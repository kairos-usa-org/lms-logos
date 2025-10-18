import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: NextRequest) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  message?: string; // Custom error message
  standardHeaders?: boolean; // Add rate limit headers
  legacyHeaders?: boolean; // Add legacy rate limit headers
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp when the window resets
  retryAfter?: number; // Seconds until the user can retry
}

export interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

/**
 * Rate limiter using Supabase for storage with organization isolation
 */
export class RateLimiter {
  private supabase: ReturnType<typeof createServerClient>;
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
      keyGenerator: config.keyGenerator || this.defaultKeyGenerator,
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      skipFailedRequests: config.skipFailedRequests || false,
      message: config.message || 'Too many requests, please try again later.',
      standardHeaders: config.standardHeaders !== false,
      legacyHeaders: config.legacyHeaders !== false,
    };

    // Create Supabase client for server-side operations
    const cookieStore = cookies();
    this.supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
  }

  /**
   * Default key generator based on IP and organization
   */
  private defaultKeyGenerator(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : req.ip || 'unknown';
    const organizationId = req.headers.get('x-organization-id') || 'anonymous';
    return `rate_limit:${organizationId}:${ip}`;
  }

  /**
   * Check if request should be rate limited
   */
  async check(req: NextRequest): Promise<{
    allowed: boolean;
    info: RateLimitInfo;
    response?: NextResponse;
  }> {
    const key = this.config.keyGenerator(req);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      // Get current rate limit entry
      const { data: entry, error } = await this.supabase
        .from('rate_limits')
        .select('*')
        .eq('key', key)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Rate limit check error:', error);
        // On error, allow the request but log it
        return {
          allowed: true,
          info: {
            limit: this.config.maxRequests,
            remaining: this.config.maxRequests,
            reset: now + this.config.windowMs,
          },
        };
      }

      let currentEntry: RateLimitEntry;
      
      if (!entry || entry.reset_time < now) {
        // No entry or window has expired, create new one
        currentEntry = {
          count: 0,
          resetTime: now + this.config.windowMs,
          blocked: false,
        };
      } else {
        // Use existing entry
        currentEntry = {
          count: entry.count,
          resetTime: entry.reset_time,
          blocked: entry.blocked || false,
        };
      }

      // Check if already blocked
      if (currentEntry.blocked && currentEntry.resetTime > now) {
        const retryAfter = Math.ceil((currentEntry.resetTime - now) / 1000);
        
        return {
          allowed: false,
          info: {
            limit: this.config.maxRequests,
            remaining: 0,
            reset: currentEntry.resetTime,
            retryAfter,
          },
          response: this.createRateLimitResponse(retryAfter),
        };
      }

      // Check if limit exceeded
      if (currentEntry.count >= this.config.maxRequests) {
        // Block the user for the remaining window time
        currentEntry.blocked = true;
        currentEntry.count = this.config.maxRequests;
        
        const retryAfter = Math.ceil((currentEntry.resetTime - now) / 1000);
        
        // Update the entry
        await this.updateRateLimitEntry(key, currentEntry);
        
        return {
          allowed: false,
          info: {
            limit: this.config.maxRequests,
            remaining: 0,
            reset: currentEntry.resetTime,
            retryAfter,
          },
          response: this.createRateLimitResponse(retryAfter),
        };
      }

      // Increment count
      currentEntry.count += 1;
      
      // Update the entry
      await this.updateRateLimitEntry(key, currentEntry);

      const remaining = Math.max(0, this.config.maxRequests - currentEntry.count);
      
      return {
        allowed: true,
        info: {
          limit: this.config.maxRequests,
          remaining,
          reset: currentEntry.resetTime,
        },
      };

    } catch (error) {
      console.error('Rate limit check error:', error);
      // On error, allow the request but log it
      return {
        allowed: true,
        info: {
          limit: this.config.maxRequests,
          remaining: this.config.maxRequests,
          reset: now + this.config.windowMs,
        },
      };
    }
  }

  /**
   * Update rate limit entry in database
   */
  private async updateRateLimitEntry(key: string, entry: RateLimitEntry): Promise<void> {
    try {
      await this.supabase
        .from('rate_limits')
        .upsert({
          key,
          count: entry.count,
          reset_time: entry.resetTime,
          blocked: entry.blocked,
          updated_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Rate limit update error:', error);
    }
  }

  /**
   * Create rate limit exceeded response
   */
  private createRateLimitResponse(retryAfter: number): NextResponse {
    const response = NextResponse.json(
      {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: this.config.message,
          retryAfter,
        },
      },
      { status: 429 }
    );

    // Add rate limit headers
    if (this.config.standardHeaders) {
      response.headers.set('X-RateLimit-Limit', this.config.maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', '0');
      response.headers.set('X-RateLimit-Reset', Math.ceil(Date.now() / 1000 + retryAfter).toString());
    }

    if (this.config.legacyHeaders) {
      response.headers.set('X-Rate-Limit-Limit', this.config.maxRequests.toString());
      response.headers.set('X-Rate-Limit-Remaining', '0');
      response.headers.set('X-Rate-Limit-Reset', Math.ceil(Date.now() / 1000 + retryAfter).toString());
    }

    response.headers.set('Retry-After', retryAfter.toString());
    
    return response;
  }

  /**
   * Add rate limit headers to successful response
   */
  addHeaders(response: NextResponse, info: RateLimitInfo): void {
    if (this.config.standardHeaders) {
      response.headers.set('X-RateLimit-Limit', info.limit.toString());
      response.headers.set('X-RateLimit-Remaining', info.remaining.toString());
      response.headers.set('X-RateLimit-Reset', Math.ceil(info.reset / 1000).toString());
    }

    if (this.config.legacyHeaders) {
      response.headers.set('X-Rate-Limit-Limit', info.limit.toString());
      response.headers.set('X-Rate-Limit-Remaining', info.remaining.toString());
      response.headers.set('X-Rate-Limit-Reset', Math.ceil(info.reset / 1000).toString());
    }
  }
}

/**
 * Predefined rate limit configurations
 */
export const rateLimitConfigs = {
  // Strict rate limiting for authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts, please try again later.',
  },

  // Moderate rate limiting for API endpoints
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'API rate limit exceeded, please try again later.',
  },

  // Lenient rate limiting for general endpoints
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,
    message: 'Rate limit exceeded, please try again later.',
  },

  // Very strict rate limiting for sensitive operations
  sensitive: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    message: 'Too many sensitive operations, please try again later.',
  },
};

/**
 * Create rate limiter middleware
 */
export function createRateLimiter(config: RateLimitConfig) {
  const limiter = new RateLimiter(config);

  return async (req: NextRequest): Promise<NextResponse | null> => {
    const { allowed, info, response } = await limiter.check(req);

    if (!allowed) {
      return response!;
    }

    // If we have a response to modify, add headers
    if (response) {
      limiter.addHeaders(response, info);
    }

    return null; // Allow request to continue
  };
}

/**
 * Rate limiter middleware factory
 */
export function rateLimit(config: RateLimitConfig) {
  return createRateLimiter(config);
}

/**
 * Organization-specific rate limiter
 */
export function organizationRateLimit(config: RateLimitConfig) {
  const orgConfig = {
    ...config,
    keyGenerator: (req: NextRequest) => {
      const organizationId = req.headers.get('x-organization-id') || 'anonymous';
      const forwarded = req.headers.get('x-forwarded-for');
      const ip = forwarded ? forwarded.split(',')[0] : req.ip || 'unknown';
      return `rate_limit:${organizationId}:${ip}`;
    },
  };

  return createRateLimiter(orgConfig);
}

/**
 * User-specific rate limiter
 */
export function userRateLimit(config: RateLimitConfig) {
  const userConfig = {
    ...config,
    keyGenerator: (req: NextRequest) => {
      const organizationId = req.headers.get('x-organization-id') || 'anonymous';
      const userId = req.headers.get('x-user-id') || 'anonymous';
      return `rate_limit:${organizationId}:user:${userId}`;
    },
  };

  return createRateLimiter(userConfig);
}

/**
 * Endpoint-specific rate limiter
 */
export function endpointRateLimit(config: RateLimitConfig, endpoint: string) {
  const endpointConfig = {
    ...config,
    keyGenerator: (req: NextRequest) => {
      const organizationId = req.headers.get('x-organization-id') || 'anonymous';
      const forwarded = req.headers.get('x-forwarded-for');
      const ip = forwarded ? forwarded.split(',')[0] : req.ip || 'unknown';
      return `rate_limit:${organizationId}:${endpoint}:${ip}`;
    },
  };

  return createRateLimiter(endpointConfig);
}

/**
 * Utility functions for rate limiting
 */
export const rateLimitUtils = {
  /**
   * Get rate limit info from response headers
   */
  getRateLimitInfo(response: NextResponse): RateLimitInfo | null {
    const limit = response.headers.get('X-RateLimit-Limit');
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');

    if (!limit || !remaining || !reset) {
      return null;
    }

    return {
      limit: parseInt(limit),
      remaining: parseInt(remaining),
      reset: parseInt(reset) * 1000, // Convert to milliseconds
    };
  },

  /**
   * Check if response indicates rate limiting
   */
  isRateLimited(response: NextResponse): boolean {
    return response.status === 429;
  },

  /**
   * Get retry after time from response
   */
  getRetryAfter(response: NextResponse): number | null {
    const retryAfter = response.headers.get('Retry-After');
    return retryAfter ? parseInt(retryAfter) : null;
  },
};

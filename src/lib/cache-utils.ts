import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  namespace: string;
}

export interface CacheItem<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  organizationId: string;
}

export interface CacheEntry<T = unknown> {
  data: T;
  expires_at: string;
  created_at: string;
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds, default 3600 (1 hour)
  organizationId: string;
}

export interface CacheKey {
  resourceType: string;
  resourceId: string;
  organizationId: string;
}

// Default cache configuration
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: 3600, // 1 hour - increased for Supabase-based caching
  namespace: "lms",
};

/**
 * Create a cache key with organization isolation
 * Format: {organization_id}:{resource_type}:{resource_id}
 */
export function createCacheKey(
  organizationId: string,
  resourceType: string,
  resourceId: string
): string {
  return `${organizationId}:${resourceType}:${resourceId}`;
}

/**
 * Parse a cache key to extract components
 */
export function parseCacheKey(cacheKey: string): CacheKey | null {
  const parts = cacheKey.split(":");
  if (parts.length !== 3) {
    return null;
  }

  return {
    organizationId: parts[0]!,
    resourceType: parts[1]!,
    resourceId: parts[2]!,
  };
}

// Cache key validation
export const validateCacheKey = (key: string): boolean => {
  // Cache keys must follow the pattern: {organization_id}:{resource_type}:{resource_id}
  const parts = key.split(":");
  return parts.length === 3 && parts.every((part) => part.length > 0);
};

/**
 * Supabase-based caching system with multi-tenant isolation
 * Uses RLS policies to ensure organization data separation
 */
export class OrganizationCache {
  public supabase: ReturnType<typeof createServerClient>;
  private defaultTtl: number;

  constructor(defaultTtl: number = DEFAULT_CACHE_CONFIG.ttl) {
    this.defaultTtl = defaultTtl;

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
   * Store data in cache with organization isolation
   */
  async set<T>(
    organizationId: string,
    resourceType: string,
    resourceId: string,
    data: T,
    options: Partial<CacheOptions> = {}
  ): Promise<boolean> {
    try {
      const ttl = options.ttl ?? this.defaultTtl;
      const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
      const cacheKey = createCacheKey(organizationId, resourceType, resourceId);

      const { error } = await this.supabase
        .from("cache")
        .upsert({
          organization_id: organizationId,
          cache_key: cacheKey,
          data: data as unknown,
          expires_at: expiresAt,
        });

      if (error) {
        console.error('Cache set error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Retrieve data from cache with organization isolation
   */
  async get<T>(
    organizationId: string,
    resourceType: string,
    resourceId: string
  ): Promise<T | null> {
    try {
      const cacheKey = createCacheKey(organizationId, resourceType, resourceId);

      const { data, error } = await this.supabase
        .from("cache")
        .select("data, expires_at")
        .eq("organization_id", organizationId)
        .eq("cache_key", cacheKey)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No rows found - cache miss
          return null;
        }
        console.error('Cache get error:', error);
        return null;
      }

      return data.data as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Delete data from cache
   */
  async delete(
    organizationId: string,
    resourceType: string,
    resourceId: string
  ): Promise<boolean> {
    try {
      const cacheKey = createCacheKey(organizationId, resourceType, resourceId);

      const { error } = await this.supabase
        .from("cache")
        .delete()
        .eq("organization_id", organizationId)
        .eq("cache_key", cacheKey);

      if (error) {
        console.error('Cache delete error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }
}

// Create a global cache instance
const globalCache = new OrganizationCache();

// Set cache item with organization isolation
export const setCacheItem = async <T>(
  organizationId: string,
  resourceType: string,
  data: T,
  resourceId: string,
  ttl: number = DEFAULT_CACHE_CONFIG.ttl
): Promise<boolean> => {
  return globalCache.set(organizationId, resourceType, resourceId, data, { ttl });
};

// Get cache item with organization isolation
export const getCacheItem = async <T>(
  organizationId: string,
  resourceType: string,
  resourceId: string
): Promise<T | null> => {
  return globalCache.get<T>(organizationId, resourceType, resourceId);
};

// Delete cache item
export const deleteCacheItem = async (
  organizationId: string,
  resourceType: string,
  resourceId: string
): Promise<boolean> => {
  return globalCache.delete(organizationId, resourceType, resourceId);
};

// Clear all cache items for an organization
export const clearOrganizationCache = async (organizationId: string): Promise<number> => {
  try {
    const { data, error } = await globalCache.supabase
      .from('cache')
      .delete()
      .eq('organization_id', organizationId)
      .select('id');

    if (error) {
      console.error('Clear organization cache error:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('Clear organization cache error:', error);
    return 0;
  }
};

// Clear all cache items for a specific resource type in an organization
export const clearResourceTypeCache = async (
  organizationId: string,
  resourceType: string
): Promise<number> => {
  try {
    const { data, error } = await globalCache.supabase
      .from('cache')
      .delete()
      .eq('organization_id', organizationId)
      .like('cache_key', `${organizationId}:${resourceType}:%`)
      .select('id');

    if (error) {
      console.error('Clear resource type cache error:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('Clear resource type cache error:', error);
    return 0;
  }
};

// Get cache statistics
export const getCacheStats = async (organizationId?: string) => {
  try {
    let query = globalCache.supabase
      .from('cache')
      .select('cache_key, expires_at, organization_id');

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: allEntries, error } = await query;

    if (error) {
      console.error('Cache stats error:', error);
      return { totalItems: 0, organizations: [], resourceTypes: [], expiredItems: 0 };
    }

    const now = new Date().toISOString();
    const expiredEntries = allEntries?.filter((entry: any) => entry.expires_at < now).length || 0;
    
    const organizations = new Set<string>();
    const resourceTypes = new Set<string>();
    
    allEntries?.forEach((entry: any) => {
      organizations.add(entry.organization_id);
      const parsed = parseCacheKey(entry.cache_key);
      if (parsed) {
        resourceTypes.add(parsed.resourceType);
      }
    });

    return {
      totalItems: allEntries?.length || 0,
      organizations: Array.from(organizations),
      resourceTypes: Array.from(resourceTypes),
      expiredItems: expiredEntries,
    };
  } catch (error) {
    console.error('Cache stats error:', error);
    return { totalItems: 0, organizations: [], resourceTypes: [], expiredItems: 0 };
  }
};

// Clean up expired items
export const cleanupExpiredItems = async (): Promise<number> => {
  try {
    const { data, error } = await globalCache.supabase
      .from('cache')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      console.error('Cache cleanup error:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('Cache cleanup error:', error);
    return 0;
  }
};

// Cache middleware for API routes
export const withCache = <T>(
  organizationId: string,
  resourceType: string,
  resourceId: string,
  ttl: number = DEFAULT_CACHE_CONFIG.ttl
) => {
  return (handler: () => Promise<T>) => {
    return async (): Promise<T> => {
      // Try to get from cache first
      const cached = await getCacheItem<T>(organizationId, resourceType, resourceId);
      if (cached !== null) {
        return cached;
      }

      // Execute handler and cache result
      const result = await handler();
      await setCacheItem(organizationId, resourceType, result, resourceId, ttl);

      return result;
    };
  };
};

// Cache invalidation patterns
export const invalidateCachePattern = async (pattern: string): Promise<number> => {
  try {
    const { data, error } = await globalCache.supabase
      .from('cache')
      .delete()
      .like('cache_key', `%${pattern}%`)
      .select('id');

    if (error) {
      console.error('Cache pattern invalidation error:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('Cache pattern invalidation error:', error);
    return 0;
  }
};

// Cache warming utility
export const warmCache = async <T>(
  organizationId: string,
  resourceType: string,
  dataFetcher: () => Promise<T[]>,
  ttl: number = DEFAULT_CACHE_CONFIG.ttl
): Promise<void> => {
  try {
    const data = await dataFetcher();

    // Cache each item individually
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const resourceId = (item as any)?.id || i.toString();
      await setCacheItem(organizationId, resourceType, item, resourceId, ttl);
    }

    // Also cache the list itself
    await setCacheItem(organizationId, resourceType, data, 'list', ttl);
  } catch (error) {
    console.error('Failed to warm cache:', error);
  }
};

// Cache health check
export const checkCacheHealth = async (organizationId?: string) => {
  const stats = await getCacheStats(organizationId);
  const expiredCount = await cleanupExpiredItems();

  return {
    healthy: stats.expiredItems < stats.totalItems * 0.1, // Less than 10% expired
    stats: {
      ...stats,
      expiredItems: expiredCount,
    },
    recommendations:
      stats.expiredItems > stats.totalItems * 0.2
        ? ['Consider increasing TTL values', 'Implement cache warming strategy']
        : [],
  };
};

/**
 * Create a new cache instance
 */
export function createCache(defaultTtl?: number): OrganizationCache {
  return new OrganizationCache(defaultTtl);
}

/**
 * Cache utility functions for common operations
 */
export const cacheUtils = {
  /**
   * Cache a function result with automatic key generation
   */
  async cacheFunction<T>(
    organizationId: string,
    resourceType: string,
    resourceId: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cache = createCache();
    
    // Try to get from cache first
    const cached = await cache.get<T>(organizationId, resourceType, resourceId);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn();
    await cache.set(organizationId, resourceType, resourceId, result, { ttl: ttl ?? undefined });
    
    return result;
  },

  /**
   * Invalidate cache for a specific resource
   */
  async invalidate(
    organizationId: string,
    resourceType: string,
    resourceId: string
  ): Promise<boolean> {
    const cache = createCache();
    return cache.delete(organizationId, resourceType, resourceId);
  },

  /**
   * Invalidate all cache entries for a resource type
   */
  async invalidateResourceType(
    organizationId: string,
    resourceType: string
  ): Promise<boolean> {
    return clearResourceTypeCache(organizationId, resourceType).then(count => count > 0);
  },
};

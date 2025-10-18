import { createOrganizationCacheKey } from "./jwt-utils";

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  namespace: string;
}

export interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  organizationId: string;
}

// In-memory cache for development (replace with Redis in production)
const memoryCache = new Map<string, CacheItem>();

// Default cache configuration
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: 300, // 5 minutes
  namespace: "lms",
};

// Cache key validation
export const validateCacheKey = (key: string): boolean => {
  // Cache keys must follow the pattern: {organization_id}:{resource_type}:{resource_id}
  const parts = key.split(":");
  return parts.length >= 2 && parts.every((part) => part.length > 0);
};

// Create organization-isolated cache key
export const createCacheKey = (
  organizationId: string,
  resourceType: string,
  resourceId?: string,
  additionalParams?: Record<string, string>,
): string => {
  let key = createOrganizationCacheKey(organizationId, resourceType, resourceId);

  if (additionalParams) {
    const paramString = Object.entries(additionalParams)
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    key += `:${paramString}`;
  }

  return key;
};

// Set cache item with organization isolation
export const setCacheItem = <T>(
  organizationId: string,
  resourceType: string,
  data: T,
  resourceId?: string,
  ttl: number = DEFAULT_CACHE_CONFIG.ttl,
): void => {
  const key = createCacheKey(organizationId, resourceType, resourceId);

  const cacheItem: CacheItem<T> = {
    data,
    timestamp: Date.now(),
    ttl: ttl * 1000, // Convert to milliseconds
    organizationId,
  };

  memoryCache.set(key, cacheItem);
};

// Get cache item with organization isolation
export const getCacheItem = <T>(
  organizationId: string,
  resourceType: string,
  resourceId?: string,
): T | null => {
  const key = createCacheKey(organizationId, resourceType, resourceId);
  const item = memoryCache.get(key);

  if (!item) {
    return null;
  }

  // Check if item belongs to the same organization
  if (item.organizationId !== organizationId) {
    console.warn(`Cache key ${key} belongs to different organization`);
    return null;
  }

  // Check if item has expired
  if (Date.now() - item.timestamp > item.ttl) {
    memoryCache.delete(key);
    return null;
  }

  return item.data;
};

// Delete cache item
export const deleteCacheItem = (
  organizationId: string,
  resourceType: string,
  resourceId?: string,
): boolean => {
  const key = createCacheKey(organizationId, resourceType, resourceId);
  return memoryCache.delete(key);
};

// Clear all cache items for an organization
export const clearOrganizationCache = (organizationId: string): number => {
  let deletedCount = 0;

  for (const [key, item] of memoryCache.entries()) {
    if (item.organizationId === organizationId) {
      memoryCache.delete(key);
      deletedCount++;
    }
  }

  return deletedCount;
};

// Clear all cache items for a specific resource type in an organization
export const clearResourceTypeCache = (
  organizationId: string,
  resourceType: string,
): number => {
  let deletedCount = 0;
  const prefix = `${organizationId}:${resourceType}`;

  for (const [key, item] of memoryCache.entries()) {
    if (key.startsWith(prefix) && item.organizationId === organizationId) {
      memoryCache.delete(key);
      deletedCount++;
    }
  }

  return deletedCount;
};

// Get cache statistics
export const getCacheStats = () => {
  const stats = {
    totalItems: memoryCache.size,
    organizations: new Set<string>(),
    resourceTypes: new Set<string>(),
    expiredItems: 0,
  };

  const now = Date.now();

  for (const [key, item] of memoryCache.entries()) {
    stats.organizations.add(item.organizationId);

    const resourceType = key.split(":")[1];
    stats.resourceTypes.add(resourceType);

    if (now - item.timestamp > item.ttl) {
      stats.expiredItems++;
    }
  }

  return {
    ...stats,
    organizations: Array.from(stats.organizations),
    resourceTypes: Array.from(stats.resourceTypes),
  };
};

// Clean up expired items
export const cleanupExpiredItems = (): number => {
  let deletedCount = 0;
  const now = Date.now();

  for (const [key, item] of memoryCache.entries()) {
    if (now - item.timestamp > item.ttl) {
      memoryCache.delete(key);
      deletedCount++;
    }
  }

  return deletedCount;
};

// Cache middleware for API routes
export const withCache = <T>(
  organizationId: string,
  resourceType: string,
  resourceId?: string,
  ttl: number = DEFAULT_CACHE_CONFIG.ttl,
) => {
  return (handler: () => Promise<T>) => {
    return async (): Promise<T> => {
      // Try to get from cache first
      const cached = getCacheItem<T>(organizationId, resourceType, resourceId);
      if (cached !== null) {
        return cached;
      }

      // Execute handler and cache result
      const result = await handler();
      setCacheItem(organizationId, resourceType, result, resourceId, ttl);

      return result;
    };
  };
};

// Cache invalidation patterns
export const invalidateCachePattern = (pattern: string): number => {
  let deletedCount = 0;

  for (const [key, item] of memoryCache.entries()) {
    if (key.includes(pattern)) {
      memoryCache.delete(key);
      deletedCount++;
    }
  }

  return deletedCount;
};

// Cache warming utility
export const warmCache = async <T>(
  organizationId: string,
  resourceType: string,
  dataFetcher: () => Promise<T[]>,
  ttl: number = DEFAULT_CACHE_CONFIG.ttl,
): Promise<void> => {
  try {
    const data = await dataFetcher();

    // Cache each item individually
    data.forEach((item: Record<string, unknown>, index: number) => {
      const resourceId = (item.id as string) || index.toString();
      setCacheItem(organizationId, resourceType, item, resourceId, ttl);
    });

    // Also cache the list itself
    setCacheItem(organizationId, resourceType, data, undefined, ttl);
  } catch (error) {
    console.error("Failed to warm cache:", error);
  }
};

// Cache health check
export const checkCacheHealth = () => {
  const stats = getCacheStats();
  const expiredCount = cleanupExpiredItems();

  return {
    healthy: stats.expiredItems < stats.totalItems * 0.1, // Less than 10% expired
    stats: {
      ...stats,
      expiredItems: expiredCount,
    },
    recommendations:
      stats.expiredItems > stats.totalItems * 0.2
        ? ["Consider increasing TTL values", "Implement cache warming strategy"]
        : [],
  };
};
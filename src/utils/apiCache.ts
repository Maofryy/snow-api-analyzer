// API result caching system to improve performance and reduce redundant requests
import { logger } from './logger';
import { ApiCallResult, ApiError } from '../types';

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  expiresAt: number;
  size: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  size: number;
  totalEntries: number;
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
}

class ApiCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxSize: number;
  private readonly defaultTtl: number;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalSize: 0
  };

  constructor(maxSize: number = 50 * 1024 * 1024, defaultTtl: number = 300000) { // 50MB, 5 minutes
    this.maxSize = maxSize;
    this.defaultTtl = defaultTtl;
    this.setupCleanupTimer();
  }

  private setupCleanupTimer(): void {
    // Clean up expired entries every 2 minutes
    setInterval(() => {
      this.cleanup();
    }, 120000);
  }

  private generateCacheKey(url: string, options: RequestInit): string {
    // Create a deterministic cache key from URL and options
    const keyData = {
      url: url.replace(/([?&])(username|password|token)=[^&]*/g, '$1$2=***'), // Remove credentials
      method: options.method || 'GET',
      headers: options.headers ? JSON.stringify(options.headers) : '',
      body: options.body || ''
    };
    
    return btoa(JSON.stringify(keyData));
  }

  private calculateSize(data: unknown): number {
    try {
      return JSON.stringify(data).length * 2; // Approximate UTF-16 size
    } catch {
      return 1000; // Default size for non-serializable data
    }
  }

  private evictLeastRecentlyUsed(): void {
    if (this.cache.size === 0) return;

    let lruKey: string | null = null;
    let lruTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      const entry = this.cache.get(lruKey);
      if (entry) {
        this.stats.totalSize -= entry.size;
        this.stats.evictions++;
        this.cache.delete(lruKey);
        logger.debug(`Evicted LRU cache entry: ${lruKey}`, 'apiCache');
      }
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      const entry = this.cache.get(key);
      if (entry) {
        this.stats.totalSize -= entry.size;
      }
      this.cache.delete(key);
    }

    if (expiredKeys.length > 0) {
      logger.info(`Cleaned up ${expiredKeys.length} expired cache entries`, 'apiCache');
    }
  }

  private ensureCapacity(newEntrySize: number): void {
    // Evict entries if we would exceed the maximum size
    while (this.stats.totalSize + newEntrySize > this.maxSize && this.cache.size > 0) {
      this.evictLeastRecentlyUsed();
    }
  }

  public get<T = unknown>(url: string, options: RequestInit): T | null {
    const key = this.generateCacheKey(url, options);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      // Entry expired
      this.stats.totalSize -= entry.size;
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;
    this.stats.hits++;

    logger.debug(`Cache hit for ${url}`, 'apiCache');
    return entry.data as T;
  }

  public set<T = unknown>(url: string, options: RequestInit, data: T, ttl?: number): void {
    const key = this.generateCacheKey(url, options);
    const size = this.calculateSize(data);
    const now = Date.now();
    const actualTtl = ttl || this.defaultTtl;

    // Don't cache if the data is too large
    if (size > this.maxSize * 0.1) { // Don't cache entries larger than 10% of max size
      logger.warn(`Skipping cache for oversized entry: ${size} bytes`, 'apiCache');
      return;
    }

    // Ensure we have capacity
    this.ensureCapacity(size);

    // Remove existing entry if present
    const existingEntry = this.cache.get(key);
    if (existingEntry) {
      this.stats.totalSize -= existingEntry.size;
    }

    // Add new entry
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + actualTtl,
      size,
      accessCount: 1,
      lastAccessed: now
    };

    this.cache.set(key, entry);
    this.stats.totalSize += size;

    logger.debug(`Cached response for ${url} (${size} bytes, TTL: ${actualTtl}ms)`, 'apiCache');
  }

  public has(url: string, options: RequestInit): boolean {
    const key = this.generateCacheKey(url, options);
    const entry = this.cache.get(key);
    
    if (!entry) return false;
    
    const now = Date.now();
    if (now > entry.expiresAt) {
      this.stats.totalSize -= entry.size;
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  public clear(): void {
    this.cache.clear();
    this.stats.totalSize = 0;
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.evictions = 0;
    logger.info('API cache cleared', 'apiCache');
  }

  public getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      size: this.stats.totalSize,
      totalEntries: this.cache.size,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0,
      missRate: total > 0 ? (this.stats.misses / total) * 100 : 0,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses
    };
  }

  public getCacheInfo(): Array<{
    key: string;
    size: number;
    age: number;
    accessCount: number;
    expiresIn: number;
  }> {
    const now = Date.now();
    const info: Array<{
      key: string;
      size: number;
      age: number;
      accessCount: number;
      expiresIn: number;
    }> = [];

    for (const [key, entry] of this.cache.entries()) {
      info.push({
        key,
        size: entry.size,
        age: now - entry.timestamp,
        accessCount: entry.accessCount,
        expiresIn: entry.expiresAt - now
      });
    }

    return info.sort((a, b) => b.accessCount - a.accessCount);
  }
}

// Export singleton instance
export const apiCache = new ApiCache();

// Enhanced fetch function with caching
export async function cachedFetch(
  url: string,
  options: RequestInit = {},
  cacheOptions: { ttl?: number; skipCache?: boolean } = {}
): Promise<Response> {
  const { ttl, skipCache = false } = cacheOptions;

  // Check cache first (only for GET requests)
  if (!skipCache && (!options.method || options.method === 'GET')) {
    const cached = apiCache.get<Response>(url, options);
    if (cached) {
      return cached;
    }
  }

  // Make the actual request
  const response = await fetch(url, options);
  
  // Cache successful responses (only for GET requests)
  if (!skipCache && response.ok && (!options.method || options.method === 'GET')) {
    // Clone the response to cache it
    const clonedResponse = response.clone();
    apiCache.set(url, options, clonedResponse, ttl);
  }

  return response;
}

// Helper function to create cache-aware API call
export async function createCachedApiCall<T = unknown>(
  url: string,
  options: RequestInit,
  cacheOptions: { ttl?: number; skipCache?: boolean } = {}
): Promise<ApiCallResult<T>> {
  const start = performance.now();
  
  try {
    const response = await cachedFetch(url, options, cacheOptions);
    const responseTime = performance.now() - start;
    
    if (!response.ok) {
      const error: ApiError = {
        message: `HTTP ${response.status}: ${response.statusText}`,
        code: response.status.toString(),
        timestamp: new Date()
      };
      
      return {
        success: false,
        error,
        responseTime,
        payloadSize: 0,
        allResponseTimes: [responseTime]
      };
    }

    const data = await response.json() as T;
    const payloadSize = JSON.stringify(data).length;
    
    return {
      success: true,
      data,
      responseTime,
      payloadSize,
      allResponseTimes: [responseTime]
    };
  } catch (error) {
    const responseTime = performance.now() - start;
    const apiError: ApiError = {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: 'NETWORK_ERROR',
      details: error,
      timestamp: new Date()
    };

    return {
      success: false,
      error: apiError,
      responseTime,
      payloadSize: 0,
      allResponseTimes: [responseTime]
    };
  }
}
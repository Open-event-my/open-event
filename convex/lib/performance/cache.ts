/**
 * Cache Manager Service
 * 
 * Provides in-memory caching for database queries to improve performance.
 * Implements TTL-based expiration and LRU eviction when max size is reached.
 * 
 * Requirements: 6.4
 */

import { logger } from '../monitoring/logger';
import { metricsCollector } from '../monitoring/metrics';

// ============================================================================
// Types
// ============================================================================

export interface CacheConfig {
  /**
   * Default time-to-live for cache entries in milliseconds
   * @default 300000 (5 minutes)
   */
  ttl: number;
  
  /**
   * Maximum number of entries in the cache
   * @default 1000
   */
  maxSize: number;
  
  /**
   * Name of the cache for logging and metrics
   * @default 'default'
   */
  name?: string;
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  /**
   * Insertion order counter for deterministic LRU eviction
   * when multiple entries have the same lastAccessed timestamp
   */
  insertionOrder: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  expirations: number;
}

// ============================================================================
// Cache Manager
// ============================================================================

export class CacheManager {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private config: Required<CacheConfig>;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    expirations: 0,
  };
  /**
   * Counter for deterministic insertion ordering
   * Used as tiebreaker in LRU eviction when timestamps are identical
   */
  private insertionCounter = 0;
  
  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      ttl: 300000, // 5 minutes default
      maxSize: 1000,
      name: 'default',
      ...config,
    };
    
    if (this.config.maxSize <= 0) {
      throw new Error('Cache maxSize must be greater than 0');
    }
    
    if (this.config.ttl < 0) {
      throw new Error('Cache TTL must be non-negative');
    }
    
    logger.debug('CacheManager initialized', {
      name: this.config.name,
      ttl: this.config.ttl,
      maxSize: this.config.maxSize,
    });
  }
  
  /**
   * Get a value from the cache
   * Returns null if the key doesn't exist or has expired
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      this.stats.misses++;
      this.recordMetrics('miss');
      return null;
    }
    
    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.expirations++;
      this.recordMetrics('miss');
      
      logger.debug('Cache entry expired', {
        cache: this.config.name,
        key,
      });
      
      return null;
    }
    
    // Update access tracking for LRU
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    this.stats.hits++;
    this.recordMetrics('hit');
    
    logger.debug('Cache hit', {
      cache: this.config.name,
      key,
      accessCount: entry.accessCount,
    });
    
    return entry.value;
  }
  
  /**
   * Set a value in the cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Optional TTL override in milliseconds
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const effectiveTtl = ttl ?? this.config.ttl;
    const now = Date.now();
    
    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }
    
    const entry: CacheEntry<T> = {
      value,
      timestamp: now,
      expiresAt: now + effectiveTtl,
      accessCount: 0,
      lastAccessed: now,
      insertionOrder: this.insertionCounter++,
    };
    
    this.cache.set(key, entry);
    
    logger.debug('Cache set', {
      cache: this.config.name,
      key,
      ttl: effectiveTtl,
      size: this.cache.size,
    });
    
    metricsCollector.recordGauge(`cache.${this.config.name}.size`, this.cache.size);
  }
  
  /**
   * Delete a specific key from the cache
   */
  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    
    if (deleted) {
      logger.debug('Cache entry deleted', {
        cache: this.config.name,
        key,
      });
    }
    
    return deleted;
  }
  
  /**
   * Clear all entries from the cache
   */
  async clear(): Promise<void> {
    const previousSize = this.cache.size;
    this.cache.clear();
    
    logger.info('Cache cleared', {
      cache: this.config.name,
      entriesCleared: previousSize,
    });
    
    metricsCollector.recordGauge(`cache.${this.config.name}.size`, 0);
  }
  
  /**
   * Check if a key exists in the cache (without updating access time)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.expirations++;
      return false;
    }
    
    return true;
  }
  
  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
    
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      evictions: this.stats.evictions,
      expirations: this.stats.expirations,
    };
  }
  
  /**
   * Get all keys in the cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
  
  /**
   * Get the number of entries in the cache
   */
  size(): number {
    return this.cache.size;
  }
  
  /**
   * Evict the least recently used entry
   * Uses insertionOrder as tiebreaker when lastAccessed times are equal
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;
    let oldestInsertionOrder = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      // Primary sort: lastAccessed (older = evict first)
      // Secondary sort: insertionOrder (lower = older = evict first)
      if (entry.lastAccessed < oldestAccess || 
          (entry.lastAccessed === oldestAccess && entry.insertionOrder < oldestInsertionOrder)) {
        oldestAccess = entry.lastAccessed;
        oldestInsertionOrder = entry.insertionOrder;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      
      logger.debug('Cache entry evicted (LRU)', {
        cache: this.config.name,
        key: oldestKey,
      });
      
      metricsCollector.recordCounter(`cache.${this.config.name}.evictions`, 1);
    }
  }
  
  /**
   * Remove all expired entries from the cache
   */
  async cleanup(): Promise<number> {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
        this.stats.expirations++;
      }
    }
    
    if (removed > 0) {
      logger.info('Cache cleanup completed', {
        cache: this.config.name,
        entriesRemoved: removed,
        remainingSize: this.cache.size,
      });
    }
    
    return removed;
  }
  
  /**
   * Record cache metrics
   */
  private recordMetrics(type: 'hit' | 'miss'): void {
    metricsCollector.recordCounter(`cache.${this.config.name}.${type}`, 1);
  }
}

// ============================================================================
// Query Cache Manager
// ============================================================================

/**
 * Specialized cache manager for database queries
 * Provides query-specific caching with automatic key generation
 */
export class QueryCacheManager extends CacheManager {
  constructor(config?: Partial<CacheConfig>) {
    super({
      name: 'query',
      ttl: 60000, // 1 minute default for queries
      maxSize: 500,
      ...config,
    });
  }
  
  /**
   * Generate a cache key from query parameters
   */
  generateKey(queryName: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${JSON.stringify(params[key])}`)
      .join('|');
    
    return `${queryName}:${sortedParams}`;
  }
  
  /**
   * Get a cached query result
   */
  async getQuery<T>(queryName: string, params: Record<string, unknown>): Promise<T | null> {
    const key = this.generateKey(queryName, params);
    return this.get<T>(key);
  }
  
  /**
   * Cache a query result
   */
  async setQuery<T>(
    queryName: string,
    params: Record<string, unknown>,
    result: T,
    ttl?: number
  ): Promise<void> {
    const key = this.generateKey(queryName, params);
    return this.set(key, result, ttl);
  }
  
  /**
   * Invalidate all cached results for a specific query
   */
  async invalidateQuery(queryName: string): Promise<number> {
    const prefix = `${queryName}:`;
    let invalidated = 0;
    
    for (const key of this.keys()) {
      if (key.startsWith(prefix)) {
        await this.delete(key);
        invalidated++;
      }
    }
    
    logger.info('Query cache invalidated', {
      queryName,
      entriesInvalidated: invalidated,
    });
    
    return invalidated;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a general-purpose cache manager
 */
export function createCacheManager(config?: Partial<CacheConfig>): CacheManager {
  return new CacheManager(config);
}

/**
 * Create a query-specific cache manager
 */
export function createQueryCacheManager(config?: Partial<CacheConfig>): QueryCacheManager {
  return new QueryCacheManager(config);
}

// ============================================================================
// Singleton Instances
// ============================================================================

/**
 * Default cache manager instance for general use
 */
export const defaultCache = new CacheManager({ name: 'default' });

/**
 * Query cache manager instance for database queries
 */
export const queryCache = new QueryCacheManager();

// ============================================================================
// Cache Decorator (for use with functions)
// ============================================================================

/**
 * Higher-order function to wrap a function with caching
 */
export function withCache<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: {
    cache: CacheManager;
    keyGenerator: (...args: Parameters<T>) => string;
    ttl?: number;
  }
): T {
  return (async (...args: Parameters<T>) => {
    const key = options.keyGenerator(...args);
    
    // Try to get from cache
    const cached = await options.cache.get(key);
    if (cached !== null) {
      return cached;
    }
    
    // Execute function and cache result
    const result = await fn(...args);
    await options.cache.set(key, result, options.ttl);
    
    return result;
  }) as T;
}

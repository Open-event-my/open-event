/**
 * Property-Based Tests for Cache Manager
 *
 * Tests universal properties that should hold for database query caching.
 * Uses fast-check for property-based testing with minimum 100 iterations.
 *
 * Feature: production-readiness, Property 24: Database Query Caching
 * Validates: Requirements 6.4
 */

import { describe, test, expect } from 'vitest'
import fc from 'fast-check'
import {
  CacheManager,
  QueryCacheManager,
  createCacheManager,
  createQueryCacheManager,
  withCache,
} from './cache'

/**
 * Feature: production-readiness, Property 24: Database Query Caching
 * Validates: Requirements 6.4
 *
 * For any database query that is repeated within the cache TTL window,
 * the cached result should be returned instead of executing the query again.
 */
describe('Property 24: Database Query Caching', () => {
  test('cached values should be returned within TTL window', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }), // cache key
        fc.anything(), // cache value (any serializable value)
        fc.integer({ min: 100, max: 10000 }), // TTL in ms
        async (key, value, ttl) => {
          const cache = new CacheManager({ ttl, maxSize: 100 })

          // Set value in cache
          await cache.set(key, value)

          // Get value immediately (within TTL)
          const retrieved = await cache.get(key)

          // Should return the cached value
          expect(retrieved).toEqual(value)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('cache should return null for non-existent keys', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }), // key to query
        async (key) => {
          const cache = new CacheManager({ ttl: 5000, maxSize: 100 })

          // Query for a key that was never set
          const result = await cache.get(key)

          // Should return null
          expect(result).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })

  test('cache should return null for expired entries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }), // cache key
        fc.string({ minLength: 1, maxLength: 100 }), // cache value
        async (key, value) => {
          // Use very short TTL
          const cache = new CacheManager({ ttl: 1, maxSize: 100 })

          // Set value in cache
          await cache.set(key, value)

          // Wait for TTL to expire
          await new Promise((resolve) => setTimeout(resolve, 10))

          // Get value after expiration
          const retrieved = await cache.get(key)

          // Should return null (expired)
          expect(retrieved).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })

  test('cache should track hits and misses correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 20 }), // number of unique keys
        fc.integer({ min: 1, max: 5 }), // accesses per key
        async (numKeys, accessesPerKey) => {
          const cache = new CacheManager({ ttl: 60000, maxSize: 1000 })

          // Generate unique keys
          const keys = Array.from({ length: numKeys }, (_, i) => `key-${i}`)

          // Set all keys
          for (const key of keys) {
            await cache.set(key, `value-${key}`)
          }

          // Access each key multiple times
          for (const key of keys) {
            for (let i = 0; i < accessesPerKey; i++) {
              await cache.get(key)
            }
          }

          const stats = cache.getStats()

          // All accesses should be hits (since we set all keys first)
          expect(stats.hits).toBe(numKeys * accessesPerKey)
          expect(stats.misses).toBe(0)
          expect(stats.hitRate).toBe(1)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('cache should evict entries when max size is reached', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 20 }), // max size
        async (maxSize) => {
          const cache = new CacheManager({ ttl: 60000, maxSize })

          // Fill cache to max size
          for (let i = 0; i < maxSize; i++) {
            await cache.set(`key-${i}`, `value-${i}`)
          }

          expect(cache.size()).toBe(maxSize)

          // Add one more entry (should evict one entry)
          await cache.set('new-key', 'new-value')

          // Size should still be maxSize
          expect(cache.size()).toBe(maxSize)

          // New key should exist
          const newKey = await cache.get('new-key')
          expect(newKey).toBe('new-value')

          // Stats should show eviction
          const stats = cache.getStats()
          expect(stats.evictions).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('cache delete should remove specific entries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 2, maxLength: 10 }),
        async (keys) => {
          // Ensure unique keys
          const uniqueKeys = [...new Set(keys)]
          if (uniqueKeys.length < 2) return // Skip if not enough unique keys

          const cache = new CacheManager({ ttl: 60000, maxSize: 100 })

          // Set all keys
          for (const key of uniqueKeys) {
            await cache.set(key, `value-${key}`)
          }

          // Delete first key
          const keyToDelete = uniqueKeys[0]
          const deleted = await cache.delete(keyToDelete)

          expect(deleted).toBe(true)

          // Deleted key should return null
          const deletedValue = await cache.get(keyToDelete)
          expect(deletedValue).toBeNull()

          // Other keys should still exist
          for (let i = 1; i < uniqueKeys.length; i++) {
            const value = await cache.get(uniqueKeys[i])
            expect(value).toBe(`value-${uniqueKeys[i]}`)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  test('cache clear should remove all entries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 50 }), // number of entries
        async (numEntries) => {
          const cache = new CacheManager({ ttl: 60000, maxSize: 100 })

          // Add entries
          for (let i = 0; i < numEntries; i++) {
            await cache.set(`key-${i}`, `value-${i}`)
          }

          expect(cache.size()).toBe(numEntries)

          // Clear cache
          await cache.clear()

          // Cache should be empty
          expect(cache.size()).toBe(0)

          // All keys should return null
          for (let i = 0; i < numEntries; i++) {
            const value = await cache.get(`key-${i}`)
            expect(value).toBeNull()
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  test('cache should support custom TTL per entry', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // key
        fc.string({ minLength: 1, maxLength: 50 }), // value
        async (key, value) => {
          // Default TTL is long
          const cache = new CacheManager({ ttl: 60000, maxSize: 100 })

          // Set with very short custom TTL
          await cache.set(key, value, 1)

          // Wait for custom TTL to expire
          await new Promise((resolve) => setTimeout(resolve, 10))

          // Should be expired
          const retrieved = await cache.get(key)
          expect(retrieved).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })

  test('cache has() should correctly report entry existence', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // existing key
        fc.string({ minLength: 1, maxLength: 50 }), // non-existing key
        async (existingKey, nonExistingKey) => {
          // Ensure keys are different
          const actualNonExisting =
            existingKey === nonExistingKey ? `${nonExistingKey}-different` : nonExistingKey

          const cache = new CacheManager({ ttl: 60000, maxSize: 100 })

          // Set existing key
          await cache.set(existingKey, 'value')

          // has() should return true for existing key
          expect(cache.has(existingKey)).toBe(true)

          // has() should return false for non-existing key
          expect(cache.has(actualNonExisting)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('cache cleanup should remove expired entries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }), // number of entries
        async (numEntries) => {
          const cache = new CacheManager({ ttl: 1, maxSize: 100 })

          // Add entries with very short TTL
          for (let i = 0; i < numEntries; i++) {
            await cache.set(`key-${i}`, `value-${i}`)
          }

          expect(cache.size()).toBe(numEntries)

          // Wait for TTL to expire
          await new Promise((resolve) => setTimeout(resolve, 10))

          // Run cleanup
          const removed = await cache.cleanup()

          // All entries should be removed
          expect(removed).toBe(numEntries)
          expect(cache.size()).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * QueryCacheManager specific tests
 */
describe('QueryCacheManager', () => {
  test('should generate consistent cache keys for same query params', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // query name
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.oneof(fc.string(), fc.integer(), fc.boolean())
        ), // params
        async (queryName, params) => {
          const cache = new QueryCacheManager()

          // Generate key twice with same params
          const key1 = cache.generateKey(queryName, params)
          const key2 = cache.generateKey(queryName, params)

          // Keys should be identical
          expect(key1).toBe(key2)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('should generate different keys for different params', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // query name
        async (queryName) => {
          const cache = new QueryCacheManager()

          const params1 = { id: 1, name: 'test' }
          const params2 = { id: 2, name: 'test' }

          const key1 = cache.generateKey(queryName, params1)
          const key2 = cache.generateKey(queryName, params2)

          // Keys should be different
          expect(key1).not.toBe(key2)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('getQuery and setQuery should work correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // query name
        fc.record({
          id: fc.integer(),
          filter: fc.string(),
        }), // params
        fc.array(fc.record({ id: fc.integer(), name: fc.string() })), // result
        async (queryName, params, result) => {
          const cache = new QueryCacheManager({ ttl: 60000 })

          // Cache query result
          await cache.setQuery(queryName, params, result)

          // Retrieve cached result
          const cached = await cache.getQuery(queryName, params)

          // Should match original result
          expect(cached).toEqual(result)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('invalidateQuery should remove all entries for a query', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // query name
        fc.integer({ min: 2, max: 10 }), // number of param variations
        async (queryName, numVariations) => {
          const cache = new QueryCacheManager({ ttl: 60000 })

          // Cache multiple variations of the same query
          for (let i = 0; i < numVariations; i++) {
            await cache.setQuery(queryName, { id: i }, { result: i })
          }

          // Also cache a different query
          await cache.setQuery('other-query', { id: 1 }, { result: 'other' })

          // Invalidate the first query
          const invalidated = await cache.invalidateQuery(queryName)

          // Should have invalidated all variations
          expect(invalidated).toBe(numVariations)

          // All variations should be gone
          for (let i = 0; i < numVariations; i++) {
            const cached = await cache.getQuery(queryName, { id: i })
            expect(cached).toBeNull()
          }

          // Other query should still exist
          const otherCached = await cache.getQuery('other-query', { id: 1 })
          expect(otherCached).toEqual({ result: 'other' })
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * withCache decorator tests
 */
describe('withCache decorator', () => {
  test('should cache function results', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // input
        async (input) => {
          const cache = new CacheManager({ ttl: 60000, maxSize: 100 })
          let callCount = 0

          // Original function that tracks calls
          const originalFn = async (arg: string) => {
            callCount++
            return `result-${arg}`
          }

          // Wrapped function with caching
          const cachedFn = withCache(originalFn, {
            cache,
            keyGenerator: (arg) => `fn:${arg}`,
          })

          // First call should execute function
          const result1 = await cachedFn(input)
          expect(result1).toBe(`result-${input}`)
          expect(callCount).toBe(1)

          // Second call should use cache
          const result2 = await cachedFn(input)
          expect(result2).toBe(`result-${input}`)
          expect(callCount).toBe(1) // Should not have called original function again
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * Cache configuration validation tests
 */
describe('Cache Configuration', () => {
  test('should throw error for invalid maxSize', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 0 }), // invalid maxSize
        (invalidMaxSize) => {
          expect(() => {
            new CacheManager({ maxSize: invalidMaxSize })
          }).toThrow('Cache maxSize must be greater than 0')
        }
      ),
      { numRuns: 100 }
    )
  })

  test('should throw error for negative TTL', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: -1 }), // negative TTL
        (negativeTtl) => {
          expect(() => {
            new CacheManager({ ttl: negativeTtl })
          }).toThrow('Cache TTL must be non-negative')
        }
      ),
      { numRuns: 100 }
    )
  })

  test('factory functions should create valid cache instances', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 100, max: 10000 }), // TTL
        fc.integer({ min: 10, max: 1000 }), // maxSize
        async (ttl, maxSize) => {
          const cache = createCacheManager({ ttl, maxSize })
          const queryCache = createQueryCacheManager({ ttl, maxSize })

          // Both should be functional
          await cache.set('test', 'value')
          expect(await cache.get('test')).toBe('value')

          await queryCache.setQuery('query', { id: 1 }, { result: 'data' })
          expect(await queryCache.getQuery('query', { id: 1 })).toEqual({ result: 'data' })
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * Cache statistics accuracy tests
 */
describe('Cache Statistics', () => {
  test('hit rate should be calculated correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 20 }), // number of hits
        fc.integer({ min: 1, max: 20 }), // number of misses
        async (numHits, numMisses) => {
          const cache = new CacheManager({ ttl: 60000, maxSize: 100 })

          // Set up keys for hits
          for (let i = 0; i < numHits; i++) {
            await cache.set(`hit-key-${i}`, `value-${i}`)
          }

          // Generate hits
          for (let i = 0; i < numHits; i++) {
            await cache.get(`hit-key-${i}`)
          }

          // Generate misses
          for (let i = 0; i < numMisses; i++) {
            await cache.get(`miss-key-${i}`)
          }

          const stats = cache.getStats()

          expect(stats.hits).toBe(numHits)
          expect(stats.misses).toBe(numMisses)

          const expectedHitRate = numHits / (numHits + numMisses)
          expect(stats.hitRate).toBeCloseTo(expectedHitRate, 5)
        }
      ),
      { numRuns: 100 }
    )
  })
})

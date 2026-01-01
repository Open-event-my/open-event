/**
 * Unit tests for Service Worker Caching Configuration
 *
 * Tests the caching strategy utilities and URL matching logic.
 * Requirements: 6.9
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  CACHE_NAMES,
  CACHE_CONFIGS,
  getAllCacheNames,
  wouldBeCached,
  formatBytes,
  clearRuntimeCaches,
  clearCache,
  getCacheStats,
} from './serviceWorkerCache'

describe('Service Worker Cache Configuration', () => {
  describe('CACHE_NAMES', () => {
    it('should define all required cache names', () => {
      expect(CACHE_NAMES.PRECACHE).toBe('workbox-precache-v2')
      expect(CACHE_NAMES.GOOGLE_FONTS_STYLESHEETS).toBe('google-fonts-stylesheets')
      expect(CACHE_NAMES.GOOGLE_FONTS_WEBFONTS).toBe('google-fonts-webfonts')
      expect(CACHE_NAMES.CDN).toBe('cdn-cache')
      expect(CACHE_NAMES.GITHUB_AVATARS).toBe('github-avatars-cache')
      expect(CACHE_NAMES.EXTERNAL_IMAGES).toBe('external-images-cache')
      expect(CACHE_NAMES.CONVEX_API).toBe('convex-api-cache')
      expect(CACHE_NAMES.LOCAL_ASSETS).toBe('local-assets-cache')
      expect(CACHE_NAMES.SAME_ORIGIN).toBe('same-origin-cache')
    })
  })

  describe('CACHE_CONFIGS', () => {
    it('should have valid configurations for all cache types', () => {
      const configs = Object.values(CACHE_CONFIGS)

      configs.forEach((config) => {
        expect(config.name).toBeDefined()
        expect(config.maxEntries).toBeGreaterThan(0)
        expect(config.maxAgeSeconds).toBeGreaterThan(0)
        expect(['CacheFirst', 'StaleWhileRevalidate', 'NetworkFirst', 'NetworkOnly']).toContain(
          config.strategy
        )
      })
    })

    it('should use CacheFirst for static assets', () => {
      expect(CACHE_CONFIGS.googleFontsStylesheets.strategy).toBe('CacheFirst')
      expect(CACHE_CONFIGS.googleFontsWebfonts.strategy).toBe('CacheFirst')
      expect(CACHE_CONFIGS.cdn.strategy).toBe('CacheFirst')
      expect(CACHE_CONFIGS.localAssets.strategy).toBe('CacheFirst')
    })

    it('should use NetworkFirst for API data', () => {
      expect(CACHE_CONFIGS.convexApi.strategy).toBe('NetworkFirst')
    })

    it('should use StaleWhileRevalidate for dynamic content', () => {
      expect(CACHE_CONFIGS.externalImages.strategy).toBe('StaleWhileRevalidate')
      expect(CACHE_CONFIGS.sameOrigin.strategy).toBe('StaleWhileRevalidate')
    })

    it('should have appropriate TTLs for different cache types', () => {
      // Fonts should have long TTL (1 year)
      expect(CACHE_CONFIGS.googleFontsStylesheets.maxAgeSeconds).toBe(60 * 60 * 24 * 365)
      expect(CACHE_CONFIGS.googleFontsWebfonts.maxAgeSeconds).toBe(60 * 60 * 24 * 365)

      // API data should have short TTL (5 minutes)
      expect(CACHE_CONFIGS.convexApi.maxAgeSeconds).toBe(60 * 5)

      // Images should have moderate TTL (14 days)
      expect(CACHE_CONFIGS.externalImages.maxAgeSeconds).toBe(60 * 60 * 24 * 14)
    })
  })

  describe('getAllCacheNames', () => {
    it('should return all cache names', () => {
      const names = getAllCacheNames()

      expect(names).toContain(CACHE_NAMES.PRECACHE)
      expect(names).toContain(CACHE_NAMES.GOOGLE_FONTS_STYLESHEETS)
      expect(names).toContain(CACHE_NAMES.CDN)
      expect(names).toContain(CACHE_NAMES.CONVEX_API)
      expect(names.length).toBe(Object.keys(CACHE_NAMES).length)
    })
  })

  describe('wouldBeCached', () => {
    it('should identify Google Fonts stylesheets as cached', () => {
      const result = wouldBeCached('https://fonts.googleapis.com/css2?family=Geist')

      expect(result.cached).toBe(true)
      expect(result.cacheName).toBe(CACHE_NAMES.GOOGLE_FONTS_STYLESHEETS)
      expect(result.strategy).toBe('CacheFirst')
    })

    it('should identify Google Fonts webfonts as cached', () => {
      const result = wouldBeCached('https://fonts.gstatic.com/s/geist/v1/font.woff2')

      expect(result.cached).toBe(true)
      expect(result.cacheName).toBe(CACHE_NAMES.GOOGLE_FONTS_WEBFONTS)
      expect(result.strategy).toBe('CacheFirst')
    })

    it('should identify CDN resources as cached', () => {
      const result = wouldBeCached('https://cdn.jsdelivr.net/npm/some-package@1.0.0/dist/index.js')

      expect(result.cached).toBe(true)
      expect(result.cacheName).toBe(CACHE_NAMES.CDN)
      expect(result.strategy).toBe('CacheFirst')
    })

    it('should identify GitHub avatars as cached', () => {
      const result = wouldBeCached('https://avatars.githubusercontent.com/u/12345')

      expect(result.cached).toBe(true)
      expect(result.cacheName).toBe(CACHE_NAMES.GITHUB_AVATARS)
      expect(result.strategy).toBe('CacheFirst')
    })

    it('should identify external images as cached with StaleWhileRevalidate', () => {
      const pngResult = wouldBeCached('https://example.com/image.png')
      expect(pngResult.cached).toBe(true)
      expect(pngResult.cacheName).toBe(CACHE_NAMES.EXTERNAL_IMAGES)
      expect(pngResult.strategy).toBe('StaleWhileRevalidate')

      const webpResult = wouldBeCached('https://example.com/photo.webp')
      expect(webpResult.cached).toBe(true)
      expect(webpResult.strategy).toBe('StaleWhileRevalidate')
    })

    it('should identify Convex API calls as cached with NetworkFirst', () => {
      const result = wouldBeCached('https://my-app.convex.cloud/api/query')

      expect(result.cached).toBe(true)
      expect(result.cacheName).toBe(CACHE_NAMES.CONVEX_API)
      expect(result.strategy).toBe('NetworkFirst')
    })

    it('should NOT cache Stripe API calls', () => {
      const result = wouldBeCached('https://api.stripe.com/v1/charges')

      expect(result.cached).toBe(false)
    })

    it('should NOT cache OpenAI API calls', () => {
      const result = wouldBeCached('https://api.openai.com/v1/chat/completions')

      expect(result.cached).toBe(false)
    })

    it('should identify local assets as cached', () => {
      const result = wouldBeCached('/assets/images/logo.png')

      expect(result.cached).toBe(true)
      expect(result.cacheName).toBe(CACHE_NAMES.LOCAL_ASSETS)
      expect(result.strategy).toBe('CacheFirst')
    })

    it('should identify same-origin requests as cached', () => {
      const result = wouldBeCached('/dashboard')

      expect(result.cached).toBe(true)
      expect(result.cacheName).toBe(CACHE_NAMES.SAME_ORIGIN)
      expect(result.strategy).toBe('StaleWhileRevalidate')
    })
  })

  describe('formatBytes', () => {
    it('should format 0 bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B')
    })

    it('should format bytes correctly', () => {
      expect(formatBytes(500)).toBe('500 B')
    })

    it('should format kilobytes correctly', () => {
      expect(formatBytes(1024)).toBe('1 KB')
      expect(formatBytes(1536)).toBe('1.5 KB')
    })

    it('should format megabytes correctly', () => {
      expect(formatBytes(1024 * 1024)).toBe('1 MB')
      expect(formatBytes(2.5 * 1024 * 1024)).toBe('2.5 MB')
    })

    it('should format gigabytes correctly', () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB')
    })
  })

  describe('Cache API operations', () => {
    const mockCaches = {
      keys: vi.fn(),
      delete: vi.fn(),
      open: vi.fn(),
    }

    beforeEach(() => {
      // Mock the caches API
      vi.stubGlobal('caches', mockCaches)
      mockCaches.keys.mockReset()
      mockCaches.delete.mockReset()
      mockCaches.open.mockReset()
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    describe('clearRuntimeCaches', () => {
      it('should clear all runtime caches but not precache', async () => {
        mockCaches.keys.mockResolvedValue([
          'workbox-precache-v2',
          'google-fonts-stylesheets',
          'cdn-cache',
          'convex-api-cache',
        ])
        mockCaches.delete.mockResolvedValue(true)

        await clearRuntimeCaches()

        // Should not delete precache
        expect(mockCaches.delete).not.toHaveBeenCalledWith('workbox-precache-v2')
        // Should delete runtime caches
        expect(mockCaches.delete).toHaveBeenCalledWith('google-fonts-stylesheets')
        expect(mockCaches.delete).toHaveBeenCalledWith('cdn-cache')
        expect(mockCaches.delete).toHaveBeenCalledWith('convex-api-cache')
      })

      it('should handle missing caches API gracefully', async () => {
        vi.stubGlobal('caches', undefined)

        // Should not throw
        await expect(clearRuntimeCaches()).resolves.toBeUndefined()
      })
    })

    describe('clearCache', () => {
      it('should clear a specific cache', async () => {
        mockCaches.delete.mockResolvedValue(true)

        const result = await clearCache(CACHE_NAMES.CDN)

        expect(mockCaches.delete).toHaveBeenCalledWith(CACHE_NAMES.CDN)
        expect(result).toBe(true)
      })

      it('should return false if cache does not exist', async () => {
        mockCaches.delete.mockResolvedValue(false)

        const result = await clearCache(CACHE_NAMES.CDN)

        expect(result).toBe(false)
      })

      it('should handle missing caches API gracefully', async () => {
        vi.stubGlobal('caches', undefined)

        const result = await clearCache(CACHE_NAMES.CDN)

        expect(result).toBe(false)
      })
    })

    describe('getCacheStats', () => {
      it('should return cache statistics', async () => {
        const mockCache = {
          keys: vi
            .fn()
            .mockResolvedValue([
              new Request('https://example.com/file1.js'),
              new Request('https://example.com/file2.js'),
            ]),
          match: vi.fn().mockResolvedValue({
            clone: () => ({
              blob: () => Promise.resolve(new Blob(['test content'], { type: 'text/plain' })),
            }),
          }),
        }

        mockCaches.keys.mockResolvedValue(['test-cache'])
        mockCaches.open.mockResolvedValue(mockCache)

        const stats = await getCacheStats()

        expect(stats.caches).toHaveLength(1)
        expect(stats.caches[0].name).toBe('test-cache')
        expect(stats.caches[0].entries).toBe(2)
        expect(stats.totalEntries).toBe(2)
      })

      it('should handle missing caches API gracefully', async () => {
        vi.stubGlobal('caches', undefined)

        const stats = await getCacheStats()

        expect(stats.caches).toEqual([])
        expect(stats.totalSize).toBe(0)
        expect(stats.totalEntries).toBe(0)
      })
    })
  })
})

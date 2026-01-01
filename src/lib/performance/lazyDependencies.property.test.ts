/**
 * Property-Based Tests for Lazy Loading Heavy Dependencies
 *
 * Property 25: Heavy Dependency Lazy Loading
 * Validates: Requirements 6.8
 *
 * Tests that heavy dependencies (tldraw, recharts, PDF libraries) are loaded
 * dynamically only when needed rather than in the initial bundle.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import {
  loadPDFModule,
  loadRechartsModule,
  loadTldrawModule,
  isModuleLoaded,
  clearModuleCache,
  getLazyLoadStats,
  preloadPDFModule,
  preloadRechartsModule,
  preloadTldrawModule,
  type LazyLoadResult,
  type PDFModule,
  type RechartsModule,
  type TldrawModule,
} from './lazyDependencies'

describe('Property 25: Heavy Dependency Lazy Loading', () => {
  beforeEach(() => {
    clearModuleCache()
  })

  describe('Module Loading Properties', () => {
    it('should not have modules loaded initially', () => {
      fc.assert(
        fc.property(fc.constantFrom('pdf', 'recharts', 'tldraw'), (moduleName) => {
          // After clearing cache, no modules should be loaded
          clearModuleCache()
          expect(isModuleLoaded(moduleName)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('should return consistent results for isModuleLoaded', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('pdf', 'recharts', 'tldraw'),
          fc.integer({ min: 1, max: 10 }),
          (moduleName, checkCount) => {
            clearModuleCache()

            // Multiple checks should return consistent results
            const results: boolean[] = []
            for (let i = 0; i < checkCount; i++) {
              results.push(isModuleLoaded(moduleName))
            }

            // All results should be the same (all false since not loaded)
            expect(new Set(results).size).toBe(1)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should track loading statistics correctly', () => {
      fc.assert(
        fc.property(fc.boolean(), () => {
          clearModuleCache()

          // Initially no stats
          const initialStats = getLazyLoadStats()
          expect(initialStats.length).toBe(0)

          return true
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('PDF Module Lazy Loading', () => {
    it('should load PDF module only when requested', async () => {
      await fc.assert(
        fc.asyncProperty(fc.boolean(), async () => {
          clearModuleCache()

          // Module should not be loaded initially
          expect(isModuleLoaded('pdf')).toBe(false)

          // Load the module
          const result = await loadPDFModule()

          // Module should now be loaded
          expect(isModuleLoaded('pdf')).toBe(true)
          expect(result.module).toBeDefined()
          expect(result.loadTime).toBeGreaterThanOrEqual(0)

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should return cached PDF module on subsequent loads', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 2, max: 5 }), async (loadCount) => {
          clearModuleCache()

          const results: LazyLoadResult<PDFModule>[] = []

          for (let i = 0; i < loadCount; i++) {
            results.push(await loadPDFModule())
          }

          // All results should reference the same module
          const firstModule = results[0].module
          for (const result of results) {
            expect(result.module).toBe(firstModule)
          }

          // Only one entry in stats
          const stats = getLazyLoadStats()
          const pdfStats = stats.filter((s) => s.moduleName === 'pdf')
          expect(pdfStats.length).toBe(1)

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should provide valid jsPDF constructor', async () => {
      await fc.assert(
        fc.asyncProperty(fc.boolean(), async () => {
          clearModuleCache()

          const { module } = await loadPDFModule()

          // jsPDF should be a constructor
          expect(typeof module.jsPDF).toBe('function')

          // autoTable should be a function
          expect(typeof module.autoTable).toBe('function')

          return true
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Recharts Module Lazy Loading', () => {
    it('should load Recharts module only when requested', async () => {
      await fc.assert(
        fc.asyncProperty(fc.boolean(), async () => {
          clearModuleCache()

          // Module should not be loaded initially
          expect(isModuleLoaded('recharts')).toBe(false)

          // Load the module
          const result = await loadRechartsModule()

          // Module should now be loaded
          expect(isModuleLoaded('recharts')).toBe(true)
          expect(result.module).toBeDefined()
          expect(result.loadTime).toBeGreaterThanOrEqual(0)

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should return cached Recharts module on subsequent loads', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 2, max: 5 }), async (loadCount) => {
          clearModuleCache()

          const results: LazyLoadResult<RechartsModule>[] = []

          for (let i = 0; i < loadCount; i++) {
            results.push(await loadRechartsModule())
          }

          // All results should reference the same module
          const firstModule = results[0].module
          for (const result of results) {
            expect(result.module).toBe(firstModule)
          }

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should provide all required Recharts components', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'LineChart',
            'Line',
            'BarChart',
            'Bar',
            'AreaChart',
            'Area',
            'PieChart',
            'Pie',
            'Cell',
            'XAxis',
            'YAxis',
            'CartesianGrid',
            'Tooltip',
            'Legend',
            'ResponsiveContainer'
          ),
          async (componentName) => {
            clearModuleCache()

            const { module } = await loadRechartsModule()

            // Component should exist
            expect(module[componentName as keyof RechartsModule]).toBeDefined()

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('tldraw Module Lazy Loading', () => {
    it('should load tldraw module only when requested', async () => {
      await fc.assert(
        fc.asyncProperty(fc.boolean(), async () => {
          clearModuleCache()

          // Module should not be loaded initially
          expect(isModuleLoaded('tldraw')).toBe(false)

          // Load the module
          const result = await loadTldrawModule()

          // Module should now be loaded
          expect(isModuleLoaded('tldraw')).toBe(true)
          expect(result.module).toBeDefined()
          expect(result.loadTime).toBeGreaterThanOrEqual(0)

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should return cached tldraw module on subsequent loads', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 2, max: 5 }), async (loadCount) => {
          clearModuleCache()

          const results: LazyLoadResult<TldrawModule>[] = []

          for (let i = 0; i < loadCount; i++) {
            results.push(await loadTldrawModule())
          }

          // All results should reference the same module
          const firstModule = results[0].module
          for (const result of results) {
            expect(result.module).toBe(firstModule)
          }

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should provide required tldraw exports', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'Tldraw',
            'createTLStore',
            'defaultShapeUtils',
            'ShapeUtil',
            'HTMLContainer',
            'Rectangle2d'
          ),
          async (exportName) => {
            clearModuleCache()

            const { module } = await loadTldrawModule()

            // Export should exist
            expect(module[exportName as keyof TldrawModule]).toBeDefined()

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Preload Functions', () => {
    it('should preload modules without throwing', () => {
      fc.assert(
        fc.property(fc.constantFrom('pdf', 'recharts', 'tldraw'), (moduleName) => {
          clearModuleCache()

          // Preload should not throw (fire-and-forget)
          if (moduleName === 'pdf') {
            expect(() => preloadPDFModule()).not.toThrow()
          } else if (moduleName === 'recharts') {
            expect(() => preloadRechartsModule()).not.toThrow()
          } else {
            expect(() => preloadTldrawModule()).not.toThrow()
          }

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should skip preload for already loaded modules', async () => {
      await fc.assert(
        fc.asyncProperty(fc.boolean(), async () => {
          clearModuleCache()

          // Load PDF module first
          await loadPDFModule()

          // Module should be loaded
          expect(isModuleLoaded('pdf')).toBe(true)

          // Preload should be a no-op (doesn't throw, doesn't change state)
          expect(() => preloadPDFModule()).not.toThrow()

          // Module should still be loaded
          expect(isModuleLoaded('pdf')).toBe(true)

          return true
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Load Time Tracking', () => {
    it('should track load time for each module', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constantFrom('pdf', 'recharts', 'tldraw'), async (moduleName) => {
          clearModuleCache()

          let result: LazyLoadResult<unknown>

          if (moduleName === 'pdf') {
            result = await loadPDFModule()
          } else if (moduleName === 'recharts') {
            result = await loadRechartsModule()
          } else {
            result = await loadTldrawModule()
          }

          // Load time should be tracked
          expect(result.loadTime).toBeGreaterThanOrEqual(0)

          // Stats should reflect the load
          const stats = getLazyLoadStats()
          const moduleStats = stats.find((s) => s.moduleName === moduleName)
          expect(moduleStats).toBeDefined()
          expect(moduleStats?.loaded).toBe(true)
          expect(moduleStats?.loadTime).toBeGreaterThanOrEqual(0)
          expect(moduleStats?.loadedAt).toBeGreaterThan(0)

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should return same load time for cached modules', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 2, max: 5 }), async (loadCount) => {
          clearModuleCache()

          const loadTimes: number[] = []

          for (let i = 0; i < loadCount; i++) {
            const result = await loadPDFModule()
            loadTimes.push(result.loadTime)
          }

          // All load times should be the same (from cache)
          expect(new Set(loadTimes).size).toBe(1)

          return true
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Concurrent Loading', () => {
    it('should handle concurrent load requests for same module', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 2, max: 10 }), async (concurrentCount) => {
          clearModuleCache()

          // Start multiple concurrent loads
          const promises = Array(concurrentCount)
            .fill(null)
            .map(() => loadPDFModule())

          const results = await Promise.all(promises)

          // All should return the same module
          const firstModule = results[0].module
          for (const result of results) {
            expect(result.module).toBe(firstModule)
          }

          // Only one entry in stats
          const stats = getLazyLoadStats()
          const pdfStats = stats.filter((s) => s.moduleName === 'pdf')
          expect(pdfStats.length).toBe(1)

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should handle concurrent loads of different modules', async () => {
      await fc.assert(
        fc.asyncProperty(fc.boolean(), async () => {
          clearModuleCache()

          // Load all modules concurrently
          const [pdfResult, rechartsResult, tldrawResult] = await Promise.all([
            loadPDFModule(),
            loadRechartsModule(),
            loadTldrawModule(),
          ])

          // All should be loaded
          expect(pdfResult.module).toBeDefined()
          expect(rechartsResult.module).toBeDefined()
          expect(tldrawResult.module).toBeDefined()

          // All should be tracked
          expect(isModuleLoaded('pdf')).toBe(true)
          expect(isModuleLoaded('recharts')).toBe(true)
          expect(isModuleLoaded('tldraw')).toBe(true)

          // Stats should have 3 entries
          const stats = getLazyLoadStats()
          expect(stats.length).toBe(3)

          return true
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Cache Clearing', () => {
    it('should properly clear module cache', async () => {
      await fc.assert(
        fc.asyncProperty(fc.boolean(), async () => {
          // Load a module
          await loadPDFModule()
          expect(isModuleLoaded('pdf')).toBe(true)

          // Clear cache
          clearModuleCache()

          // Module should no longer be loaded
          expect(isModuleLoaded('pdf')).toBe(false)
          expect(getLazyLoadStats().length).toBe(0)

          return true
        }),
        { numRuns: 100 }
      )
    })
  })
})

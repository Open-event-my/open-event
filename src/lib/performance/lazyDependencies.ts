/**
 * Lazy Loading for Heavy Dependencies
 *
 * Provides dynamic imports for heavy libraries to reduce initial bundle size.
 * Libraries are loaded on-demand when first needed.
 *
 * Requirements: 6.8
 */

// ============================================================================
// Types
// ============================================================================

export interface LazyLoadResult<T> {
  module: T
  loadTime: number
}

export interface LazyLoadStats {
  moduleName: string
  loaded: boolean
  loadTime: number | null
  loadedAt: number | null
}

export interface PDFModule {
  jsPDF: typeof import('jspdf').default
  autoTable: typeof import('jspdf-autotable').default
}

export interface RechartsModule {
  LineChart: typeof import('recharts').LineChart
  Line: typeof import('recharts').Line
  BarChart: typeof import('recharts').BarChart
  Bar: typeof import('recharts').Bar
  AreaChart: typeof import('recharts').AreaChart
  Area: typeof import('recharts').Area
  PieChart: typeof import('recharts').PieChart
  Pie: typeof import('recharts').Pie
  Cell: typeof import('recharts').Cell
  XAxis: typeof import('recharts').XAxis
  YAxis: typeof import('recharts').YAxis
  CartesianGrid: typeof import('recharts').CartesianGrid
  Tooltip: typeof import('recharts').Tooltip
  Legend: typeof import('recharts').Legend
  ResponsiveContainer: typeof import('recharts').ResponsiveContainer
}

// TldrawModule DISABLED - tldraw has React 18 compatibility issues
// export interface TldrawModule {
//   Tldraw: typeof import('tldraw').Tldraw
//   createTLStore: typeof import('tldraw').createTLStore
//   defaultShapeUtils: typeof import('tldraw').defaultShapeUtils
//   ShapeUtil: typeof import('tldraw').ShapeUtil
//   HTMLContainer: typeof import('tldraw').HTMLContainer
//   Rectangle2d: typeof import('tldraw').Rectangle2d
// }

// ============================================================================
// Module Cache
// ============================================================================

const moduleCache = new Map<string, unknown>()
const loadStats = new Map<string, LazyLoadStats>()

// Promise references for deduplication (prevents multiple concurrent loads)
let pdfPromise: Promise<PDFModule> | null = null
let rechartsPromise: Promise<RechartsModule> | null = null
// tldrawPromise DISABLED - tldraw has React 18 compatibility issues

/**
 * Get loading statistics for all lazy-loaded modules
 */
export function getLazyLoadStats(): LazyLoadStats[] {
  return Array.from(loadStats.values())
}

/**
 * Check if a module has been loaded
 */
export function isModuleLoaded(moduleName: string): boolean {
  return moduleCache.has(moduleName)
}

/**
 * Clear the module cache (useful for testing)
 */
export function clearModuleCache(): void {
  moduleCache.clear()
  loadStats.clear()
  pdfPromise = null
  rechartsPromise = null
}

// ============================================================================
// PDF Libraries (jsPDF + jspdf-autotable)
// ============================================================================

/**
 * Lazily load PDF generation libraries
 * Returns cached module if already loaded
 */
export async function loadPDFModule(): Promise<LazyLoadResult<PDFModule>> {
  const moduleName = 'pdf'

  // Return cached module
  if (moduleCache.has(moduleName)) {
    const stats = loadStats.get(moduleName)!
    return {
      module: moduleCache.get(moduleName) as PDFModule,
      loadTime: stats.loadTime ?? 0,
    }
  }

  // Reuse existing promise if loading is in progress
  if (!pdfPromise) {
    const startTime = performance.now()

    pdfPromise = Promise.all([import('jspdf'), import('jspdf-autotable')]).then(
      ([jspdfModule, autoTableModule]) => {
        const loadTime = performance.now() - startTime

        const module: PDFModule = {
          jsPDF: jspdfModule.default,
          autoTable: autoTableModule.default,
        }

        moduleCache.set(moduleName, module)
        loadStats.set(moduleName, {
          moduleName,
          loaded: true,
          loadTime,
          loadedAt: Date.now(),
        })

        return module
      }
    )
  }

  const module = await pdfPromise
  const stats = loadStats.get(moduleName)!

  return {
    module,
    loadTime: stats.loadTime ?? 0,
  }
}

// ============================================================================
// Recharts Library
// ============================================================================

/**
 * Lazily load Recharts library
 * Returns cached module if already loaded
 */
export async function loadRechartsModule(): Promise<LazyLoadResult<RechartsModule>> {
  const moduleName = 'recharts'

  // Return cached module
  if (moduleCache.has(moduleName)) {
    const stats = loadStats.get(moduleName)!
    return {
      module: moduleCache.get(moduleName) as RechartsModule,
      loadTime: stats.loadTime ?? 0,
    }
  }

  // Reuse existing promise if loading is in progress
  if (!rechartsPromise) {
    const startTime = performance.now()

    rechartsPromise = import('recharts').then((recharts) => {
      const loadTime = performance.now() - startTime

      const module: RechartsModule = {
        LineChart: recharts.LineChart,
        Line: recharts.Line,
        BarChart: recharts.BarChart,
        Bar: recharts.Bar,
        AreaChart: recharts.AreaChart,
        Area: recharts.Area,
        PieChart: recharts.PieChart,
        Pie: recharts.Pie,
        Cell: recharts.Cell,
        XAxis: recharts.XAxis,
        YAxis: recharts.YAxis,
        CartesianGrid: recharts.CartesianGrid,
        Tooltip: recharts.Tooltip,
        Legend: recharts.Legend,
        ResponsiveContainer: recharts.ResponsiveContainer,
      }

      moduleCache.set(moduleName, module)
      loadStats.set(moduleName, {
        moduleName,
        loaded: true,
        loadTime,
        loadedAt: Date.now(),
      })

      return module
    })
  }

  const module = await rechartsPromise
  const stats = loadStats.get(moduleName)!

  return {
    module,
    loadTime: stats.loadTime ?? 0,
  }
}

// ============================================================================
// tldraw Library - DISABLED due to React 18 compatibility issues
// ============================================================================

// loadTldrawModule removed - tldraw has React 18 compatibility issues

// ============================================================================
// Preload Functions (for anticipated usage)
// ============================================================================

/**
 * Preload PDF module in the background
 * Call this when user is likely to export soon
 */
export function preloadPDFModule(): void {
  if (!isModuleLoaded('pdf')) {
    loadPDFModule().catch(() => {
      // Silently fail preload - will retry on actual use
    })
  }
}

/**
 * Preload Recharts module in the background
 * Call this when user navigates to analytics pages
 */
export function preloadRechartsModule(): void {
  if (!isModuleLoaded('recharts')) {
    loadRechartsModule().catch(() => {
      // Silently fail preload - will retry on actual use
    })
  }
}

// preloadTldrawModule removed - tldraw has React 18 compatibility issues

/**
 * Configuration Health Check Utilities
 *
 * Provides functions to check the health of frontend and backend configuration.
 */

import { envValidator, type ConfigHealthStatus } from './envValidator'

/**
 * Backend configuration health response
 */
export interface BackendHealthResponse {
  healthy: boolean
  environment: string
  timestamp: number
  checks: Array<{
    name: string
    status: 'pass' | 'fail' | 'warn'
    message: string
    required: boolean
  }>
  summary: {
    total: number
    passed: number
    warnings: number
    failed: number
  }
}

/**
 * Combined health check result
 */
export interface CombinedHealthStatus {
  frontend: ConfigHealthStatus
  backend: BackendHealthResponse | null
  overall: {
    healthy: boolean
    timestamp: number
  }
}

/**
 * Check frontend configuration health
 */
export function checkFrontendHealth(): ConfigHealthStatus {
  return envValidator.healthCheck()
}

/**
 * Check backend configuration health via API
 *
 * @param convexUrl - The Convex deployment URL
 * @returns Backend health status or null if request fails
 */
export async function checkBackendHealth(
  convexUrl?: string
): Promise<BackendHealthResponse | null> {
  const baseUrl = convexUrl || import.meta.env.VITE_CONVEX_URL

  if (!baseUrl) {
    return null
  }

  // Convert Convex URL to HTTP API URL
  const httpUrl = baseUrl.replace('.convex.cloud', '.convex.site')

  try {
    const response = await fetch(`${httpUrl}/api/health/config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.warn('Backend health check failed:', response.status)
      return null
    }

    const data = await response.json()
    return data.data as BackendHealthResponse
  } catch (error) {
    console.warn('Backend health check error:', error)
    return null
  }
}

/**
 * Check both frontend and backend configuration health
 *
 * @param convexUrl - Optional Convex deployment URL
 * @returns Combined health status
 */
export async function checkCombinedHealth(convexUrl?: string): Promise<CombinedHealthStatus> {
  const frontend = checkFrontendHealth()
  const backend = await checkBackendHealth(convexUrl)

  const frontendHealthy = frontend.healthy
  const backendHealthy = backend?.healthy ?? true // Assume healthy if can't check

  return {
    frontend,
    backend,
    overall: {
      healthy: frontendHealthy && backendHealthy,
      timestamp: Date.now(),
    },
  }
}

/**
 * Format health status for display
 *
 * @param status - Health check status
 * @returns Formatted string for display
 */
export function formatHealthStatus(status: CombinedHealthStatus): string {
  const lines: string[] = []

  lines.push(`Overall Health: ${status.overall.healthy ? '✅ Healthy' : '❌ Unhealthy'}`)
  lines.push('')

  lines.push('Frontend Configuration:')
  status.frontend.checks.forEach((check) => {
    const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌'
    lines.push(`  ${icon} ${check.name}: ${check.message}`)
  })

  if (status.backend) {
    lines.push('')
    lines.push('Backend Configuration:')
    status.backend.checks.forEach((check) => {
      const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌'
      lines.push(`  ${icon} ${check.name}: ${check.message}`)
    })
  }

  return lines.join('\n')
}

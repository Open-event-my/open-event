/**
 * AI Resilience Service
 *
 * Provides resilience features for AI API calls including:
 * - Retry logic with exponential backoff
 * - Response caching
 * - Fallback mechanisms
 * - Request timeout enforcement
 * - Response validation
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.7, 10.8
 */

import type { AIMessage, AITool } from '../ai/types'
import { createAIProvider, isProviderAvailable } from '../ai/factory'
import type { ProviderType, ProviderCredentials } from '../ai/types'
import { CircuitBreaker, type CircuitBreakerStats } from './circuitBreaker'
import { logger } from '../monitoring/logger'
import { metricsCollector } from '../monitoring/metrics'

// ============================================================================
// Types
// ============================================================================

export interface AIConfig {
  provider: ProviderType
  model: string
  timeout: number
  maxRetries: number
}

export interface AIResponse {
  content: string
  provider: string
  cached: boolean
  tokensUsed?: number
  cost?: number
}

export interface CacheEntry {
  response: AIResponse
  timestamp: number
  expiresAt: number
}

export interface AIResilienceConfig {
  /**
   * Default timeout for AI requests in milliseconds
   * @default 30000 (30 seconds)
   */
  defaultTimeout: number

  /**
   * Maximum number of retry attempts
   * @default 5
   */
  maxRetries: number

  /**
   * Base delay for exponential backoff in milliseconds
   * @default 1000 (1 second)
   */
  baseDelay: number

  /**
   * Cache TTL in milliseconds
   * @default 3600000 (1 hour)
   */
  cacheTTL: number

  /**
   * Enable response caching
   * @default true
   */
  enableCaching: boolean

  /**
   * Enable fallback to alternative providers
   * @default true
   */
  enableFallback: boolean

  /**
   * Validate AI responses before returning
   * @default true
   */
  validateResponses: boolean
}

// ============================================================================
// AI Resilience Service
// ============================================================================

export class AIResilienceService {
  private cache: Map<string, CacheEntry> = new Map()
  private circuitBreakers: Map<string, CircuitBreaker> = new Map()
  private config: AIResilienceConfig
  private credentials: ProviderCredentials

  constructor(credentials: ProviderCredentials, config?: Partial<AIResilienceConfig>) {
    this.credentials = credentials
    this.config = {
      defaultTimeout: 30000,
      maxRetries: 5,
      baseDelay: 1000,
      cacheTTL: 3600000,
      enableCaching: true,
      enableFallback: true,
      validateResponses: true,
      ...config,
    }
  }

  /**
   * Get or create a circuit breaker for a provider
   */
  private getCircuitBreaker(provider: ProviderType): CircuitBreaker {
    if (!this.circuitBreakers.has(provider)) {
      this.circuitBreakers.set(
        provider,
        new CircuitBreaker({
          failureThreshold: 5,
          successThreshold: 2,
          timeout: 300000, // 5 minutes
          name: `AI-${provider}`,
        })
      )
    }
    return this.circuitBreakers.get(provider)!
  }

  /**
   * Generate cache key from prompt and config
   */
  private getCacheKey(prompt: string, config: AIConfig): string {
    return `${config.provider}:${config.model}:${prompt}`
  }

  /**
   * Get cached response if available and not expired
   */
  getCachedResponse(prompt: string, config: AIConfig): AIResponse | null {
    if (!this.config.enableCaching) {
      return null
    }

    const key = this.getCacheKey(prompt, config)
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // Check if cache entry is expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    logger.debug('AI response cache hit', {
      provider: config.provider,
      model: config.model,
      promptLength: prompt.length,
    })

    metricsCollector.recordCounter('ai.cache.hit', 1, {
      provider: config.provider,
      model: config.model,
    })

    return entry.response
  }

  /**
   * Cache an AI response
   */
  cacheResponse(prompt: string, config: AIConfig, response: AIResponse): void {
    if (!this.config.enableCaching) {
      return
    }

    const key = this.getCacheKey(prompt, config)
    const entry: CacheEntry = {
      response,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.config.cacheTTL,
    }

    this.cache.set(key, entry)

    logger.debug('AI response cached', {
      provider: config.provider,
      model: config.model,
      promptLength: prompt.length,
      ttl: this.config.cacheTTL,
    })

    metricsCollector.recordCounter('ai.cache.set', 1, {
      provider: config.provider,
      model: config.model,
    })
  }

  /**
   * Validate AI response for completeness and safety
   */
  private validateResponse(response: string): boolean {
    if (!this.config.validateResponses) {
      return true
    }

    // Check if response is empty or too short
    if (!response || response.trim().length < 1) {
      logger.warn('AI response validation failed: empty response')
      return false
    }

    // Check for common error patterns
    const errorPatterns = [/error/i, /failed/i, /unable to/i, /cannot process/i]

    const lowerResponse = response.toLowerCase()
    const hasErrorPattern = errorPatterns.some((pattern) => pattern.test(lowerResponse))

    if (hasErrorPattern && response.length < 100) {
      logger.warn('AI response validation failed: error pattern detected', {
        responseLength: response.length,
      })
      return false
    }

    return true
  }

  /**
   * Execute AI request with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`AI request timeout after ${timeout}ms`))
        }, timeout)
      }),
    ])
  }

  /**
   * Retry a function with exponential backoff
   */
  async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = this.config.maxRetries
  ): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error

        // Don't retry on non-transient errors
        if (!this.isTransientError(error)) {
          throw error
        }

        // Don't retry on last attempt
        if (attempt === maxRetries - 1) {
          break
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.config.baseDelay * Math.pow(2, attempt)
        const jitter = Math.random() * 1000
        const totalDelay = delay + jitter

        logger.info('Retrying AI request', {
          attempt: attempt + 1,
          maxRetries,
          delay: totalDelay,
          error: lastError.message,
        })

        metricsCollector.recordCounter('ai.retry', 1, {
          attempt: String(attempt + 1),
        })

        await this.sleep(totalDelay)
      }
    }

    throw lastError || new Error('Max retries exceeded')
  }

  /**
   * Check if an error is transient (should be retried)
   */
  private isTransientError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false
    }

    const message = error.message.toLowerCase()
    const transientPatterns = [
      'timeout',
      'network',
      'econnreset',
      'enotfound',
      'rate limit',
      '429',
      '500',
      '502',
      '503',
      '504',
    ]

    return transientPatterns.some((pattern) => message.includes(pattern))
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Get fallback providers in priority order
   */
  private getFallbackProviders(primaryProvider: ProviderType): ProviderType[] {
    const allProviders: ProviderType[] = ['openai', 'anthropic', 'groq']
    const availableProviders = allProviders.filter(
      (p) => p !== primaryProvider && isProviderAvailable(p, this.credentials)
    )

    return availableProviders
  }

  /**
   * Call AI with fallback to alternative providers
   */
  async callWithFallback(
    messages: AIMessage[],
    tools: AITool[],
    config: AIConfig
  ): Promise<AIResponse> {
    const prompt = messages.map((m) => m.content).join('\n')

    // Check cache first
    const cachedResponse = this.getCachedResponse(prompt, config)
    if (cachedResponse) {
      return cachedResponse
    }

    // Try primary provider
    try {
      const response = await this.callProvider(config.provider, messages, tools, config)

      // Cache successful response
      this.cacheResponse(prompt, config, response)

      return response
    } catch (primaryError) {
      logger.error('Primary AI provider failed', primaryError, {
        provider: config.provider,
        model: config.model,
      })

      metricsCollector.recordCounter('ai.provider.failure', 1, {
        provider: config.provider,
        model: config.model,
      })

      // Try fallback providers if enabled
      if (this.config.enableFallback) {
        const fallbackProviders = this.getFallbackProviders(config.provider)

        for (const fallbackProvider of fallbackProviders) {
          try {
            logger.info('Attempting fallback provider', {
              primary: config.provider,
              fallback: fallbackProvider,
            })

            const response = await this.callProvider(fallbackProvider, messages, tools, {
              ...config,
              provider: fallbackProvider,
            })

            metricsCollector.recordCounter('ai.fallback.success', 1, {
              primary: config.provider,
              fallback: fallbackProvider,
            })

            // Cache successful fallback response
            this.cacheResponse(prompt, config, response)

            return response
          } catch (fallbackError) {
            logger.error('Fallback provider failed', fallbackError, {
              provider: fallbackProvider,
            })

            metricsCollector.recordCounter('ai.fallback.failure', 1, {
              primary: config.provider,
              fallback: fallbackProvider,
            })
          }
        }
      }

      // All providers failed, return graceful degradation message
      logger.error('All AI providers failed', primaryError)

      return {
        content:
          "I apologize, but I'm currently unable to process your request due to technical difficulties. Please try again in a few moments.",
        provider: 'fallback',
        cached: false,
      }
    }
  }

  /**
   * Call a specific AI provider with resilience features
   */
  private async callProvider(
    provider: ProviderType,
    messages: AIMessage[],
    tools: AITool[],
    config: AIConfig
  ): Promise<AIResponse> {
    const circuitBreaker = this.getCircuitBreaker(provider)
    const startTime = Date.now()

    try {
      // Execute with circuit breaker protection
      const result = await circuitBreaker.execute(async () => {
        // Execute with retry and timeout
        return await this.retryWithBackoff(async () => {
          return await this.executeWithTimeout(async () => {
            // Create provider instance
            const aiProvider = createAIProvider(provider, this.credentials)

            // Call AI provider
            const stream = await aiProvider.createStreamingChat(messages, tools, {
              model: config.model,
              temperature: 0.7,
              maxTokens: 1500,
              toolChoice: 'auto',
            })

            // Collect streaming response
            let content = ''
            for await (const chunk of stream) {
              if (chunk.type === 'text' && chunk.content) {
                content += chunk.content
              }
            }

            // Validate response
            if (!this.validateResponse(content)) {
              throw new Error('AI response validation failed')
            }

            return content
          }, config.timeout)
        }, config.maxRetries)
      })

      const duration = Date.now() - startTime

      // Record metrics
      metricsCollector.recordTiming('ai.request.duration', duration, {
        provider,
        model: config.model,
        status: 'success',
      })

      logger.info('AI request successful', {
        provider,
        model: config.model,
        duration,
        responseLength: result.length,
      })

      return {
        content: result,
        provider,
        cached: false,
      }
    } catch (error) {
      const duration = Date.now() - startTime

      // Record error metrics
      metricsCollector.recordTiming('ai.request.duration', duration, {
        provider,
        model: config.model,
        status: 'error',
      })

      logger.error('AI request failed', error, {
        provider,
        model: config.model,
        duration,
      })

      throw error
    }
  }

  /**
   * Clear the response cache
   */
  clearCache(): void {
    this.cache.clear()
    logger.info('AI response cache cleared')
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number
    entries: Array<{ key: string; timestamp: number; expiresAt: number }>
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      timestamp: entry.timestamp,
      expiresAt: entry.expiresAt,
    }))

    return {
      size: this.cache.size,
      entries,
    }
  }

  /**
   * Get circuit breaker statistics for all providers
   */
  getCircuitBreakerStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {}

    for (const [provider, breaker] of this.circuitBreakers.entries()) {
      stats[provider] = breaker.getStats()
    }

    return stats
  }

  /**
   * Reset all circuit breakers
   */
  resetCircuitBreakers(): void {
    for (const breaker of this.circuitBreakers.values()) {
      breaker.reset()
    }
    logger.info('All AI circuit breakers reset')
  }
}

/**
 * Create an AI resilience service with default configuration
 */
export function createAIResilienceService(
  credentials: ProviderCredentials,
  config?: Partial<AIResilienceConfig>
): AIResilienceService {
  return new AIResilienceService(credentials, config)
}

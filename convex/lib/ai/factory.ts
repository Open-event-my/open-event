/**
 * AI Provider Factory
 *
 * Creates AI provider instances based on the requested type.
 * Supports OpenAI, with planned support for Anthropic and Groq.
 */

import { OpenAIProvider } from './providers/openai'
import { AnthropicProvider } from './providers/anthropic'
import type { AIProvider, ProviderType, ProviderCredentials } from './types'

/**
 * Create an AI provider instance.
 *
 * @param type - The provider type (openai, anthropic, groq)
 * @param credentials - API credentials for the providers
 * @returns An AIProvider instance
 *
 * @example
 * const provider = createAIProvider('openai', {
 *   openai: process.env.OPENAI_API_KEY,
 * })
 */
export function createAIProvider(type: ProviderType, credentials: ProviderCredentials): AIProvider {
  switch (type) {
    case 'openai': {
      if (!credentials.openai) {
        throw new Error('OpenAI API key is required')
      }
      return new OpenAIProvider(credentials.openai)
    }

    case 'anthropic': {
      if (!credentials.anthropic) {
        throw new Error('Anthropic API key is required')
      }
      return new AnthropicProvider(credentials.anthropic)
    }

    case 'groq': {
      // TODO: Implement Groq provider
      throw new Error('Groq provider not yet implemented. Coming soon!')
    }

    default: {
      const _exhaustive: never = type
      throw new Error(`Unknown provider type: ${_exhaustive}`)
    }
  }
}

/**
 * Check if a provider is available (has credentials).
 */
export function isProviderAvailable(type: ProviderType, credentials: ProviderCredentials): boolean {
  switch (type) {
    case 'openai':
      return !!credentials.openai
    case 'anthropic':
      return !!credentials.anthropic
    case 'groq':
      return !!credentials.groq
    default:
      return false
  }
}

/**
 * Get the default provider based on available credentials.
 * Priority: OpenAI > Anthropic > Groq
 */
export function getDefaultProvider(credentials: ProviderCredentials): ProviderType | null {
  if (credentials.openai) return 'openai'
  if (credentials.anthropic) return 'anthropic'
  if (credentials.groq) return 'groq'
  return null
}

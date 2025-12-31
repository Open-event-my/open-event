/**
 * AI Provider Factory Tests
 *
 * Tests for multi-provider support including:
 * - Provider creation
 * - Provider switching
 * - Provider availability checking
 * - Default provider selection
 *
 * Requirements: 10.10
 */

import { describe, it, expect } from 'vitest'
import {
  createAIProvider,
  isProviderAvailable,
  getDefaultProvider,
} from './factory'
import { OpenAIProvider } from './providers/openai'
import { AnthropicProvider } from './providers/anthropic'
import type { ProviderCredentials } from './types'

describe('AI Provider Factory', () => {
  describe('createAIProvider', () => {
    it('should create OpenAI provider with valid credentials', () => {
      const credentials: ProviderCredentials = {
        openai: 'test-openai-key',
      }

      const provider = createAIProvider('openai', credentials)

      expect(provider).toBeInstanceOf(OpenAIProvider)
      expect(provider.name).toBe('openai')
    })

    it('should create Anthropic provider with valid credentials', () => {
      const credentials: ProviderCredentials = {
        anthropic: 'test-anthropic-key',
      }

      const provider = createAIProvider('anthropic', credentials)

      expect(provider).toBeInstanceOf(AnthropicProvider)
      expect(provider.name).toBe('anthropic')
    })

    it('should throw error when OpenAI credentials are missing', () => {
      const credentials: ProviderCredentials = {}

      expect(() => createAIProvider('openai', credentials)).toThrow(
        'OpenAI API key is required'
      )
    })

    it('should throw error when Anthropic credentials are missing', () => {
      const credentials: ProviderCredentials = {}

      expect(() => createAIProvider('anthropic', credentials)).toThrow(
        'Anthropic API key is required'
      )
    })

    it('should throw error for Groq provider (not yet implemented)', () => {
      const credentials: ProviderCredentials = {
        groq: 'test-groq-key',
      }

      expect(() => createAIProvider('groq', credentials)).toThrow(
        'Groq provider not yet implemented'
      )
    })
  })

  describe('isProviderAvailable', () => {
    it('should return true when OpenAI credentials are present', () => {
      const credentials: ProviderCredentials = {
        openai: 'test-openai-key',
      }

      expect(isProviderAvailable('openai', credentials)).toBe(true)
    })

    it('should return true when Anthropic credentials are present', () => {
      const credentials: ProviderCredentials = {
        anthropic: 'test-anthropic-key',
      }

      expect(isProviderAvailable('anthropic', credentials)).toBe(true)
    })

    it('should return false when credentials are missing', () => {
      const credentials: ProviderCredentials = {}

      expect(isProviderAvailable('openai', credentials)).toBe(false)
      expect(isProviderAvailable('anthropic', credentials)).toBe(false)
      expect(isProviderAvailable('groq', credentials)).toBe(false)
    })

    it('should return false when credentials are empty string', () => {
      const credentials: ProviderCredentials = {
        openai: '',
        anthropic: '',
      }

      expect(isProviderAvailable('openai', credentials)).toBe(false)
      expect(isProviderAvailable('anthropic', credentials)).toBe(false)
    })
  })

  describe('getDefaultProvider', () => {
    it('should return openai as default when available', () => {
      const credentials: ProviderCredentials = {
        openai: 'test-openai-key',
        anthropic: 'test-anthropic-key',
      }

      expect(getDefaultProvider(credentials)).toBe('openai')
    })

    it('should return anthropic when openai is not available', () => {
      const credentials: ProviderCredentials = {
        anthropic: 'test-anthropic-key',
      }

      expect(getDefaultProvider(credentials)).toBe('anthropic')
    })

    it('should return groq when only groq is available', () => {
      const credentials: ProviderCredentials = {
        groq: 'test-groq-key',
      }

      expect(getDefaultProvider(credentials)).toBe('groq')
    })

    it('should return null when no credentials are available', () => {
      const credentials: ProviderCredentials = {}

      expect(getDefaultProvider(credentials)).toBe(null)
    })

    it('should prioritize openai over anthropic and groq', () => {
      const credentials: ProviderCredentials = {
        openai: 'test-openai-key',
        anthropic: 'test-anthropic-key',
        groq: 'test-groq-key',
      }

      expect(getDefaultProvider(credentials)).toBe('openai')
    })

    it('should prioritize anthropic over groq when openai is missing', () => {
      const credentials: ProviderCredentials = {
        anthropic: 'test-anthropic-key',
        groq: 'test-groq-key',
      }

      expect(getDefaultProvider(credentials)).toBe('anthropic')
    })
  })

  describe('Provider Switching', () => {
    it('should switch between OpenAI and Anthropic providers', () => {
      const credentials: ProviderCredentials = {
        openai: 'test-openai-key',
        anthropic: 'test-anthropic-key',
      }

      // Create OpenAI provider
      const openaiProvider = createAIProvider('openai', credentials)
      expect(openaiProvider.name).toBe('openai')

      // Switch to Anthropic provider
      const anthropicProvider = createAIProvider('anthropic', credentials)
      expect(anthropicProvider.name).toBe('anthropic')

      // Verify they are different instances
      expect(openaiProvider).not.toBe(anthropicProvider)
    })

    it('should create new provider instances on each call', () => {
      const credentials: ProviderCredentials = {
        openai: 'test-openai-key',
      }

      const provider1 = createAIProvider('openai', credentials)
      const provider2 = createAIProvider('openai', credentials)

      // Should be different instances
      expect(provider1).not.toBe(provider2)
      // But same type
      expect(provider1.name).toBe(provider2.name)
    })

    it('should handle switching with partial credentials', () => {
      // Start with only OpenAI
      const credentials1: ProviderCredentials = {
        openai: 'test-openai-key',
      }

      const provider1 = createAIProvider('openai', credentials1)
      expect(provider1.name).toBe('openai')

      // Add Anthropic credentials
      const credentials2: ProviderCredentials = {
        openai: 'test-openai-key',
        anthropic: 'test-anthropic-key',
      }

      const provider2 = createAIProvider('anthropic', credentials2)
      expect(provider2.name).toBe('anthropic')
    })
  })

  describe('Provider Interface Compliance', () => {
    it('should ensure all providers implement the AIProvider interface', () => {
      const credentials: ProviderCredentials = {
        openai: 'test-openai-key',
        anthropic: 'test-anthropic-key',
      }

      const openaiProvider = createAIProvider('openai', credentials)
      const anthropicProvider = createAIProvider('anthropic', credentials)

      // Check that both providers have the required properties
      expect(openaiProvider).toHaveProperty('name')
      expect(openaiProvider).toHaveProperty('createStreamingChat')
      expect(typeof openaiProvider.createStreamingChat).toBe('function')

      expect(anthropicProvider).toHaveProperty('name')
      expect(anthropicProvider).toHaveProperty('createStreamingChat')
      expect(typeof anthropicProvider.createStreamingChat).toBe('function')
    })
  })
})

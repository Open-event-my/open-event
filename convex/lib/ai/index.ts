/**
 * AI Provider Module
 *
 * Exports all AI provider types, factories, and implementations.
 *
 * @example
 * import { createAIProvider, DEFAULT_CONFIGS } from './lib/ai'
 *
 * const provider = createAIProvider('openai', {
 *   openai: process.env.OPENAI_API_KEY,
 * })
 *
 * const stream = await provider.createStreamingChat(
 *   messages,
 *   tools,
 *   DEFAULT_CONFIGS.openai
 * )
 */

// Types
export type {
  AIMessageRole,
  AIMessage,
  AIToolCall,
  AIStreamChunkType,
  AIStreamChunk,
  AITool,
  AIProviderConfig,
  AIProvider,
  ProviderType,
  ProviderCredentials,
} from './types'

export { DEFAULT_CONFIGS } from './types'

// Factory
export { createAIProvider, isProviderAvailable, getDefaultProvider } from './factory'

// Providers
export { OpenAIProvider } from './providers/openai'
export { AnthropicProvider } from './providers/anthropic'

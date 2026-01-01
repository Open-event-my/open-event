/**
 * OpenAI Provider Implementation
 *
 * Implements the AIProvider interface for OpenAI's API.
 * Includes retry logic with exponential backoff.
 */

import OpenAI from 'openai'
import type { AIProvider, AIMessage, AITool, AIProviderConfig, AIStreamChunk } from '../types'

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai'
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true, // Allow in test/development environments
    })
  }

  /**
   * Create a streaming chat completion with retry logic.
   */
  async createStreamingChat(
    messages: AIMessage[],
    tools: AITool[],
    config: AIProviderConfig
  ): Promise<AsyncIterable<AIStreamChunk>> {
    const stream = await this.createWithRetry(messages, tools, config)
    return this.transformStream(stream)
  }

  /**
   * Transform OpenAI's stream format to our common AIStreamChunk format.
   */
  private async *transformStream(
    stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>
  ): AsyncIterable<AIStreamChunk> {
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta
      const finishReason = chunk.choices[0]?.finish_reason

      // Stream text content
      if (delta?.content) {
        yield {
          type: 'text',
          content: delta.content,
        }
      }

      // Stream tool calls
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          // First chunk for a tool call (has id and name)
          if (tc.id) {
            yield {
              type: 'tool_call_start',
              toolCall: {
                index: tc.index,
                id: tc.id,
                type: 'function',
                function: {
                  name: tc.function?.name || '',
                  arguments: tc.function?.arguments || '',
                },
              },
            }
          } else if (tc.function?.arguments) {
            // Subsequent chunks (arguments delta)
            yield {
              type: 'tool_call_delta',
              toolCall: {
                index: tc.index,
                function: {
                  name: '',
                  arguments: tc.function.arguments,
                },
              },
            }
          }
        }
      }

      // Handle completion
      if (finishReason) {
        yield {
          type: 'done',
          finishReason: finishReason as AIStreamChunk['finishReason'],
        }
      }
    }
  }

  /**
   * Create OpenAI completion with retry logic and exponential backoff.
   */
  private async createWithRetry(
    messages: AIMessage[],
    tools: AITool[],
    config: AIProviderConfig,
    maxRetries = 3
  ): Promise<AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const openaiMessages = this.convertMessages(messages)
        const openaiTools = this.convertTools(tools)

        return await this.client.chat.completions.create({
          model: config.model,
          messages: openaiMessages,
          tools: openaiTools.length > 0 ? openaiTools : undefined,
          tool_choice: openaiTools.length > 0 ? (config.toolChoice ?? 'auto') : undefined,
          temperature: config.temperature ?? 0.7,
          max_tokens: config.maxTokens ?? 1500,
          stream: true,
        })
      } catch (error) {
        lastError = error as Error

        // Don't retry on auth errors
        if (error instanceof OpenAI.APIError) {
          if (error.status === 401 || error.status === 403) {
            throw new Error('AI service authentication failed. Please check configuration.')
          }
          if (error.status === 429) {
            // Rate limit - wait longer
            const waitTime = Math.pow(2, attempt) * 2000
            await new Promise((r) => setTimeout(r, waitTime))
            continue
          }
        }

        // For other errors, exponential backoff
        if (attempt < maxRetries - 1) {
          const waitTime = Math.pow(2, attempt) * 1000
          await new Promise((r) => setTimeout(r, waitTime))
        }
      }
    }

    throw lastError || new Error('OpenAI API call failed after retries')
  }

  /**
   * Convert our message format to OpenAI's format.
   */
  private convertMessages(messages: AIMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
    return messages.map((msg) => {
      if (msg.role === 'tool') {
        return {
          role: 'tool' as const,
          content: msg.content,
          tool_call_id: msg.toolCallId || '',
        }
      }

      if (msg.role === 'assistant' && msg.toolCalls) {
        return {
          role: 'assistant' as const,
          content: msg.content,
          tool_calls: msg.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: tc.function,
          })),
        }
      }

      return {
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content,
      }
    })
  }

  /**
   * Convert our tool format to OpenAI's format.
   */
  private convertTools(tools: AITool[]): OpenAI.Chat.ChatCompletionTool[] {
    return tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters,
      },
    }))
  }
}

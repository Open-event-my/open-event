/**
 * Anthropic Provider Implementation
 *
 * Implements the AIProvider interface for Anthropic's Claude API.
 * Includes retry logic with exponential backoff.
 */

import type { AIProvider, AIMessage, AITool, AIProviderConfig, AIStreamChunk } from '../types'

// Anthropic API types (simplified - in production, use @anthropic-ai/sdk)
interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string | Array<{ type: string; text?: string; tool_use_id?: string; content?: string }>
}

interface AnthropicTool {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

interface AnthropicStreamEvent {
  type: string
  delta?: {
    type: string
    text?: string
  }
  content_block?: {
    type: string
    id?: string
    name?: string
    input?: string
  }
  index?: number
  message?: {
    stop_reason?: string
  }
}

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic'
  private apiKey: string
  private baseURL = 'https://api.anthropic.com/v1'

  constructor(apiKey: string) {
    this.apiKey = apiKey
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
   * Transform Anthropic's stream format to our common AIStreamChunk format.
   */
  private async *transformStream(
    stream: AsyncIterable<AnthropicStreamEvent>
  ): AsyncIterable<AIStreamChunk> {
    const toolCalls: Map<number, { id: string; name: string; arguments: string }> = new Map()

    for await (const event of stream) {
      // Handle text content
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        yield {
          type: 'text',
          content: event.delta.text || '',
        }
      }

      // Handle tool use start
      if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
        const index = event.index ?? 0
        const id = event.content_block.id || `tool_${index}`
        const name = event.content_block.name || ''

        toolCalls.set(index, { id, name, arguments: '' })

        yield {
          type: 'tool_call_start',
          toolCall: {
            index,
            id,
            type: 'function',
            function: {
              name,
              arguments: '',
            },
          },
        }
      }

      // Handle tool use delta (arguments)
      if (event.type === 'content_block_delta' && event.delta?.type === 'input_json_delta') {
        const index = event.index ?? 0
        const toolCall = toolCalls.get(index)

        if (toolCall && event.content_block?.input) {
          toolCall.arguments += event.content_block.input

          yield {
            type: 'tool_call_delta',
            toolCall: {
              index,
              function: {
                name: '',
                arguments: event.content_block.input,
              },
            },
          }
        }
      }

      // Handle completion
      if (event.type === 'message_delta' && event.message?.stop_reason) {
        const stopReason = event.message.stop_reason
        let finishReason: AIStreamChunk['finishReason'] = 'stop'

        if (stopReason === 'tool_use') {
          finishReason = 'tool_calls'
        } else if (stopReason === 'max_tokens') {
          finishReason = 'length'
        }

        yield {
          type: 'done',
          finishReason,
        }
      }
    }
  }

  /**
   * Create Anthropic completion with retry logic and exponential backoff.
   */
  private async createWithRetry(
    messages: AIMessage[],
    tools: AITool[],
    config: AIProviderConfig,
    maxRetries = 3
  ): Promise<AsyncIterable<AnthropicStreamEvent>> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const anthropicMessages = this.convertMessages(messages)
        const anthropicTools = this.convertTools(tools)

        // Extract system message if present
        const systemMessage = messages.find((m) => m.role === 'system')?.content

        const requestBody = {
          model: config.model,
          messages: anthropicMessages,
          max_tokens: config.maxTokens ?? 1500,
          temperature: config.temperature ?? 0.7,
          stream: true,
          ...(systemMessage && { system: systemMessage }),
          ...(anthropicTools.length > 0 && { tools: anthropicTools }),
        }

        const response = await fetch(`${this.baseURL}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          await response.json().catch(() => ({}))
          const error = new Error(`Anthropic API error: ${response.status} ${response.statusText}`)

          // Don't retry on auth errors
          if (response.status === 401 || response.status === 403) {
            throw new Error('AI service authentication failed. Please check configuration.')
          }

          // Rate limit - wait longer
          if (response.status === 429) {
            const waitTime = Math.pow(2, attempt) * 2000
            await new Promise((r) => setTimeout(r, waitTime))
            continue
          }

          throw error
        }

        return this.parseSSEStream(response.body!)
      } catch (error) {
        lastError = error as Error

        // For other errors, exponential backoff
        if (attempt < maxRetries - 1) {
          const waitTime = Math.pow(2, attempt) * 1000
          await new Promise((r) => setTimeout(r, waitTime))
        }
      }
    }

    throw lastError || new Error('Anthropic API call failed after retries')
  }

  /**
   * Parse Server-Sent Events stream from Anthropic API
   */
  private async *parseSSEStream(
    body: ReadableStream<Uint8Array>
  ): AsyncIterable<AnthropicStreamEvent> {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue

            try {
              const event = JSON.parse(data) as AnthropicStreamEvent
              yield event
            } catch {
              // Skip invalid JSON
              continue
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * Convert our message format to Anthropic's format.
   */
  private convertMessages(messages: AIMessage[]): AnthropicMessage[] {
    // Filter out system messages (handled separately)
    const nonSystemMessages = messages.filter((m) => m.role !== 'system')

    return nonSystemMessages.map((msg) => {
      if (msg.role === 'tool') {
        return {
          role: 'user' as const,
          content: [
            {
              type: 'tool_result',
              tool_use_id: msg.toolCallId || '',
              content: msg.content,
            },
          ],
        }
      }

      if (msg.role === 'assistant' && msg.toolCalls) {
        const content: Array<{
          type: string
          text?: string
          id?: string
          name?: string
          input?: Record<string, unknown>
        }> = []

        // Add text content if present
        if (msg.content) {
          content.push({
            type: 'text',
            text: msg.content,
          })
        }

        // Add tool calls
        for (const tc of msg.toolCalls) {
          content.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.function.name,
            input: JSON.parse(tc.function.arguments),
          })
        }

        return {
          role: 'assistant' as const,
          content,
        }
      }

      return {
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }
    })
  }

  /**
   * Convert our tool format to Anthropic's format.
   */
  private convertTools(tools: AITool[]): AnthropicTool[] {
    return tools.map((tool) => ({
      name: tool.function.name,
      description: tool.function.description,
      input_schema: tool.function.parameters,
    }))
  }
}

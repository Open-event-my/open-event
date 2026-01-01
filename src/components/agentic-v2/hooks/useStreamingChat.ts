import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { ChatMessage, ToolCall, ToolResult, ToolStatus } from '../types'
import { toolDisplayNames } from '../types'

// ============================================================================
// Types
// ============================================================================

interface UseStreamingChatParams {
  authToken: string | null
  convexUrl: string
  confirmedToolCalls: string[]
  onComplete?: (entityId: string) => void
}

interface StreamingCallbacks {
  onPrepare: () => void
  onAddMessage: (message: ChatMessage) => void
  onUpdateMessage: (id: string, content: string) => void
  onSetStreaming: (isStreaming: boolean) => void
  onSetActivity: (activity: string | null) => void
  onAddExecutingTool: (tool: { id: string; name: string; status: ToolStatus }) => void
  onUpdateToolStatus: (id: string, status: ToolStatus) => void
  onAddToolResult: (result: ToolResult) => void
  onSetPendingConfirmation: (confirmation: ToolCall | null) => void
  onSetComplete: (isComplete: boolean) => void
  onSetLoading: (isLoading: boolean) => void
  onFinish: () => void
  onSetLocalRemaining: (remaining: number) => void
}

// ============================================================================
// Hook
// ============================================================================

export function useStreamingChat({
  authToken,
  convexUrl,
  confirmedToolCalls,
  onComplete,
}: UseStreamingChatParams) {
  const navigate = useNavigate()

  const sendMessage = useCallback(
    async (
      userMessage: string,
      messages: ChatMessage[],
      abortController: AbortController,
      callbacks: StreamingCallbacks
    ) => {
      if (!authToken || !userMessage.trim()) return

      callbacks.onPrepare()

      const userMsgId = `user-${Date.now()}`
      const newUserMessage: ChatMessage = {
        id: userMsgId,
        role: 'user',
        content: userMessage,
        timestamp: Date.now(),
      }

      const updatedMessages = [...messages, newUserMessage]
      callbacks.onAddMessage(newUserMessage)

      try {
        const httpUrl = convexUrl.replace('.convex.cloud', '.convex.site')

        const response = await fetch(`${httpUrl}/api/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            userMessage,
            confirmedToolCalls,
          }),
          signal: abortController.signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => null)

          if (response.status === 429) {
            callbacks.onSetLocalRemaining(0)
            throw new Error(errorData?.message || 'Daily limit reached. Please try again tomorrow.')
          }

          throw new Error(
            errorData?.error || errorData?.message || `HTTP error! status: ${response.status}`
          )
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response body')

        const decoder = new TextDecoder()
        let buffer = ''
        let fullContent = ''

        const assistantMsgId = `assistant-${Date.now()}`
        callbacks.onAddMessage({
          id: assistantMsgId,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
        })
        callbacks.onSetStreaming(true)
        callbacks.onSetActivity(null)

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          let currentEvent = ''
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7)
            } else if (line.startsWith('data: ')) {
              const data = line.slice(6)
              try {
                const parsed = JSON.parse(data)

                switch (currentEvent) {
                  case 'text': {
                    const textData = parsed as { content: string }
                    fullContent += textData.content
                    callbacks.onUpdateMessage(assistantMsgId, fullContent)
                    break
                  }

                  case 'tool_start': {
                    const toolData = parsed as ToolCall
                    callbacks.onAddExecutingTool({
                      id: toolData.id,
                      name: toolData.name,
                      status: 'executing',
                    })
                    callbacks.onSetActivity(
                      toolDisplayNames[toolData.name] || `Running ${toolData.name}`
                    )
                    break
                  }

                  case 'tool_pending': {
                    const toolData = parsed as ToolCall
                    callbacks.onSetPendingConfirmation(toolData)
                    callbacks.onSetActivity(null)
                    callbacks.onSetLoading(false)
                    callbacks.onSetStreaming(false)
                    break
                  }

                  case 'tool_result': {
                    const resultData = parsed as ToolResult & {
                      id: string
                      name: string
                    }
                    const result: ToolResult = {
                      toolCallId: resultData.id,
                      name: resultData.name,
                      success: resultData.success,
                      summary: resultData.summary,
                      data: resultData.data,
                      error: resultData.error,
                    }
                    callbacks.onAddToolResult(result)
                    callbacks.onUpdateToolStatus(
                      resultData.id,
                      result.success ? 'success' : 'error'
                    )
                    callbacks.onSetActivity(null)
                    break
                  }

                  case 'done': {
                    const doneData = parsed as {
                      message: string
                      toolCalls: ToolCall[]
                      toolResults: ToolResult[]
                      pendingConfirmations: ToolCall[]
                      isComplete: boolean
                      entityId?: string
                      rateLimit?: { remaining: number; limit: number }
                    }

                    if (doneData.rateLimit) {
                      callbacks.onSetLocalRemaining(doneData.rateLimit.remaining)
                    }

                    if (doneData.isComplete && doneData.entityId) {
                      callbacks.onSetComplete(true)
                      toast.success('Event created successfully!')
                      setTimeout(() => {
                        if (onComplete) {
                          onComplete(doneData.entityId!)
                        } else {
                          navigate(`/dashboard/events/${doneData.entityId}`)
                        }
                      }, 1500)
                    }

                    if (doneData.pendingConfirmations.length > 0) {
                      callbacks.onSetPendingConfirmation(doneData.pendingConfirmations[0])
                      callbacks.onSetLoading(false)
                      callbacks.onSetStreaming(false)
                    }
                    break
                  }

                  case 'error': {
                    const errorData = parsed as { message: string }
                    throw new Error(errorData.message)
                  }
                }
              } catch (parseError) {
                if (
                  parseError instanceof Error &&
                  parseError.message !== 'Unexpected end of JSON input'
                ) {
                  throw parseError
                }
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Request was aborted - remove the user message we added
          // Note: This would require a removeMessage callback
        } else {
          const error = err instanceof Error ? err : new Error('Unknown error')
          if (error.message.includes('rate limit')) {
            toast.error('Too many requests. Please wait a moment.')
          } else if (error.message.includes('API key') || error.message.includes('OPENAI')) {
            toast.error('AI service unavailable. Please check configuration.')
          } else if (error.message.includes('Unauthorized')) {
            toast.error('Please sign in to use the AI assistant.')
          } else {
            toast.error('Something went wrong. Please try again.')
          }
        }
      } finally {
        callbacks.onFinish()
      }
    },
    [authToken, convexUrl, confirmedToolCalls, navigate, onComplete]
  )

  const executeToolConfirmation = useCallback(
    async (
      pendingConfirmation: ToolCall,
      callbacks: {
        onSetLoading: (isLoading: boolean) => void
        onAddExecutingTool: (tool: { id: string; name: string; status: ToolStatus }) => void
        onSetActivity: (activity: string | null) => void
        onUpdateToolStatus: (id: string, status: ToolStatus) => void
        onAddToolResult: (result: ToolResult) => void
        onSetPendingConfirmation: (confirmation: ToolCall | null) => void
        onSetComplete: (isComplete: boolean) => void
        onAddMessage: (message: ChatMessage) => void
      }
    ) => {
      if (!pendingConfirmation || !authToken) return

      callbacks.onSetLoading(true)
      callbacks.onAddExecutingTool({
        id: pendingConfirmation.id,
        name: pendingConfirmation.name,
        status: 'executing',
      })
      callbacks.onSetActivity(toolDisplayNames[pendingConfirmation.name] || 'Executing')

      try {
        const httpUrl = convexUrl.replace('.convex.cloud', '.convex.site')

        const response = await fetch(`${httpUrl}/api/chat/execute-tool`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            toolName: pendingConfirmation.name,
            toolArguments: pendingConfirmation.arguments,
          }),
        })

        const result = (await response.json()) as ToolResult & {
          data?: { eventId?: string }
        }

        callbacks.onUpdateToolStatus(pendingConfirmation.id, result.success ? 'success' : 'error')

        callbacks.onAddToolResult({
          toolCallId: result.toolCallId || pendingConfirmation.id,
          name: result.name || pendingConfirmation.name,
          success: result.success,
          summary: result.summary,
          data: result.data,
          error: result.error,
        })

        if (result.success) {
          toast.success(result.summary)

          if (pendingConfirmation.name === 'createEvent' && result.data?.eventId) {
            callbacks.onSetComplete(true)

            const confirmationMsgId = `assistant-confirm-${Date.now()}`
            callbacks.onAddMessage({
              id: confirmationMsgId,
              role: 'assistant',
              content: `I've successfully created your event. ${result.summary}`,
              timestamp: Date.now(),
            })

            setTimeout(() => {
              if (onComplete) {
                onComplete(result.data!.eventId!)
              } else {
                navigate(`/dashboard/events/${result.data!.eventId}`)
              }
            }, 1500)
          }
        } else {
          toast.error(result.error || 'Action failed')
        }

        callbacks.onSetPendingConfirmation(null)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to confirm action'
        toast.error(errorMessage)
      } finally {
        callbacks.onSetLoading(false)
        callbacks.onSetActivity(null)
      }
    },
    [authToken, convexUrl, navigate, onComplete]
  )

  return {
    sendMessage,
    executeToolConfirmation,
  }
}

import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from 'convex/react'
import { useHybridAuth } from '@/hooks/useHybridAuth'
import { api } from '../../../convex/_generated/api'
import { CheckCircle } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Components
import { AgenticAvatar } from './AgenticAvatar'
import { AgenticMessage } from './AgenticMessage'
import { AgenticConfirmation } from './AgenticConfirmation'
import { AgenticHeader } from './AgenticHeader'
import { AgenticToolResults } from './AgenticToolResults'
import { AgenticThinkingIndicator } from './AgenticThinkingIndicator'
import { AgenticInputArea } from './AgenticInputArea'

// Hooks
import { useAgenticChat } from './hooks/useAgenticChat'
import { useStreamingChat } from './hooks/useStreamingChat'

// Types
import type { AgenticChatV2Props, QuickReply } from './types'

// ============================================================================
// Main Component
// ============================================================================

export function AgenticChatV2({
  subtitle = 'What would you like to create?',
  placeholder = 'Describe your event idea...',
  onComplete,
  className,
}: AgenticChatV2Props) {
  const navigate = useNavigate()
  const { token: authToken, isAuthenticated } = useHybridAuth()
  const convexUrl = import.meta.env.VITE_CONVEX_URL as string

  // AI Usage/Rate limit
  const aiUsage = useQuery(api.aiUsage.getMyUsage)
  const [localRemaining, setLocalRemaining] = useState<number | null>(null)

  // Use local state if available, otherwise use query result
  const promptsRemaining = localRemaining ?? aiUsage?.promptsRemaining ?? 5
  const promptsLimit = aiUsage?.dailyLimit ?? 5
  const isRateLimited = promptsRemaining <= 0
  const isAdmin = aiUsage?.isAdmin ?? false
  const timeUntilReset = aiUsage?.timeUntilReset?.formatted ?? ''

  // Chat state hook - destructure to avoid ref-access-during-render lint errors
  const chat = useAgenticChat()
  // Extract state values (safe to access during render)
  const {
    messages,
    hasMessages,
    isStreaming,
    isLoading,
    isComplete,
    currentActivity,
    executingTools,
    toolResults,
    pendingConfirmation,
    inputValue,
    setInputValue,
    clearChat,
    // Refs - only used in JSX ref props, not during render logic
    inputRef,
    conversationAreaRef,
  } = chat

  // Streaming chat hook
  const { sendMessage, executeToolConfirmation } = useStreamingChat({
    authToken,
    convexUrl,
    confirmedToolCalls: chat.confirmedToolCalls,
    onComplete,
  })

  // Handle send
  const handleSend = useCallback(
    async (userMessage: string) => {
      if (chat.isLoading || !isAuthenticated || !authToken || !userMessage.trim()) return

      // Check rate limit before sending
      if (isRateLimited && !isAdmin) {
        toast.error(`Daily limit reached. Resets in ${timeUntilReset || 'a few hours'}.`, {
          action: {
            label: 'View Usage',
            onClick: () => navigate('/dashboard/settings'),
          },
        })
        return
      }

      const abortController = chat.createAbortController()

      await sendMessage(userMessage, chat.messages, abortController, {
        onPrepare: chat.prepareForSend,
        onAddMessage: chat.addMessage,
        onUpdateMessage: chat.updateMessage,
        onSetStreaming: chat.setStreaming,
        onSetActivity: chat.setActivity,
        onAddExecutingTool: chat.addExecutingTool,
        onUpdateToolStatus: chat.updateToolStatus,
        onAddToolResult: chat.addToolResult,
        onSetPendingConfirmation: chat.setPendingConfirmation,
        onSetComplete: chat.setComplete,
        onSetLoading: chat.setLoading,
        onFinish: chat.finishResponse,
        onSetLocalRemaining: setLocalRemaining,
      })
    },
    [
      chat,
      isAuthenticated,
      authToken,
      isRateLimited,
      isAdmin,
      timeUntilReset,
      navigate,
      sendMessage,
    ]
  )

  // Handle confirm
  const handleConfirm = useCallback(async () => {
    if (!chat.pendingConfirmation || !authToken) return

    await executeToolConfirmation(chat.pendingConfirmation, {
      onSetLoading: chat.setLoading,
      onAddExecutingTool: chat.addExecutingTool,
      onSetActivity: chat.setActivity,
      onUpdateToolStatus: chat.updateToolStatus,
      onAddToolResult: chat.addToolResult,
      onSetPendingConfirmation: chat.setPendingConfirmation,
      onSetComplete: chat.setComplete,
      onAddMessage: chat.addMessage,
    })
  }, [chat, authToken, executeToolConfirmation])

  // Handle cancel
  const handleCancel = useCallback(() => {
    chat.setPendingConfirmation(null)
    toast.info('Action cancelled')
  }, [chat])

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (inputValue.trim()) {
      handleSend(inputValue.trim())
    }
  }, [inputValue, handleSend])

  // Navigate to settings
  const handleNavigateToSettings = useCallback(() => {
    navigate('/dashboard/settings')
  }, [navigate])

  // Get confirmation quick replies
  const getQuickReplies = useMemo(() => {
    return (msgIndex: number, isLastMessage: boolean): QuickReply[] | undefined => {
      const msg = messages[msgIndex]
      if (!isLastMessage || msg?.role === 'user' || isStreaming || isLoading) {
        return undefined
      }

      const confirmationPatterns = [
        /shall i proceed/i,
        /would you like me to (create|proceed|continue)/i,
        /ready to create/i,
        /do you want me to/i,
        /should i (create|proceed|go ahead)/i,
        /can i (create|proceed)/i,
        /let me know if you('d| would) like/i,
      ]

      const messageAsksForConfirmation = confirmationPatterns.some((pattern) =>
        pattern.test(msg?.content || '')
      )

      if (pendingConfirmation || messageAsksForConfirmation) {
        return [
          { label: 'Yes, create it', value: 'yes', variant: 'primary' as const },
          { label: 'Make changes', value: 'changes', variant: 'secondary' as const },
          { label: 'Cancel', value: 'cancel', variant: 'secondary' as const },
        ]
      }

      return undefined
    }
  }, [messages, isStreaming, isLoading, pendingConfirmation])

  // Handle quick reply
  const handleQuickReply = useCallback(
    (value: string) => {
      if (value === 'yes') {
        if (pendingConfirmation) {
          handleConfirm()
        } else {
          handleSend('Yes, please create the event.')
        }
      } else if (value === 'cancel') {
        if (pendingConfirmation) {
          handleCancel()
        } else {
          handleSend("Cancel, I don't want to create this event.")
        }
      } else if (value === 'changes') {
        handleSend("I'd like to make some changes to the event details.")
      }
    },
    [pendingConfirmation, handleConfirm, handleCancel, handleSend]
  )

  // Compute input disabled state
  const inputDisabled = isLoading || !!pendingConfirmation || (isRateLimited && !isAdmin)

  // Compute placeholder
  const inputPlaceholder =
    isRateLimited && !isAdmin
      ? `Daily limit reached. Resets in ${timeUntilReset || 'a few hours'}`
      : placeholder

  return (
    <div className={cn('agentic-chat-container', className)}>
      {/* Main Layout */}
      <div className={cn('agentic-chat-layout', hasMessages ? 'has-messages' : 'is-empty')}>
        {/* Header */}
        <AgenticHeader
          hasMessages={hasMessages}
          isRateLimited={isRateLimited}
          isAdmin={isAdmin}
          promptsRemaining={promptsRemaining}
          promptsLimit={promptsLimit}
          timeUntilReset={timeUntilReset}
          subtitle={subtitle}
          onClear={clearChat}
          onNavigateToSettings={handleNavigateToSettings}
        />

        {/* Conversation Area - Only shown when there are messages */}
        {hasMessages && (
          <div className="agentic-conversation-area" ref={conversationAreaRef}>
            <div className="agentic-conversation">
              {/* Messages */}
              <div className="agentic-conversation-messages">
                {messages.map((msg, i) => {
                  const isLastMessage = i === messages.length - 1
                  return (
                    <AgenticMessage
                      key={msg.id}
                      role={msg.role}
                      content={msg.content}
                      isStreaming={isStreaming}
                      isLatest={isLastMessage}
                      timestamp={msg.timestamp}
                      quickReplies={getQuickReplies(i, isLastMessage)}
                      onQuickReply={handleQuickReply}
                    />
                  )
                })}

                {/* Tool Results */}
                <AgenticToolResults results={toolResults} />

                {/* Pending Confirmation */}
                {pendingConfirmation && (
                  <div className="flex gap-3">
                    <AgenticAvatar isStreaming={false} />
                    <div className="flex-1 max-w-[85%]">
                      <AgenticConfirmation
                        toolCall={pendingConfirmation}
                        onConfirm={handleConfirm}
                        onCancel={handleCancel}
                        isLoading={isLoading}
                      />
                    </div>
                  </div>
                )}

                {/* Thinking Indicator */}
                {!pendingConfirmation && (
                  <AgenticThinkingIndicator
                    activity={currentActivity}
                    executingTools={executingTools}
                  />
                )}

                {/* Success State */}
                {isComplete && (
                  <div className="flex gap-3 items-center agentic-message">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted">
                      <CheckCircle size={16} className="text-muted-foreground" />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Event created. Redirecting...
                    </span>
                  </div>
                )}

                {/* Scroll anchor */}
                <div className="h-px w-full flex-shrink-0" aria-hidden="true" />
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <AgenticInputArea
          ref={inputRef}
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          disabled={inputDisabled}
          placeholder={inputPlaceholder}
          isLoading={isLoading}
          showKeyboardHint={!hasMessages}
        />
      </div>
    </div>
  )
}

export default AgenticChatV2

import { useReducer, useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import type {
  ChatState,
  ChatAction,
  ChatMessage,
  ToolCall,
  ToolResult,
  ToolStatus,
  ExecutingTool,
} from '../types'
import { STORAGE_KEY } from '../types'

// ============================================================================
// Initial State
// ============================================================================

function getInitialMessages(): ChatMessage[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {
    // Ignore localStorage errors
  }
  return []
}

const initialState: ChatState = {
  messages: [],
  inputValue: '',
  isLoading: false,
  isStreaming: false,
  currentActivity: null,
  pendingConfirmation: null,
  executingTools: [],
  toolResults: [],
  confirmedToolCalls: [],
  isComplete: false,
}

// ============================================================================
// Reducer
// ============================================================================

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_MESSAGES':
      return { ...state, messages: action.messages }

    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.message] }

    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.id ? { ...m, content: action.content } : m
        ),
      }

    case 'SET_INPUT_VALUE':
      return { ...state, inputValue: action.value }

    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading }

    case 'SET_STREAMING':
      return { ...state, isStreaming: action.isStreaming }

    case 'SET_ACTIVITY':
      return { ...state, currentActivity: action.activity }

    case 'SET_PENDING_CONFIRMATION':
      return { ...state, pendingConfirmation: action.confirmation }

    case 'ADD_EXECUTING_TOOL':
      return { ...state, executingTools: [...state.executingTools, action.tool] }

    case 'UPDATE_TOOL_STATUS':
      return {
        ...state,
        executingTools: state.executingTools.map((t) =>
          t.id === action.id ? { ...t, status: action.status } : t
        ),
      }

    case 'CLEAR_EXECUTING_TOOLS':
      return { ...state, executingTools: [] }

    case 'ADD_TOOL_RESULT':
      return { ...state, toolResults: [...state.toolResults, action.result] }

    case 'CLEAR_TOOL_RESULTS':
      return { ...state, toolResults: [] }

    case 'ADD_CONFIRMED_TOOL_CALL':
      return { ...state, confirmedToolCalls: [...state.confirmedToolCalls, action.id] }

    case 'SET_COMPLETE':
      return { ...state, isComplete: action.isComplete }

    case 'CLEAR_CHAT':
      return {
        ...initialState,
        messages: [],
      }

    case 'PREPARE_FOR_SEND':
      return {
        ...state,
        inputValue: '',
        isLoading: true,
        isStreaming: false,
        currentActivity: 'Thinking',
        executingTools: [],
        toolResults: [],
        pendingConfirmation: null,
        isComplete: false,
      }

    default:
      return state
  }
}

// ============================================================================
// Hook
// ============================================================================

export function useAgenticChat() {
  const [state, dispatch] = useReducer(chatReducer, {
    ...initialState,
    messages: getInitialMessages(),
  })

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const conversationAreaRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Persist messages to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.messages))
  }, [state.messages])

  // Scroll to bottom when messages change
  useEffect(() => {
    const scrollArea = conversationAreaRef.current
    if (scrollArea) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollArea.scrollTo({
            top: scrollArea.scrollHeight,
            behavior: 'smooth',
          })
        })
      })
    }
  }, [state.messages, state.currentActivity, state.executingTools, state.isStreaming])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
    if (conversationAreaRef.current && state.messages.length > 0) {
      conversationAreaRef.current.scrollTop = conversationAreaRef.current.scrollHeight
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Actions
  const setInputValue = useCallback((value: string) => {
    dispatch({ type: 'SET_INPUT_VALUE', value })
  }, [])

  const addMessage = useCallback((message: ChatMessage) => {
    dispatch({ type: 'ADD_MESSAGE', message })
  }, [])

  const updateMessage = useCallback((id: string, content: string) => {
    dispatch({ type: 'UPDATE_MESSAGE', id, content })
  }, [])

  const setLoading = useCallback((isLoading: boolean) => {
    dispatch({ type: 'SET_LOADING', isLoading })
  }, [])

  const setStreaming = useCallback((isStreaming: boolean) => {
    dispatch({ type: 'SET_STREAMING', isStreaming })
  }, [])

  const setActivity = useCallback((activity: string | null) => {
    dispatch({ type: 'SET_ACTIVITY', activity })
  }, [])

  const setPendingConfirmation = useCallback((confirmation: ToolCall | null) => {
    dispatch({ type: 'SET_PENDING_CONFIRMATION', confirmation })
  }, [])

  const addExecutingTool = useCallback((tool: ExecutingTool) => {
    dispatch({ type: 'ADD_EXECUTING_TOOL', tool })
  }, [])

  const updateToolStatus = useCallback((id: string, status: ToolStatus) => {
    dispatch({ type: 'UPDATE_TOOL_STATUS', id, status })
  }, [])

  const addToolResult = useCallback((result: ToolResult) => {
    dispatch({ type: 'ADD_TOOL_RESULT', result })
  }, [])

  const setComplete = useCallback((isComplete: boolean) => {
    dispatch({ type: 'SET_COMPLETE', isComplete })
  }, [])

  const prepareForSend = useCallback(() => {
    dispatch({ type: 'PREPARE_FOR_SEND' })
  }, [])

  const clearChat = useCallback(() => {
    dispatch({ type: 'CLEAR_CHAT' })
    localStorage.removeItem(STORAGE_KEY)
    toast.info('Chat cleared')
  }, [])

  const finishResponse = useCallback(() => {
    dispatch({ type: 'SET_LOADING', isLoading: false })
    dispatch({ type: 'SET_STREAMING', isStreaming: false })
    dispatch({ type: 'SET_ACTIVITY', activity: null })
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  // Abort controller management
  const createAbortController = useCallback(() => {
    abortControllerRef.current = new AbortController()
    return abortControllerRef.current
  }, [])

  const abortRequest = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
  }, [])

  return {
    // State
    ...state,
    hasMessages: state.messages.length > 0,

    // Refs
    inputRef,
    conversationAreaRef,
    abortControllerRef,

    // Actions
    setInputValue,
    addMessage,
    updateMessage,
    setLoading,
    setStreaming,
    setActivity,
    setPendingConfirmation,
    addExecutingTool,
    updateToolStatus,
    addToolResult,
    setComplete,
    prepareForSend,
    clearChat,
    finishResponse,
    createAbortController,
    abortRequest,
  }
}

export type UseAgenticChatReturn = ReturnType<typeof useAgenticChat>

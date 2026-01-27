import { useState, useCallback, useEffect } from 'react'
import type { OnboardingState, OnboardingAnswers, UserRole } from '@/types/onboarding'

interface ExtendedOnboardingState extends OnboardingState {
  direction: 'forward' | 'backward'
}

const STORAGE_KEY = 'open_event_onboarding_state'

/**
 * Definition of the onboarding flow steps.
 * This allows us to calculate progress and next steps dynamically.
 */
export type OnboardingStepId =
  | 'welcome'
  | 'role'
  | 'organization'
  | 'eventTypes'
  | 'eventScale'
  | 'goals'
  | 'experience'
  | 'referral'

// Define the logical flow for each role
const FLOWS: Record<UserRole | 'default', OnboardingStepId[]> = {
  organizer: [
    'welcome',
    'role',
    'organization',
    'eventTypes',
    'eventScale',
    'goals',
    'experience',
    'referral',
  ],
  sponsor: ['welcome', 'role', 'organization', 'goals', 'referral'],
  vendor: ['welcome', 'role', 'organization', 'goals', 'referral'],
  exploring: ['welcome', 'role', 'eventTypes', 'referral'],
  default: [
    'welcome',
    'role',
    'organization',
    'eventTypes',
    'eventScale',
    'goals',
    'experience',
    'referral',
  ],
}

const initialState: ExtendedOnboardingState = {
  currentStep: 1,
  totalSteps: FLOWS.default.length,
  answers: {},
  isComplete: false,
  direction: 'forward',
}

/**
 * Hook for managing multi-step onboarding flow state.
 * Handles persistence, branching logic, and step navigation.
 */
export function useOnboarding() {
  // Initialize state from localStorage or default
  const [state, setState] = useState<ExtendedOnboardingState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (e) {
      console.error('Failed to load onboarding state:', e)
    }
    return initialState
  })

  // Persist state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (e) {
      console.error('Failed to save onboarding state:', e)
    }
  }, [state])

  /**
   * Calculate the current flow based on the selected role.
   * If no role is selected, use the default flow.
   */
  const getCurrentFlow = useCallback(() => {
    const role = state.answers.role
    return role ? FLOWS[role] || FLOWS.default : FLOWS.default
  }, [state.answers.role])

  // Derived state for totalSteps (instead of syncing to state)
  const currentFlow = getCurrentFlow()
  const derivedTotalSteps = currentFlow.length

  /**
   * Get the ID of the current step based on the currentStep index.
   */
  const getCurrentStepId = useCallback(() => {
    // currentStep is 1-indexed, so subtract 1
    return currentFlow[state.currentStep - 1] || 'welcome'
  }, [currentFlow, state.currentStep])

  /**
   * Ensure current step is valid when flow changes
   */
  useEffect(() => {
    if (state.currentStep > derivedTotalSteps) {
      // Defer state update
      const timer = setTimeout(() => {
        setState((prev) => ({
          ...prev,
          currentStep: derivedTotalSteps,
        }))
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [derivedTotalSteps, state.currentStep])

  /** Advance to next step, optionally saving answer data */
  const nextStep = useCallback(
    (data?: Partial<OnboardingAnswers>) => {
      setState((prev) => {
        const newAnswers = data ? { ...prev.answers, ...data } : prev.answers
        
        // Determine flow based on NEW answers (crucial for Role step)
        const role = newAnswers.role
        const flow = role ? FLOWS[role] || FLOWS.default : FLOWS.default
        const totalSteps = flow.length
        
        const nextStepNum = prev.currentStep + 1

        if (nextStepNum > totalSteps) {
          return {
            ...prev,
            answers: newAnswers,
            isComplete: true,
            direction: 'forward',
            totalSteps: totalSteps, // Keep legacy field updated just in case
          }
        }

        return {
          ...prev,
          currentStep: nextStepNum,
          answers: newAnswers,
          direction: 'forward',
          totalSteps: totalSteps, // Keep legacy field updated just in case
        }
      })
    },
    []
  )

  /** Go back to previous step */
  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(1, prev.currentStep - 1),
      direction: 'backward',
    }))
  }, [])

  /** Skip remaining steps and mark as complete */
  const skipOnboarding = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isComplete: true,
    }))
  }, [])

  /** Reset to initial state and clear storage */
  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setState(initialState)
  }, [])

  return {
    ...state,
    currentStepId: getCurrentStepId(),
    nextStep,
    prevStep,
    skipOnboarding,
    reset,
  }
}

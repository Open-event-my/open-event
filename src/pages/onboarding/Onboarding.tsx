import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useConvexAuth } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { TypeformLayout, TypeformTransition } from '@/components/typeform'
import { useOnboarding } from '@/hooks/use-onboarding'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
  RoleStep,
  OrganizationStep,
  EventTypesStep,
  EventScaleStep,
  GoalsStep,
  ExperienceStep,
  ReferralStep,
} from './steps'
import type { OnboardingAnswers } from '@/types/onboarding'

const steps = [
  RoleStep,
  OrganizationStep,
  EventTypesStep,
  EventScaleStep,
  GoalsStep,
  ExperienceStep,
  ReferralStep,
]

export function Onboarding() {
  const navigate = useNavigate()
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth()
  const user = useQuery(api.queries.auth.getCurrentUser)
  const saveProfile = useMutation(api.organizerProfiles.saveProfile)

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/bf0148c8-69d2-4cb6-82fd-f2bf765adef1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'src/pages/onboarding/Onboarding.tsx:35',
        message: 'Onboarding auth state',
        data: {
          isAuthenticated,
          authLoading,
          hasUser: !!user,
          userId: user?._id,
          userRole: user?.role,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'onboarding-auth',
        hypothesisId: 'O1',
      }),
    }).catch(() => {})
  }, [isAuthenticated, authLoading, user])
  // #endregion

  // Only query profile if authenticated
  const existingProfile = useQuery(
    api.organizerProfiles.getMyProfile,
    isAuthenticated ? {} : 'skip'
  )

  const hasSavedRef = useRef(false)

  const {
    currentStep,
    totalSteps,
    answers,
    isComplete,
    direction,
    nextStep,
    prevStep,
    skipOnboarding,
  } = useOnboarding()

  // Redirect unauthenticated users to sign-in
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/sign-in', { replace: true })
    }
  }, [authLoading, isAuthenticated, navigate])

  // Redirect users who already have a profile to dashboard
  useEffect(() => {
    if (existingProfile) {
      navigate('/dashboard', { replace: true })
    }
  }, [existingProfile, navigate])

  // Save onboarding data and navigate to completion when done
  useEffect(() => {
    if (isComplete && !hasSavedRef.current && isAuthenticated) {
      hasSavedRef.current = true

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/bf0148c8-69d2-4cb6-82fd-f2bf765adef1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'src/pages/onboarding/Onboarding.tsx:70',
          message: 'Saving onboarding profile',
          data: { isAuthenticated, hasUser: !!user },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'onboarding-save',
          hypothesisId: 'O2',
        }),
      }).catch(() => {})
      // #endregion

      // Save profile to Convex (no accessToken needed - uses Convex Auth)
      saveProfile({
        organizationName: answers.organizationName,
        organizationType: answers.organizationType,
        eventTypes: answers.eventTypes,
        eventScale: answers.eventScale,
        goals: answers.goals,
        experienceLevel: answers.experienceLevel,
        referralSource: answers.referralSource,
      })
        .then(() => {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/bf0148c8-69d2-4cb6-82fd-f2bf765adef1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'src/pages/onboarding/Onboarding.tsx:88',
              message: 'Onboarding profile saved successfully',
              data: {},
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'onboarding-save',
              hypothesisId: 'O3',
            }),
          }).catch(() => {})
          // #endregion
          navigate('/onboarding/complete', { replace: true })
        })
        .catch((error) => {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/bf0148c8-69d2-4cb6-82fd-f2bf765adef1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'src/pages/onboarding/Onboarding.tsx:92',
              message: 'Onboarding profile save error',
              data: { error: error instanceof Error ? error.message : String(error) },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'onboarding-save',
              hypothesisId: 'O4',
            }),
          }).catch(() => {})
          // #endregion
          // Navigate anyway - we don't want to block the user
          navigate('/onboarding/complete', { replace: true })
        })
    }
  }, [isComplete, answers, saveProfile, navigate, isAuthenticated, user])

  const CurrentStepComponent = steps[currentStep - 1]

  // Show loading while checking auth state
  if (authLoading) {
    return <LoadingSpinner message="Loading..." fullScreen />
  }

  // Not authenticated - will redirect
  if (!isAuthenticated) {
    return <LoadingSpinner message="Redirecting..." fullScreen />
  }

  // Show loading while checking if user already completed onboarding
  if (existingProfile === undefined) {
    return <LoadingSpinner message="Setting up..." fullScreen />
  }

  const handleNext = (data: Partial<OnboardingAnswers>) => {
    nextStep(data)
  }

  const handleBack = () => {
    prevStep()
  }

  const handleSkip = () => {
    skipOnboarding()
  }

  return (
    <TypeformLayout
      currentStep={currentStep}
      totalSteps={totalSteps}
      canGoNext={true}
      canGoPrevious={currentStep > 1}
    >
      <TypeformTransition transitionKey={currentStep} direction={direction}>
        <CurrentStepComponent
          onNext={handleNext}
          onBack={handleBack}
          onSkip={currentStep === totalSteps ? handleSkip : undefined}
          currentData={answers}
        />
      </TypeformTransition>
    </TypeformLayout>
  )
}

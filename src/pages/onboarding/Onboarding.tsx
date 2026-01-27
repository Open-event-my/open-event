import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useConvexAuth } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { TypeformLayout, TypeformTransition } from '@/components/typeform'
import { useOnboarding } from '@/hooks/use-onboarding'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
  WelcomeStep,
  RoleStep,
  OrganizationStep,
  EventTypesStep,
  EventScaleStep,
  GoalsStep,
  ExperienceStep,
  ReferralStep,
} from './steps'
import type { OnboardingStepId } from '@/hooks/use-onboarding'
import type { OnboardingAnswers } from '@/types/onboarding'
import type { StepProps } from '@/types/onboarding'

// Map step IDs to components
const STEP_COMPONENTS: Record<OnboardingStepId, React.ComponentType<StepProps>> = {
  welcome: WelcomeStep,
  role: RoleStep,
  organization: OrganizationStep,
  eventTypes: EventTypesStep,
  eventScale: EventScaleStep,
  goals: GoalsStep,
  experience: ExperienceStep,
  referral: ReferralStep,
}

export function Onboarding() {
  const navigate = useNavigate()
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth()
  const saveProfile = useMutation(api.organizerProfiles.saveProfile)

  // Only query profile if authenticated
  const existingProfile = useQuery(
    api.organizerProfiles.getMyProfile,
    isAuthenticated ? {} : 'skip'
  )

  const hasSavedRef = useRef(false)

  const {
    currentStep,
    totalSteps,
    currentStepId,
    answers,
    isComplete,
    direction,
    nextStep,
    prevStep,
    skipOnboarding,
    reset,
  } = useOnboarding()

  // Redirect unauthenticated users to sign-in
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/sign-in', { replace: true })
    }
  }, [authLoading, isAuthenticated, navigate])

  // Redirect users who already have a profile to dashboard
  useEffect(() => {
    // If we are in the completion phase (isComplete is true), don't redirect yet
    // Let the save logic handle the navigation to /onboarding/complete
    if (existingProfile && !isComplete && !authLoading) {
       // Check if profile was just created (within last 5 seconds) to assume completion
       const isRecent = existingProfile.createdAt && (Date.now() - existingProfile.createdAt < 5000);
       if (!isRecent) {
           navigate('/dashboard', { replace: true })
       }
    }
  }, [existingProfile, navigate, isComplete, authLoading])

  // Save onboarding data and navigate to completion when done
  useEffect(() => {
    if (isComplete && !hasSavedRef.current && isAuthenticated) {
      hasSavedRef.current = true

      // Save profile to Convex
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
          reset() // Clear local storage on success
          navigate('/onboarding/complete', { replace: true })
        })
        .catch((error) => {
          console.error('Onboarding save error:', error)
          // Navigate anyway - we don't want to block the user
          reset()
          navigate('/onboarding/complete', { replace: true })
        })
    }
  }, [isComplete, answers, saveProfile, navigate, isAuthenticated, reset])

  const CurrentStepComponent = STEP_COMPONENTS[currentStepId]

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
      <TypeformTransition transitionKey={currentStepId} direction={direction}>
        <CurrentStepComponent
          onNext={handleNext}
          onBack={handleBack}
          onSkip={currentStepId === 'referral' ? handleSkip : undefined}
          currentData={answers}
        />
      </TypeformTransition>
    </TypeformLayout>
  )
}

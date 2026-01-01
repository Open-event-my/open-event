import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import { cn } from '@/lib/utils'
import { isValidEmail } from '@/lib/validation'
import {
  TypeformLayout,
  TypeformTransition,
  TypeformQuestion,
  TypeformNavigation,
  TypeformInput,
  TypeformTextarea,
  TypeformSelect,
} from '@/components/typeform'
import { OptionCard } from '@/components/onboarding'
import {
  Handshake,
  Globe,
  CurrencyDollar,
  Target,
  Medal,
  User,
  Envelope,
  Phone,
} from '@phosphor-icons/react'

// Define all steps as individual questions (Typeform style)
const STEPS = [
  'companyName',
  'industry',
  'description',
  'website',
  'sponsorshipTiers',
  'budgetRange',
  'targetEventTypes',
  'targetAudience',
  'pastExperience',
  'additionalNotes',
  'referralSource',
  'contactName',
  'contactEmail',
  'contactPhone',
  'review',
] as const

const EVENT_TYPES = [
  'Conference',
  'Trade Show',
  'Festival',
  'Concert',
  'Sports Event',
  'Charity Gala',
  'Corporate Event',
  'Community Event',
  'Workshop/Seminar',
  'Other',
]

export function SponsorApplicationPage() {
  const navigate = useNavigate()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prevStepRef = useRef(0)

  // Form data
  const [formData, setFormData] = useState({
    companyName: '',
    description: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    website: '',
    industry: '',
    sponsorshipTiers: [] as string[],
    budgetMin: '',
    budgetMax: '',
    targetEventTypes: [] as string[],
    targetAudience: '',
    pastExperience: '',
    additionalNotes: '',
    referralSource: '',
  })

  const formOptions = useQuery(api.publicApplications.getFormOptions)
  const submitApplication = useMutation(api.publicApplications.submitSponsorApplication)

  const currentStep = STEPS[currentStepIndex]
  const totalSteps = STEPS.length

  // Track direction for animations
  useEffect(() => {
    if (currentStepIndex > prevStepRef.current) {
      setDirection('forward')
    } else if (currentStepIndex < prevStepRef.current) {
      setDirection('backward')
    }
    prevStepRef.current = currentStepIndex
  }, [currentStepIndex])

  const updateField = (field: keyof typeof formData, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 'companyName':
        if (!formData.companyName.trim()) {
          setError('Company name is required')
          return false
        }
        break
      case 'industry':
        if (!formData.industry) {
          setError('Please select an industry')
          return false
        }
        break
      case 'contactName':
        if (!formData.contactName.trim()) {
          setError('Contact name is required')
          return false
        }
        break
      case 'contactEmail': {
        if (!formData.contactEmail.trim()) {
          setError('Email is required')
          return false
        }
        if (!isValidEmail(formData.contactEmail)) {
          setError('Please enter a valid email address')
          return false
        }
        break
      }
    }
    return true
  }

  const nextStep = () => {
    if (!validateCurrentStep()) return
    setError(null)

    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1)
    }
  }

  const toggleTier = (tier: string) => {
    const newTiers = formData.sponsorshipTiers.includes(tier)
      ? formData.sponsorshipTiers.filter((t) => t !== tier)
      : [...formData.sponsorshipTiers, tier]
    updateField('sponsorshipTiers', newTiers)
  }

  const toggleEventType = (eventType: string) => {
    const newTypes = formData.targetEventTypes.includes(eventType)
      ? formData.targetEventTypes.filter((t) => t !== eventType)
      : [...formData.targetEventTypes, eventType]
    updateField('targetEventTypes', newTypes)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      await submitApplication({
        companyName: formData.companyName,
        description: formData.description || undefined,
        contactName: formData.contactName,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone || undefined,
        website: formData.website || undefined,
        industry: formData.industry,
        sponsorshipTiers:
          formData.sponsorshipTiers.length > 0 ? formData.sponsorshipTiers : undefined,
        budgetMin: formData.budgetMin ? parseInt(formData.budgetMin) : undefined,
        budgetMax: formData.budgetMax ? parseInt(formData.budgetMax) : undefined,
        targetEventTypes:
          formData.targetEventTypes.length > 0 ? formData.targetEventTypes : undefined,
        targetAudience: formData.targetAudience || undefined,
        pastExperience: formData.pastExperience || undefined,
        additionalNotes: formData.additionalNotes || undefined,
        referralSource: formData.referralSource || undefined,
      })

      navigate('/apply/success?type=sponsor')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit application')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Check if current step can proceed (for keyboard nav)
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'companyName':
        return formData.companyName.trim().length > 0
      case 'industry':
        return !!formData.industry
      case 'contactName':
        return formData.contactName.trim().length > 0
      case 'contactEmail':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)
      default:
        return true
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'companyName':
        return (
          <div className="space-y-10">
            <TypeformQuestion
              stepNumber={1}
              question="What's your company name?"
              description="This is how you'll appear to event organizers."
            />
            <TypeformInput
              placeholder="Your company or brand name"
              value={formData.companyName}
              onChange={(e) => updateField('companyName', e.target.value)}
              error={error || undefined}
              autoFocus
            />
            <TypeformNavigation onNext={nextStep} canGoNext={canProceed()} />
          </div>
        )

      case 'industry':
        return (
          <div className="space-y-10">
            <TypeformQuestion
              stepNumber={2}
              question="What industry are you in?"
              description="This helps us match you with relevant events."
            />
            <div className="grid grid-cols-2 gap-3">
              {formOptions?.sponsorIndustries.map((ind, index) => (
                <OptionCard
                  key={ind}
                  label={ind.charAt(0).toUpperCase() + ind.slice(1).replace('_', ' ')}
                  isSelected={formData.industry === ind}
                  onClick={() => updateField('industry', ind)}
                  delay={index * 50}
                  icon={Handshake}
                />
              ))}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <TypeformNavigation onPrevious={prevStep} onNext={nextStep} canGoNext={canProceed()} />
          </div>
        )

      case 'description':
        return (
          <div className="space-y-10">
            <TypeformQuestion
              stepNumber={3}
              question="Tell us about your company"
              description="Share your sponsorship goals and what you're looking for (Optional)"
            />
            <TypeformTextarea
              placeholder="Tell us about your company and your sponsorship objectives..."
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={4}
            />
            <TypeformNavigation onPrevious={prevStep} onNext={nextStep} />
          </div>
        )

      case 'website':
        return (
          <div className="space-y-10">
            <TypeformQuestion
              stepNumber={4}
              question="Do you have a website?"
              description="Help organizers learn more about your brand (Optional)"
            >
              <div className="flex items-center gap-2 text-muted-foreground mt-2">
                <Globe size={18} weight="duotone" />
                <span className="text-sm">Include https://</span>
              </div>
            </TypeformQuestion>
            <TypeformInput
              type="url"
              placeholder="https://yourcompany.com"
              value={formData.website}
              onChange={(e) => updateField('website', e.target.value)}
            />
            <TypeformNavigation onPrevious={prevStep} onNext={nextStep} />
          </div>
        )

      case 'sponsorshipTiers':
        return (
          <div className="space-y-10">
            <TypeformQuestion
              stepNumber={5}
              question="Which sponsorship tiers interest you?"
              description="Select all that apply (Optional)"
            >
              <div className="flex items-center gap-2 text-muted-foreground mt-2">
                <Medal size={18} weight="duotone" />
              </div>
            </TypeformQuestion>
            <div className="flex flex-wrap gap-3">
              {formOptions?.sponsorshipTiers.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => toggleTier(tier)}
                  className={cn(
                    'px-5 py-3 rounded-lg border text-base font-medium transition-all',
                    'hover:scale-[1.02] active:scale-[0.98]',
                    formData.sponsorshipTiers.includes(tier)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </button>
              ))}
            </div>
            <TypeformNavigation onPrevious={prevStep} onNext={nextStep} />
          </div>
        )

      case 'budgetRange':
        return (
          <div className="space-y-10">
            <TypeformQuestion
              stepNumber={6}
              question="What's your sponsorship budget range?"
              description="Help us match you with appropriate opportunities (Optional)"
            >
              <div className="flex items-center gap-2 text-muted-foreground mt-2">
                <CurrencyDollar size={18} weight="duotone" />
                <span className="text-sm">USD</span>
              </div>
            </TypeformQuestion>
            <div className="grid grid-cols-2 gap-4">
              <TypeformInput
                type="number"
                placeholder="Minimum"
                value={formData.budgetMin}
                onChange={(e) => updateField('budgetMin', e.target.value)}
              />
              <TypeformInput
                type="number"
                placeholder="Maximum"
                value={formData.budgetMax}
                onChange={(e) => updateField('budgetMax', e.target.value)}
              />
            </div>
            <TypeformNavigation onPrevious={prevStep} onNext={nextStep} />
          </div>
        )

      case 'targetEventTypes':
        return (
          <div className="space-y-10">
            <TypeformQuestion
              stepNumber={7}
              question="What types of events interest you?"
              description="Select all that apply (Optional)"
            >
              <div className="flex items-center gap-2 text-muted-foreground mt-2">
                <Target size={18} weight="duotone" />
              </div>
            </TypeformQuestion>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EVENT_TYPES.map((eventType) => (
                <button
                  key={eventType}
                  type="button"
                  onClick={() => toggleEventType(eventType)}
                  className={cn(
                    'px-4 py-3 rounded-lg border text-sm transition-all text-left',
                    'hover:scale-[1.02] active:scale-[0.98]',
                    formData.targetEventTypes.includes(eventType)
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  {eventType}
                </button>
              ))}
            </div>
            <TypeformNavigation onPrevious={prevStep} onNext={nextStep} />
          </div>
        )

      case 'targetAudience':
        return (
          <div className="space-y-10">
            <TypeformQuestion
              stepNumber={8}
              question="Who is your target audience?"
              description="Help us understand who you're trying to reach (Optional)"
            />
            <TypeformInput
              placeholder="e.g., Young professionals, Tech enthusiasts, Families"
              value={formData.targetAudience}
              onChange={(e) => updateField('targetAudience', e.target.value)}
            />
            <TypeformNavigation onPrevious={prevStep} onNext={nextStep} />
          </div>
        )

      case 'pastExperience':
        return (
          <div className="space-y-10">
            <TypeformQuestion
              stepNumber={9}
              question="Tell us about your sponsorship experience"
              description="Share any notable events you've sponsored (Optional)"
            />
            <TypeformTextarea
              placeholder="Describe your past sponsorship experience, outcomes, and learnings..."
              value={formData.pastExperience}
              onChange={(e) => updateField('pastExperience', e.target.value)}
              rows={5}
            />
            <TypeformNavigation onPrevious={prevStep} onNext={nextStep} />
          </div>
        )

      case 'additionalNotes':
        return (
          <div className="space-y-10">
            <TypeformQuestion
              stepNumber={10}
              question="Anything else you'd like to share?"
              description="Additional information or specific requirements (Optional)"
            />
            <TypeformTextarea
              placeholder="Any other information about your sponsorship preferences..."
              value={formData.additionalNotes}
              onChange={(e) => updateField('additionalNotes', e.target.value)}
              rows={4}
            />
            <TypeformNavigation onPrevious={prevStep} onNext={nextStep} />
          </div>
        )

      case 'referralSource':
        return (
          <div className="space-y-10">
            <TypeformQuestion
              stepNumber={11}
              question="How did you hear about us?"
              description="This helps us improve (Optional)"
            />
            <TypeformSelect
              value={formData.referralSource}
              onChange={(e) => updateField('referralSource', e.target.value)}
            >
              <option value="">Select an option</option>
              {formOptions?.referralSources.map((source) => (
                <option key={source} value={source}>
                  {source.charAt(0).toUpperCase() + source.slice(1).replace('_', ' ')}
                </option>
              ))}
            </TypeformSelect>
            <TypeformNavigation onPrevious={prevStep} onNext={nextStep} />
          </div>
        )

      case 'contactName':
        return (
          <div className="space-y-10">
            <TypeformQuestion
              stepNumber={12}
              question="What's your name?"
              description="The primary contact for this application."
            >
              <div className="flex items-center gap-2 text-muted-foreground mt-2">
                <User size={18} weight="duotone" />
              </div>
            </TypeformQuestion>
            <TypeformInput
              placeholder="Your full name"
              value={formData.contactName}
              onChange={(e) => updateField('contactName', e.target.value)}
              error={error || undefined}
              autoFocus
            />
            <TypeformNavigation onPrevious={prevStep} onNext={nextStep} canGoNext={canProceed()} />
          </div>
        )

      case 'contactEmail':
        return (
          <div className="space-y-10">
            <TypeformQuestion
              stepNumber={13}
              question="What's your email address?"
              description="We'll use this to contact you about your application."
            >
              <div className="flex items-center gap-2 text-muted-foreground mt-2">
                <Envelope size={18} weight="duotone" />
              </div>
            </TypeformQuestion>
            <TypeformInput
              type="email"
              placeholder="you@company.com"
              value={formData.contactEmail}
              onChange={(e) => updateField('contactEmail', e.target.value)}
              error={error || undefined}
              autoFocus
            />
            <TypeformNavigation onPrevious={prevStep} onNext={nextStep} canGoNext={canProceed()} />
          </div>
        )

      case 'contactPhone':
        return (
          <div className="space-y-10">
            <TypeformQuestion
              stepNumber={14}
              question="What's your phone number?"
              description="Optional, but helpful for discussing opportunities."
            >
              <div className="flex items-center gap-2 text-muted-foreground mt-2">
                <Phone size={18} weight="duotone" />
              </div>
            </TypeformQuestion>
            <TypeformInput
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={formData.contactPhone}
              onChange={(e) => updateField('contactPhone', e.target.value)}
            />
            <TypeformNavigation onPrevious={prevStep} onNext={nextStep} />
          </div>
        )

      case 'review':
        return (
          <div className="space-y-10">
            <TypeformQuestion
              stepNumber={15}
              question="Ready to submit your application?"
              description="Review your information and submit when ready."
            />

            {/* Summary */}
            <div className="space-y-4 p-6 rounded-xl bg-muted/30 border border-border">
              <div className="grid gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Company:</span>{' '}
                  <span className="font-medium">{formData.companyName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Industry:</span>{' '}
                  <span className="font-medium">{formData.industry}</span>
                </div>
                {formData.sponsorshipTiers.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Interested Tiers:</span>{' '}
                    <span className="font-medium">{formData.sponsorshipTiers.join(', ')}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Contact:</span>{' '}
                  <span className="font-medium">{formData.contactName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>{' '}
                  <span className="font-medium">{formData.contactEmail}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-2">What happens next?</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Our team will review your application within 2-3 business days</li>
                  <li>We may reach out to discuss sponsorship opportunities</li>
                  <li>Once approved, you'll be able to browse and apply to sponsor events</li>
                </ul>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                {error}
              </p>
            )}

            <TypeformNavigation
              onPrevious={prevStep}
              onNext={handleSubmit}
              canGoNext={!isSubmitting}
              isLoading={isSubmitting}
              isLastStep
              showKeyboardHint={false}
            />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <TypeformLayout
      currentStep={currentStepIndex + 1}
      totalSteps={totalSteps}
      onNext={currentStep === 'review' ? handleSubmit : nextStep}
      canGoNext={canProceed()}
      canGoPrevious={currentStepIndex > 0}
      enableKeyboardNav={currentStep !== 'review'}
    >
      <TypeformTransition transitionKey={currentStepIndex} direction={direction}>
        {renderStep()}
      </TypeformTransition>
    </TypeformLayout>
  )
}

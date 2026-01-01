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
  Storefront,
  Globe,
  MapPin,
  CurrencyDollar,
  User,
  Envelope,
  Phone,
} from '@phosphor-icons/react'

// Define all steps as individual questions (Typeform style)
const STEPS = [
  'companyName',
  'description',
  'website',
  'category',
  'services',
  'location',
  'priceRange',
  'pastExperience',
  'additionalNotes',
  'referralSource',
  'contactName',
  'contactEmail',
  'contactPhone',
  'review',
] as const

const SERVICE_OPTIONS = [
  'Setup & Installation',
  'On-site Support',
  'Equipment Rental',
  'Design Services',
  'Consultation',
  'Full Service',
  'Delivery',
  'Cleanup',
  'Custom Solutions',
]

export function VendorApplicationPage() {
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
    category: '',
    services: [] as string[],
    location: '',
    priceRange: '',
    pastExperience: '',
    additionalNotes: '',
    referralSource: '',
  })

  const formOptions = useQuery(api.publicApplications.getFormOptions)
  const submitApplication = useMutation(api.publicApplications.submitVendorApplication)

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
      case 'category':
        if (!formData.category) {
          setError('Please select a category')
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

  const toggleService = (service: string) => {
    const newServices = formData.services.includes(service)
      ? formData.services.filter((s) => s !== service)
      : [...formData.services, service]
    updateField('services', newServices)
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
        category: formData.category,
        services: formData.services.length > 0 ? formData.services : undefined,
        location: formData.location || undefined,
        priceRange: formData.priceRange || undefined,
        pastExperience: formData.pastExperience || undefined,
        additionalNotes: formData.additionalNotes || undefined,
        referralSource: formData.referralSource || undefined,
      })

      navigate('/apply/success?type=vendor')
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
      case 'category':
        return !!formData.category
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
              placeholder="Your company or business name"
              value={formData.companyName}
              onChange={(e) => updateField('companyName', e.target.value)}
              error={error || undefined}
              autoFocus
            />
            <TypeformNavigation onNext={nextStep} canGoNext={canProceed()} />
          </div>
        )

      case 'description':
        return (
          <div className="space-y-10">
            <TypeformQuestion
              stepNumber={2}
              question="Tell us about your company"
              description="What makes your business unique? (Optional)"
            />
            <TypeformTextarea
              placeholder="Share your story, expertise, and what sets you apart..."
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
              stepNumber={3}
              question="Do you have a website?"
              description="Help organizers learn more about you (Optional)"
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

      case 'category':
        return (
          <div className="space-y-10">
            <TypeformQuestion
              stepNumber={4}
              question="What category best describes your services?"
              description="Select your primary service category."
            />
            <div className="grid grid-cols-2 gap-3">
              {formOptions?.vendorCategories.map((cat, index) => (
                <OptionCard
                  key={cat}
                  label={cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
                  isSelected={formData.category === cat}
                  onClick={() => updateField('category', cat)}
                  delay={index * 50}
                  icon={Storefront}
                />
              ))}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <TypeformNavigation onPrevious={prevStep} onNext={nextStep} canGoNext={canProceed()} />
          </div>
        )

      case 'services':
        return (
          <div className="space-y-10">
            <TypeformQuestion
              stepNumber={5}
              question="What services do you offer?"
              description="Select all that apply (Optional)"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SERVICE_OPTIONS.map((service) => (
                <button
                  key={service}
                  type="button"
                  onClick={() => toggleService(service)}
                  className={cn(
                    'px-4 py-3 rounded-lg border text-sm transition-all text-left',
                    'hover:scale-[1.02] active:scale-[0.98]',
                    formData.services.includes(service)
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  {service}
                </button>
              ))}
            </div>
            <TypeformNavigation onPrevious={prevStep} onNext={nextStep} />
          </div>
        )

      case 'location':
        return (
          <div className="space-y-10">
            <TypeformQuestion
              stepNumber={6}
              question="Where do you provide services?"
              description="Your service area or location (Optional)"
            >
              <div className="flex items-center gap-2 text-muted-foreground mt-2">
                <MapPin size={18} weight="duotone" />
                <span className="text-sm">City, region, or "Nationwide"</span>
              </div>
            </TypeformQuestion>
            <TypeformInput
              placeholder="e.g., New York, Nationwide"
              value={formData.location}
              onChange={(e) => updateField('location', e.target.value)}
            />
            <TypeformNavigation onPrevious={prevStep} onNext={nextStep} />
          </div>
        )

      case 'priceRange':
        return (
          <div className="space-y-10">
            <TypeformQuestion
              stepNumber={7}
              question="What's your typical price range?"
              description="Help organizers find vendors that match their budget (Optional)"
            >
              <div className="flex items-center gap-2 text-muted-foreground mt-2">
                <CurrencyDollar size={18} weight="duotone" />
              </div>
            </TypeformQuestion>
            <div className="space-y-3">
              {formOptions?.priceRanges.map((range, index) => (
                <OptionCard
                  key={range}
                  label={range.charAt(0).toUpperCase() + range.slice(1)}
                  isSelected={formData.priceRange === range}
                  onClick={() => updateField('priceRange', range)}
                  delay={index * 100}
                />
              ))}
            </div>
            <TypeformNavigation onPrevious={prevStep} onNext={nextStep} />
          </div>
        )

      case 'pastExperience':
        return (
          <div className="space-y-10">
            <TypeformQuestion
              stepNumber={8}
              question="Tell us about your experience"
              description="Share notable events, clients, or projects you've worked on (Optional)"
            />
            <TypeformTextarea
              placeholder="Describe your experience working with events..."
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
              stepNumber={9}
              question="Anything else you'd like to share?"
              description="Additional information, certifications, or notes (Optional)"
            />
            <TypeformTextarea
              placeholder="Any other information..."
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
              stepNumber={10}
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
              stepNumber={11}
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
              stepNumber={12}
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
              stepNumber={13}
              question="What's your phone number?"
              description="Optional, but helpful for quick questions."
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
              stepNumber={14}
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
                  <span className="text-muted-foreground">Category:</span>{' '}
                  <span className="font-medium">{formData.category}</span>
                </div>
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
                  <li>We may reach out for additional information if needed</li>
                  <li>Once approved, you'll be able to browse and apply to events</li>
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

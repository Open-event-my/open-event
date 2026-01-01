import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  X,
  Buildings,
  Medal,
  Shield,
  CurrencyDollar,
  Palette,
  CircleNotch,
} from '@phosphor-icons/react'

type Tab = 'basic' | 'sponsorship' | 'legal' | 'payment' | 'brand'

const TABS: { id: Tab; label: string; icon: typeof Buildings }[] = [
  { id: 'basic', label: 'Basic Info', icon: Buildings },
  { id: 'sponsorship', label: 'Sponsorship', icon: Medal },
  { id: 'legal', label: 'Legal & Contracts', icon: Shield },
  { id: 'payment', label: 'Payment & Exclusivity', icon: CurrencyDollar },
  { id: 'brand', label: 'Brand Guidelines', icon: Palette },
]

const SPONSOR_INDUSTRIES = [
  'technology',
  'finance',
  'healthcare',
  'education',
  'retail',
  'manufacturing',
  'media',
  'entertainment',
  'food_beverage',
  'automotive',
  'real_estate',
  'consulting',
  'other',
]

const SPONSORSHIP_TIERS = ['platinum', 'gold', 'silver', 'bronze', 'custom']

const APPLICATION_SOURCES = ['manual', 'email', 'import', 'referral', 'form']

interface AddSponsorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddSponsorModal({ open, onOpenChange }: AddSponsorModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('basic')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    description: '',
    industry: '',
    sponsorshipTiers: [] as string[],
    budgetMin: '',
    budgetMax: '',
    targetEventTypes: [] as string[],
    targetAudience: '',
    contactEmail: '',
    contactName: '',
    contactPhone: '',
    website: '',
    logoUrl: '',
    applicationSource: 'manual',
    applicationNotes: '',
    autoApprove: false,

    // Enterprise - Company Info
    companySize: '',
    yearFounded: '',
    headquarters: '',

    // Deliverables
    deliverablesOffered: [] as string[],

    // Contracts
    contractTemplateUrl: '',

    // Payment Terms
    paymentPreferredMethod: '',
    paymentNetDays: '',
    paymentRequiresInvoice: false,
    paymentCurrency: 'USD',
    paymentNotes: '',

    // Exclusivity
    exclusivityRequired: false,
    exclusivityCompetitors: '',
    exclusivityTerritory: '',
    exclusivityNotes: '',

    // Brand Guidelines
    brandGuidelinesUrl: '',
    brandLogoUsageNotes: '',
    brandColorCodes: '',
    brandProhibitedUsages: '',
  })

  const adminCreate = useMutation(api.sponsors.adminCreate)

  const updateField = (field: keyof typeof formData, value: string | string[] | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
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

  const toggleDeliverable = (deliverable: string) => {
    const newDeliverables = formData.deliverablesOffered.includes(deliverable)
      ? formData.deliverablesOffered.filter((d) => d !== deliverable)
      : [...formData.deliverablesOffered, deliverable]
    updateField('deliverablesOffered', newDeliverables)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Sponsor name is required')
      return
    }
    if (!formData.industry) {
      toast.error('Industry is required')
      return
    }

    setIsSubmitting(true)

    try {
      await adminCreate({
        // Basic Info
        name: formData.name,
        description: formData.description || undefined,
        industry: formData.industry,
        sponsorshipTiers:
          formData.sponsorshipTiers.length > 0 ? formData.sponsorshipTiers : undefined,
        budgetMin: formData.budgetMin ? parseInt(formData.budgetMin) : undefined,
        budgetMax: formData.budgetMax ? parseInt(formData.budgetMax) : undefined,
        targetEventTypes:
          formData.targetEventTypes.length > 0 ? formData.targetEventTypes : undefined,
        targetAudience: formData.targetAudience || undefined,
        contactEmail: formData.contactEmail || undefined,
        contactName: formData.contactName || undefined,
        contactPhone: formData.contactPhone || undefined,
        website: formData.website || undefined,
        logoUrl: formData.logoUrl || undefined,
        applicationSource: formData.applicationSource || undefined,
        applicationNotes: formData.applicationNotes || undefined,
        autoApprove: formData.autoApprove,

        // Enterprise - Company Info
        companySize: formData.companySize || undefined,
        yearFounded: formData.yearFounded ? parseInt(formData.yearFounded) : undefined,
        headquarters: formData.headquarters || undefined,

        // Deliverables
        deliverablesOffered:
          formData.deliverablesOffered.length > 0 ? formData.deliverablesOffered : undefined,

        // Contracts
        contractTemplateUrl: formData.contractTemplateUrl || undefined,

        // Payment Terms
        paymentTerms:
          formData.paymentPreferredMethod ||
          formData.paymentNetDays ||
          formData.paymentRequiresInvoice
            ? {
                preferredMethod: formData.paymentPreferredMethod || undefined,
                netDays: formData.paymentNetDays ? parseInt(formData.paymentNetDays) : undefined,
                requiresInvoice: formData.paymentRequiresInvoice || undefined,
                currency: formData.paymentCurrency || undefined,
                notes: formData.paymentNotes || undefined,
              }
            : undefined,

        // Exclusivity
        exclusivityRequirements: formData.exclusivityRequired
          ? {
              requiresExclusivity: formData.exclusivityRequired,
              competitorRestrictions: formData.exclusivityCompetitors
                ? formData.exclusivityCompetitors.split(',').map((c) => c.trim())
                : undefined,
              territorialScope: formData.exclusivityTerritory || undefined,
              notes: formData.exclusivityNotes || undefined,
            }
          : undefined,

        // Brand Guidelines
        brandGuidelines:
          formData.brandGuidelinesUrl || formData.brandLogoUsageNotes
            ? {
                guidelinesUrl: formData.brandGuidelinesUrl || undefined,
                logoUsageNotes: formData.brandLogoUsageNotes || undefined,
                colorCodes: formData.brandColorCodes
                  ? formData.brandColorCodes.split(',').map((c) => c.trim())
                  : undefined,
                prohibitedUsages: formData.brandProhibitedUsages
                  ? formData.brandProhibitedUsages.split(',').map((p) => p.trim())
                  : undefined,
              }
            : undefined,
      })

      toast.success(
        formData.autoApprove ? 'Sponsor created and approved' : 'Sponsor created successfully'
      )
      onOpenChange(false)
      resetForm()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create sponsor')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      industry: '',
      sponsorshipTiers: [],
      budgetMin: '',
      budgetMax: '',
      targetEventTypes: [],
      targetAudience: '',
      contactEmail: '',
      contactName: '',
      contactPhone: '',
      website: '',
      logoUrl: '',
      applicationSource: 'manual',
      applicationNotes: '',
      autoApprove: false,
      companySize: '',
      yearFounded: '',
      headquarters: '',
      deliverablesOffered: [],
      contractTemplateUrl: '',
      paymentPreferredMethod: '',
      paymentNetDays: '',
      paymentRequiresInvoice: false,
      paymentCurrency: 'USD',
      paymentNotes: '',
      exclusivityRequired: false,
      exclusivityCompetitors: '',
      exclusivityTerritory: '',
      exclusivityNotes: '',
      brandGuidelinesUrl: '',
      brandLogoUsageNotes: '',
      brandColorCodes: '',
      brandProhibitedUsages: '',
    })
    setActiveTab('basic')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="relative bg-background rounded-xl border border-border w-full max-w-3xl mx-4 shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Add New Sponsor</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 rounded-lg hover:bg-muted transition-colors"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-2 border-b border-border bg-muted/30 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                  activeTab === tab.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon size={16} weight="duotone" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Company Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Sponsor company name"
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border border-border bg-background',
                      'text-sm placeholder:text-muted-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20'
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Industry <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={formData.industry}
                    onChange={(e) => updateField('industry', e.target.value)}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border border-border bg-background',
                      'text-sm focus:outline-none focus:ring-2 focus:ring-primary/20'
                    )}
                  >
                    <option value="">Select industry</option>
                    {SPONSOR_INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind.charAt(0).toUpperCase() + ind.slice(1).replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="About this sponsor..."
                  rows={3}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border border-border bg-background',
                    'text-sm placeholder:text-muted-foreground resize-none',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20'
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Contact Name</label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => updateField('contactName', e.target.value)}
                    placeholder="John Doe"
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border border-border bg-background',
                      'text-sm placeholder:text-muted-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20'
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Email</label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => updateField('contactEmail', e.target.value)}
                    placeholder="contact@sponsor.com"
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border border-border bg-background',
                      'text-sm placeholder:text-muted-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20'
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => updateField('contactPhone', e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border border-border bg-background',
                      'text-sm placeholder:text-muted-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20'
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Website</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => updateField('website', e.target.value)}
                    placeholder="https://sponsor.com"
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border border-border bg-background',
                      'text-sm placeholder:text-muted-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20'
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Logo URL</label>
                  <input
                    type="url"
                    value={formData.logoUrl}
                    onChange={(e) => updateField('logoUrl', e.target.value)}
                    placeholder="https://..."
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border border-border bg-background',
                      'text-sm placeholder:text-muted-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20'
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Company Size</label>
                  <input
                    type="text"
                    value={formData.companySize}
                    onChange={(e) => updateField('companySize', e.target.value)}
                    placeholder="100-500 employees"
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border border-border bg-background',
                      'text-sm placeholder:text-muted-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20'
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Year Founded</label>
                  <input
                    type="number"
                    value={formData.yearFounded}
                    onChange={(e) => updateField('yearFounded', e.target.value)}
                    placeholder="2010"
                    min="1900"
                    max={new Date().getFullYear()}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border border-border bg-background',
                      'text-sm placeholder:text-muted-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20'
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Application Source</label>
                  <select
                    value={formData.applicationSource}
                    onChange={(e) => updateField('applicationSource', e.target.value)}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border border-border bg-background',
                      'text-sm focus:outline-none focus:ring-2 focus:ring-primary/20'
                    )}
                  >
                    {APPLICATION_SOURCES.map((source) => (
                      <option key={source} value={source}>
                        {source.charAt(0).toUpperCase() + source.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Internal Notes</label>
                <textarea
                  value={formData.applicationNotes}
                  onChange={(e) => updateField('applicationNotes', e.target.value)}
                  placeholder="Internal notes about this sponsor..."
                  rows={2}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border border-border bg-background',
                    'text-sm placeholder:text-muted-foreground resize-none',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20'
                  )}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoApprove"
                  checked={formData.autoApprove}
                  onChange={(e) => updateField('autoApprove', e.target.checked)}
                  className="w-4 h-4 rounded border-border"
                />
                <label htmlFor="autoApprove" className="text-sm font-medium">
                  Auto-approve this sponsor
                </label>
              </div>
            </div>
          )}

          {/* Sponsorship Tab */}
          {activeTab === 'sponsorship' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Sponsorship Tiers</label>
                <div className="flex flex-wrap gap-2">
                  {SPONSORSHIP_TIERS.map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => toggleTier(tier)}
                      className={cn(
                        'px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                        formData.sponsorshipTiers.includes(tier)
                          ? 'border-purple-500 bg-purple-500/10 text-purple-600'
                          : 'border-border hover:border-purple-500/50'
                      )}
                    >
                      {tier.charAt(0).toUpperCase() + tier.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Budget Min ($)</label>
                  <input
                    type="number"
                    value={formData.budgetMin}
                    onChange={(e) => updateField('budgetMin', e.target.value)}
                    placeholder="5000"
                    min="0"
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border border-border bg-background',
                      'text-sm placeholder:text-muted-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20'
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Budget Max ($)</label>
                  <input
                    type="number"
                    value={formData.budgetMax}
                    onChange={(e) => updateField('budgetMax', e.target.value)}
                    placeholder="50000"
                    min="0"
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border border-border bg-background',
                      'text-sm placeholder:text-muted-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20'
                    )}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Target Event Types</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    'Conference',
                    'Trade Show',
                    'Festival',
                    'Concert',
                    'Sports Event',
                    'Charity Gala',
                    'Corporate Event',
                    'Community Event',
                    'Workshop',
                  ].map((eventType) => (
                    <button
                      key={eventType}
                      type="button"
                      onClick={() => toggleEventType(eventType)}
                      className={cn(
                        'px-3 py-2 rounded-lg border text-sm transition-colors text-left',
                        formData.targetEventTypes.includes(eventType)
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      {eventType}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Target Audience</label>
                <input
                  type="text"
                  value={formData.targetAudience}
                  onChange={(e) => updateField('targetAudience', e.target.value)}
                  placeholder="Tech professionals, startups, etc."
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border border-border bg-background',
                    'text-sm placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20'
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Deliverables Offered</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Logo Placement',
                    'Speaking Slot',
                    'Booth Space',
                    'Product Demo',
                    'Networking Event',
                    'Branded Materials',
                    'Social Media',
                    'Email Marketing',
                    'VIP Access',
                  ].map((deliverable) => (
                    <button
                      key={deliverable}
                      type="button"
                      onClick={() => toggleDeliverable(deliverable)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg border text-sm transition-colors',
                        formData.deliverablesOffered.includes(deliverable)
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      {deliverable}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Legal & Contracts Tab */}
          {activeTab === 'legal' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Contract Template URL</label>
                <input
                  type="url"
                  value={formData.contractTemplateUrl}
                  onChange={(e) => updateField('contractTemplateUrl', e.target.value)}
                  placeholder="https://..."
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border border-border bg-background',
                    'text-sm placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20'
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Headquarters</label>
                <input
                  type="text"
                  value={formData.headquarters}
                  onChange={(e) => updateField('headquarters', e.target.value)}
                  placeholder="San Francisco, CA"
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border border-border bg-background',
                    'text-sm placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20'
                  )}
                />
              </div>

              <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                <p>
                  Legal documents can be added after the sponsor is created through the edit
                  interface.
                </p>
              </div>
            </div>
          )}

          {/* Payment & Exclusivity Tab */}
          {activeTab === 'payment' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Payment Terms</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Preferred Method</label>
                    <select
                      value={formData.paymentPreferredMethod}
                      onChange={(e) => updateField('paymentPreferredMethod', e.target.value)}
                      className={cn(
                        'w-full px-3 py-2 rounded-lg border border-border bg-background',
                        'text-sm focus:outline-none focus:ring-2 focus:ring-primary/20'
                      )}
                    >
                      <option value="">Select method</option>
                      <option value="wire">Wire Transfer</option>
                      <option value="ach">ACH</option>
                      <option value="check">Check</option>
                      <option value="credit_card">Credit Card</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Net Days</label>
                    <input
                      type="number"
                      value={formData.paymentNetDays}
                      onChange={(e) => updateField('paymentNetDays', e.target.value)}
                      placeholder="30"
                      min="0"
                      className={cn(
                        'w-full px-3 py-2 rounded-lg border border-border bg-background',
                        'text-sm placeholder:text-muted-foreground',
                        'focus:outline-none focus:ring-2 focus:ring-primary/20'
                      )}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="requiresInvoice"
                    checked={formData.paymentRequiresInvoice}
                    onChange={(e) => updateField('paymentRequiresInvoice', e.target.checked)}
                    className="w-4 h-4 rounded border-border"
                  />
                  <label htmlFor="requiresInvoice" className="text-sm font-medium">
                    Requires invoice
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Payment Notes</label>
                  <textarea
                    value={formData.paymentNotes}
                    onChange={(e) => updateField('paymentNotes', e.target.value)}
                    placeholder="Additional payment notes..."
                    rows={2}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border border-border bg-background',
                      'text-sm placeholder:text-muted-foreground resize-none',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20'
                    )}
                  />
                </div>
              </div>

              <div className="border-t border-border pt-6 space-y-4">
                <h3 className="font-medium">Exclusivity Requirements</h3>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="exclusivityRequired"
                    checked={formData.exclusivityRequired}
                    onChange={(e) => updateField('exclusivityRequired', e.target.checked)}
                    className="w-4 h-4 rounded border-border"
                  />
                  <label htmlFor="exclusivityRequired" className="text-sm font-medium">
                    Requires exclusivity
                  </label>
                </div>

                {formData.exclusivityRequired && (
                  <div className="ml-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        Competitor Restrictions (comma separated)
                      </label>
                      <input
                        type="text"
                        value={formData.exclusivityCompetitors}
                        onChange={(e) => updateField('exclusivityCompetitors', e.target.value)}
                        placeholder="Competitor A, Competitor B"
                        className={cn(
                          'w-full px-3 py-2 rounded-lg border border-border bg-background',
                          'text-sm placeholder:text-muted-foreground',
                          'focus:outline-none focus:ring-2 focus:ring-primary/20'
                        )}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1.5">Territorial Scope</label>
                      <input
                        type="text"
                        value={formData.exclusivityTerritory}
                        onChange={(e) => updateField('exclusivityTerritory', e.target.value)}
                        placeholder="North America, Global, etc."
                        className={cn(
                          'w-full px-3 py-2 rounded-lg border border-border bg-background',
                          'text-sm placeholder:text-muted-foreground',
                          'focus:outline-none focus:ring-2 focus:ring-primary/20'
                        )}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1.5">Exclusivity Notes</label>
                      <textarea
                        value={formData.exclusivityNotes}
                        onChange={(e) => updateField('exclusivityNotes', e.target.value)}
                        placeholder="Additional exclusivity details..."
                        rows={2}
                        className={cn(
                          'w-full px-3 py-2 rounded-lg border border-border bg-background',
                          'text-sm placeholder:text-muted-foreground resize-none',
                          'focus:outline-none focus:ring-2 focus:ring-primary/20'
                        )}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Brand Guidelines Tab */}
          {activeTab === 'brand' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Brand Guidelines URL</label>
                <input
                  type="url"
                  value={formData.brandGuidelinesUrl}
                  onChange={(e) => updateField('brandGuidelinesUrl', e.target.value)}
                  placeholder="https://..."
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border border-border bg-background',
                    'text-sm placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20'
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Logo Usage Notes</label>
                <textarea
                  value={formData.brandLogoUsageNotes}
                  onChange={(e) => updateField('brandLogoUsageNotes', e.target.value)}
                  placeholder="Notes on how the logo should be used..."
                  rows={3}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border border-border bg-background',
                    'text-sm placeholder:text-muted-foreground resize-none',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20'
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Brand Colors (comma separated hex codes)
                </label>
                <input
                  type="text"
                  value={formData.brandColorCodes}
                  onChange={(e) => updateField('brandColorCodes', e.target.value)}
                  placeholder="#FF5733, #3498DB, #2ECC71"
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border border-border bg-background',
                    'text-sm placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20'
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Prohibited Usages (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.brandProhibitedUsages}
                  onChange={(e) => updateField('brandProhibitedUsages', e.target.value)}
                  placeholder="No stretching, No color alterations"
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border border-border bg-background',
                    'text-sm placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20'
                  )}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg',
              'bg-primary text-primary-foreground text-sm font-medium',
              'hover:bg-primary/90 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <>
                <CircleNotch size={16} weight="bold" className="animate-spin" />
                Creating...
              </>
            ) : (
              'Create Sponsor'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

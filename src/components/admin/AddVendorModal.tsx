import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { X, Buildings, Package, Shield, CurrencyDollar, CircleNotch } from '@phosphor-icons/react'

type Tab = 'basic' | 'services' | 'legal' | 'payment'

const TABS: { id: Tab; label: string; icon: typeof Buildings }[] = [
  { id: 'basic', label: 'Basic Info', icon: Buildings },
  { id: 'services', label: 'Services', icon: Package },
  { id: 'legal', label: 'Legal & Insurance', icon: Shield },
  { id: 'payment', label: 'Payment Terms', icon: CurrencyDollar },
]

const VENDOR_CATEGORIES = [
  'catering',
  'av',
  'photography',
  'videography',
  'security',
  'transportation',
  'decoration',
  'entertainment',
  'staffing',
  'equipment',
  'venue',
  'other',
]

const PRICE_RANGES = ['budget', 'mid', 'premium']

const APPLICATION_SOURCES = ['manual', 'email', 'import', 'referral', 'form']

interface AddVendorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddVendorModal({ open, onOpenChange }: AddVendorModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('basic')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    description: '',
    category: '',
    services: [] as string[],
    location: '',
    priceRange: '',
    contactEmail: '',
    contactPhone: '',
    contactName: '',
    website: '',
    logoUrl: '',
    applicationSource: 'manual',
    applicationNotes: '',
    autoApprove: false,

    // Enterprise - Company Info
    companySize: '',
    yearFounded: '',
    headquarters: '',

    // Insurance
    insuranceProvider: '',
    insurancePolicyNumber: '',
    insuranceCoverageAmount: '',
    insuranceExpirationDate: '',
    insuranceCertificateUrl: '',

    // Payment Terms
    paymentAcceptedMethods: [] as string[],
    paymentRequiresDeposit: false,
    paymentDepositPercentage: '',
    paymentNetDays: '',
    paymentNotes: '',

    // Capacity
    maxEventsPerMonth: '',
    teamSize: '',
    serviceArea: '',
  })

  const adminCreate = useMutation(api.vendors.adminCreate)

  const updateField = (field: keyof typeof formData, value: string | string[] | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const toggleService = (service: string) => {
    const newServices = formData.services.includes(service)
      ? formData.services.filter((s) => s !== service)
      : [...formData.services, service]
    updateField('services', newServices)
  }

  const togglePaymentMethod = (method: string) => {
    const newMethods = formData.paymentAcceptedMethods.includes(method)
      ? formData.paymentAcceptedMethods.filter((m) => m !== method)
      : [...formData.paymentAcceptedMethods, method]
    updateField('paymentAcceptedMethods', newMethods)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Vendor name is required')
      return
    }
    if (!formData.category) {
      toast.error('Category is required')
      return
    }

    setIsSubmitting(true)

    try {
      await adminCreate({
        // Basic Info
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category,
        services: formData.services.length > 0 ? formData.services : undefined,
        location: formData.location || undefined,
        priceRange: formData.priceRange || undefined,
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
        contactName: formData.contactName || undefined,
        website: formData.website || undefined,
        logoUrl: formData.logoUrl || undefined,
        applicationSource: formData.applicationSource || undefined,
        applicationNotes: formData.applicationNotes || undefined,
        autoApprove: formData.autoApprove,

        // Enterprise - Company Info
        companySize: formData.companySize || undefined,
        yearFounded: formData.yearFounded ? parseInt(formData.yearFounded) : undefined,
        headquarters: formData.headquarters || undefined,

        // Insurance
        insuranceInfo: formData.insuranceProvider
          ? {
              provider: formData.insuranceProvider || undefined,
              policyNumber: formData.insurancePolicyNumber || undefined,
              coverageAmount: formData.insuranceCoverageAmount
                ? parseInt(formData.insuranceCoverageAmount)
                : undefined,
              expirationDate: formData.insuranceExpirationDate
                ? new Date(formData.insuranceExpirationDate).getTime()
                : undefined,
              certificateUrl: formData.insuranceCertificateUrl || undefined,
            }
          : undefined,

        // Payment Terms
        paymentTerms:
          formData.paymentAcceptedMethods.length > 0 || formData.paymentRequiresDeposit
            ? {
                acceptedMethods:
                  formData.paymentAcceptedMethods.length > 0
                    ? formData.paymentAcceptedMethods
                    : undefined,
                requiresDeposit: formData.paymentRequiresDeposit || undefined,
                depositPercentage: formData.paymentDepositPercentage
                  ? parseInt(formData.paymentDepositPercentage)
                  : undefined,
                netDays: formData.paymentNetDays ? parseInt(formData.paymentNetDays) : undefined,
                notes: formData.paymentNotes || undefined,
              }
            : undefined,

        // Capacity
        capacity:
          formData.maxEventsPerMonth || formData.teamSize || formData.serviceArea
            ? {
                maxEventsPerMonth: formData.maxEventsPerMonth
                  ? parseInt(formData.maxEventsPerMonth)
                  : undefined,
                teamSize: formData.teamSize ? parseInt(formData.teamSize) : undefined,
                serviceArea: formData.serviceArea || undefined,
              }
            : undefined,
      })

      toast.success(
        formData.autoApprove ? 'Vendor created and approved' : 'Vendor created successfully'
      )
      onOpenChange(false)
      resetForm()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create vendor')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      services: [],
      location: '',
      priceRange: '',
      contactEmail: '',
      contactPhone: '',
      contactName: '',
      website: '',
      logoUrl: '',
      applicationSource: 'manual',
      applicationNotes: '',
      autoApprove: false,
      companySize: '',
      yearFounded: '',
      headquarters: '',
      insuranceProvider: '',
      insurancePolicyNumber: '',
      insuranceCoverageAmount: '',
      insuranceExpirationDate: '',
      insuranceCertificateUrl: '',
      paymentAcceptedMethods: [],
      paymentRequiresDeposit: false,
      paymentDepositPercentage: '',
      paymentNetDays: '',
      paymentNotes: '',
      maxEventsPerMonth: '',
      teamSize: '',
      serviceArea: '',
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
          <h2 className="text-lg font-semibold">Add New Vendor</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 rounded-lg hover:bg-muted transition-colors"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-2 border-b border-border bg-muted/30">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
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
                    placeholder="Vendor company name"
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border border-border bg-background',
                      'text-sm placeholder:text-muted-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20'
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Category <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => updateField('category', e.target.value)}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border border-border bg-background',
                      'text-sm focus:outline-none focus:ring-2 focus:ring-primary/20'
                    )}
                  >
                    <option value="">Select category</option>
                    {VENDOR_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
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
                  placeholder="About this vendor..."
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
                    placeholder="contact@vendor.com"
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
                    placeholder="https://vendor.com"
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border border-border bg-background',
                      'text-sm placeholder:text-muted-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20'
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    placeholder="New York, NY"
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
                  <label className="block text-sm font-medium mb-1.5">Price Range</label>
                  <select
                    value={formData.priceRange}
                    onChange={(e) => updateField('priceRange', e.target.value)}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border border-border bg-background',
                      'text-sm focus:outline-none focus:ring-2 focus:ring-primary/20'
                    )}
                  >
                    <option value="">Select range</option>
                    {PRICE_RANGES.map((range) => (
                      <option key={range} value={range}>
                        {range.charAt(0).toUpperCase() + range.slice(1)}
                      </option>
                    ))}
                  </select>
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

                <div>
                  <label className="block text-sm font-medium mb-1.5">Company Size</label>
                  <input
                    type="text"
                    value={formData.companySize}
                    onChange={(e) => updateField('companySize', e.target.value)}
                    placeholder="10-50 employees"
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border border-border bg-background',
                      'text-sm placeholder:text-muted-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20'
                    )}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Internal Notes</label>
                <textarea
                  value={formData.applicationNotes}
                  onChange={(e) => updateField('applicationNotes', e.target.value)}
                  placeholder="Internal notes about this vendor..."
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
                  Auto-approve this vendor
                </label>
              </div>
            </div>
          )}

          {/* Services Tab */}
          {activeTab === 'services' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Services Offered</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    'Setup & Installation',
                    'On-site Support',
                    'Equipment Rental',
                    'Design Services',
                    'Consultation',
                    'Full Service',
                    'Delivery',
                    'Cleanup',
                    'Custom Solutions',
                    'Training',
                    'Maintenance',
                    'Emergency Support',
                  ].map((service) => (
                    <button
                      key={service}
                      type="button"
                      onClick={() => toggleService(service)}
                      className={cn(
                        'px-3 py-2 rounded-lg border text-sm transition-colors text-left',
                        formData.services.includes(service)
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      {service}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Max Events/Month</label>
                  <input
                    type="number"
                    value={formData.maxEventsPerMonth}
                    onChange={(e) => updateField('maxEventsPerMonth', e.target.value)}
                    placeholder="10"
                    min="1"
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border border-border bg-background',
                      'text-sm placeholder:text-muted-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20'
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Team Size</label>
                  <input
                    type="number"
                    value={formData.teamSize}
                    onChange={(e) => updateField('teamSize', e.target.value)}
                    placeholder="25"
                    min="1"
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border border-border bg-background',
                      'text-sm placeholder:text-muted-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20'
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Service Area</label>
                  <input
                    type="text"
                    value={formData.serviceArea}
                    onChange={(e) => updateField('serviceArea', e.target.value)}
                    placeholder="Nationwide"
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border border-border bg-background',
                      'text-sm placeholder:text-muted-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20'
                    )}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Legal & Insurance Tab */}
          {activeTab === 'legal' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <h3 className="font-medium mb-3">Insurance Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Provider</label>
                    <input
                      type="text"
                      value={formData.insuranceProvider}
                      onChange={(e) => updateField('insuranceProvider', e.target.value)}
                      placeholder="Insurance company name"
                      className={cn(
                        'w-full px-3 py-2 rounded-lg border border-border bg-background',
                        'text-sm placeholder:text-muted-foreground',
                        'focus:outline-none focus:ring-2 focus:ring-primary/20'
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Policy Number</label>
                    <input
                      type="text"
                      value={formData.insurancePolicyNumber}
                      onChange={(e) => updateField('insurancePolicyNumber', e.target.value)}
                      placeholder="POL-12345"
                      className={cn(
                        'w-full px-3 py-2 rounded-lg border border-border bg-background',
                        'text-sm placeholder:text-muted-foreground',
                        'focus:outline-none focus:ring-2 focus:ring-primary/20'
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Coverage Amount ($)</label>
                    <input
                      type="number"
                      value={formData.insuranceCoverageAmount}
                      onChange={(e) => updateField('insuranceCoverageAmount', e.target.value)}
                      placeholder="1000000"
                      min="0"
                      className={cn(
                        'w-full px-3 py-2 rounded-lg border border-border bg-background',
                        'text-sm placeholder:text-muted-foreground',
                        'focus:outline-none focus:ring-2 focus:ring-primary/20'
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Expiration Date</label>
                    <input
                      type="date"
                      value={formData.insuranceExpirationDate}
                      onChange={(e) => updateField('insuranceExpirationDate', e.target.value)}
                      className={cn(
                        'w-full px-3 py-2 rounded-lg border border-border bg-background',
                        'text-sm focus:outline-none focus:ring-2 focus:ring-primary/20'
                      )}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1.5">Certificate URL</label>
                  <input
                    type="url"
                    value={formData.insuranceCertificateUrl}
                    onChange={(e) => updateField('insuranceCertificateUrl', e.target.value)}
                    placeholder="https://..."
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
                  <label className="block text-sm font-medium mb-1.5">Year Founded</label>
                  <input
                    type="number"
                    value={formData.yearFounded}
                    onChange={(e) => updateField('yearFounded', e.target.value)}
                    placeholder="2015"
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
                  <label className="block text-sm font-medium mb-1.5">Headquarters</label>
                  <input
                    type="text"
                    value={formData.headquarters}
                    onChange={(e) => updateField('headquarters', e.target.value)}
                    placeholder="New York, NY"
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border border-border bg-background',
                      'text-sm placeholder:text-muted-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20'
                    )}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Payment Terms Tab */}
          {activeTab === 'payment' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Accepted Payment Methods</label>
                <div className="flex flex-wrap gap-2">
                  {['Credit Card', 'Bank Transfer', 'Check', 'ACH', 'Wire', 'PayPal', 'Cash'].map(
                    (method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => togglePaymentMethod(method)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg border text-sm transition-colors',
                          formData.paymentAcceptedMethods.includes(method)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        {method}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requiresDeposit"
                  checked={formData.paymentRequiresDeposit}
                  onChange={(e) => updateField('paymentRequiresDeposit', e.target.checked)}
                  className="w-4 h-4 rounded border-border"
                />
                <label htmlFor="requiresDeposit" className="text-sm font-medium">
                  Requires deposit
                </label>
              </div>

              {formData.paymentRequiresDeposit && (
                <div className="ml-6">
                  <label className="block text-sm font-medium mb-1.5">Deposit Percentage</label>
                  <input
                    type="number"
                    value={formData.paymentDepositPercentage}
                    onChange={(e) => updateField('paymentDepositPercentage', e.target.value)}
                    placeholder="50"
                    min="1"
                    max="100"
                    className={cn(
                      'w-32 px-3 py-2 rounded-lg border border-border bg-background',
                      'text-sm placeholder:text-muted-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20'
                    )}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1.5">Payment Terms (Net Days)</label>
                <input
                  type="number"
                  value={formData.paymentNetDays}
                  onChange={(e) => updateField('paymentNetDays', e.target.value)}
                  placeholder="30"
                  min="0"
                  className={cn(
                    'w-32 px-3 py-2 rounded-lg border border-border bg-background',
                    'text-sm placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20'
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Payment Notes</label>
                <textarea
                  value={formData.paymentNotes}
                  onChange={(e) => updateField('paymentNotes', e.target.value)}
                  placeholder="Additional payment terms or notes..."
                  rows={3}
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
              'Create Vendor'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

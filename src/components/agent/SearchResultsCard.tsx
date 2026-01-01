import { cn } from '@/lib/utils'
import {
  Storefront,
  Handshake,
  Star,
  CheckCircle,
  MapPin,
  CurrencyDollar,
} from '@phosphor-icons/react'

interface VendorResult {
  id: string
  name: string
  category: string
  description?: string
  rating?: number
  priceRange?: string
  location?: string
  verified: boolean
}

interface SponsorResult {
  id: string
  name: string
  industry: string
  description?: string
  budgetRange?: string
  sponsorshipTiers?: string[]
  verified: boolean
}

interface SearchResultsCardProps {
  type: 'vendors' | 'sponsors'
  results: VendorResult[] | SponsorResult[]
  onSelect?: (id: string) => void
  className?: string
}

export function SearchResultsCard({ type, results, onSelect, className }: SearchResultsCardProps) {
  if (results.length === 0) {
    return (
      <div className={cn('p-4 rounded-lg bg-muted/50 text-center', className)}>
        <p className="text-sm text-muted-foreground">
          No {type} found matching your criteria. The marketplace is still growing!
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs text-muted-foreground mb-2">
        Found {results.length} {type}:
      </p>
      <div className="grid grid-cols-1 gap-2">
        {type === 'vendors'
          ? (results as VendorResult[]).map((vendor) => (
              <VendorCard key={vendor.id} vendor={vendor} onSelect={onSelect} />
            ))
          : (results as SponsorResult[]).map((sponsor) => (
              <SponsorCard key={sponsor.id} sponsor={sponsor} onSelect={onSelect} />
            ))}
      </div>
    </div>
  )
}

function VendorCard({
  vendor,
  onSelect,
}: {
  vendor: VendorResult
  onSelect?: (id: string) => void
}) {
  return (
    <button
      onClick={() => onSelect?.(vendor.id)}
      className={cn(
        'w-full flex items-start gap-3 p-3 rounded-lg border border-border bg-card text-left',
        'hover:border-primary/20 hover:bg-muted/30 transition-colors cursor-pointer'
      )}
    >
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Storefront size={18} weight="duotone" className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{vendor.name}</span>
          {vendor.verified && (
            <CheckCircle size={14} weight="fill" className="text-blue-500 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="capitalize">{vendor.category}</span>
          {vendor.rating && vendor.rating > 0 && (
            <span className="inline-flex items-center gap-1">
              <Star size={12} weight="fill" className="text-amber-500" />
              {vendor.rating.toFixed(1)}
            </span>
          )}
          {vendor.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} />
              {vendor.location}
            </span>
          )}
        </div>
      </div>
      {vendor.priceRange && (
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
          {vendor.priceRange}
        </span>
      )}
    </button>
  )
}

function SponsorCard({
  sponsor,
  onSelect,
}: {
  sponsor: SponsorResult
  onSelect?: (id: string) => void
}) {
  return (
    <button
      onClick={() => onSelect?.(sponsor.id)}
      className={cn(
        'w-full flex items-start gap-3 p-3 rounded-lg border border-border bg-card text-left',
        'hover:border-primary/20 hover:bg-muted/30 transition-colors cursor-pointer'
      )}
    >
      <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
        <Handshake size={18} weight="duotone" className="text-amber-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{sponsor.name}</span>
          {sponsor.verified && (
            <CheckCircle size={14} weight="fill" className="text-blue-500 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="capitalize">{sponsor.industry}</span>
          {sponsor.budgetRange && (
            <span className="inline-flex items-center gap-1">
              <CurrencyDollar size={12} />
              {sponsor.budgetRange}
            </span>
          )}
        </div>
        {sponsor.sponsorshipTiers && sponsor.sponsorshipTiers.length > 0 && (
          <div className="flex gap-1 mt-1.5">
            {sponsor.sponsorshipTiers.slice(0, 3).map((tier) => (
              <span key={tier} className="text-xs bg-muted px-1.5 py-0.5 rounded capitalize">
                {tier}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  )
}

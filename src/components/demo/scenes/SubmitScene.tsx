import { cn } from '@/lib/utils'
import { Handshake, CaretDown, PaperPlaneTilt } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'

interface SubmitSceneProps {
  progress: number // 0-1
}

export function SubmitScene({ progress }: SubmitSceneProps) {
  // Animation timeline based on progress
  const showCard = progress > 0.05
  const showHeader = progress > 0.1
  const showCompanyField = progress > 0.15
  const typingCompany = progress > 0.2 && progress < 0.4
  const companyComplete = progress > 0.4
  const showTierField = progress > 0.45
  const tierSelected = progress > 0.55
  const showBudgetField = progress > 0.6
  const budgetComplete = progress > 0.7
  const showInterests = progress > 0.75
  const showSubmitButton = progress > 0.8
  const buttonClicked = progress > 0.9

  return (
    <div className="w-full max-w-md">
      {/* Form Card */}
      <div
        className={cn(
          'bg-card border rounded-xl shadow-lg overflow-hidden transition-all duration-500',
          showCard ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center gap-3 p-4 border-b bg-muted/30 transition-all duration-300',
            showHeader ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          )}
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Handshake size={20} weight="duotone" className="text-primary" />
          </div>
          <div>
            <h3 className="font-mono font-semibold text-sm">Sponsor Application</h3>
            <p className="text-xs text-muted-foreground">Tech Conference 2025</p>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-4 space-y-4">
          {/* Company Name Field */}
          <div
            className={cn(
              'space-y-1.5 transition-all duration-300',
              showCompanyField ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            )}
          >
            <label className="text-xs font-medium text-muted-foreground">Company Name</label>
            <div className="h-9 px-3 rounded-md border bg-background flex items-center">
              <span
                className={cn(
                  'font-mono text-sm transition-all',
                  companyComplete ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {companyComplete ? 'Acme Corp' : typingCompany ? 'Acme Co|' : ''}
              </span>
              {typingCompany && <span className="animate-pulse ml-0.5 w-0.5 h-4 bg-primary" />}
            </div>
          </div>

          {/* Tier Selection */}
          <div
            className={cn(
              'space-y-1.5 transition-all duration-300',
              showTierField ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            )}
          >
            <label className="text-xs font-medium text-muted-foreground">Sponsorship Tier</label>
            <div
              className={cn(
                'h-9 px-3 rounded-md border bg-background flex items-center justify-between transition-colors',
                tierSelected && 'border-primary'
              )}
            >
              <span
                className={cn(
                  'text-sm transition-all',
                  tierSelected ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}
              >
                {tierSelected ? 'Gold Tier' : 'Select tier...'}
              </span>
              <CaretDown size={14} className="text-muted-foreground" />
            </div>
          </div>

          {/* Budget */}
          <div
            className={cn(
              'space-y-1.5 transition-all duration-300',
              showBudgetField ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            )}
          >
            <label className="text-xs font-medium text-muted-foreground">Budget</label>
            <div className="h-9 px-3 rounded-md border bg-background flex items-center">
              <span
                className={cn(
                  'font-mono text-sm',
                  budgetComplete ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {budgetComplete ? '$50,000' : '$'}
              </span>
            </div>
          </div>

          {/* Interests */}
          <div
            className={cn(
              'space-y-1.5 transition-all duration-300',
              showInterests ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            )}
          >
            <label className="text-xs font-medium text-muted-foreground">Interests</label>
            <div className="flex gap-2">
              <Badge variant="secondary" className="text-xs">
                Tech
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Innovation
              </Badge>
            </div>
          </div>

          {/* Submit Button */}
          <div
            className={cn(
              'pt-2 transition-all duration-300',
              showSubmitButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            )}
          >
            <button
              className={cn(
                'w-full h-10 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200',
                buttonClicked
                  ? 'bg-primary/80 text-primary-foreground scale-95'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
            >
              <PaperPlaneTilt size={16} weight="duotone" />
              Submit Application
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

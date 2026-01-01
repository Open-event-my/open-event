import { useState } from 'react'
import { TypeformQuestion, TypeformNavigation, TypeformInput } from '@/components/typeform'
import { OptionCard } from '@/components/onboarding'
import { Buildings, Heart, Bank, Users } from '@phosphor-icons/react'
import type { StepProps, OrganizationType } from '@/types/onboarding'

const orgTypes: { value: OrganizationType; label: string; icon: typeof Buildings }[] = [
  { value: 'company', label: 'Company', icon: Buildings },
  { value: 'nonprofit', label: 'Non-profit', icon: Heart },
  { value: 'government', label: 'Government', icon: Bank },
  { value: 'community', label: 'Community / Indie', icon: Users },
]

export function OrganizationStep({ onNext, onBack, currentData }: StepProps) {
  const [name, setName] = useState(currentData.organizationName || '')
  const [type, setType] = useState<OrganizationType | undefined>(currentData.organizationType)

  const canContinue = name.trim().length > 0 && type

  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-10">
      <TypeformQuestion
        stepNumber={2}
        question="Tell us about your organization"
        description="This helps us tailor the experience for you."
      />

      <div className="space-y-6 sm:space-y-8">
        <TypeformInput
          placeholder="Your organization name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        <div className="space-y-3">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground">Organization type</p>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {orgTypes.map((org, index) => (
              <OptionCard
                key={org.value}
                label={org.label}
                icon={org.icon}
                isSelected={type === org.value}
                onClick={() => setType(org.value)}
                delay={(index + 1) * 75}
                compact
              />
            ))}
          </div>
        </div>
      </div>

      <TypeformNavigation
        onPrevious={onBack}
        onNext={() => onNext({ organizationName: name, organizationType: type })}
        canGoNext={!!canContinue}
      />
    </div>
  )
}

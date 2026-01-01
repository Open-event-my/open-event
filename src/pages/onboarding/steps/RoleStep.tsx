import { useState } from 'react'
import { TypeformQuestion, TypeformNavigation } from '@/components/typeform'
import { OptionCard } from '@/components/onboarding'
import { CalendarBlank, Handshake, Truck, Compass } from '@phosphor-icons/react'
import type { StepProps, UserRole } from '@/types/onboarding'

const roles: { value: UserRole; label: string; description: string; icon: typeof CalendarBlank }[] =
  [
    {
      value: 'organizer',
      label: 'Event Organizer',
      description: 'I plan and run events',
      icon: CalendarBlank,
    },
    {
      value: 'sponsor',
      label: 'Sponsor',
      description: 'I sponsor events for brand visibility',
      icon: Handshake,
    },
    {
      value: 'vendor',
      label: 'Vendor',
      description: 'I provide services to events',
      icon: Truck,
    },
    {
      value: 'exploring',
      label: 'Just exploring',
      description: "I'm checking out the platform",
      icon: Compass,
    },
  ]

export function RoleStep({ onNext, currentData }: StepProps) {
  const [selected, setSelected] = useState<UserRole | undefined>(currentData.role)

  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-10">
      <TypeformQuestion
        stepNumber={1}
        question="Let's personalize your experience!"
        description="First, tell us about your role:"
      />

      <div className="space-y-2.5 sm:space-y-3">
        {roles.map((role, index) => (
          <OptionCard
            key={role.value}
            label={role.label}
            description={role.description}
            icon={role.icon}
            isSelected={selected === role.value}
            onClick={() => setSelected(role.value)}
            delay={index * 75}
          />
        ))}
      </div>

      <TypeformNavigation onNext={() => onNext({ role: selected })} canGoNext={!!selected} />
    </div>
  )
}

import { useState } from 'react'
import { TypeformQuestion, TypeformNavigation } from '@/components/typeform'
import { OptionCard } from '@/components/onboarding'
import { UsersThree, UsersFour, Users, Buildings } from '@phosphor-icons/react'
import type { StepProps, EventScale } from '@/types/onboarding'

const scales: { value: EventScale; label: string; description: string; icon: typeof UsersThree }[] =
  [
    {
      value: 'small',
      label: 'Small',
      description: 'Less than 100 attendees',
      icon: UsersThree,
    },
    {
      value: 'medium',
      label: 'Medium',
      description: '100-500 attendees',
      icon: UsersFour,
    },
    {
      value: 'large',
      label: 'Large',
      description: '500-2,000 attendees',
      icon: Users,
    },
    {
      value: 'enterprise',
      label: 'Enterprise',
      description: '2,000+ attendees',
      icon: Buildings,
    },
  ]

export function EventScaleStep({ onNext, onBack, currentData }: StepProps) {
  const [selected, setSelected] = useState<EventScale | undefined>(currentData.eventScale)

  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-10">
      <TypeformQuestion
        stepNumber={4}
        question="How big are your typical events?"
        description="This helps us suggest the right features"
      />

      <div className="space-y-2.5 sm:space-y-3">
        {scales.map((scale, index) => (
          <OptionCard
            key={scale.value}
            label={scale.label}
            description={scale.description}
            icon={scale.icon}
            isSelected={selected === scale.value}
            onClick={() => setSelected(scale.value)}
            delay={index * 75}
          />
        ))}
      </div>

      <TypeformNavigation
        onPrevious={onBack}
        onNext={() => onNext({ eventScale: selected })}
        canGoNext={!!selected}
      />
    </div>
  )
}

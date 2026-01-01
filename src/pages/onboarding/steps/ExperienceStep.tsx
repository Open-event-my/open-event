import { useState } from 'react'
import { TypeformQuestion, TypeformNavigation } from '@/components/typeform'
import { OptionCard } from '@/components/onboarding'
import { Baby, Leaf, Tree, Mountains } from '@phosphor-icons/react'
import type { StepProps, ExperienceLevel } from '@/types/onboarding'

const levels: { value: ExperienceLevel; label: string; description: string; icon: typeof Baby }[] =
  [
    {
      value: 'first-time',
      label: 'First-time organizer',
      description: 'Planning my first event',
      icon: Baby,
    },
    {
      value: '1-5',
      label: '1-5 events',
      description: 'Getting the hang of it',
      icon: Leaf,
    },
    {
      value: '5-20',
      label: '5-20 events',
      description: 'Experienced organizer',
      icon: Tree,
    },
    {
      value: '20+',
      label: '20+ events',
      description: 'Seasoned veteran',
      icon: Mountains,
    },
  ]

export function ExperienceStep({ onNext, onBack, currentData }: StepProps) {
  const [selected, setSelected] = useState<ExperienceLevel | undefined>(currentData.experienceLevel)

  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-10">
      <TypeformQuestion
        stepNumber={6}
        question="How experienced are you with event management?"
        description="This helps us customize your dashboard"
      />

      <div className="space-y-2.5 sm:space-y-3">
        {levels.map((level, index) => (
          <OptionCard
            key={level.value}
            label={level.label}
            description={level.description}
            icon={level.icon}
            isSelected={selected === level.value}
            onClick={() => setSelected(level.value)}
            delay={index * 75}
          />
        ))}
      </div>

      <TypeformNavigation
        onPrevious={onBack}
        onNext={() => onNext({ experienceLevel: selected })}
        canGoNext={!!selected}
      />
    </div>
  )
}

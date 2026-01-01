import { useState } from 'react'
import { TypeformQuestion, TypeformNavigation } from '@/components/typeform'
import { MultiSelect } from '@/components/onboarding'
import type { StepProps } from '@/types/onboarding'
import { GOALS } from '@/types/onboarding'

const goalOptions = GOALS.map((goal) => ({
  value: goal.toLowerCase().replace(/\s+/g, '-'),
  label: goal,
}))

export function GoalsStep({ onNext, onBack, currentData }: StepProps) {
  const [selected, setSelected] = useState<string[]>(currentData.goals || [])

  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-10">
      <TypeformQuestion
        stepNumber={5}
        question="What are you hoping to achieve with Open Event?"
        description="Select all that apply"
      />

      <MultiSelect options={goalOptions} selected={selected} onChange={setSelected} />

      <TypeformNavigation
        onPrevious={onBack}
        onNext={() => onNext({ goals: selected })}
        canGoNext={selected.length > 0}
      />
    </div>
  )
}

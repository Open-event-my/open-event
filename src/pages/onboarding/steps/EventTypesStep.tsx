import { useState } from 'react'
import { TypeformQuestion, TypeformNavigation } from '@/components/typeform'
import { MultiSelect } from '@/components/onboarding'
import type { StepProps } from '@/types/onboarding'
import { EVENT_TYPES } from '@/types/onboarding'

const eventTypeOptions = EVENT_TYPES.map((type) => ({
  value: type.toLowerCase().replace(/[^a-z]/g, '-'),
  label: type,
}))

export function EventTypesStep({ onNext, onBack, currentData }: StepProps) {
  const [selected, setSelected] = useState<string[]>(currentData.eventTypes || [])

  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-10">
      <TypeformQuestion
        stepNumber={3}
        question="What type of events do you typically organize?"
        description="Select all that apply"
      />

      <MultiSelect options={eventTypeOptions} selected={selected} onChange={setSelected} />

      <TypeformNavigation
        onPrevious={onBack}
        onNext={() => onNext({ eventTypes: selected })}
        canGoNext={selected.length > 0}
      />
    </div>
  )
}

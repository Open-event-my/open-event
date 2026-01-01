import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Robot, Notepad } from '@phosphor-icons/react'
import { AgenticChatV2 } from '@/components/agentic'
import { ManualEventForm } from '@/components/events/ManualEventForm'
import { cn } from '@/lib/utils'

export function EventCreatePage() {
  const navigate = useNavigate()
  const [useAI, setUseAI] = useState(true)

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      {/* Mode Toggle Header */}
      <div className="flex items-center justify-center gap-6 py-4 border-b border-border mb-4">
        <button
          type="button"
          onClick={() => setUseAI(true)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
            useAI
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          <Robot size={18} weight={useAI ? 'fill' : 'regular'} />
          AI Assistant
        </button>
        <button
          type="button"
          onClick={() => setUseAI(false)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
            !useAI
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          <Notepad size={18} weight={!useAI ? 'fill' : 'regular'} />
          Manual Form
        </button>
      </div>

      {/* Content */}
      {useAI ? (
        <AgenticChatV2
          title="Open Event AI"
          subtitle="What would you like to create?"
          placeholder="Describe your event - include details like type, date, location, and expected attendees..."
          onComplete={(eventId) => {
            navigate(`/dashboard/events/${eventId}`)
          }}
        />
      ) : (
        <ManualEventForm onSuccess={(eventId) => navigate(`/dashboard/events/${eventId}`)} />
      )}
    </div>
  )
}

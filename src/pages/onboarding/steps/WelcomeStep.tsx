import { TypeformNavigation } from '@/components/typeform'
import { Rocket, Confetti } from '@phosphor-icons/react'
import type { StepProps } from '@/types/onboarding'

export function WelcomeStep({ onNext }: StepProps) {
  return (
    <div className="flex flex-col items-center text-center space-y-8 animate-in fade-in zoom-in duration-500">
      {/* Icon/Brand */}
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-primary/10 shadow-sm">
          <Rocket size={40} weight="duotone" className="text-primary" />
        </div>
        <Confetti 
          size={24} 
          weight="duotone" 
          className="absolute -top-2 -right-2 text-yellow-500 animate-bounce" 
        />
      </div>

      {/* Welcome Text */}
      <div className="space-y-3 max-w-md">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          Welcome to <span className="text-primary">Open Event</span>
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Let's set up your workspace. We'll ask a few quick questions to customize your experience.
        </p>
      </div>

      {/* Features/Benefits */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mt-8">
        {[
          { text: 'Tailored Dashboard', emoji: '✨' },
          { text: 'Smart Templates', emoji: '📋' },
          { text: 'Relevant Tools', emoji: '🛠️' },
        ].map((item, i) => (
          <div 
            key={item.text}
            className="p-3 rounded-lg border border-border/50 bg-card/50 text-sm font-medium text-muted-foreground flex items-center justify-center gap-2"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <span>{item.emoji}</span>
            <span>{item.text}</span>
          </div>
        ))}
      </div>

      <div className="w-full max-w-xs pt-8">
        <TypeformNavigation 
          onNext={() => onNext({})} 
          canGoNext={true} 
          showKeyboardHint={true}
          className="justify-center"
        />
      </div>
    </div>
  )
}

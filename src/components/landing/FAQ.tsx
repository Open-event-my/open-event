import { useState } from 'react'
import { useScrollAnimation } from '@/hooks/use-scroll-animation'
import { cn } from '@/lib/utils'
import { CaretDown } from '@phosphor-icons/react'

const faqs = [
  {
    question: 'wait, is this actually free?',
    answer:
      "yep. 100% open-source, MIT licensed. use it, fork it, self-host it, remix it into something cooler. we're just getting started and want people to actually use this thing.",
  },
  {
    question: 'who is this for exactly?',
    answer:
      "three types of people: organizers who are drowning in spreadsheets, sponsors who want to know their money isn't vanishing into thin air, and vendors who are tired of cold outreach. if you've ever planned an event and thought \"there has to be a better way\" — hi, that's us.",
  },
  {
    question: 'what can the AI actually do?',
    answer:
      "real stuff. find sponsors that match your event type and budget. compare vendors by pricing and reviews. auto-generate task checklists. create post-event reports. it's not just a chatbot — it actually does things. revolutionary concept, we know.",
  },
  {
    question: 'how do sponsors track their ROI?',
    answer:
      'real metrics, not vibes. booth visits, lead captures, engagement data — all compiled into reports your CFO won\'t need a translator for. no more "trust us, it was a great event" conversations.',
  },
  {
    question: 'can vendors actually get discovered here?',
    answer:
      "that's the whole point. instead of cold-emailing organizers, you list your services and let them find you. AI matching helps surface you to relevant events. inbound > outbound, always.",
  },
  {
    question: 'is my data safe?',
    answer:
      'open-source means you can audit every line of code. for our hosted version: encrypted, backed up, the usual security checklist. or self-host and keep everything on your own servers. your call.',
  },
  {
    question: 'you just launched — should I trust this?',
    answer:
      "fair question. we're new, but the code is open and the roadmap is public. worst case, you try it, hate it, and export your data. best case, you're one of our first users and we'll love you forever.",
  },
  {
    question: 'how do I get help?',
    answer:
      'github issues for bugs, email for everything else. we actually read and reply to messages. shocking in 2024, we know.',
  },
]

export function FAQ() {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <section className="py-16 sm:py-24 lg:py-32 px-4 sm:px-6 section-divider">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div
          ref={ref}
          className={cn(
            'text-center mb-8 sm:mb-12 transition-all duration-700',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          <h2 className="font-mono text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
            got questions?
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground mt-3 sm:mt-4">
            we probably have answers. probably.
          </p>
        </div>

        {/* FAQ List */}
        <div className="space-y-3 sm:space-y-4">
          {faqs.map((faq, index) => (
            <FAQItem key={index} {...faq} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

function FAQItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [isOpen, setIsOpen] = useState(false)
  const { ref, isVisible } = useScrollAnimation()

  return (
    <div
      ref={ref}
      className={cn(
        'border border-border rounded-lg sm:rounded-xl overflow-hidden bg-card',
        'transition-all duration-500',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      )}
      style={{ transitionDelay: `${index * 50}ms` }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-muted/50 transition-colors cursor-pointer touch-manipulation min-h-[56px] sm:min-h-0"
      >
        <span className="font-medium text-xs sm:text-sm md:text-base pr-3 sm:pr-4">{question}</span>
        <CaretDown
          size={16}
          className={cn(
            'sm:hidden text-muted-foreground shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
          weight="bold"
        />
        <CaretDown
          size={20}
          className={cn(
            'hidden sm:block text-muted-foreground shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
          weight="bold"
        />
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-300',
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="p-4 sm:p-5 pt-0 text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {answer}
        </div>
      </div>
    </div>
  )
}

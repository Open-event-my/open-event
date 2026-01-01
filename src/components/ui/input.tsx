import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-[14px] text-foreground',
        'placeholder:text-muted-foreground selection:bg-primary/10 selection:text-foreground',
        'transition-all duration-150 outline-none',
        'focus:border-ring focus:ring-2 focus:ring-ring/20',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
        'file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium',
        className
      )}
      {...props}
    />
  )
}

export { Input }

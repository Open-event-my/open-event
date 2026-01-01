import { CheckCircle, Info, CircleNotch, XCircle, Warning } from '@phosphor-icons/react'
import { useTheme } from 'next-themes'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      icons={{
        success: <CheckCircle size={16} weight="duotone" />,
        info: <Info size={16} weight="duotone" />,
        warning: <Warning size={16} weight="duotone" />,
        error: <XCircle size={16} weight="duotone" />,
        loading: <CircleNotch size={16} className="animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }

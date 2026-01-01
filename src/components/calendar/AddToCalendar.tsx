/**
 * Add to Calendar Component
 * Dropdown menu for adding events to various calendar services
 */

import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { CalendarPlus, GoogleLogo, WindowsLogo, Download, CaretDown } from '@phosphor-icons/react'
import { toast } from 'sonner'
import {
  generateICS,
  downloadICS,
  generateICSFilename,
  generateGoogleCalendarUrl,
  generateOutlookUrl,
  generateOffice365Url,
  type CalendarEvent,
} from '@/lib/calendar'

interface AddToCalendarProps {
  event: CalendarEvent
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export function AddToCalendar({
  event,
  variant = 'outline',
  size = 'default',
  className,
}: AddToCalendarProps) {
  const [open, setOpen] = useState(false)

  const handleGoogleCalendar = () => {
    const url = generateGoogleCalendarUrl(event)
    window.open(url, '_blank', 'noopener,noreferrer')
    toast.success('Opening Google Calendar...')
    setOpen(false)
  }

  const handleOutlook = () => {
    const url = generateOutlookUrl(event)
    window.open(url, '_blank', 'noopener,noreferrer')
    toast.success('Opening Outlook...')
    setOpen(false)
  }

  const handleOffice365 = () => {
    const url = generateOffice365Url(event)
    window.open(url, '_blank', 'noopener,noreferrer')
    toast.success('Opening Office 365...')
    setOpen(false)
  }

  const handleDownloadICS = () => {
    try {
      const icsContent = generateICS(event)
      const filename = generateICSFilename(event.title)
      downloadICS(icsContent, filename)
      toast.success('Calendar file downloaded')
    } catch (error) {
      console.error('Failed to generate ICS:', error)
      toast.error('Failed to download calendar file')
    }
    setOpen(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <CalendarPlus size={16} className="mr-2" />
          Add to Calendar
          <CaretDown size={14} className="ml-1 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleGoogleCalendar} className="cursor-pointer">
          <GoogleLogo size={16} className="mr-2 text-[#4285F4]" weight="bold" />
          Google Calendar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOutlook} className="cursor-pointer">
          <WindowsLogo size={16} className="mr-2 text-[#0078D4]" weight="bold" />
          Outlook.com
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOffice365} className="cursor-pointer">
          <WindowsLogo size={16} className="mr-2 text-[#D83B01]" weight="bold" />
          Office 365
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDownloadICS} className="cursor-pointer">
          <Download size={16} className="mr-2" />
          Download .ics file
          <span className="ml-auto text-xs text-muted-foreground">Apple, etc.</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

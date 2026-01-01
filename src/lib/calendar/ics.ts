/**
 * iCal/ICS Generation Utility
 * Generates RFC 5545 compliant ICS files for event calendar integration
 */

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startDate: number // Unix timestamp in ms
  endDate?: number // Unix timestamp in ms
  location?: string
  locationAddress?: string
  organizer?: {
    name: string
    email?: string
  }
  url?: string
}

/**
 * Escape special characters for ICS format
 */
function escapeICS(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

/**
 * Format date to ICS format (YYYYMMDDTHHMMSSZ)
 */
function formatICSDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
}

// NOTE: formatICSDateOnly function removed - can be added back if all-day events are needed
// Format would be: YYYYMMDD (e.g., 20250101 for Jan 1, 2025)

/**
 * Generate a unique ID for the event
 */
function generateUID(eventId: string): string {
  return `${eventId}@openevent.app`
}

/**
 * Fold long lines according to ICS spec (max 75 chars per line)
 */
function foldLine(line: string): string {
  const maxLength = 75
  if (line.length <= maxLength) return line

  const lines: string[] = []
  let remaining = line

  while (remaining.length > maxLength) {
    lines.push(remaining.substring(0, maxLength))
    remaining = ' ' + remaining.substring(maxLength) // Continuation lines start with space
  }
  lines.push(remaining)

  return lines.join('\r\n')
}

/**
 * Generate ICS content for a single event
 */
export function generateICS(event: CalendarEvent): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Open Event//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${generateUID(event.id)}`,
    `DTSTAMP:${formatICSDate(Date.now())}`,
    `DTSTART:${formatICSDate(event.startDate)}`,
  ]

  // End date (default to start + 2 hours if not specified)
  const endDate = event.endDate || event.startDate + 2 * 60 * 60 * 1000
  lines.push(`DTEND:${formatICSDate(endDate)}`)

  // Title (required)
  lines.push(`SUMMARY:${escapeICS(event.title)}`)

  // Description
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICS(event.description)}`)
  }

  // Location
  if (event.location) {
    const locationText = event.locationAddress
      ? `${event.location}, ${event.locationAddress}`
      : event.location
    lines.push(`LOCATION:${escapeICS(locationText)}`)
  }

  // Organizer
  if (event.organizer?.email) {
    lines.push(`ORGANIZER;CN=${escapeICS(event.organizer.name)}:mailto:${event.organizer.email}`)
  }

  // URL
  if (event.url) {
    lines.push(`URL:${event.url}`)
  }

  lines.push('END:VEVENT', 'END:VCALENDAR')

  // Fold long lines and join with CRLF
  return lines.map(foldLine).join('\r\n')
}

/**
 * Generate ICS content for multiple events
 */
export function generateMultiEventICS(events: CalendarEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Open Event//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Open Event Calendar',
  ]

  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${generateUID(event.id)}`,
      `DTSTAMP:${formatICSDate(Date.now())}`,
      `DTSTART:${formatICSDate(event.startDate)}`
    )

    const endDate = event.endDate || event.startDate + 2 * 60 * 60 * 1000
    lines.push(`DTEND:${formatICSDate(endDate)}`)
    lines.push(`SUMMARY:${escapeICS(event.title)}`)

    if (event.description) {
      lines.push(`DESCRIPTION:${escapeICS(event.description)}`)
    }

    if (event.location) {
      const locationText = event.locationAddress
        ? `${event.location}, ${event.locationAddress}`
        : event.location
      lines.push(`LOCATION:${escapeICS(locationText)}`)
    }

    if (event.organizer?.email) {
      lines.push(`ORGANIZER;CN=${escapeICS(event.organizer.name)}:mailto:${event.organizer.email}`)
    }

    if (event.url) {
      lines.push(`URL:${event.url}`)
    }

    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')

  return lines.map(foldLine).join('\r\n')
}

/**
 * Download ICS file
 */
export function downloadICS(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.ics') ? filename : `${filename}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Generate filename for ICS export
 */
export function generateICSFilename(eventTitle: string): string {
  const sanitized = eventTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
  return `${sanitized || 'event'}.ics`
}

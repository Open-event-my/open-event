/**
 * Calendar URL Generators
 * Generate URLs for adding events to Google Calendar, Outlook, and other services
 */

import type { CalendarEvent } from './ics'

/**
 * Format date for Google Calendar URL (YYYYMMDDTHHMMSSZ)
 */
function formatGoogleDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
}

/**
 * Format date for Outlook (ISO 8601)
 */
function formatOutlookDate(timestamp: number): string {
  return new Date(timestamp).toISOString()
}

/**
 * Generate Google Calendar event URL
 * Opens Google Calendar in a new tab with event pre-filled
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const endDate = event.endDate || event.startDate + 2 * 60 * 60 * 1000

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleDate(event.startDate)}/${formatGoogleDate(endDate)}`,
  })

  if (event.description) {
    params.set('details', event.description)
  }

  if (event.location) {
    const location = event.locationAddress
      ? `${event.location}, ${event.locationAddress}`
      : event.location
    params.set('location', location)
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Generate Outlook Web Calendar URL
 * Opens Outlook in a new tab with event pre-filled
 */
export function generateOutlookUrl(event: CalendarEvent): string {
  const endDate = event.endDate || event.startDate + 2 * 60 * 60 * 1000

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: formatOutlookDate(event.startDate),
    enddt: formatOutlookDate(endDate),
  })

  if (event.description) {
    params.set('body', event.description)
  }

  if (event.location) {
    const location = event.locationAddress
      ? `${event.location}, ${event.locationAddress}`
      : event.location
    params.set('location', location)
  }

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

/**
 * Generate Office 365 Calendar URL
 */
export function generateOffice365Url(event: CalendarEvent): string {
  const endDate = event.endDate || event.startDate + 2 * 60 * 60 * 1000

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: formatOutlookDate(event.startDate),
    enddt: formatOutlookDate(endDate),
  })

  if (event.description) {
    params.set('body', event.description)
  }

  if (event.location) {
    const location = event.locationAddress
      ? `${event.location}, ${event.locationAddress}`
      : event.location
    params.set('location', location)
  }

  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`
}

/**
 * Generate Yahoo Calendar URL
 */
export function generateYahooCalendarUrl(event: CalendarEvent): string {
  const endDate = event.endDate || event.startDate + 2 * 60 * 60 * 1000
  const durationMs = endDate - event.startDate
  const durationHours = Math.floor(durationMs / (60 * 60 * 1000))
  const durationMinutes = Math.floor((durationMs % (60 * 60 * 1000)) / (60 * 1000))
  const duration = `${String(durationHours).padStart(2, '0')}${String(durationMinutes).padStart(2, '0')}`

  const params = new URLSearchParams({
    v: '60',
    title: event.title,
    st: formatGoogleDate(event.startDate),
    dur: duration,
  })

  if (event.description) {
    params.set('desc', event.description)
  }

  if (event.location) {
    const location = event.locationAddress
      ? `${event.location}, ${event.locationAddress}`
      : event.location
    params.set('in_loc', location)
  }

  return `https://calendar.yahoo.com/?${params.toString()}`
}

export type CalendarType = 'google' | 'outlook' | 'office365' | 'yahoo' | 'ics'

/**
 * Get calendar service info
 */
export function getCalendarServiceInfo(type: CalendarType): {
  name: string
  icon: string
  description: string
} {
  switch (type) {
    case 'google':
      return {
        name: 'Google Calendar',
        icon: 'google',
        description: 'Add to your Google Calendar',
      }
    case 'outlook':
      return {
        name: 'Outlook.com',
        icon: 'outlook',
        description: 'Add to Outlook.com calendar',
      }
    case 'office365':
      return {
        name: 'Office 365',
        icon: 'microsoft',
        description: 'Add to Office 365 calendar',
      }
    case 'yahoo':
      return {
        name: 'Yahoo Calendar',
        icon: 'yahoo',
        description: 'Add to Yahoo Calendar',
      }
    case 'ics':
      return {
        name: 'Download .ics',
        icon: 'download',
        description: 'Download calendar file (Apple Calendar, etc.)',
      }
  }
}

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatRelativeTime, formatDate, formatDateTime } from './formatters'

describe('formatters', () => {
  describe('formatRelativeTime', () => {
    beforeEach(() => {
      // Mock Date.now to return a fixed timestamp
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-06-15T12:00:00.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return "Just now" for timestamps less than 1 minute ago', () => {
      const now = Date.now()
      expect(formatRelativeTime(now)).toBe('Just now')
      expect(formatRelativeTime(now - 30000)).toBe('Just now') // 30 seconds ago
      expect(formatRelativeTime(now - 59000)).toBe('Just now') // 59 seconds ago
    })

    it('should return minutes ago for timestamps 1-59 minutes ago', () => {
      const now = Date.now()
      expect(formatRelativeTime(now - 60000)).toBe('1m ago') // 1 minute
      expect(formatRelativeTime(now - 300000)).toBe('5m ago') // 5 minutes
      expect(formatRelativeTime(now - 1800000)).toBe('30m ago') // 30 minutes
      expect(formatRelativeTime(now - 3540000)).toBe('59m ago') // 59 minutes
    })

    it('should return hours ago for timestamps 1-23 hours ago', () => {
      const now = Date.now()
      expect(formatRelativeTime(now - 3600000)).toBe('1h ago') // 1 hour
      expect(formatRelativeTime(now - 7200000)).toBe('2h ago') // 2 hours
      expect(formatRelativeTime(now - 43200000)).toBe('12h ago') // 12 hours
      expect(formatRelativeTime(now - 82800000)).toBe('23h ago') // 23 hours
    })

    it('should return days ago for timestamps 1-6 days ago', () => {
      const now = Date.now()
      expect(formatRelativeTime(now - 86400000)).toBe('1d ago') // 1 day
      expect(formatRelativeTime(now - 172800000)).toBe('2d ago') // 2 days
      expect(formatRelativeTime(now - 518400000)).toBe('6d ago') // 6 days
    })

    it('should return formatted date for timestamps 7+ days ago', () => {
      const now = Date.now()
      const sevenDaysAgo = now - 7 * 86400000 // 7 days
      const result = formatRelativeTime(sevenDaysAgo)
      // Should be a formatted date like "Jun 8, 2024"
      expect(result).toMatch(/[A-Z][a-z]{2} \d{1,2}, \d{4}/)
    })

    it('should handle edge case at exactly 1 hour boundary', () => {
      const now = Date.now()
      // At exactly 60 minutes, should show hours
      expect(formatRelativeTime(now - 3600000)).toBe('1h ago')
    })

    it('should handle edge case at exactly 24 hours boundary', () => {
      const now = Date.now()
      // At exactly 24 hours, should show days
      expect(formatRelativeTime(now - 86400000)).toBe('1d ago')
    })
  })

  describe('formatDate', () => {
    it('should format timestamp to readable date', () => {
      // June 15, 2024
      const timestamp = new Date('2024-06-15T12:00:00.000Z').getTime()
      const result = formatDate(timestamp)
      expect(result).toBe('Jun 15, 2024')
    })

    it('should return "N/A" for undefined timestamp', () => {
      expect(formatDate(undefined)).toBe('N/A')
    })

    it('should return "N/A" for zero timestamp', () => {
      expect(formatDate(0)).toBe('N/A')
    })

    it('should use custom options when provided', () => {
      const timestamp = new Date('2024-06-15T12:00:00.000Z').getTime()
      const result = formatDate(timestamp, {
        weekday: 'long',
        month: 'long',
      })
      // Custom options should override defaults
      expect(result).toContain('June')
      expect(result).toContain('Saturday')
    })

    it('should handle different months correctly', () => {
      expect(formatDate(new Date('2024-01-15').getTime())).toBe('Jan 15, 2024')
      expect(formatDate(new Date('2024-12-25').getTime())).toBe('Dec 25, 2024')
    })

    it('should handle single digit days', () => {
      const result = formatDate(new Date('2024-06-05').getTime())
      expect(result).toBe('Jun 5, 2024')
    })
  })

  describe('formatDateTime', () => {
    it('should format timestamp to date with time', () => {
      // June 15, 2024 at 2:30 PM UTC
      const timestamp = new Date('2024-06-15T14:30:00.000Z').getTime()
      const result = formatDateTime(timestamp)
      // The exact output depends on timezone, but should include date and time
      expect(result).toMatch(/Jun 15, 2024/)
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })

    it('should include AM/PM in time', () => {
      const timestamp = new Date('2024-06-15T09:00:00.000Z').getTime()
      const result = formatDateTime(timestamp)
      // Should contain either AM or PM
      expect(result).toMatch(/AM|PM/)
    })

    it('should handle midnight correctly', () => {
      const timestamp = new Date('2024-06-15T00:00:00.000Z').getTime()
      const result = formatDateTime(timestamp)
      expect(result).toMatch(/Jun 1[45], 2024/) // Could be 14 or 15 depending on timezone
    })

    it('should handle noon correctly', () => {
      const timestamp = new Date('2024-06-15T12:00:00.000Z').getTime()
      const result = formatDateTime(timestamp)
      expect(result).toMatch(/\d{1,2}:00/)
    })

    it('should format minutes with leading zero', () => {
      const timestamp = new Date('2024-06-15T14:05:00.000Z').getTime()
      const result = formatDateTime(timestamp)
      expect(result).toMatch(/:05/)
    })
  })

  describe('edge cases', () => {
    it('should handle very old timestamps', () => {
      const oldTimestamp = new Date('1990-01-01').getTime()
      expect(formatDate(oldTimestamp)).toBe('Jan 1, 1990')
    })

    it('should handle future timestamps in formatRelativeTime', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-06-15T12:00:00.000Z'))

      const futureTimestamp = Date.now() + 3600000 // 1 hour in future
      // Since diff will be negative, minutes will be negative, treated as < 1
      const result = formatRelativeTime(futureTimestamp)
      expect(result).toBe('Just now')

      vi.useRealTimers()
    })

    it('should handle timestamps at year boundaries', () => {
      // Use local dates to avoid timezone conversion issues
      const dec31 = new Date(2023, 11, 31, 12, 0, 0).getTime() // Dec 31, 2023 noon local
      const jan1 = new Date(2024, 0, 1, 12, 0, 0).getTime() // Jan 1, 2024 noon local
      expect(formatDate(dec31)).toBe('Dec 31, 2023')
      expect(formatDate(jan1)).toBe('Jan 1, 2024')
    })
  })
})

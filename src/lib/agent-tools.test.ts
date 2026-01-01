import { describe, it, expect } from 'vitest'
import {
  TOOL_CONFIG,
  getToolConfig,
  getToolIcon,
  getToolExecutingLabel,
  getToolConfirmLabel,
  type ToolName,
} from './agent-tools'
import { Calendar, Storefront, Handshake, User, Wrench } from '@phosphor-icons/react'

describe('agent-tools', () => {
  describe('TOOL_CONFIG', () => {
    it('should define all expected tools', () => {
      const expectedTools: ToolName[] = [
        'createEvent',
        'updateEvent',
        'getEventDetails',
        'getUpcomingEvents',
        'searchVendors',
        'addVendorToEvent',
        'searchSponsors',
        'addSponsorToEvent',
        'getUserProfile',
      ]

      expectedTools.forEach((tool) => {
        expect(TOOL_CONFIG[tool]).toBeDefined()
      })
    })

    it('should have correct structure for each tool config', () => {
      Object.values(TOOL_CONFIG).forEach((config) => {
        expect(config).toHaveProperty('icon')
        expect(config).toHaveProperty('executingLabel')
        expect(config).toHaveProperty('confirmLabel')
        expect(config).toHaveProperty('confirmDescription')
        expect(config).toHaveProperty('category')
        expect(typeof config.executingLabel).toBe('string')
        expect(typeof config.confirmLabel).toBe('string')
        expect(typeof config.confirmDescription).toBe('string')
        expect(['events', 'vendors', 'sponsors', 'profile']).toContain(config.category)
      })
    })

    it('should use correct icons for event tools', () => {
      expect(TOOL_CONFIG.createEvent.icon).toBe(Calendar)
      expect(TOOL_CONFIG.updateEvent.icon).toBe(Calendar)
      expect(TOOL_CONFIG.getEventDetails.icon).toBe(Calendar)
      expect(TOOL_CONFIG.getUpcomingEvents.icon).toBe(Calendar)
    })

    it('should use correct icons for vendor tools', () => {
      expect(TOOL_CONFIG.searchVendors.icon).toBe(Storefront)
      expect(TOOL_CONFIG.addVendorToEvent.icon).toBe(Storefront)
    })

    it('should use correct icons for sponsor tools', () => {
      expect(TOOL_CONFIG.searchSponsors.icon).toBe(Handshake)
      expect(TOOL_CONFIG.addSponsorToEvent.icon).toBe(Handshake)
    })

    it('should use correct icon for profile tools', () => {
      expect(TOOL_CONFIG.getUserProfile.icon).toBe(User)
    })

    it('should have correct categories for each tool', () => {
      expect(TOOL_CONFIG.createEvent.category).toBe('events')
      expect(TOOL_CONFIG.updateEvent.category).toBe('events')
      expect(TOOL_CONFIG.getEventDetails.category).toBe('events')
      expect(TOOL_CONFIG.getUpcomingEvents.category).toBe('events')
      expect(TOOL_CONFIG.searchVendors.category).toBe('vendors')
      expect(TOOL_CONFIG.addVendorToEvent.category).toBe('vendors')
      expect(TOOL_CONFIG.searchSponsors.category).toBe('sponsors')
      expect(TOOL_CONFIG.addSponsorToEvent.category).toBe('sponsors')
      expect(TOOL_CONFIG.getUserProfile.category).toBe('profile')
    })
  })

  describe('getToolConfig', () => {
    it('should return config for known tools', () => {
      const config = getToolConfig('createEvent')
      expect(config).toEqual(TOOL_CONFIG.createEvent)
    })

    it('should return fallback config for unknown tools', () => {
      const config = getToolConfig('unknownTool')
      expect(config.icon).toBe(Wrench)
      expect(config.executingLabel).toBe('unknownTool')
      expect(config.confirmLabel).toBe('unknownTool')
      expect(config.confirmDescription).toBe('Are you sure you want to proceed?')
      expect(config.category).toBe('events')
    })

    it('should handle empty string', () => {
      const config = getToolConfig('')
      expect(config.icon).toBe(Wrench)
      expect(config.executingLabel).toBe('')
    })
  })

  describe('getToolIcon', () => {
    it('should return correct icon for known tools', () => {
      expect(getToolIcon('createEvent')).toBe(Calendar)
      expect(getToolIcon('searchVendors')).toBe(Storefront)
      expect(getToolIcon('searchSponsors')).toBe(Handshake)
      expect(getToolIcon('getUserProfile')).toBe(User)
    })

    it('should return Wrench icon for unknown tools', () => {
      expect(getToolIcon('unknownTool')).toBe(Wrench)
    })
  })

  describe('getToolExecutingLabel', () => {
    it('should return correct executing labels', () => {
      expect(getToolExecutingLabel('createEvent')).toBe('Creating Event')
      expect(getToolExecutingLabel('searchVendors')).toBe('Searching Vendors')
      expect(getToolExecutingLabel('getUserProfile')).toBe('Getting Profile')
    })

    it('should return tool name for unknown tools', () => {
      expect(getToolExecutingLabel('unknownTool')).toBe('unknownTool')
    })
  })

  describe('getToolConfirmLabel', () => {
    it('should return correct confirm labels', () => {
      expect(getToolConfirmLabel('createEvent')).toBe('Create Event')
      expect(getToolConfirmLabel('addVendorToEvent')).toBe('Add Vendor to Event')
      expect(getToolConfirmLabel('addSponsorToEvent')).toBe('Add Sponsor to Event')
    })

    it('should return tool name for unknown tools', () => {
      expect(getToolConfirmLabel('unknownTool')).toBe('unknownTool')
    })
  })

  describe('Labels consistency', () => {
    it('should have executing labels in gerund form (-ing)', () => {
      const executingLabels = Object.values(TOOL_CONFIG).map((c) => c.executingLabel)
      executingLabels.forEach((label) => {
        // Check that labels are in gerund/present participle form
        expect(label).toMatch(/ing\s|ing$/)
      })
    })

    it('should have confirmation descriptions ending with colon or question', () => {
      const descriptions = Object.values(TOOL_CONFIG).map((c) => c.confirmDescription)
      descriptions.forEach((desc) => {
        expect(desc.endsWith(':') || desc.endsWith('.')).toBe(true)
      })
    })
  })
})

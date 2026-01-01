/**
 * Agent Tool Definitions
 *
 * This module defines all available tools for the AI agent.
 * Each tool has a schema that OpenAI uses for function calling.
 */

import type { ToolDefinition } from './types'

export const AGENT_TOOLS: ToolDefinition[] = [
  // ============================================================================
  // Event Tools
  // ============================================================================
  {
    name: 'createEvent',
    description:
      'Create a new event with the provided details. Use this when you have gathered enough information from the user to create an event.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'The name/title of the event',
        },
        description: {
          type: 'string',
          description: 'A detailed description of the event',
        },
        eventType: {
          type: 'string',
          description: 'The type of event',
          enum: [
            'conference',
            'hackathon',
            'workshop',
            'meetup',
            'corporate',
            'webinar',
            'concert',
            'exhibition',
            'other',
          ],
        },
        startDate: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format',
        },
        startTime: {
          type: 'string',
          description: 'Start time in HH:MM format (24-hour)',
        },
        endDate: {
          type: 'string',
          description: 'End date in YYYY-MM-DD format (optional, defaults to start date)',
        },
        endTime: {
          type: 'string',
          description: 'End time in HH:MM format (24-hour)',
        },
        locationType: {
          type: 'string',
          description: 'Whether the event is in-person, virtual, or hybrid',
          enum: ['in-person', 'virtual', 'hybrid'],
        },
        venueName: {
          type: 'string',
          description: 'Name of the venue (for in-person/hybrid events)',
        },
        venueAddress: {
          type: 'string',
          description: 'Full address of the venue',
        },
        virtualPlatform: {
          type: 'string',
          description: 'Platform for virtual attendance (e.g., Zoom, Google Meet)',
        },
        expectedAttendees: {
          type: 'number',
          description: 'Expected number of attendees',
        },
        budget: {
          type: 'number',
          description: 'Total budget for the event in USD',
        },
        requirements: {
          type: 'object',
          description: 'Vendor requirements for the event',
          properties: {
            catering: { type: 'boolean', description: 'Whether catering is needed' },
            av: { type: 'boolean', description: 'Whether AV equipment is needed' },
            photography: {
              type: 'boolean',
              description: 'Whether photography/videography is needed',
            },
            security: { type: 'boolean', description: 'Whether security is needed' },
            transportation: { type: 'boolean', description: 'Whether transportation is needed' },
            decoration: { type: 'boolean', description: 'Whether decoration is needed' },
          },
        },
      },
      required: ['title', 'eventType', 'startDate'],
    },
    requiresConfirmation: true,
    category: 'events',
  },

  {
    name: 'updateEvent',
    description: 'Update an existing event with new details',
    parameters: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'The ID of the event to update',
        },
        title: { type: 'string', description: 'New title for the event' },
        description: { type: 'string', description: 'New description' },
        startDate: { type: 'string', description: 'New start date (YYYY-MM-DD)' },
        startTime: { type: 'string', description: 'New start time (HH:MM)' },
        expectedAttendees: { type: 'number', description: 'Updated attendee count' },
        budget: { type: 'number', description: 'Updated budget' },
      },
      required: ['eventId'],
    },
    requiresConfirmation: true,
    category: 'events',
  },

  {
    name: 'getEventDetails',
    description: 'Get details about a specific event',
    parameters: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'The ID of the event to retrieve',
        },
      },
      required: ['eventId'],
    },
    requiresConfirmation: false,
    category: 'events',
  },

  {
    name: 'getUpcomingEvents',
    description: "Get the user's upcoming events",
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of events to return (default: 5)',
        },
        status: {
          type: 'string',
          description: 'Filter by event status',
          enum: ['draft', 'planning', 'active', 'completed'],
        },
      },
      required: [],
    },
    requiresConfirmation: false,
    category: 'events',
  },

  // ============================================================================
  // Vendor Tools
  // ============================================================================
  {
    name: 'searchVendors',
    description:
      'Search for vendors that match specific criteria. Use this to find catering, AV, photography, and other service providers for events.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'The type of vendor to search for',
          enum: [
            'catering',
            'av',
            'photography',
            'decoration',
            'security',
            'transportation',
            'entertainment',
            'staffing',
          ],
        },
        location: {
          type: 'string',
          description: 'Location to search in (city or region)',
        },
        priceRange: {
          type: 'string',
          description: 'Budget range',
          enum: ['budget', 'mid-range', 'premium', 'luxury'],
        },
        minRating: {
          type: 'number',
          description: 'Minimum rating (1-5)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 5)',
        },
      },
      required: [],
    },
    requiresConfirmation: false,
    category: 'vendors',
  },

  {
    name: 'addVendorToEvent',
    description: 'Add a vendor to an event and create an inquiry',
    parameters: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'The ID of the event',
        },
        vendorId: {
          type: 'string',
          description: 'The ID of the vendor to add',
        },
        proposedBudget: {
          type: 'number',
          description: 'Proposed budget for this vendor',
        },
        notes: {
          type: 'string',
          description: 'Notes or special requests for the vendor',
        },
      },
      required: ['eventId', 'vendorId'],
    },
    requiresConfirmation: true,
    category: 'vendors',
  },

  // ============================================================================
  // Sponsor Tools
  // ============================================================================
  {
    name: 'searchSponsors',
    description:
      'Search for potential sponsors that match event criteria. Use this to find companies interested in sponsoring events.',
    parameters: {
      type: 'object',
      properties: {
        industry: {
          type: 'string',
          description: 'Industry to search in',
          enum: [
            'technology',
            'finance',
            'healthcare',
            'education',
            'media',
            'retail',
            'automotive',
            'consumer-goods',
          ],
        },
        eventType: {
          type: 'string',
          description: 'Type of event they sponsor',
        },
        minBudget: {
          type: 'number',
          description: 'Minimum sponsorship budget',
        },
        maxBudget: {
          type: 'number',
          description: 'Maximum sponsorship budget',
        },
        tier: {
          type: 'string',
          description: 'Sponsorship tier level',
          enum: ['platinum', 'gold', 'silver', 'bronze'],
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 5)',
        },
      },
      required: [],
    },
    requiresConfirmation: false,
    category: 'sponsors',
  },

  {
    name: 'addSponsorToEvent',
    description: 'Add a sponsor to an event and create a sponsorship inquiry',
    parameters: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'The ID of the event',
        },
        sponsorId: {
          type: 'string',
          description: 'The ID of the sponsor to add',
        },
        tier: {
          type: 'string',
          description: 'Proposed sponsorship tier',
          enum: ['platinum', 'gold', 'silver', 'bronze'],
        },
        proposedAmount: {
          type: 'number',
          description: 'Proposed sponsorship amount',
        },
        benefits: {
          type: 'array',
          description: 'List of benefits to offer the sponsor',
          items: { type: 'string' },
        },
      },
      required: ['eventId', 'sponsorId'],
    },
    requiresConfirmation: true,
    category: 'sponsors',
  },

  // ============================================================================
  // Matching/Recommendation Tools
  // ============================================================================
  {
    name: 'getRecommendedVendors',
    description:
      'Get intelligently matched vendor recommendations for a specific event. This tool analyzes event requirements, budget, and attendee count to find the best fitting vendors. Use this instead of searchVendors when you have an event context.',
    parameters: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'The ID of the event to match vendors for',
        },
        category: {
          type: 'string',
          description: 'Optionally filter by vendor category',
          enum: [
            'catering',
            'av',
            'photography',
            'decoration',
            'security',
            'transportation',
            'entertainment',
            'staffing',
          ],
        },
        limit: {
          type: 'number',
          description: 'Maximum number of recommendations (default: 5)',
        },
      },
      required: ['eventId'],
    },
    requiresConfirmation: false,
    category: 'vendors',
  },

  {
    name: 'getRecommendedSponsors',
    description:
      'Get intelligently matched sponsor recommendations for a specific event. This tool analyzes event type, audience, and expected reach to find sponsors likely to be interested. Use this instead of searchSponsors when you have an event context.',
    parameters: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'The ID of the event to match sponsors for',
        },
        tier: {
          type: 'string',
          description: 'Optionally filter by sponsorship tier',
          enum: ['platinum', 'gold', 'silver', 'bronze'],
        },
        limit: {
          type: 'number',
          description: 'Maximum number of recommendations (default: 5)',
        },
      },
      required: ['eventId'],
    },
    requiresConfirmation: false,
    category: 'sponsors',
  },

  {
    name: 'getEventVendors',
    description: 'Get all vendors currently added to an event with their status',
    parameters: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'The ID of the event',
        },
      },
      required: ['eventId'],
    },
    requiresConfirmation: false,
    category: 'vendors',
  },

  {
    name: 'getEventSponsors',
    description: 'Get all sponsors currently added to an event with their status',
    parameters: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'The ID of the event',
        },
      },
      required: ['eventId'],
    },
    requiresConfirmation: false,
    category: 'sponsors',
  },

  // ============================================================================
  // Profile Tools
  // ============================================================================
  {
    name: 'getUserProfile',
    description: "Get the current user's profile and preferences to personalize recommendations",
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    requiresConfirmation: false,
    category: 'profile',
  },
]

/**
 * Convert our tool definitions to OpenAI function format
 */
export function getOpenAITools(): Array<{
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}> {
  return AGENT_TOOLS.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }))
}

/**
 * Get a tool definition by name
 */
export function getToolByName(name: string): ToolDefinition | undefined {
  return AGENT_TOOLS.find((t) => t.name === name)
}

/**
 * Check if a tool requires user confirmation
 */
export function toolRequiresConfirmation(name: string): boolean {
  const tool = getToolByName(name)
  return tool?.requiresConfirmation ?? false
}

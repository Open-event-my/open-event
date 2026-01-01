/**
 * Agent Tool System Types
 *
 * This module defines the core types for our agentic AI system.
 * Tools are functions the AI can call to perform actions on behalf of users.
 */

import type { Id } from '../../_generated/dataModel'

// ============================================================================
// Tool Definitions
// ============================================================================

export type ToolName =
  | 'createEvent'
  | 'updateEvent'
  | 'searchVendors'
  | 'searchSponsors'
  | 'getEventDetails'
  | 'addVendorToEvent'
  | 'addSponsorToEvent'
  | 'getUserProfile'
  | 'getUpcomingEvents'
  | 'getRecommendedVendors'
  | 'getRecommendedSponsors'
  | 'getEventVendors'
  | 'getEventSponsors'

export interface ToolDefinition {
  name: ToolName
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, ToolParameter>
    required: string[]
  }
  /** Whether this tool requires user confirmation before execution */
  requiresConfirmation: boolean
  /** Category for UI grouping */
  category: 'events' | 'vendors' | 'sponsors' | 'profile'
}

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  enum?: string[]
  items?: { type: string }
  properties?: Record<string, ToolParameter>
}

// ============================================================================
// Tool Execution
// ============================================================================

export interface ToolCall {
  id: string
  name: ToolName
  arguments: Record<string, unknown>
}

export interface ToolResult {
  toolCallId: string
  name: ToolName
  success: boolean
  data?: unknown
  error?: string
  /** Human-readable summary for display */
  summary: string
}

// ============================================================================
// Agent Message Types
// ============================================================================

export type AgentMessageRole = 'user' | 'assistant' | 'tool'

export interface AgentMessage {
  role: AgentMessageRole
  content: string
  toolCalls?: ToolCall[]
  toolResults?: ToolResult[]
}

// ============================================================================
// Agent Response
// ============================================================================

export interface AgentResponse {
  /** The assistant's text response */
  message: string
  /** Tools that were called during this turn */
  toolCalls: ToolCall[]
  /** Results from tool executions */
  toolResults: ToolResult[]
  /** Tools that need user confirmation before execution */
  pendingConfirmations: ToolCall[]
  /** Whether the conversation is complete (event created, etc.) */
  isComplete: boolean
  /** If complete, the created/updated entity ID */
  entityId?: Id<'events'>
  /** Structured data extracted so far */
  extractedData?: EventDraft
}

// ============================================================================
// Event Draft (data extracted from conversation)
// ============================================================================

export interface EventDraft {
  title?: string
  description?: string
  eventType?: string
  startDate?: string
  startTime?: string
  endDate?: string
  endTime?: string
  timezone?: string
  locationType?: 'in-person' | 'virtual' | 'hybrid'
  venueName?: string
  venueAddress?: string
  virtualPlatform?: string
  expectedAttendees?: number
  budget?: number
  budgetCurrency?: string
  requirements?: {
    catering?: boolean
    av?: boolean
    photography?: boolean
    security?: boolean
    transportation?: boolean
    decoration?: boolean
    other?: string[]
  }
}

// ============================================================================
// Vendor/Sponsor Search Results
// ============================================================================

export interface VendorSearchResult {
  id: Id<'vendors'>
  name: string
  category: string
  description?: string
  rating?: number
  priceRange?: string
  location?: string
  verified: boolean
}

export interface VendorRecommendation extends VendorSearchResult {
  matchScore: number
  /** Array of specific reasons why this vendor is recommended */
  matchReasons: string[]
  /** Human-readable summary of why this vendor is a good fit */
  whyRecommended: string
}

export interface SponsorSearchResult {
  id: Id<'sponsors'>
  name: string
  industry: string
  description?: string
  budgetRange?: string
  sponsorshipTiers?: string[]
  verified: boolean
}

export interface SponsorRecommendation extends SponsorSearchResult {
  matchScore: number
  /** Array of specific reasons why this sponsor is recommended */
  matchReasons: string[]
  /** Human-readable summary of why this sponsor is a good fit */
  whyRecommended: string
}

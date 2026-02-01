import { action, internalQuery } from './_generated/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Return types for the recommendation functions
type VendorRecommendation = {
  vendor: Doc<'vendors'> | null
  score: number
}

type SponsorRecommendation = {
  sponsor: Doc<'sponsors'> | null
  score: number
}

/**
 * Recommend vendors for an event using Semantic Vector Search
 */
export const recommendVendors = action({
  args: {
    eventId: v.id('events'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<VendorRecommendation[]> => {
    // 1. Get Event Details
    const event = await ctx.runQuery(internal.recommendations.getEventForMatching, {
      eventId: args.eventId,
    })

    if (!event) throw new Error('Event not found')

    // 2. Generate Embedding for Event
    // Combine title, description, and requirements into a rich text prompt
    const requirementText = event.requirements
      ? Object.entries(event.requirements)
          .filter(([, val]) => val)
          .map(([k]) => k)
          .join(', ')
      : ''

    const textToEmbed = `
      Event: ${event.title}
      Type: ${event.eventType || 'General'}
      Description: ${event.description || ''}
      Requirements: ${requirementText}
      Looking for: ${event.vendorCategories?.join(', ') || 'Vendors'}
    `.trim()

    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: textToEmbed,
    })
    const embedding = embeddingResponse.data[0].embedding

    // 3. Perform Vector Search
    // We search for vendors whose profile embedding is close to the event embedding
    const results = await ctx.vectorSearch('vendors', 'by_embedding', {
      vector: embedding,
      limit: args.limit ?? 20,
      filter: (q) => q.eq('status', 'approved'), // Only approved vendors
    })

    // 4. Fetch full vendor details for the results
    const vendorIds: Id<'vendors'>[] = results.map((r) => r._id)
    const vendors: (Doc<'vendors'> | null)[] = await ctx.runQuery(
      internal.recommendations.getVendorsByIds,
      { vendorIds }
    )

    // 5. Merge scores and return
    return results.map(
      (result, i): VendorRecommendation => ({
        vendor: vendors[i],
        score: result._score,
      })
    )
  },
})

/**
 * Recommend sponsors for an event using Semantic Vector Search
 */
export const recommendSponsors = action({
  args: {
    eventId: v.id('events'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<SponsorRecommendation[]> => {
    // 1. Get Event Details
    const event = await ctx.runQuery(internal.recommendations.getEventForMatching, {
      eventId: args.eventId,
    })

    if (!event) throw new Error('Event not found')

    // 2. Generate Embedding for Event
    const textToEmbed = `
      Sponsorship Opportunity for Event: ${event.title}
      Type: ${event.eventType || 'General'}
      Description: ${event.description || ''}
      Audience Size: ${event.expectedAttendees || 'Unknown'}
      Budget: ${event.budget || 'Unknown'}
      Seeking Sponsors: ${event.seekingSponsors ? 'Yes' : 'No'}
    `.trim()

    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: textToEmbed,
    })
    const embedding = embeddingResponse.data[0].embedding

    // 3. Perform Vector Search
    // Note: Using `any` type for filter builder because Convex vector search types
    // are parameterized by indexed fields only, but runtime allows filtering on any field
    const results = await ctx.vectorSearch('sponsors', 'by_embedding', {
      vector: embedding,
      limit: args.limit ?? 20,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filter: (q: any) => q.eq('status', 'approved'),
    })

    // 4. Fetch full sponsor details
    const sponsorIds: Id<'sponsors'>[] = results.map((r) => r._id)
    const sponsors: (Doc<'sponsors'> | null)[] = await ctx.runQuery(
      internal.recommendations.getSponsorsByIds,
      { sponsorIds }
    )

    return results.map(
      (result, i): SponsorRecommendation => ({
        sponsor: sponsors[i],
        score: result._score,
      })
    )
  },
})

// ============================================================================
// Internal Helpers
// ============================================================================

export const getEventForMatching = internalQuery({
  args: { eventId: v.id('events') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.eventId)
  },
})

export const getVendorsByIds = internalQuery({
  args: { vendorIds: v.array(v.id('vendors')) },
  handler: async (ctx, args) => {
    return Promise.all(args.vendorIds.map((id) => ctx.db.get(id)))
  },
})

export const getSponsorsByIds = internalQuery({
  args: { sponsorIds: v.array(v.id('sponsors')) },
  handler: async (ctx, args) => {
    return Promise.all(args.sponsorIds.map((id) => ctx.db.get(id)))
  },
})

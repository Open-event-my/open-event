import { action } from './_generated/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * Recommend vendors for an event using Semantic Vector Search
 */
export const recommendVendors = action({
  args: {
    eventId: v.id('events'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 1. Get Event Details
    const event = await ctx.runQuery(internal.recommendations.getEventForMatching, {
      eventId: args.eventId,
    })

    if (!event) throw new Error('Event not found')

    // 2. Generate Embedding for Event
    // Combine title, description, and requirements into a rich text prompt
    const requirementText = event.requirements
      ? Object.entries(event.requirements)
          .filter(([_, v]) => v)
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
    const vendorIds = results.map((r) => r._id)
    const vendors = await ctx.runQuery(internal.recommendations.getVendorsByIds, {
      vendorIds,
    })

    // 5. Merge scores and return
    return results.map((result, i) => ({
      vendor: vendors[i],
      score: result._score,
    }))
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
  handler: async (ctx, args) => {
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
    const results = await ctx.vectorSearch('sponsors', 'by_embedding', {
      vector: embedding,
      limit: args.limit ?? 20,
      filter: (q) => q.eq('status', 'approved'),
    })

    // 4. Fetch full sponsor details
    const sponsorIds = results.map((r) => r._id)
    const sponsors = await ctx.runQuery(internal.recommendations.getSponsorsByIds, {
      sponsorIds,
    })

    return results.map((result, i) => ({
      sponsor: sponsors[i],
      score: result._score,
    }))
  },
})

// ============================================================================
// Internal Helpers
// ============================================================================

import { internalQuery } from './_generated/server'

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

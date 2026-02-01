import { internalAction } from './_generated/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * Generate embedding for a vendor profile
 */
export const generateVendorEmbedding = internalAction({
  args: {
    vendorId: v.id('vendors'),
  },
  handler: async (ctx, args) => {
    // 1. Fetch vendor data
    const vendor = await ctx.runQuery(internal.embeddings.getVendorForEmbedding, {
      vendorId: args.vendorId,
    })

    if (!vendor) return

    // 2. Construct text for embedding
    // We combine key fields to create a semantic representation
    const textParts = [
      `Vendor Name: ${vendor.name}`,
      `Category: ${vendor.category}`,
      `Services: ${vendor.services?.join(', ') || ''}`,
      `Description: ${vendor.description || ''}`,
      `Location: ${vendor.location || ''}`,
      `Price Range: ${vendor.priceRange || ''}`,
    ]
    const textToEmbed = textParts.join('\n')

    // 3. Generate embedding
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: textToEmbed,
      })

      const embedding = response.data[0].embedding

      // 4. Save embedding back to database
      await ctx.runMutation(internal.embeddings.saveVendorEmbedding, {
        vendorId: args.vendorId,
        embedding,
      })
    } catch (error) {
      console.error(`Failed to generate embedding for vendor ${args.vendorId}:`, error)
    }
  },
})

/**
 * Generate embedding for a sponsor profile
 */
export const generateSponsorEmbedding = internalAction({
  args: {
    sponsorId: v.id('sponsors'),
  },
  handler: async (ctx, args) => {
    // 1. Fetch sponsor data
    const sponsor = await ctx.runQuery(internal.embeddings.getSponsorForEmbedding, {
      sponsorId: args.sponsorId,
    })

    if (!sponsor) return

    // 2. Construct text for embedding
    const textParts = [
      `Sponsor Name: ${sponsor.name}`,
      `Industry: ${sponsor.industry}`,
      `Target Event Types: ${sponsor.targetEventTypes?.join(', ') || ''}`,
      `Description: ${sponsor.description || ''}`,
      `Budget Range: ${sponsor.budgetMin || 0} - ${sponsor.budgetMax || 'Unlimited'}`,
      `Target Audience: ${sponsor.targetAudience || ''}`,
    ]
    const textToEmbed = textParts.join('\n')

    // 3. Generate embedding
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: textToEmbed,
      })

      const embedding = response.data[0].embedding

      // 4. Save embedding back to database
      await ctx.runMutation(internal.embeddings.saveSponsorEmbedding, {
        sponsorId: args.sponsorId,
        embedding,
      })
    } catch (error) {
      console.error(`Failed to generate embedding for sponsor ${args.sponsorId}:`, error)
    }
  },
})

// ============================================================================
// Internal Helpers (Queries & Mutations)
// ============================================================================

import { internalQuery, internalMutation } from './_generated/server'

export const getVendorForEmbedding = internalQuery({
  args: { vendorId: v.id('vendors') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.vendorId)
  },
})

export const saveVendorEmbedding = internalMutation({
  args: { vendorId: v.id('vendors'), embedding: v.array(v.float64()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.vendorId, { embedding: args.embedding })
  },
})

export const getSponsorForEmbedding = internalQuery({
  args: { sponsorId: v.id('sponsors') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sponsorId)
  },
})

export const saveSponsorEmbedding = internalMutation({
  args: { sponsorId: v.id('sponsors'), embedding: v.array(v.float64()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sponsorId, { embedding: args.embedding })
  },
})

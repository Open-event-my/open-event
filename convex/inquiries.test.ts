import { convexTest } from 'convex-test'
import { describe, it, expect } from 'vitest'
import schema from './schema'
import {
  sendHandler,
  listAllForAdminHandler,
  updateAdminNotesHandler,
  searchAdminInquiriesHandler,
  markAsReadHandler,
} from './inquiries'

describe('Inquiries Module', () => {
  it('should send an inquiry as organizer', async () => {
    const t = convexTest(schema)

    // Setup users
    const organizerId = await t.run(async (ctx) => {
      return await ctx.db.insert('users', {
        name: 'Organizer',
        email: 'organizer@test.com',
        role: 'organizer',
        createdAt: Date.now(),
      })
    })

    await t.run(async (ctx) => {
      return await ctx.db.insert('users', {
        name: 'Admin',
        email: 'admin@test.com',
        role: 'superadmin',
        createdAt: Date.now(),
      })
    })

    // Setup vendor
    const vendorId = await t.run(async (ctx) => {
      return await ctx.db.insert('vendors', {
        name: 'Test Vendor',
        category: 'catering',
        contactEmail: 'vendor@test.com',
        status: 'approved',
        createdAt: Date.now(),
        verified: true,
        rating: 0,
        reviewCount: 0,
      })
    })

    // Send inquiry using handler directly with mocked auth
    const inquiryId = await t.run(async (ctx) => {
      const mockCtx = {
        ...ctx,
        auth: {
          ...ctx.auth,
          getUserIdentity: async () => ({
            subject: organizerId, // Pass ID directly
            tokenIdentifier: 'mock',
            issuer: 'mock',
            name: 'Organizer',
            email: 'organizer@test.com',
          }),
        },
      }

      // @ts-expect-error Mocking context
      return await sendHandler(mockCtx, {
        toType: 'vendor',
        toId: vendorId,
        subject: 'Test Inquiry',
        message: 'Hello, are you available?',
      })
    })

    expect(inquiryId).toBeDefined()

    // Verify stored data
    await t.run(async (ctx) => {
      const inquiry = await ctx.db.get(inquiryId)
      expect(inquiry).toMatchObject({
        subject: 'Test Inquiry',
        message: 'Hello, are you available?',
        status: 'sent',
        fromUserId: organizerId,
        toType: 'vendor',
        toId: vendorId,
      })
    })
  })

  it('should list inquiries with pagination for admin', async () => {
    const t = convexTest(schema)

    const adminId = await t.run(async (ctx) => {
      return await ctx.db.insert('users', {
        name: 'Admin',
        email: 'admin@test.com',
        role: 'admin', // Use admin role for this test
        createdAt: Date.now(),
      })
    })

    const organizerId = await t.run(async (ctx) => {
      return await ctx.db.insert('users', {
        name: 'Organizer',
        email: 'organizer@test.com',
        role: 'organizer',
        createdAt: Date.now(),
      })
    })

    const vendorId = await t.run(async (ctx) => {
      return await ctx.db.insert('vendors', {
        name: 'Test Vendor',
        category: 'catering',
        contactEmail: 'vendor@test.com',
        status: 'approved',
        createdAt: Date.now(),
        verified: true,
        rating: 0,
        reviewCount: 0,
      })
    })

    // Create multiple inquiries
    for (let i = 0; i < 5; i++) {
      await t.run(async (ctx) => {
        const mockCtx = {
          ...ctx,
          auth: {
            ...ctx.auth,
            getUserIdentity: async () => ({
              subject: organizerId,
              tokenIdentifier: 'mock',
            }),
          },
        }
        // @ts-expect-error Mocking context
        await sendHandler(mockCtx, {
          toType: 'vendor',
          toId: vendorId,
          subject: `Inquiry ${i}`,
          message: 'Message',
        })
      })
    }

    // Fetch page as admin
    const result = await t.run(async (ctx) => {
      const mockCtx = {
        ...ctx,
        auth: {
          ...ctx.auth,
          getUserIdentity: async () => ({
            subject: adminId,
            tokenIdentifier: 'mock',
          }),
        },
      }
      // @ts-expect-error Mocking context
      return await listAllForAdminHandler(mockCtx, {
        paginationOpts: { numItems: 3, cursor: null },
      })
    })

    expect(result.page.length).toBe(3)
    expect(result.continueCursor).toBeDefined()

    // Verify sorting (descending by default)
    expect(result.page[0].subject).toBe('Inquiry 4')
    expect(result.page[1].subject).toBe('Inquiry 3')
    expect(result.page[2].subject).toBe('Inquiry 2')
  })

  it('should update admin notes and status', async () => {
    const t = convexTest(schema)

    const adminId = await t.run(async (ctx) => {
      return await ctx.db.insert('users', {
        name: 'Admin',
        email: 'admin@test.com',
        role: 'admin',
        createdAt: Date.now(),
      })
    })

    const organizerId = await t.run(async (ctx) => {
      return await ctx.db.insert('users', {
        name: 'Organizer',
        email: 'organizer@test.com',
        role: 'organizer',
        createdAt: Date.now(),
      })
    })

    const vendorId = await t.run(async (ctx) => {
      return await ctx.db.insert('vendors', {
        name: 'Test Vendor',
        category: 'catering',
        contactEmail: 'vendor@test.com',
        status: 'approved',
        createdAt: Date.now(),
        verified: true,
        rating: 0,
        reviewCount: 0,
      })
    })

    // Send inquiry
    const inquiryId = await t.run(async (ctx) => {
      const mockCtx = {
        ...ctx,
        auth: {
          ...ctx.auth,
          getUserIdentity: async () => ({
            subject: organizerId,
            tokenIdentifier: 'mock',
          }),
        },
      }
      // @ts-expect-error Mocking context
      return await sendHandler(mockCtx, {
        toType: 'vendor',
        toId: vendorId,
        subject: 'Subject',
        message: 'Message',
      })
    })

    // Update notes and mark as read
    await t.run(async (ctx) => {
      const mockCtx = {
        ...ctx,
        auth: {
          ...ctx.auth,
          getUserIdentity: async () => ({
            subject: adminId,
            tokenIdentifier: 'mock',
          }),
        },
      }
      // @ts-expect-error Mocking context
      await updateAdminNotesHandler(mockCtx, {
        inquiryId,
        notes: 'This is an important inquiry.',
      })

      // @ts-expect-error Mocking context
      await markAsReadHandler(mockCtx, { inquiryId })
    })

    // Verify
    await t.run(async (ctx) => {
      const updated = await ctx.db.get(inquiryId)
      expect(updated?.adminNotes).toBe('This is an important inquiry.')
      expect(updated?.status).toBe('read')
    })
  })

  it('should search inquiries', async () => {
    const t = convexTest(schema)

    const adminId = await t.run(async (ctx) => {
      return await ctx.db.insert('users', {
        name: 'Admin',
        email: 'admin@test.com',
        role: 'admin',
        createdAt: Date.now(),
      })
    })

    const organizerId = await t.run(async (ctx) => {
      return await ctx.db.insert('users', {
        name: 'Organizer',
        email: 'organizer@test.com',
        role: 'organizer',
        createdAt: Date.now(),
      })
    })

    const vendorId = await t.run(async (ctx) => {
      return await ctx.db.insert('vendors', {
        name: 'Test Vendor',
        category: 'catering',
        contactEmail: 'vendor@test.com',
        status: 'approved',
        createdAt: Date.now(),
        verified: true,
        rating: 0,
        reviewCount: 0,
      })
    })

    // Send inquiries
    await t.run(async (ctx) => {
      const mockCtx = {
        ...ctx,
        auth: {
          ...ctx.auth,
          getUserIdentity: async () => ({
            subject: organizerId,
            tokenIdentifier: 'mock',
          }),
        },
      }
      // @ts-expect-error Mocking context
      await sendHandler(mockCtx, {
        toType: 'vendor',
        toId: vendorId,
        subject: 'UniqueKeyword',
        message: 'Message',
      })
      // @ts-expect-error Mocking context
      await sendHandler(mockCtx, {
        toType: 'vendor',
        toId: vendorId,
        subject: 'OtherSubject',
        message: 'Message',
      })
    })

    // Search
    const results = await t.run(async (ctx) => {
      const mockCtx = {
        ...ctx,
        auth: {
          ...ctx.auth,
          getUserIdentity: async () => ({
            subject: adminId,
            tokenIdentifier: 'mock',
          }),
        },
      }
      // @ts-expect-error Mocking context
      return await searchAdminInquiriesHandler(mockCtx, {
        query: 'UniqueKeyword',
      })
    })

    expect(results.length).toBe(1)
    expect(results[0].subject).toBe('UniqueKeyword')
  })
})

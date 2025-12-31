/**
 * Seed Data Migration
 *
 * Creates comprehensive mock data for testing all app features including:
 * - Events (various statuses)
 * - Vendors (different categories)
 * - Sponsors (different industries)
 * - Event-Vendor and Event-Sponsor relationships
 * - Ticket types and attendees
 * - Orders and promo codes
 * - Budget items
 *
 * Usage:
 * - Seed data: npx convex run migrations/seedData:seed
 * - Clear data: npx convex run migrations/seedData:clear
 * - Dry run: npx convex run migrations/seedData:dryRun
 */

import { internalMutation } from '../_generated/server'
import type { Id } from '../_generated/dataModel'

// Prefix for identifying seeded data
const SEED_PREFIX = '[SEED]'

// Helper to generate unique ticket numbers
function generateTicketNumber(): string {
  return `TKT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
}

// Helper to generate order numbers
function generateOrderNumber(): string {
  return `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
}

// Helper to get timestamp for X days ago
function daysAgo(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000
}

// Helper to get timestamp for X days in future
function daysFromNow(days: number): number {
  return Date.now() + days * 24 * 60 * 60 * 1000
}

/**
 * Main seed function - creates all mock data
 */
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const results = {
      vendors: 0,
      sponsors: 0,
      events: 0,
      eventVendors: 0,
      eventSponsors: 0,
      ticketTypes: 0,
      attendees: 0,
      orders: 0,
      budgetItems: 0,
      promoCodes: 0,
      eventApplications: 0,
    }

    // Get the first organizer user to own the events
    const organizer = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('role'), 'organizer'))
      .first()

    if (!organizer) {
      // Try to get any user
      const anyUser = await ctx.db.query('users').first()
      if (!anyUser) {
        throw new Error('No users found. Please create a user account first.')
      }
      console.log('[SEED] No organizer found, using first available user:', anyUser.email)
    }

    const organizerId = organizer?._id || (await ctx.db.query('users').first())!._id
    console.log('[SEED] Using organizer:', organizerId)

    // ========================================================================
    // 1. CREATE VENDORS
    // ========================================================================
    console.log('[SEED] Creating vendors...')

    const vendorData = [
      {
        name: `${SEED_PREFIX} Elite Catering Co.`,
        description: 'Premium catering services for corporate events, weddings, and large gatherings. Award-winning cuisine with customizable menus.',
        category: 'Catering',
        services: ['Buffet Service', 'Plated Dinner', 'Cocktail Reception', 'Dietary Accommodations'],
        location: 'New York, NY',
        priceRange: 'premium',
        rating: 4.8,
        reviewCount: 127,
        contactEmail: 'contact@elitecatering.example.com',
        contactPhone: '+1-555-0101',
        contactName: 'Michael Chen',
        website: 'https://elitecatering.example.com',
        verified: true,
        status: 'approved' as const,
        companySize: 'medium',
        yearFounded: 2010,
      },
      {
        name: `${SEED_PREFIX} SoundWave Audio`,
        description: 'Professional audio and visual equipment rental with full technical support. Specializing in conferences and live events.',
        category: 'Audio/Visual',
        services: ['Sound Systems', 'LED Screens', 'Stage Lighting', 'Live Streaming'],
        location: 'Los Angeles, CA',
        priceRange: 'mid',
        rating: 4.6,
        reviewCount: 89,
        contactEmail: 'info@soundwave.example.com',
        contactPhone: '+1-555-0102',
        contactName: 'Sarah Johnson',
        website: 'https://soundwave.example.com',
        verified: true,
        status: 'approved' as const,
        companySize: 'small',
        yearFounded: 2015,
      },
      {
        name: `${SEED_PREFIX} Bloom Florals`,
        description: 'Creative floral arrangements and event decoration. From intimate gatherings to grand celebrations.',
        category: 'Decoration',
        services: ['Floral Arrangements', 'Centerpieces', 'Venue Decoration', 'Custom Installations'],
        location: 'Miami, FL',
        priceRange: 'mid',
        rating: 4.9,
        reviewCount: 156,
        contactEmail: 'hello@bloomflorals.example.com',
        contactPhone: '+1-555-0103',
        contactName: 'Emily Rose',
        verified: false,
        status: 'pending' as const,
        companySize: 'solo',
        yearFounded: 2018,
      },
      {
        name: `${SEED_PREFIX} SecureEvent Guards`,
        description: 'Professional event security services with trained personnel for all event types.',
        category: 'Security',
        services: ['Crowd Management', 'VIP Protection', 'Access Control', 'Emergency Response'],
        location: 'Chicago, IL',
        priceRange: 'premium',
        rating: 4.7,
        reviewCount: 203,
        contactEmail: 'security@secureevent.example.com',
        contactPhone: '+1-555-0104',
        contactName: 'Robert Williams',
        website: 'https://secureevent.example.com',
        verified: true,
        status: 'approved' as const,
        companySize: 'large',
        yearFounded: 2005,
      },
      {
        name: `${SEED_PREFIX} Flash Photography`,
        description: 'Event photography and videography services capturing your special moments.',
        category: 'Photography',
        services: ['Event Photography', 'Videography', 'Photo Booth', 'Drone Coverage'],
        location: 'San Francisco, CA',
        priceRange: 'budget',
        rating: 3.8,
        reviewCount: 45,
        contactEmail: 'book@flashphoto.example.com',
        contactPhone: '+1-555-0105',
        contactName: 'Alex Kim',
        verified: false,
        status: 'rejected' as const,
        rejectionReason: 'Insufficient portfolio provided',
        companySize: 'solo',
        yearFounded: 2020,
      },
    ]

    const vendorIds: Id<'vendors'>[] = []
    for (const vendor of vendorData) {
      const id = await ctx.db.insert('vendors', {
        ...vendor,
        createdAt: daysAgo(Math.floor(Math.random() * 90)),
      })
      vendorIds.push(id)
      results.vendors++
    }
    console.log(`[SEED] Created ${results.vendors} vendors`)

    // ========================================================================
    // 2. CREATE SPONSORS
    // ========================================================================
    console.log('[SEED] Creating sponsors...')

    const sponsorData = [
      {
        name: `${SEED_PREFIX} TechCorp Industries`,
        description: 'Leading technology company supporting innovation through strategic event partnerships.',
        industry: 'Technology',
        sponsorshipTiers: ['platinum', 'gold'],
        budgetMin: 50000,
        budgetMax: 200000,
        targetEventTypes: ['Conference', 'Hackathon', 'Tech Summit'],
        targetAudience: 'Tech professionals and developers',
        contactEmail: 'sponsorship@techcorp.example.com',
        contactName: 'David Lee',
        contactPhone: '+1-555-0201',
        website: 'https://techcorp.example.com',
        verified: true,
        status: 'approved' as const,
        companySize: 'enterprise',
        yearFounded: 1998,
        deliverablesOffered: ['Logo Placement', 'Speaking Slot', 'Booth Space', 'Networking Events'],
      },
      {
        name: `${SEED_PREFIX} GreenLife Foods`,
        description: 'Organic food company passionate about sustainable events and healthy communities.',
        industry: 'Food & Beverage',
        sponsorshipTiers: ['gold', 'silver'],
        budgetMin: 10000,
        budgetMax: 50000,
        targetEventTypes: ['Festival', 'Community Event', 'Charity Gala'],
        targetAudience: 'Health-conscious consumers',
        contactEmail: 'events@greenlife.example.com',
        contactName: 'Lisa Green',
        contactPhone: '+1-555-0202',
        website: 'https://greenlife.example.com',
        verified: true,
        status: 'approved' as const,
        companySize: 'medium',
        yearFounded: 2012,
        deliverablesOffered: ['Product Sampling', 'Logo Placement', 'Social Media'],
      },
      {
        name: `${SEED_PREFIX} Urban Bank`,
        description: 'Community-focused financial institution investing in local events and initiatives.',
        industry: 'Finance',
        sponsorshipTiers: ['silver', 'bronze'],
        budgetMin: 5000,
        budgetMax: 25000,
        targetEventTypes: ['Networking', 'Business Conference', 'Community Event'],
        targetAudience: 'Business professionals and entrepreneurs',
        contactEmail: 'community@urbanbank.example.com',
        contactName: 'James Wilson',
        verified: false,
        status: 'pending' as const,
        companySize: 'large',
        yearFounded: 1985,
      },
      {
        name: `${SEED_PREFIX} SportsFit Gear`,
        description: 'Athletic apparel and equipment company sponsoring sports and fitness events.',
        industry: 'Sports',
        sponsorshipTiers: ['gold', 'silver', 'bronze'],
        budgetMin: 15000,
        budgetMax: 75000,
        targetEventTypes: ['Sports Event', 'Marathon', 'Fitness Expo'],
        targetAudience: 'Athletes and fitness enthusiasts',
        contactEmail: 'partnerships@sportsfit.example.com',
        contactName: 'Maria Santos',
        contactPhone: '+1-555-0204',
        website: 'https://sportsfit.example.com',
        verified: true,
        status: 'approved' as const,
        companySize: 'medium',
        yearFounded: 2008,
        deliverablesOffered: ['Branded Merchandise', 'Booth Space', 'Logo Placement', 'Athlete Meet & Greet'],
      },
    ]

    const sponsorIds: Id<'sponsors'>[] = []
    for (const sponsor of sponsorData) {
      const id = await ctx.db.insert('sponsors', {
        ...sponsor,
        createdAt: daysAgo(Math.floor(Math.random() * 90)),
      })
      sponsorIds.push(id)
      results.sponsors++
    }
    console.log(`[SEED] Created ${results.sponsors} sponsors`)

    // ========================================================================
    // 3. CREATE EVENTS
    // ========================================================================
    console.log('[SEED] Creating events...')

    const eventData = [
      {
        title: `${SEED_PREFIX} Tech Innovation Summit 2025`,
        description: 'Annual technology conference featuring keynote speakers, workshops, and networking opportunities for tech professionals.',
        eventType: 'Conference',
        status: 'active',
        locationType: 'in-person',
        venueName: 'Convention Center',
        venueAddress: '123 Tech Boulevard, San Francisco, CA 94102',
        expectedAttendees: 500,
        budget: 75000,
        budgetCurrency: 'USD',
        startDate: daysFromNow(30),
        endDate: daysFromNow(32),
        isPublic: true,
        seekingVendors: true,
        seekingSponsors: true,
        vendorCategories: ['Catering', 'Audio/Visual', 'Photography'],
        sponsorBenefits: 'Logo placement, speaking slots, booth space, and exclusive networking access.',
        requirements: {
          catering: true,
          av: true,
          photography: true,
          security: true,
        },
      },
      {
        title: `${SEED_PREFIX} Annual Charity Gala`,
        description: 'Elegant fundraising event supporting local education initiatives. Includes dinner, auction, and live entertainment.',
        eventType: 'Gala',
        status: 'planning',
        locationType: 'in-person',
        venueName: 'Grand Ballroom Hotel',
        venueAddress: '456 Luxury Lane, New York, NY 10001',
        expectedAttendees: 200,
        budget: 45000,
        budgetCurrency: 'USD',
        startDate: daysFromNow(60),
        endDate: daysFromNow(60),
        isPublic: true,
        seekingVendors: true,
        seekingSponsors: true,
        vendorCategories: ['Catering', 'Decoration', 'Entertainment'],
        requirements: {
          catering: true,
          decoration: true,
          photography: true,
        },
      },
      {
        title: `${SEED_PREFIX} Corporate Team Building`,
        description: 'Team building workshop and activities for company employees.',
        eventType: 'Corporate',
        status: 'draft',
        locationType: 'in-person',
        venueName: 'Adventure Park Resort',
        expectedAttendees: 50,
        budget: 15000,
        budgetCurrency: 'USD',
        startDate: daysFromNow(45),
        isPublic: false,
      },
      {
        title: `${SEED_PREFIX} Summer Music Festival`,
        description: 'Three-day outdoor music festival featuring local and international artists across multiple stages.',
        eventType: 'Festival',
        status: 'active',
        locationType: 'in-person',
        venueName: 'Riverside Park',
        venueAddress: '789 Park Drive, Austin, TX 78701',
        expectedAttendees: 5000,
        budget: 250000,
        budgetCurrency: 'USD',
        startDate: daysFromNow(14),
        endDate: daysFromNow(17),
        isPublic: true,
        seekingVendors: true,
        seekingSponsors: true,
        vendorCategories: ['Catering', 'Security', 'Photography'],
        requirements: {
          catering: true,
          av: true,
          security: true,
          transportation: true,
        },
      },
      {
        title: `${SEED_PREFIX} Product Launch Party`,
        description: 'Exclusive launch event for our new product line with press, influencers, and VIP guests.',
        eventType: 'Launch',
        status: 'completed',
        locationType: 'hybrid',
        venueName: 'Modern Art Gallery',
        venueAddress: '321 Creative Street, Los Angeles, CA 90001',
        virtualPlatform: 'Zoom',
        expectedAttendees: 150,
        budget: 35000,
        budgetCurrency: 'USD',
        startDate: daysAgo(7),
        endDate: daysAgo(7),
        isPublic: false,
      },
      {
        title: `${SEED_PREFIX} Holiday Networking Mixer`,
        description: 'End of year networking event for professionals in the industry.',
        eventType: 'Networking',
        status: 'cancelled',
        locationType: 'in-person',
        venueName: 'Downtown Lounge',
        expectedAttendees: 100,
        budget: 8000,
        budgetCurrency: 'USD',
        startDate: daysFromNow(90),
        isPublic: true,
      },
    ]

    const eventIds: Id<'events'>[] = []
    for (const event of eventData) {
      const id = await ctx.db.insert('events', {
        ...event,
        organizerId,
        createdAt: daysAgo(Math.floor(Math.random() * 60) + 30),
      })
      eventIds.push(id)
      results.events++
    }
    console.log(`[SEED] Created ${results.events} events`)

    // Reference IDs for specific events
    const techSummitId = eventIds[0] // Tech Innovation Summit
    const charityGalaId = eventIds[1] // Charity Gala
    const musicFestivalId = eventIds[3] // Music Festival
    const productLaunchId = eventIds[4] // Product Launch (completed)

    // ========================================================================
    // 4. CREATE EVENT-VENDOR RELATIONSHIPS
    // ========================================================================
    console.log('[SEED] Creating event-vendor relationships...')

    const eventVendorData = [
      { eventId: techSummitId, vendorId: vendorIds[0], status: 'confirmed', proposedBudget: 15000, finalBudget: 14500, notes: 'Full catering package agreed' },
      { eventId: techSummitId, vendorId: vendorIds[1], status: 'confirmed', proposedBudget: 8000, finalBudget: 8000, notes: 'AV equipment and support' },
      { eventId: musicFestivalId, vendorId: vendorIds[4], status: 'negotiating', proposedBudget: 5000, notes: 'Discussing coverage package' },
      { eventId: charityGalaId, vendorId: vendorIds[2], status: 'inquiry', proposedBudget: 6000, notes: 'Initial inquiry for floral decorations' },
      { eventId: productLaunchId, vendorId: vendorIds[0], status: 'completed', proposedBudget: 8000, finalBudget: 8500, notes: 'Catering for launch event completed' },
    ]

    for (const ev of eventVendorData) {
      await ctx.db.insert('eventVendors', {
        ...ev,
        createdAt: daysAgo(Math.floor(Math.random() * 30)),
      })
      results.eventVendors++
    }
    console.log(`[SEED] Created ${results.eventVendors} event-vendor relationships`)

    // ========================================================================
    // 5. CREATE EVENT-SPONSOR RELATIONSHIPS
    // ========================================================================
    console.log('[SEED] Creating event-sponsor relationships...')

    const eventSponsorData = [
      { eventId: techSummitId, sponsorId: sponsorIds[0], tier: 'platinum', status: 'confirmed', amount: 100000, benefits: ['Keynote Slot', 'Premium Booth', 'Logo on All Materials', 'VIP Dinner Hosting'] },
      { eventId: techSummitId, sponsorId: sponsorIds[2], tier: 'silver', status: 'negotiating', amount: 25000, notes: 'Discussing terms' },
      { eventId: musicFestivalId, sponsorId: sponsorIds[3], tier: 'gold', status: 'confirmed', amount: 50000, benefits: ['Stage Branding', 'Booth Space', 'Athlete Meet & Greet', 'Social Media Feature'] },
      { eventId: charityGalaId, sponsorId: sponsorIds[1], tier: 'gold', status: 'confirmed', amount: 30000, benefits: ['Table Sponsorship', 'Menu Feature', 'Logo Placement'] },
    ]

    for (const es of eventSponsorData) {
      await ctx.db.insert('eventSponsors', {
        ...es,
        createdAt: daysAgo(Math.floor(Math.random() * 30)),
      })
      results.eventSponsors++
    }
    console.log(`[SEED] Created ${results.eventSponsors} event-sponsor relationships`)

    // ========================================================================
    // 6. CREATE TICKET TYPES
    // ========================================================================
    console.log('[SEED] Creating ticket types...')

    const ticketTypeData = [
      // Tech Summit tickets
      { eventId: techSummitId, name: 'VIP Pass', description: 'Full conference access with VIP lounge and networking dinner', price: 29900, currency: 'usd', quantity: 50, soldCount: 23, sortOrder: 1, isActive: true, isHidden: false, perks: ['VIP Lounge Access', 'Networking Dinner', 'Priority Seating', 'Gift Bag'] },
      { eventId: techSummitId, name: 'General Admission', description: 'Full conference access to all sessions and expo hall', price: 9900, currency: 'usd', quantity: 400, soldCount: 156, sortOrder: 2, isActive: true, isHidden: false, perks: ['All Sessions', 'Expo Hall', 'Lunch Included'] },
      { eventId: techSummitId, name: 'Student Pass', description: 'Discounted access for students with valid ID', price: 4900, currency: 'usd', quantity: 100, soldCount: 45, sortOrder: 3, isActive: true, isHidden: false, perks: ['All Sessions', 'Expo Hall'] },

      // Music Festival tickets
      { eventId: musicFestivalId, name: 'Weekend Pass', description: 'Full 3-day festival access', price: 15000, currency: 'usd', quantity: 3000, soldCount: 1847, sortOrder: 1, isActive: true, isHidden: false, perks: ['All Stages', 'All 3 Days', 'Free Parking'] },
      { eventId: musicFestivalId, name: 'Day Pass', description: 'Single day access', price: 6000, currency: 'usd', quantity: 2000, soldCount: 523, sortOrder: 2, isActive: true, isHidden: false, perks: ['All Stages', 'One Day'] },
      { eventId: musicFestivalId, name: 'Early Bird Special', description: 'Limited early bird pricing', price: 9900, currency: 'usd', quantity: 500, soldCount: 500, sortOrder: 3, isActive: false, isHidden: false, perks: ['All Stages', 'All 3 Days', 'Early Entry'] },
    ]

    const ticketTypeIds: Id<'ticketTypes'>[] = []
    for (const tt of ticketTypeData) {
      const id = await ctx.db.insert('ticketTypes', {
        ...tt,
        createdAt: daysAgo(Math.floor(Math.random() * 60)),
      })
      ticketTypeIds.push(id)
      results.ticketTypes++
    }
    console.log(`[SEED] Created ${results.ticketTypes} ticket types`)

    // ========================================================================
    // 7. CREATE ATTENDEES
    // ========================================================================
    console.log('[SEED] Creating attendees...')

    const firstNames = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'Chris', 'Lisa', 'Robert', 'Amanda']
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor']
    const organizations = ['Acme Corp', 'Tech Startup', 'Global Industries', 'Innovation Labs', 'Future Co', null]
    const statuses: Array<'registered' | 'confirmed' | 'checked_in' | 'cancelled' | 'no_show'> = ['registered', 'confirmed', 'checked_in', 'cancelled', 'no_show']

    // Tech Summit attendees
    for (let i = 0; i < 10; i++) {
      const firstName = firstNames[i % firstNames.length]
      const lastName = lastNames[i % lastNames.length]
      const status = statuses[i % 3] // registered, confirmed, checked_in

      await ctx.db.insert('attendees', {
        eventId: techSummitId,
        name: `${SEED_PREFIX} ${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
        phone: `+1-555-${String(1000 + i).padStart(4, '0')}`,
        ticketType: i < 3 ? 'VIP Pass' : i < 7 ? 'General Admission' : 'Student Pass',
        ticketNumber: generateTicketNumber(),
        status,
        checkedInAt: status === 'checked_in' ? daysAgo(1) : undefined,
        organization: organizations[i % organizations.length] || undefined,
        registrationSource: 'form',
        paymentStatus: 'paid',
        registeredAt: daysAgo(Math.floor(Math.random() * 30) + 1),
      })
      results.attendees++
    }

    // Music Festival attendees
    for (let i = 0; i < 10; i++) {
      const firstName = firstNames[(i + 5) % firstNames.length]
      const lastName = lastNames[(i + 5) % lastNames.length]
      const status = i < 6 ? 'registered' : i < 8 ? 'cancelled' : 'no_show'

      await ctx.db.insert('attendees', {
        eventId: musicFestivalId,
        name: `${SEED_PREFIX} ${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i + 10}@example.com`,
        ticketType: i % 2 === 0 ? 'Weekend Pass' : 'Day Pass',
        ticketNumber: generateTicketNumber(),
        status,
        registrationSource: 'form',
        paymentStatus: status === 'cancelled' ? 'refunded' : 'paid',
        registeredAt: daysAgo(Math.floor(Math.random() * 20) + 1),
      })
      results.attendees++
    }
    console.log(`[SEED] Created ${results.attendees} attendees`)

    // ========================================================================
    // 8. CREATE ORDERS
    // ========================================================================
    console.log('[SEED] Creating orders...')

    const orderData = [
      // Completed orders
      { eventId: techSummitId, buyerEmail: 'buyer1@example.com', buyerName: `${SEED_PREFIX} Alice Walker`, ticketTypeId: ticketTypeIds[0], quantity: 2, paymentStatus: 'completed' as const, paidAt: daysAgo(5) },
      { eventId: techSummitId, buyerEmail: 'buyer2@example.com', buyerName: `${SEED_PREFIX} Bob Martin`, ticketTypeId: ticketTypeIds[1], quantity: 5, paymentStatus: 'completed' as const, paidAt: daysAgo(3) },
      { eventId: musicFestivalId, buyerEmail: 'buyer3@example.com', buyerName: `${SEED_PREFIX} Carol White`, ticketTypeId: ticketTypeIds[3], quantity: 4, paymentStatus: 'completed' as const, paidAt: daysAgo(10) },
      { eventId: musicFestivalId, buyerEmail: 'buyer4@example.com', buyerName: `${SEED_PREFIX} Dan Brown`, ticketTypeId: ticketTypeIds[4], quantity: 2, paymentStatus: 'completed' as const, paidAt: daysAgo(7) },
      // Pending orders
      { eventId: techSummitId, buyerEmail: 'buyer5@example.com', buyerName: `${SEED_PREFIX} Eve Davis`, ticketTypeId: ticketTypeIds[1], quantity: 1, paymentStatus: 'pending' as const },
      { eventId: musicFestivalId, buyerEmail: 'buyer6@example.com', buyerName: `${SEED_PREFIX} Frank Miller`, ticketTypeId: ticketTypeIds[3], quantity: 2, paymentStatus: 'pending' as const },
      // Refunded order
      { eventId: techSummitId, buyerEmail: 'buyer7@example.com', buyerName: `${SEED_PREFIX} Grace Lee`, ticketTypeId: ticketTypeIds[1], quantity: 3, paymentStatus: 'refunded' as const, refundReason: 'Unable to attend due to scheduling conflict' },
      // Failed order
      { eventId: musicFestivalId, buyerEmail: 'buyer8@example.com', buyerName: `${SEED_PREFIX} Henry Zhang`, ticketTypeId: ticketTypeIds[3], quantity: 1, paymentStatus: 'failed' as const },
    ]

    for (const order of orderData) {
      const ticketType = await ctx.db.get(order.ticketTypeId)
      if (!ticketType) continue

      const subtotal = ticketType.price * order.quantity
      const fees = Math.round(subtotal * 0.03) // 3% fee
      const total = subtotal + fees

      await ctx.db.insert('orders', {
        eventId: order.eventId,
        buyerEmail: order.buyerEmail,
        buyerName: order.buyerName,
        items: [{
          ticketTypeId: order.ticketTypeId,
          ticketTypeName: ticketType.name,
          quantity: order.quantity,
          unitPrice: ticketType.price,
          subtotal,
        }],
        subtotal,
        fees,
        total,
        currency: 'usd',
        paymentStatus: order.paymentStatus,
        orderNumber: generateOrderNumber(),
        paidAt: order.paidAt,
        refundReason: order.refundReason,
        refundAmount: order.paymentStatus === 'refunded' ? total : undefined,
        createdAt: daysAgo(Math.floor(Math.random() * 14) + 1),
      })
      results.orders++
    }
    console.log(`[SEED] Created ${results.orders} orders`)

    // ========================================================================
    // 9. CREATE BUDGET ITEMS
    // ========================================================================
    console.log('[SEED] Creating budget items...')

    const budgetItemData = [
      // Tech Summit budget items
      { eventId: techSummitId, category: 'venue', name: `${SEED_PREFIX} Convention Center Rental`, estimatedAmount: 25000, actualAmount: 24500, status: 'paid' as const },
      { eventId: techSummitId, category: 'catering', name: `${SEED_PREFIX} Elite Catering Package`, estimatedAmount: 15000, actualAmount: 14500, status: 'paid' as const, vendorId: vendorIds[0] },
      { eventId: techSummitId, category: 'av', name: `${SEED_PREFIX} Audio Visual Equipment`, estimatedAmount: 8000, actualAmount: 8000, status: 'committed' as const, vendorId: vendorIds[1] },
      { eventId: techSummitId, category: 'marketing', name: `${SEED_PREFIX} Digital Marketing Campaign`, estimatedAmount: 5000, status: 'planned' as const },
      { eventId: techSummitId, category: 'staffing', name: `${SEED_PREFIX} Event Staff`, estimatedAmount: 3000, status: 'planned' as const },
      { eventId: techSummitId, category: 'permits', name: `${SEED_PREFIX} Event Permits & Insurance`, estimatedAmount: 2000, actualAmount: 1800, status: 'paid' as const },

      // Music Festival budget items
      { eventId: musicFestivalId, category: 'venue', name: `${SEED_PREFIX} Park Rental & Setup`, estimatedAmount: 50000, actualAmount: 52000, status: 'paid' as const },
      { eventId: musicFestivalId, category: 'catering', name: `${SEED_PREFIX} Food Vendor Coordination`, estimatedAmount: 30000, status: 'committed' as const },
      { eventId: musicFestivalId, category: 'av', name: `${SEED_PREFIX} Stage & Sound Systems`, estimatedAmount: 80000, actualAmount: 78500, status: 'paid' as const },
      { eventId: musicFestivalId, category: 'marketing', name: `${SEED_PREFIX} Festival Marketing`, estimatedAmount: 25000, actualAmount: 27000, status: 'paid' as const },
      { eventId: musicFestivalId, category: 'staffing', name: `${SEED_PREFIX} Security & Event Staff`, estimatedAmount: 40000, status: 'committed' as const, vendorId: vendorIds[3] },
      { eventId: musicFestivalId, category: 'misc', name: `${SEED_PREFIX} Contingency Fund`, estimatedAmount: 15000, status: 'planned' as const },
    ]

    for (const item of budgetItemData) {
      await ctx.db.insert('budgetItems', {
        ...item,
        createdAt: daysAgo(Math.floor(Math.random() * 45)),
      })
      results.budgetItems++
    }
    console.log(`[SEED] Created ${results.budgetItems} budget items`)

    // ========================================================================
    // 10. CREATE PROMO CODES
    // ========================================================================
    console.log('[SEED] Creating promo codes...')

    const promoCodeData = [
      {
        eventId: techSummitId,
        code: 'EARLY20',
        description: 'Early bird 20% discount',
        discountType: 'percentage' as const,
        discountValue: 20,
        maxUses: 100,
        usedCount: 34,
        isActive: true,
        validUntil: daysFromNow(15),
      },
      {
        code: 'VIP50',
        description: '$50 off any order',
        discountType: 'fixed' as const,
        discountValue: 5000, // cents
        maxUses: 50,
        usedCount: 12,
        maxUsesPerEmail: 1,
        minOrderAmount: 10000,
        isActive: true,
        validUntil: daysFromNow(30),
      },
      {
        eventId: musicFestivalId,
        code: 'EXPIRED10',
        description: 'Expired 10% discount',
        discountType: 'percentage' as const,
        discountValue: 10,
        maxUses: 200,
        usedCount: 87,
        isActive: false,
        validUntil: daysAgo(5),
      },
    ]

    for (const promo of promoCodeData) {
      await ctx.db.insert('promoCodes', {
        ...promo,
        organizerId,
        createdAt: daysAgo(60),
      })
      results.promoCodes++
    }
    console.log(`[SEED] Created ${results.promoCodes} promo codes`)

    // ========================================================================
    // 11. CREATE EVENT APPLICATIONS
    // ========================================================================
    console.log('[SEED] Creating event applications...')

    const applicationData = [
      { eventId: techSummitId, applicantType: 'vendor' as const, applicantId: vendorIds[2].toString(), status: 'pending' as const, message: 'We would love to provide floral decorations for your event.', proposedBudget: 4000 },
      { eventId: musicFestivalId, applicantType: 'vendor' as const, applicantId: vendorIds[4].toString(), status: 'under_review' as const, message: 'Professional photography services for your festival.', proposedBudget: 6000 },
      { eventId: charityGalaId, applicantType: 'sponsor' as const, applicantId: sponsorIds[2].toString(), status: 'pending' as const, message: 'Urban Bank would like to support your charity event.', proposedTier: 'silver', proposedBudget: 20000 },
      { eventId: techSummitId, applicantType: 'sponsor' as const, applicantId: sponsorIds[3].toString(), status: 'accepted' as const, message: 'Excited to sponsor the tech summit!', proposedTier: 'bronze', proposedBudget: 15000 },
      { eventId: musicFestivalId, applicantType: 'sponsor' as const, applicantId: sponsorIds[1].toString(), status: 'rejected' as const, message: 'GreenLife Foods partnership proposal', proposedTier: 'gold', proposedBudget: 40000, rejectionReason: 'Already have a food sponsor for this tier' },
      { eventId: charityGalaId, applicantType: 'vendor' as const, applicantId: vendorIds[0].toString(), status: 'accepted' as const, message: 'Elite Catering at your service', proposedBudget: 12000 },
    ]

    for (const app of applicationData) {
      await ctx.db.insert('eventApplications', {
        ...app,
        createdAt: daysAgo(Math.floor(Math.random() * 20)),
      })
      results.eventApplications++
    }
    console.log(`[SEED] Created ${results.eventApplications} event applications`)

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('[SEED] ============================================')
    console.log('[SEED] Seed data creation complete!')
    console.log('[SEED] Summary:')
    console.log(`[SEED]   Vendors: ${results.vendors}`)
    console.log(`[SEED]   Sponsors: ${results.sponsors}`)
    console.log(`[SEED]   Events: ${results.events}`)
    console.log(`[SEED]   Event-Vendor Links: ${results.eventVendors}`)
    console.log(`[SEED]   Event-Sponsor Links: ${results.eventSponsors}`)
    console.log(`[SEED]   Ticket Types: ${results.ticketTypes}`)
    console.log(`[SEED]   Attendees: ${results.attendees}`)
    console.log(`[SEED]   Orders: ${results.orders}`)
    console.log(`[SEED]   Budget Items: ${results.budgetItems}`)
    console.log(`[SEED]   Promo Codes: ${results.promoCodes}`)
    console.log(`[SEED]   Event Applications: ${results.eventApplications}`)
    console.log('[SEED] ============================================')

    return results
  },
})

/**
 * Clear all seeded data (identified by [SEED] prefix)
 */
export const clear = internalMutation({
  args: {},
  handler: async (ctx) => {
    const results = {
      orders: 0,
      attendees: 0,
      eventApplications: 0,
      ticketTypes: 0,
      budgetItems: 0,
      promoCodes: 0,
      eventVendors: 0,
      eventSponsors: 0,
      events: 0,
      vendors: 0,
      sponsors: 0,
    }

    console.log('[SEED CLEAR] Starting cleanup of seeded data...')

    // Find seeded events first
    const seededEvents = await ctx.db
      .query('events')
      .collect()
    const seededEventIds = seededEvents
      .filter((e) => e.title.startsWith(SEED_PREFIX))
      .map((e) => e._id)

    // Delete orders for seeded events
    const orders = await ctx.db.query('orders').collect()
    for (const order of orders) {
      if (seededEventIds.includes(order.eventId)) {
        await ctx.db.delete(order._id)
        results.orders++
      }
    }

    // Delete attendees for seeded events
    const attendees = await ctx.db.query('attendees').collect()
    for (const attendee of attendees) {
      if (seededEventIds.includes(attendee.eventId) || attendee.name.startsWith(SEED_PREFIX)) {
        await ctx.db.delete(attendee._id)
        results.attendees++
      }
    }

    // Delete event applications for seeded events
    const applications = await ctx.db.query('eventApplications').collect()
    for (const app of applications) {
      if (seededEventIds.includes(app.eventId)) {
        await ctx.db.delete(app._id)
        results.eventApplications++
      }
    }

    // Delete ticket types for seeded events
    const ticketTypes = await ctx.db.query('ticketTypes').collect()
    for (const tt of ticketTypes) {
      if (seededEventIds.includes(tt.eventId)) {
        await ctx.db.delete(tt._id)
        results.ticketTypes++
      }
    }

    // Delete budget items for seeded events
    const budgetItems = await ctx.db.query('budgetItems').collect()
    for (const item of budgetItems) {
      if (seededEventIds.includes(item.eventId) || item.name.startsWith(SEED_PREFIX)) {
        await ctx.db.delete(item._id)
        results.budgetItems++
      }
    }

    // Delete promo codes (check by code or for seeded events)
    const promoCodes = await ctx.db.query('promoCodes').collect()
    for (const promo of promoCodes) {
      if ((promo.eventId && seededEventIds.includes(promo.eventId)) ||
          ['EARLY20', 'VIP50', 'EXPIRED10'].includes(promo.code)) {
        await ctx.db.delete(promo._id)
        results.promoCodes++
      }
    }

    // Delete event-vendor relationships
    const eventVendors = await ctx.db.query('eventVendors').collect()
    for (const ev of eventVendors) {
      if (seededEventIds.includes(ev.eventId)) {
        await ctx.db.delete(ev._id)
        results.eventVendors++
      }
    }

    // Delete event-sponsor relationships
    const eventSponsors = await ctx.db.query('eventSponsors').collect()
    for (const es of eventSponsors) {
      if (seededEventIds.includes(es.eventId)) {
        await ctx.db.delete(es._id)
        results.eventSponsors++
      }
    }

    // Delete seeded events
    for (const event of seededEvents) {
      if (event.title.startsWith(SEED_PREFIX)) {
        await ctx.db.delete(event._id)
        results.events++
      }
    }

    // Delete seeded vendors
    const vendors = await ctx.db.query('vendors').collect()
    for (const vendor of vendors) {
      if (vendor.name.startsWith(SEED_PREFIX)) {
        await ctx.db.delete(vendor._id)
        results.vendors++
      }
    }

    // Delete seeded sponsors
    const sponsors = await ctx.db.query('sponsors').collect()
    for (const sponsor of sponsors) {
      if (sponsor.name.startsWith(SEED_PREFIX)) {
        await ctx.db.delete(sponsor._id)
        results.sponsors++
      }
    }

    console.log('[SEED CLEAR] Cleanup complete!')
    console.log('[SEED CLEAR] Removed:', results)

    return results
  },
})

/**
 * Dry run - shows what would be created without making changes
 */
export const dryRun = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check for organizer
    const organizer = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('role'), 'organizer'))
      .first()

    const anyUser = organizer || (await ctx.db.query('users').first())

    // Check for existing seeded data
    const existingEvents = await ctx.db.query('events').collect()
    const seededEvents = existingEvents.filter((e) => e.title.startsWith(SEED_PREFIX))

    const existingVendors = await ctx.db.query('vendors').collect()
    const seededVendors = existingVendors.filter((v) => v.name.startsWith(SEED_PREFIX))

    const existingSponsors = await ctx.db.query('sponsors').collect()
    const seededSponsors = existingSponsors.filter((s) => s.name.startsWith(SEED_PREFIX))

    return {
      wouldCreateFor: anyUser?.email || 'No user found',
      existingSeededData: {
        events: seededEvents.length,
        vendors: seededVendors.length,
        sponsors: seededSponsors.length,
      },
      wouldCreate: {
        vendors: 5,
        sponsors: 4,
        events: 6,
        eventVendors: 5,
        eventSponsors: 4,
        ticketTypes: 6,
        attendees: 20,
        orders: 8,
        budgetItems: 12,
        promoCodes: 3,
        eventApplications: 6,
      },
      note: seededEvents.length > 0
        ? 'Warning: Seeded data already exists. Run clear first or existing data will remain.'
        : 'No existing seeded data found. Safe to run seed.',
    }
  },
})

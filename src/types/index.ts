// User types
export type UserRole = 'superadmin' | 'organizer' | 'vendor' | 'sponsor' | 'volunteer'

export interface User {
  _id: string
  email: string
  name: string
  role: UserRole
  avatarUrl?: string
  createdAt: number

  // Account status for moderation
  status?: 'active' | 'suspended' | 'pending'

  // Suspension tracking
  suspendedAt?: number
  suspendedReason?: string
  suspendedBy?: string
}

// Event types
export type EventStatus = 'draft' | 'planning' | 'active' | 'completed' | 'cancelled'

export interface Event {
  _id: string
  name: string
  description: string
  organizerId: string
  startDate: number
  endDate: number
  location: string
  status: EventStatus
  logoStorageId?: string
  createdAt: number
  updatedAt: number
}

// Vendor types
export interface Vendor {
  _id: string
  userId: string
  companyName: string
  category: string
  description: string
  services: string[]
  priceRange: {
    min: number
    max: number
    currency: string
  }
  rating?: number
  approved: boolean
  createdAt: number
}

// Sponsor types
export type SponsorTier = 'platinum' | 'gold' | 'silver' | 'bronze'

export interface Sponsor {
  _id: string
  userId: string
  companyName: string
  tier: SponsorTier
  budget: number
  interests: string[]
  approved: boolean
  createdAt: number
}

// Volunteer types
export interface VolunteerAvailability {
  date: number
  startTime: string
  endTime: string
}

export interface Volunteer {
  _id: string
  userId: string
  skills: string[]
  availability: VolunteerAvailability[]
  approved: boolean
  createdAt: number
}

// Relationship types
export type VendorApplicationStatus = 'pending' | 'approved' | 'rejected' | 'contracted'
export type SponsorApplicationStatus = 'applied' | 'approved' | 'rejected' | 'confirmed'
export type VolunteerAssignmentStatus = 'assigned' | 'confirmed' | 'completed' | 'no_show'
export type LogisticsStatus = 'pending' | 'ordered' | 'delivered' | 'setup'
export type FileType = 'logo' | 'certificate' | 'report' | 'document'

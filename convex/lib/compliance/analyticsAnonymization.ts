/**
 * Analytics Data Anonymization
 *
 * Provides utilities to anonymize PII from analytics data to ensure GDPR compliance.
 * Hashes or removes personally identifiable information while preserving analytical value.
 *
 * Note: This file uses pure JavaScript hashing instead of Node.js crypto
 * to be compatible with Convex's edge runtime.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Fields that contain PII and should be anonymized
 */
export interface PIIFields {
  email?: string
  name?: string
  phone?: string
  ipAddress?: string
  contactEmail?: string
  contactName?: string
  contactPhone?: string
  userAgent?: string
}

/**
 * Anonymized version of PII fields
 */
export interface AnonymizedFields {
  emailHash?: string
  nameHash?: string
  phoneHash?: string
  ipAddressHash?: string
  contactEmailHash?: string
  contactNameHash?: string
  contactPhoneHash?: string
  userAgentHash?: string
}

// ============================================================================
// Anonymization Functions
// ============================================================================

/**
 * Simple hash function using djb2 algorithm
 * This is a fast, non-cryptographic hash suitable for anonymization
 * Returns a consistent hash for the same input, allowing for aggregation
 */
export function hashValue(value: string | undefined | null): string | undefined {
  if (!value || value.trim() === '') {
    return undefined
  }

  const str = value.toLowerCase().trim()
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i)
    hash = hash & hash // Convert to 32bit integer
  }
  // Convert to hex string and ensure positive
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * Anonymize email address
 * Converts email to a hash while preserving domain for analytics
 */
export function anonymizeEmail(email: string | undefined | null): {
  emailHash?: string
  emailDomain?: string
} {
  if (!email || email.trim() === '') {
    return {}
  }

  const trimmedEmail = email.toLowerCase().trim()
  const [, domain] = trimmedEmail.split('@')

  return {
    emailHash: hashValue(trimmedEmail),
    emailDomain: domain || undefined,
  }
}

/**
 * Anonymize IP address
 * Hashes the full IP but preserves the first two octets for geographic analytics
 */
export function anonymizeIPAddress(ipAddress: string | undefined | null): {
  ipAddressHash?: string
  ipPrefix?: string
} {
  if (!ipAddress || ipAddress.trim() === '') {
    return {}
  }

  const trimmedIP = ipAddress.trim()

  // Extract first two octets for IPv4 (e.g., "192.168" from "192.168.1.1")
  const ipv4Match = trimmedIP.match(/^(\d+\.\d+)\./)
  const ipPrefix = ipv4Match ? ipv4Match[1] : undefined

  return {
    ipAddressHash: hashValue(trimmedIP),
    ipPrefix,
  }
}

/**
 * Anonymize user agent string
 * Extracts browser and OS info while hashing the full string
 */
export function anonymizeUserAgent(userAgent: string | undefined | null): {
  userAgentHash?: string
  browser?: string
  os?: string
} {
  if (!userAgent || userAgent.trim() === '') {
    return {}
  }

  const trimmedUA = userAgent.trim()

  // Extract browser info (simplified)
  let browser: string | undefined
  if (trimmedUA.includes('Chrome')) browser = 'Chrome'
  else if (trimmedUA.includes('Firefox')) browser = 'Firefox'
  else if (trimmedUA.includes('Safari')) browser = 'Safari'
  else if (trimmedUA.includes('Edge')) browser = 'Edge'
  else browser = 'Other'

  // Extract OS info (simplified)
  let os: string | undefined
  if (trimmedUA.includes('Windows')) os = 'Windows'
  else if (trimmedUA.includes('Mac')) os = 'macOS'
  else if (trimmedUA.includes('Linux')) os = 'Linux'
  else if (trimmedUA.includes('Android')) os = 'Android'
  else if (trimmedUA.includes('iOS')) os = 'iOS'
  else os = 'Other'

  return {
    userAgentHash: hashValue(trimmedUA),
    browser,
    os,
  }
}

/**
 * Anonymize a complete PII object
 * Converts all PII fields to hashed versions
 */
export function anonymizePII(pii: PIIFields): AnonymizedFields & {
  emailDomain?: string
  ipPrefix?: string
  browser?: string
  os?: string
} {
  const emailData = anonymizeEmail(pii.email)
  const ipData = anonymizeIPAddress(pii.ipAddress)
  const uaData = anonymizeUserAgent(pii.userAgent)

  return {
    emailHash: emailData.emailHash,
    emailDomain: emailData.emailDomain,
    nameHash: hashValue(pii.name),
    phoneHash: hashValue(pii.phone),
    ipAddressHash: ipData.ipAddressHash,
    ipPrefix: ipData.ipPrefix,
    contactEmailHash: hashValue(pii.contactEmail),
    contactNameHash: hashValue(pii.contactName),
    contactPhoneHash: hashValue(pii.contactPhone),
    userAgentHash: uaData.userAgentHash,
    browser: uaData.browser,
    os: uaData.os,
  }
}

/**
 * Remove PII fields from an object
 * Returns a new object with PII fields removed
 */
export function removePII<T extends Record<string, unknown>>(
  obj: T,
  piiFields: string[] = [
    'email',
    'name',
    'phone',
    'ipAddress',
    'contactEmail',
    'contactName',
    'contactPhone',
    'userAgent',
  ]
): Omit<T, keyof PIIFields> {
  const result = { ...obj }

  for (const field of piiFields) {
    delete result[field]
  }

  return result as Omit<T, keyof PIIFields>
}

/**
 * Anonymize user data for analytics
 * Replaces PII with hashed versions while preserving analytical value
 */
export function anonymizeUserForAnalytics(user: {
  _id: string
  email?: string
  name?: string
  phone?: string
  role?: string
  status?: string
  createdAt?: number
  _creationTime?: number
}): {
  userId: string
  emailHash?: string
  emailDomain?: string
  nameHash?: string
  phoneHash?: string
  role?: string
  status?: string
  createdAt?: number
  _creationTime?: number
} {
  const anonymized = anonymizePII({
    email: user.email,
    name: user.name,
    phone: user.phone,
  })

  return {
    userId: user._id,
    emailHash: anonymized.emailHash,
    emailDomain: anonymized.emailDomain,
    nameHash: anonymized.nameHash,
    phoneHash: anonymized.phoneHash,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    _creationTime: user._creationTime,
  }
}

/**
 * Anonymize event data for analytics
 * Removes organizer PII while preserving event metrics
 */
export function anonymizeEventForAnalytics(event: {
  _id: string
  organizerId: string
  title?: string
  status?: string
  eventType?: string
  locationType?: string
  budget?: number
  expectedAttendees?: number
  createdAt?: number
  _creationTime?: number
}): {
  eventId: string
  organizerIdHash: string
  status?: string
  eventType?: string
  locationType?: string
  budget?: number
  expectedAttendees?: number
  createdAt?: number
  _creationTime?: number
} {
  return {
    eventId: event._id,
    organizerIdHash: hashValue(event.organizerId) || '',
    status: event.status,
    eventType: event.eventType,
    locationType: event.locationType,
    budget: event.budget,
    expectedAttendees: event.expectedAttendees,
    createdAt: event.createdAt,
    _creationTime: event._creationTime,
  }
}

/**
 * Anonymize session data for analytics
 * Hashes IP and user agent while preserving session metrics
 */
export function anonymizeSessionForAnalytics(session: {
  _id: string
  userId: string
  ipAddress?: string
  userAgent?: string
  createdAt?: number
  expiresAt?: number
}): {
  sessionId: string
  userIdHash: string
  ipAddressHash?: string
  ipPrefix?: string
  userAgentHash?: string
  browser?: string
  os?: string
  createdAt?: number
  expiresAt?: number
} {
  const anonymized = anonymizePII({
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
  })

  return {
    sessionId: session._id,
    userIdHash: hashValue(session.userId) || '',
    ipAddressHash: anonymized.ipAddressHash,
    ipPrefix: anonymized.ipPrefix,
    userAgentHash: anonymized.userAgentHash,
    browser: anonymized.browser,
    os: anonymized.os,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
  }
}

/**
 * Check if a value contains potential PII
 * Used for validation and testing
 */
export function containsPII(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false
  }

  // Check for email pattern
  if (/@/.test(value) && /\.[a-z]{2,}$/i.test(value)) {
    return true
  }

  // Check for phone pattern (basic)
  if (/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(value)) {
    return true
  }

  // Check for IP address pattern
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value)) {
    return true
  }

  return false
}

/**
 * Test mutation to validate JWT_PRIVATE_KEY format
 * Run this in Convex Dashboard to check if the key is properly formatted
 */
import { mutation } from './_generated/server'
import { importPKCS8 } from 'jose'

export const testKeyFormat = mutation({
  args: {},
  handler: async () => {
    const key = process.env.JWT_PRIVATE_KEY

    if (!key) {
      return {
        success: false,
        error: 'JWT_PRIVATE_KEY environment variable is not set',
      }
    }

    const analysis = {
      hasKey: !!key,
      length: key.length,
      trimmedLength: key.trim().length,
      firstLine: key.split(/\r?\n/)[0] || '',
      lastLine:
        key
          .split(/\r?\n/)
          .filter((l) => l.trim())
          .pop() || '',
      hasBegin: key.includes('-----BEGIN PRIVATE KEY-----'),
      hasEnd: key.includes('-----END PRIVATE KEY-----'),
      startsWithBegin: key.trim().startsWith('-----BEGIN PRIVATE KEY-----'),
      endsWithEnd: key.trim().endsWith('-----END PRIVATE KEY-----'),
      hasNewlines: key.includes('\n') || key.includes('\r\n'),
      lineCount: key.split(/\r?\n/).length,
    }

    // Try to actually import the key
    let importError: string | null = null
    let importSuccess = false
    try {
      await importPKCS8(key, 'RS256')
      importSuccess = true
    } catch (error) {
      importError = error instanceof Error ? error.message : String(error)
    }

    return {
      success: importSuccess,
      analysis,
      importError,
      recommendation: importSuccess
        ? 'Key format is correct! ✅'
        : `Key format issue: ${importError}. Check that the key includes -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY----- markers.`,
    }
  },
})

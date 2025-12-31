/**
 * Test mutation to validate JWKS configuration
 * Run this in Convex Dashboard to check if JWKS matches JWT_PRIVATE_KEY
 */
import { mutation } from './_generated/server'
import { importPKCS8, importJWK, SignJWT, jwtVerify } from 'jose'

import { KeyLike } from 'jose'

export const testJWKS = mutation({
  args: {},
  handler: async () => {
    const jwtPrivateKey = process.env.JWT_PRIVATE_KEY
    const jwks = process.env.JWKS

    if (!jwtPrivateKey) {
      return {
        success: false,
        error: 'JWT_PRIVATE_KEY environment variable is not set',
      }
    }

    if (!jwks) {
      return {
        success: false,
        error: 'JWKS environment variable is not set',
      }
    }

    // Parse JWKS
    let jwksParsed: { keys: Array<Record<string, unknown>> }
    try {
      jwksParsed = JSON.parse(jwks)
    } catch (error) {
      return {
        success: false,
        error: `JWKS is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      }
    }

    if (
      !jwksParsed ||
      !jwksParsed.keys ||
      !Array.isArray(jwksParsed.keys) ||
      jwksParsed.keys.length === 0
    ) {
      return {
        success: false,
        error: 'JWKS does not contain a valid keys array',
      }
    }

    const jwk = jwksParsed.keys[0]

    // Try to import the private key
    let privateKey: KeyLike
    try {
      privateKey = await importPKCS8(jwtPrivateKey, 'RS256')
    } catch (error) {
      return {
        success: false,
        error: `Failed to import JWT_PRIVATE_KEY: ${error instanceof Error ? error.message : String(error)}`,
      }
    }

    // Try to import the public key from JWKS
    let publicKey: KeyLike
    try {
      publicKey = await importJWK(jwk, 'RS256')
    } catch (error) {
      return {
        success: false,
        error: `Failed to import JWKS public key: ${error instanceof Error ? error.message : String(error)}`,
      }
    }

    // Test: Sign a JWT with the private key
    let signedJWT: string
    try {
      signedJWT = await new SignJWT({ test: 'claim' })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(privateKey)
    } catch (error) {
      return {
        success: false,
        error: `Failed to sign JWT with private key: ${error instanceof Error ? error.message : String(error)}`,
      }
    }

    // Test: Verify the JWT with the public key from JWKS
    try {
      await jwtVerify(signedJWT, publicKey)
      return {
        success: true,
        message:
          '✅ JWKS configuration is correct! The public key in JWKS matches the private key.',
        details: {
          jwksKeysCount: jwksParsed.keys.length,
          jwkAlg: jwk.alg,
          jwkKty: jwk.kty,
          jwkUse: jwk.use,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: `❌ JWKS does NOT match JWT_PRIVATE_KEY! The public key in JWKS cannot verify tokens signed with the private key.`,
        details: {
          verificationError: error instanceof Error ? error.message : String(error),
          jwksKeysCount: jwksParsed.keys.length,
          jwkAlg: jwk.alg,
          jwkKty: jwk.kty,
        },
        recommendation:
          'The JWKS and JWT_PRIVATE_KEY are mismatched. Regenerate both using: node scripts/generateKeys.mjs and update both in Convex Dashboard.',
      }
    }
  },
})

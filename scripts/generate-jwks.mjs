#!/usr/bin/env node
/**
 * Generate JWKS (JSON Web Key Set) from RSA Private Key
 *
 * Usage:
 *   node scripts/generate-jwks.mjs private.pem
 *
 * This script reads an RSA private key and generates the corresponding JWKS
 * that can be used in Convex environment variables.
 */

import { readFileSync } from 'fs'
import { createPrivateKey } from 'crypto'

const args = process.argv.slice(2)

if (args.length === 0) {
  console.error('❌ Error: No private key file specified')
  console.log('\nUsage:')
  console.log('  node scripts/generate-jwks.mjs private.pem')
  console.log('\nExample:')
  console.log('  openssl genrsa -out private.pem 2048')
  console.log('  node scripts/generate-jwks.mjs private.pem')
  process.exit(1)
}

const privateKeyPath = args[0]

try {
  // Read the private key file
  const privateKeyPem = readFileSync(privateKeyPath, 'utf8')

  console.log('✓ Private key file read successfully\n')

  // Create a KeyObject from the PEM
  const privateKey = createPrivateKey(privateKeyPem)

  // Export as JWK (JSON Web Key)
  const jwk = privateKey.export({ format: 'jwk' })

  // Add required fields for JWKS
  jwk.alg = 'RS256'
  jwk.use = 'sig'
  jwk.kid = 'default' // Key ID

  // Create JWKS structure
  const jwks = {
    keys: [jwk]
  }

  // Format the output
  const jwksString = JSON.stringify(jwks)

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ JWKS Generated Successfully!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('📋 Copy the following values to Convex Environment Variables:\n')

  console.log('1️⃣  JWT_PRIVATE_KEY:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(privateKeyPem)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('2️⃣  JWKS:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(jwksString)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('📝 Instructions:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('1. Go to: https://dashboard.convex.dev')
  console.log('2. Select your project')
  console.log('3. Go to: Settings → Environment Variables')
  console.log('4. Add/Update these variables:')
  console.log('   - JWT_PRIVATE_KEY (copy the entire block including BEGIN/END)')
  console.log('   - JWKS (copy the JSON object)')
  console.log('5. Save and redeploy if needed')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('⚠️  Security Notes:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('• Keep private.pem file secure - DO NOT commit to Git')
  console.log('• Store in password manager or secure vault')
  console.log('• Rotate keys periodically for security')
  console.log('• Use different keys for development and production')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

} catch (error) {
  console.error('❌ Error:', error.message)

  if (error.code === 'ENOENT') {
    console.error(`\n❌ File not found: ${privateKeyPath}`)
    console.log('\n💡 Generate a new key first:')
    console.log('   openssl genrsa -out private.pem 2048')
  } else if (error.message.includes('not a valid PEM')) {
    console.error('\n❌ Invalid private key format')
    console.log('\n💡 Make sure the file contains a valid RSA private key')
    console.log('   It should start with: -----BEGIN PRIVATE KEY-----')
  }

  process.exit(1)
}

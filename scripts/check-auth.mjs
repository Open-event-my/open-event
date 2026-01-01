#!/usr/bin/env node

/**
 * Quick script to verify auth configuration is correct
 */

console.log('\n🔍 Checking Auth Configuration...\n')

// Check package.json for Convex Auth version
import { readFileSync } from 'fs'

try {
  const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))
  const authVersion = pkg.dependencies['@convex-dev/auth']

  console.log('✅ @convex-dev/auth version:', authVersion)

  if (authVersion.includes('0.0.90')) {
    console.log('\n📌 For version 0.0.90, you should use:')
    console.log('   - JWT_PRIVATE_KEY (NOT CONVEX_AUTH_PRIVATE_KEY)')
  }
} catch (err) {
  console.error('❌ Error reading package.json:', err.message)
}

console.log('\n📋 Checklist:\n')
console.log('1. [ ] Set JWT_PRIVATE_KEY in Convex Dashboard')
console.log('2. [ ] Set JWKS in Convex Dashboard')
console.log('3. [ ] Set SITE_URL in Convex Dashboard')
console.log('4. [ ] Delete CONVEX_AUTH_PRIVATE_KEY if it exists')
console.log('5. [ ] Restart Convex dev server')
console.log('6. [ ] Test login at http://localhost:5173/sign-in')

console.log('\n💡 To generate fresh keys, run:')
console.log('   node scripts/generateKeys.mjs')

console.log('\n🌐 Convex Dashboard:')
console.log('   https://dashboard.convex.dev')

console.log('\n')

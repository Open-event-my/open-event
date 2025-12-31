/**
 * Validation script to check if JWT_PRIVATE_KEY format is correct
 * This helps diagnose PKCS#8 format issues
 */

const key = process.env.JWT_PRIVATE_KEY

if (!key) {
  console.error('❌ JWT_PRIVATE_KEY environment variable is not set')
  process.exit(1)
}

console.log('🔍 Validating JWT_PRIVATE_KEY format...\n')

const checks = {
  hasBeginMarker: key.includes('-----BEGIN PRIVATE KEY-----'),
  hasEndMarker: key.includes('-----END PRIVATE KEY-----'),
  startsWithBegin: key.trim().startsWith('-----BEGIN PRIVATE KEY-----'),
  endsWithEnd: key.trim().endsWith('-----END PRIVATE KEY-----'),
  hasNewlines: key.includes('\n'),
  length: key.length,
  first50Chars: key.substring(0, 50),
  last50Chars: key.substring(Math.max(0, key.length - 50)),
}

console.log('Key Details:')
console.log(`  Length: ${checks.length} characters`)
console.log(`  First 50 chars: ${checks.first50Chars}`)
console.log(`  Last 50 chars: ${checks.last50Chars}`)
console.log('')

console.log('Format Checks:')
console.log(`  ✅ Has BEGIN marker: ${checks.hasBeginMarker ? 'YES' : 'NO'}`)
console.log(`  ✅ Has END marker: ${checks.hasEndMarker ? 'YES' : 'NO'}`)
console.log(`  ✅ Starts with BEGIN: ${checks.startsWithBegin ? 'YES' : 'NO'}`)
console.log(`  ✅ Ends with END: ${checks.endsWithEnd ? 'YES' : 'NO'}`)
console.log(`  ✅ Has newlines: ${checks.hasNewlines ? 'YES' : 'NO'}`)
console.log('')

const isValid =
  checks.hasBeginMarker && checks.hasEndMarker && checks.startsWithBegin && checks.endsWithEnd

if (isValid) {
  console.log('✅ Key format is CORRECT!')
  console.log('   The key should work with Convex Auth.')
} else {
  console.log('❌ Key format is INCORRECT!')
  console.log('')
  console.log('The key must:')
  console.log('  1. Start with: -----BEGIN PRIVATE KEY-----')
  console.log('  2. End with: -----END PRIVATE KEY-----')
  console.log('  3. Include all line breaks')
  console.log('')
  console.log('To fix:')
  console.log('  1. Run: node scripts/formatKeyForConvex.mjs')
  console.log('  2. Copy the key from the output (including BEGIN/END lines)')
  console.log('  3. Update JWT_PRIVATE_KEY in Convex Dashboard')
  console.log('  4. Restart Convex dev server')
  process.exit(1)
}

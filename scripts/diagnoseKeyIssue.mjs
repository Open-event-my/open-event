/**
 * Diagnostic script to help identify JWT_PRIVATE_KEY format issues
 * This checks what the key looks like and provides specific guidance
 */

console.log('🔍 JWT_PRIVATE_KEY Diagnostic Tool\n')
console.log('This script helps diagnose PKCS#8 format issues.\n')

const key = process.env.JWT_PRIVATE_KEY

if (!key) {
  console.error('❌ JWT_PRIVATE_KEY environment variable is not set')
  console.log('\nTo fix:')
  console.log('1. Go to Convex Dashboard → Settings → Environment Variables')
  console.log('2. Add JWT_PRIVATE_KEY with your private key')
  process.exit(1)
}

console.log('✅ JWT_PRIVATE_KEY is set\n')

// Analyze the key
const trimmed = key.trim()
const lines = key.split(/\r?\n/)
const firstLine = lines[0] || ''
const lastLine = lines[lines.length - 1] || ''
const hasBegin = key.includes('-----BEGIN PRIVATE KEY-----')
const hasEnd = key.includes('-----END PRIVATE KEY-----')
const startsWithBegin = trimmed.startsWith('-----BEGIN PRIVATE KEY-----')
const endsWithEnd = trimmed.endsWith('-----END PRIVATE KEY-----')
const hasNewlines = key.includes('\n') || key.includes('\r\n')

console.log('Key Analysis:')
console.log(`  Length: ${key.length} characters`)
console.log(`  Lines: ${lines.length}`)
console.log(`  First line: "${firstLine.substring(0, 50)}${firstLine.length > 50 ? '...' : ''}"`)
console.log(`  Last line: "${lastLine.substring(Math.max(0, lastLine.length - 50))}"`)
console.log('')

console.log('Format Checks:')
console.log(`  Has BEGIN marker: ${hasBegin ? '✅ YES' : '❌ NO'}`)
console.log(`  Has END marker: ${hasEnd ? '✅ YES' : '❌ NO'}`)
console.log(`  Starts with BEGIN: ${startsWithBegin ? '✅ YES' : '❌ NO'}`)
console.log(`  Ends with END: ${endsWithEnd ? '✅ YES' : '❌ NO'}`)
console.log(`  Has line breaks: ${hasNewlines ? '✅ YES' : '❌ NO'}`)
console.log('')

// Determine the issue
const issues = []

if (!hasBegin) {
  issues.push('Missing -----BEGIN PRIVATE KEY----- marker')
}
if (!hasEnd) {
  issues.push('Missing -----END PRIVATE KEY----- marker')
}
if (!startsWithBegin) {
  issues.push('Key does not start with -----BEGIN PRIVATE KEY-----')
  if (firstLine && !firstLine.includes('BEGIN')) {
    issues.push(`  First line is: "${firstLine.substring(0, 50)}..."`)
  }
}
if (!endsWithEnd) {
  issues.push('Key does not end with -----END PRIVATE KEY-----')
  if (lastLine && !lastLine.includes('END')) {
    issues.push(`  Last line is: "${lastLine.substring(Math.max(0, lastLine.length - 50))}"`)
  }
}
if (!hasNewlines && key.length > 100) {
  issues.push('Key appears to be on a single line (should have line breaks)')
}

if (issues.length === 0) {
  console.log('✅ Key format looks correct!')
  console.log('')
  console.log("If you're still getting PKCS#8 errors:")
  console.log('1. Make sure you restarted Convex dev server after updating the key')
  console.log('2. Check for extra spaces or characters before/after the key')
  console.log("3. Verify the key wasn't corrupted during copy/paste")
} else {
  console.log('❌ Issues found:')
  issues.forEach((issue, i) => {
    console.log(`  ${i + 1}. ${issue}`)
  })
  console.log('')
  console.log('To fix:')
  console.log('1. Run: node scripts/formatKeyForConvex.mjs')
  console.log('2. Copy the ENTIRE key block from KEYS_FOR_CONVEX.md')
  console.log('3. Go to Convex Dashboard → Settings → Environment Variables')
  console.log('4. Edit JWT_PRIVATE_KEY and paste the full key (all lines)')
  console.log('5. Make sure to include:')
  console.log('   - -----BEGIN PRIVATE KEY----- at the start')
  console.log('   - All the base64 content in between')
  console.log('   - -----END PRIVATE KEY----- at the end')
  console.log('6. Save and restart Convex dev server')
}

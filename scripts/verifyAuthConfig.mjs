/**
 * Verify Convex Auth Configuration
 * This script helps diagnose authentication setup issues
 */

console.log('=== Convex Auth Configuration Check ===\n')

// Check what Convex Auth expects
console.log('📋 Expected Environment Variables:')
console.log('  1. CONVEX_AUTH_PRIVATE_KEY (or JWT_PRIVATE_KEY)')
console.log('  2. JWKS')
console.log('  3. SITE_URL\n')

console.log('⚠️  IMPORTANT NOTES:')
console.log('  - Only ONE private key variable should be set (not both)')
console.log('  - The key must be in PKCS#8 format')
console.log('  - The key must include BEGIN/END headers')
console.log('  - After setting variables, RESTART Convex dev server\n')

console.log('🔍 Troubleshooting Steps:')
console.log('  1. Delete JWT_PRIVATE_KEY if CONVEX_AUTH_PRIVATE_KEY exists')
console.log('  2. Verify CONVEX_AUTH_PRIVATE_KEY has full key with headers')
console.log('  3. Click the eye icon in Convex Dashboard to verify key format')
console.log('  4. Restart Convex dev server: npx convex dev')
console.log('  5. Check terminal for any error messages\n')

console.log('📝 Key Format Check:')
console.log("  ✅ Correct: Starts with '-----BEGIN PRIVATE KEY-----'")
console.log("  ✅ Correct: Ends with '-----END PRIVATE KEY-----'")
console.log('  ❌ Wrong: Missing BEGIN/END lines')
console.log('  ❌ Wrong: Has extra spaces or line breaks\n')

console.log('💡 If still not working:')
console.log('  1. Delete the broken user account from Convex Dashboard → Data → users')
console.log('  2. Delete from authAccounts table too')
console.log('  3. Regenerate keys: node scripts/generateKeys.mjs')
console.log('  4. Set only CONVEX_AUTH_PRIVATE_KEY (delete JWT_PRIVATE_KEY)')
console.log('  5. Restart server and try signing up again\n')

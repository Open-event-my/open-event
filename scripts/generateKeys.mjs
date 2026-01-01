import { exportJWK, exportPKCS8, generateKeyPair } from 'jose'

const keys = await generateKeyPair('RS256')
const privateKey = await exportPKCS8(keys.privateKey)
const publicKey = await exportJWK(keys.publicKey)
const jwks = JSON.stringify({ keys: [{ use: 'sig', ...publicKey }] })

console.log('=== JWT_PRIVATE_KEY ===')
console.log(privateKey)
console.log('\n=== JWKS ===')
console.log(jwks)
console.log('\n=== Instructions ===')
console.log('1. Go to your Convex Dashboard: https://dashboard.convex.dev')
console.log('2. Select your project and go to Settings > Environment Variables')
console.log('3. Add these environment variables:')
console.log('   - JWT_PRIVATE_KEY: (copy the private key above, including BEGIN/END lines)')
console.log(
  '     Note: For @convex-dev/auth v0.0.90, use JWT_PRIVATE_KEY (not CONVEX_AUTH_PRIVATE_KEY)'
)
console.log('   - JWKS: (copy the JSON above)')
console.log('   - SITE_URL: http://localhost:5173 (for dev) or your production URL')
console.log(
  '\n⚠️  IMPORTANT: Copy the ENTIRE private key including -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY-----'
)

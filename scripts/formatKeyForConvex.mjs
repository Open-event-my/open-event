import { exportJWK, exportPKCS8, generateKeyPair } from 'jose'
import { readFileSync, writeFileSync } from 'fs'

// Generate new keys
const keys = await generateKeyPair('RS256')
const privateKey = await exportPKCS8(keys.privateKey)
const publicKey = await exportJWK(keys.publicKey)
const jwks = JSON.stringify({ keys: [{ use: 'sig', ...publicKey }] }, null, 2)

// Create a formatted output file
const output = `# JWT Keys for Convex Dashboard

## Step 1: Copy JWT_PRIVATE_KEY
Copy the ENTIRE block below (including the BEGIN and END lines):

\`\`\`
${privateKey}
\`\`\`

## Step 2: Copy JWKS
Copy the JSON below:

\`\`\`json
${jwks}
\`\`\`

## Step 3: Set SITE_URL
\`\`\`
http://localhost:5173
\`\`\`

## Instructions
1. Go to https://dashboard.convex.dev
2. Select your project
3. Go to Settings > Environment Variables
4. Add/Update JWT_PRIVATE_KEY with the key from Step 1 (copy the ENTIRE block, all lines)
5. Add/Update JWKS with the JSON from Step 2
6. Add/Update SITE_URL with the value from Step 3
7. Restart your Convex dev server

## Verification
After setting the variables, the key should:
- Start with: -----BEGIN PRIVATE KEY-----
- End with: -----END PRIVATE KEY-----
- Be approximately 1700-1800 characters long (including line breaks)
`

console.log(output)

// Also write to a file for easy copying
writeFileSync('KEYS_FOR_CONVEX.md', output)
console.log('\n✅ Keys also saved to KEYS_FOR_CONVEX.md for easy reference')

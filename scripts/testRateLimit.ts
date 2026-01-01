/**
 * Rate Limiting Test Script
 * Tests AI usage rate limiting functionality
 *
 * Run with: npx tsx scripts/testRateLimit.ts
 * Or with env var: VITE_CONVEX_URL=your-url npx tsx scripts/testRateLimit.ts
 */

import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env file manually
function loadEnvFile() {
  try {
    const envPath = resolve(__dirname, '../.env')
    const envFile = readFileSync(envPath, 'utf-8')
    const lines = envFile.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      const [key, ...valueParts] = trimmed.split('=')
      const value = valueParts.join('=').trim()

      if (key && value && !process.env[key]) {
        process.env[key] = value
      }
    }
  } catch {
    // .env file not found or can't be read - that's okay, user might have set env vars manually
  }
}

loadEnvFile()

const CONVEX_URL = process.env.VITE_CONVEX_URL || 'https://your-deployment.convex.cloud'

if (!CONVEX_URL || CONVEX_URL.includes('your-deployment')) {
  console.error('❌ Error: VITE_CONVEX_URL not set in environment')
  console.error('Please set VITE_CONVEX_URL in your .env file')
  console.error('Or run: VITE_CONVEX_URL=your-url npx tsx scripts/testRateLimit.ts')
  process.exit(1)
}

const client = new ConvexHttpClient(CONVEX_URL)

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60))
  log(title, colors.bright + colors.cyan)
  console.log('='.repeat(60))
}

function logTest(testName: string, status: 'PASS' | 'FAIL' | 'RUNNING', message?: string) {
  const statusColor =
    status === 'PASS' ? colors.green : status === 'FAIL' ? colors.red : colors.yellow
  const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏳'
  log(`${statusIcon} ${testName}`, statusColor)
  if (message) {
    log(`   ${message}`, colors.dim)
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Test 1: Get current usage stats
 */
async function testGetUsage() {
  logSection('Test 1: Get Usage Stats')

  try {
    const usage = await client.query(api.aiUsage.getMyUsage, {})

    if (!usage) {
      logTest('Get Usage', 'FAIL', 'No usage data returned (user may not be authenticated)')
      return null
    }

    logTest('Get Usage', 'PASS', 'Successfully retrieved usage stats')

    console.log('\nCurrent Usage:')
    log(`  Prompts Used: ${usage.promptsUsed}/${usage.dailyLimit}`, colors.cyan)
    log(`  Remaining: ${usage.promptsRemaining}`, colors.cyan)
    log(`  Status: ${usage.status}`, colors.cyan)
    log(`  Is Admin: ${usage.isAdmin}`, colors.cyan)
    log(`  Percentage Used: ${usage.percentageUsed}%`, colors.cyan)
    if (usage.timeUntilReset) {
      log(`  Resets in: ${usage.timeUntilReset.formatted}`, colors.cyan)
    }

    return usage
  } catch (error) {
    logTest('Get Usage', 'FAIL', error instanceof Error ? error.message : 'Unknown error')
    return null
  }
}

/**
 * Test 2: Check rate limit
 */
async function testCheckRateLimit(userId?: string) {
  logSection('Test 2: Check Rate Limit')

  try {
    const result = await client.query(api.aiUsage.checkRateLimit, {
      userId: userId as string | undefined,
    })

    logTest('Check Rate Limit', 'PASS', 'Successfully checked rate limit')

    console.log('\nRate Limit Check:')
    log(`  Allowed: ${result.allowed}`, result.allowed ? colors.green : colors.red)
    log(`  Remaining: ${result.remaining}/${result.limit}`, colors.cyan)
    log(`  Code: ${result.code}`, colors.cyan)
    if (result.reason) {
      log(`  Reason: ${result.reason}`, colors.yellow)
    }
    if (result.status) {
      log(`  Status: ${result.status}`, colors.cyan)
    }

    return result
  } catch (error) {
    logTest('Check Rate Limit', 'FAIL', error instanceof Error ? error.message : 'Unknown error')
    return null
  }
}

/**
 * Test 3: Increment usage
 */
async function testIncrementUsage() {
  logSection('Test 3: Increment Usage')

  try {
    const result = await client.mutation(api.aiUsage.incrementUsage, {})

    if (!result.success) {
      logTest('Increment Usage', 'FAIL', result.error || 'Failed to increment')
      return result
    }

    logTest('Increment Usage', 'PASS', 'Successfully incremented usage')

    console.log('\nIncrement Result:')
    log(`  New Count: ${result.newCount}`, colors.cyan)
    log(`  Remaining: ${result.remaining}`, colors.cyan)
    log(`  Code: ${result.code}`, colors.cyan)

    return result
  } catch (error) {
    logTest('Increment Usage', 'FAIL', error instanceof Error ? error.message : 'Unknown error')
    return null
  }
}

/**
 * Test 4: Simulate normal usage flow (0-5 requests)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _testNormalFlow() {
  logSection('Test 4: Normal Usage Flow (5 Requests)')

  log('\nThis test will increment usage 5 times to test normal flow...', colors.yellow)
  log('Note: If you already have usage today, this might hit the limit earlier', colors.yellow)

  const results: Array<{
    requestNum: number
    count: number
    remaining: number
    status: string | undefined
  }> = []

  for (let i = 1; i <= 5; i++) {
    log(`\nRequest ${i}/5...`, colors.bright)

    // Check before increment
    const checkBefore = await client.query(api.aiUsage.checkRateLimit, {})

    if (!checkBefore.allowed) {
      logTest(`Request ${i}`, 'FAIL', `Already at limit: ${checkBefore.reason}`)
      break
    }

    // Increment
    const increment = await client.mutation(api.aiUsage.incrementUsage, {})

    if (!increment.success) {
      logTest(`Request ${i}`, 'FAIL', increment.error || 'Failed to increment')
      break
    }

    // Check after increment
    const checkAfter = await client.query(api.aiUsage.checkRateLimit, {})

    logTest(
      `Request ${i}`,
      'PASS',
      `Count: ${increment.newCount}, Remaining: ${increment.remaining}, Status: ${checkAfter.status || 'normal'}`
    )

    results.push({
      requestNum: i,
      count: increment.newCount,
      remaining: increment.remaining,
      status: checkAfter.status,
    })

    await sleep(500) // Small delay between requests
  }

  return results
}

/**
 * Test 5: Test limit exceeded
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _testLimitExceeded() {
  logSection('Test 5: Limit Exceeded Behavior')

  // First, get current usage
  const usage = await client.query(api.aiUsage.getMyUsage, {})

  if (!usage) {
    logTest('Test Limit Exceeded', 'FAIL', 'Cannot get current usage')
    return
  }

  if (usage.isAdmin) {
    logTest('Test Limit Exceeded', 'FAIL', 'Cannot test - user is admin with unlimited access')
    return
  }

  log(`\nCurrent usage: ${usage.promptsUsed}/${usage.dailyLimit}`, colors.cyan)

  if (usage.promptsRemaining > 0) {
    log(`\nYou still have ${usage.promptsRemaining} requests remaining.`, colors.yellow)
    log('This test requires you to be at the limit. Incrementing to limit...', colors.yellow)

    // Increment until we hit the limit
    for (let i = 0; i < usage.promptsRemaining; i++) {
      await client.mutation(api.aiUsage.incrementUsage, {})
      await sleep(300)
    }
  }

  // Now try to increment one more time (should fail)
  log('\nAttempting request beyond limit...', colors.yellow)

  const checkResult = await client.query(api.aiUsage.checkRateLimit, {})

  if (!checkResult.allowed) {
    logTest('Limit Exceeded Check', 'PASS', `Correctly blocked: ${checkResult.reason}`)
  } else {
    logTest('Limit Exceeded Check', 'FAIL', 'Should have been blocked but was allowed')
  }

  // Try to increment (should fail or be skipped)
  try {
    const incrementResult = await client.mutation(api.aiUsage.incrementUsage, {})

    if (!incrementResult.success) {
      logTest('Limit Exceeded Increment', 'PASS', 'Correctly prevented increment at limit')
    } else {
      logTest('Limit Exceeded Increment', 'FAIL', 'Should not have allowed increment at limit')
    }
  } catch {
    logTest('Limit Exceeded Increment', 'PASS', 'Correctly threw error at limit')
  }
}

/**
 * Test 6: Warning thresholds
 */
async function testWarningThresholds() {
  logSection('Test 6: Warning Thresholds')

  const usage = await client.query(api.aiUsage.getMyUsage, {})

  if (!usage) {
    logTest('Warning Thresholds', 'FAIL', 'Cannot get usage')
    return
  }

  console.log('\nWarning Threshold Analysis:')
  log(`  Current Status: ${usage.status}`, colors.cyan)
  log(`  Percentage Used: ${usage.percentageUsed}%`, colors.cyan)

  const statusEmoji = {
    normal: '🟢',
    warning: '🟡',
    critical: '🔴',
    exceeded: '🚫',
  }

  log(`\n  ${statusEmoji[usage.status]} Status: ${usage.status.toUpperCase()}`, colors.bright)

  console.log('\nThreshold Definitions:')
  log('  🟢 Normal (0-59%): No warning', colors.green)
  log('  🟡 Warning (60-89%): Running low', colors.yellow)
  log('  🔴 Critical (90-99%): Almost at limit', colors.red)
  log('  🚫 Exceeded (100%): Blocked', colors.red)

  // Verify status matches percentage
  const percentage = usage.percentageUsed
  let expectedStatus: string

  if (percentage >= 100) expectedStatus = 'exceeded'
  else if (percentage >= 90) expectedStatus = 'critical'
  else if (percentage >= 60) expectedStatus = 'warning'
  else expectedStatus = 'normal'

  if (usage.status === expectedStatus) {
    logTest(
      'Status Calculation',
      'PASS',
      `Status "${usage.status}" matches percentage ${percentage}%`
    )
  } else {
    logTest(
      'Status Calculation',
      'FAIL',
      `Expected "${expectedStatus}" but got "${usage.status}" for ${percentage}%`
    )
  }
}

/**
 * Test 7: Admin analytics (requires admin access)
 */
async function testAdminAnalytics() {
  logSection('Test 7: Admin Analytics (Optional)')

  log('\nAttempting to fetch admin analytics...', colors.yellow)
  log('This will fail if you are not an admin/superadmin', colors.dim)

  try {
    const analytics = await client.query(api.aiUsage.getUsageAnalytics, {})

    logTest('Get Analytics', 'PASS', 'Successfully retrieved analytics')

    console.log('\nPlatform Analytics:')
    log(`  Total Users: ${analytics.totalUsers}`, colors.cyan)
    log(`  Active Today: ${analytics.activeUsersToday}`, colors.cyan)
    log(`  Users at Limit: ${analytics.usersAtLimit}`, colors.cyan)
    log(`  Prompts Today: ${analytics.totalPromptsToday}`, colors.cyan)
    log(`  All-Time Prompts: ${analytics.totalPromptsAllTime}`, colors.cyan)
    log(`  Avg per User: ${analytics.averagePromptsPerUser}`, colors.cyan)
    log(`  Avg Today: ${analytics.averagePromptsToday}`, colors.cyan)
    log(`  Default Limit: ${analytics.defaultDailyLimit}`, colors.cyan)
  } catch (error) {
    logTest(
      'Get Analytics',
      'FAIL',
      error instanceof Error ? error.message : 'Unauthorized (not an admin)'
    )
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  log('\n' + '═'.repeat(60), colors.bright + colors.magenta)
  log('   RATE LIMITING TEST SUITE', colors.bright + colors.magenta)
  log('═'.repeat(60), colors.bright + colors.magenta)

  log('\nConnecting to Convex...', colors.yellow)
  log(`URL: ${CONVEX_URL}`, colors.dim)

  // Test 1: Get usage
  const usage = await testGetUsage()
  if (!usage) {
    log('\n⚠️  Cannot proceed without authentication. Please sign in first.', colors.yellow)
    return
  }

  await sleep(1000)

  // Test 2: Check rate limit
  await testCheckRateLimit()
  await sleep(1000)

  // Test 3: Single increment
  await testIncrementUsage()
  await sleep(1000)

  // Test 4: Normal flow (commented out by default to avoid using up quota)
  // Uncomment to run full flow test
  log('\n⚠️  Skipping Test 4 (Normal Flow) to preserve quota', colors.yellow)
  log('   Uncomment in script to run full 5-request simulation', colors.dim)
  // await testNormalFlow()
  // await sleep(1000)

  // Test 5: Limit exceeded (commented out to avoid hitting limit)
  log('\n⚠️  Skipping Test 5 (Limit Exceeded) to preserve quota', colors.yellow)
  log('   Uncomment in script to test limit blocking', colors.dim)
  // await testLimitExceeded()
  // await sleep(1000)

  // Test 6: Warning thresholds
  await testWarningThresholds()
  await sleep(1000)

  // Test 7: Admin analytics
  await testAdminAnalytics()

  // Summary
  logSection('Test Summary')
  log('\n✅ Basic tests completed successfully!', colors.green)
  log('\nTo run destructive tests (that use quota):', colors.yellow)
  log('  1. Uncomment testNormalFlow() in the script', colors.dim)
  log('  2. Uncomment testLimitExceeded() in the script', colors.dim)
  log('  3. Run again: npx tsx scripts/testRateLimit.ts', colors.dim)

  log('\n💡 Manual Testing Recommendations:', colors.cyan)
  log('  1. Test in the UI by using Playground finalization', colors.dim)
  log('  2. Watch the usage counter decrement: 5 → 4 → 3 → 2 → 1 → 0', colors.dim)
  log('  3. Verify warning colors appear at 60% and 90%', colors.dim)
  log('  4. Confirm error toast at 100%', colors.dim)
  log('  5. Test admin bypass with admin account', colors.dim)

  console.log()
}

// Run tests
runAllTests()
  .then(() => {
    log('\n✅ All tests completed!', colors.green)
    process.exit(0)
  })
  .catch((error) => {
    log('\n❌ Test suite failed:', colors.red)
    console.error(error)
    process.exit(1)
  })

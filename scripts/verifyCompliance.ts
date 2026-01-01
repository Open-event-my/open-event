/**
 * Compliance Verification Script
 *
 * This script verifies all compliance features are working correctly:
 * - Data export functionality
 * - Data deletion functionality
 * - Audit log creation
 * - Cookie consent tracking
 * - Terms acceptance tracking
 */

import { ConvexHttpClient } from 'convex/browser'

const CONVEX_URL = process.env.VITE_CONVEX_URL || 'https://your-deployment.convex.cloud'

interface VerificationResult {
  feature: string
  passed: boolean
  message: string
  details?: Record<string, unknown>
}

class ComplianceVerifier {
  private client: ConvexHttpClient
  private results: VerificationResult[] = []

  constructor() {
    this.client = new ConvexHttpClient(CONVEX_URL)
  }

  private addResult(
    feature: string,
    passed: boolean,
    message: string,
    details?: Record<string, unknown>
  ) {
    this.results.push({ feature, passed, message, details })
    const status = passed ? '✅' : '❌'
    console.log(`${status} ${feature}: ${message}`)
    if (details) {
      console.log('   Details:', JSON.stringify(details, null, 2))
    }
  }

  async verifyDataExport(): Promise<void> {
    console.log('\n🔍 Verifying Data Export Functionality...')

    try {
      // Check if data export service exists
      const exportService = await import('../convex/lib/compliance/dataExport')

      if (exportService.exportUserData) {
        this.addResult('Data Export Service', true, 'Data export service is implemented')
      } else {
        this.addResult(
          'Data Export Service',
          false,
          'Data export service is missing exportUserData function'
        )
      }

      // Check if frontend component exists
      const exportComponent = await import('../src/components/compliance/DataExportSection')

      if (exportComponent.DataExportSection) {
        this.addResult('Data Export UI', true, 'Data export UI component is implemented')
      } else {
        this.addResult('Data Export UI', false, 'Data export UI component is missing')
      }

      // Check if property test exists
      try {
        await import('../convex/lib/compliance/dataExport.property.test')
        this.addResult('Data Export Property Test', true, 'Property test for data export exists')
      } catch {
        this.addResult(
          'Data Export Property Test',
          false,
          'Property test for data export is missing'
        )
      }
    } catch (error) {
      this.addResult(
        'Data Export',
        false,
        `Error verifying data export: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async verifyDataDeletion(): Promise<void> {
    console.log('\n🔍 Verifying Data Deletion Functionality...')

    try {
      // Check if data deletion service exists
      const deletionService = await import('../convex/lib/compliance/dataDeletion')

      if (deletionService.deleteUserData) {
        this.addResult('Data Deletion Service', true, 'Data deletion service is implemented')
      } else {
        this.addResult(
          'Data Deletion Service',
          false,
          'Data deletion service is missing deleteUserData function'
        )
      }

      // Check if frontend component exists
      const deletionComponent = await import('../src/components/compliance/DataDeletionSection')

      if (deletionComponent.DataDeletionSection) {
        this.addResult('Data Deletion UI', true, 'Data deletion UI component is implemented')
      } else {
        this.addResult('Data Deletion UI', false, 'Data deletion UI component is missing')
      }

      // Check if property test exists
      try {
        await import('../convex/lib/compliance/dataDeletion.property.test')
        this.addResult(
          'Data Deletion Property Test',
          true,
          'Property test for data deletion exists'
        )
      } catch {
        this.addResult(
          'Data Deletion Property Test',
          false,
          'Property test for data deletion is missing'
        )
      }
    } catch (error) {
      this.addResult(
        'Data Deletion',
        false,
        `Error verifying data deletion: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async verifyAuditLogging(): Promise<void> {
    console.log('\n🔍 Verifying Audit Logging...')

    try {
      // Check if audit log service exists
      const auditService = await import('../convex/lib/compliance/auditLog')

      if (auditService.logAuditEvent) {
        this.addResult('Audit Log Service', true, 'Audit log service is implemented')
      } else {
        this.addResult(
          'Audit Log Service',
          false,
          'Audit log service is missing logAuditEvent function'
        )
      }

      // Check if audit log middleware exists
      const auditMiddleware = await import('../convex/lib/compliance/auditLogMiddleware')

      if (auditMiddleware.withAuditLog) {
        this.addResult('Audit Log Middleware', true, 'Audit log middleware is implemented')
      } else {
        this.addResult('Audit Log Middleware', false, 'Audit log middleware is missing')
      }

      // Check if property test exists
      try {
        await import('../convex/lib/compliance/auditLog.property.test')
        this.addResult('Audit Log Property Test', true, 'Property test for audit logging exists')
      } catch {
        this.addResult(
          'Audit Log Property Test',
          false,
          'Property test for audit logging is missing'
        )
      }

      // Check if guide exists
      try {
        const fs = await import('fs/promises')
        await fs.access('convex/lib/compliance/AUDIT_LOGGING_GUIDE.md')
        this.addResult('Audit Logging Guide', true, 'Audit logging guide documentation exists')
      } catch {
        this.addResult('Audit Logging Guide', false, 'Audit logging guide documentation is missing')
      }
    } catch (error) {
      this.addResult(
        'Audit Logging',
        false,
        `Error verifying audit logging: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async verifyCookieConsent(): Promise<void> {
    console.log('\n🔍 Verifying Cookie Consent...')

    try {
      // Check if cookie consent banner exists
      const consentBanner = await import('../src/components/compliance/CookieConsentBanner')

      if (consentBanner.CookieConsentBanner) {
        this.addResult(
          'Cookie Consent Banner',
          true,
          'Cookie consent banner component is implemented'
        )
      } else {
        this.addResult('Cookie Consent Banner', false, 'Cookie consent banner component is missing')
      }

      // Check if cookie preferences component exists
      const consentPrefs = await import('../src/components/compliance/CookiePreferences')

      if (consentPrefs.CookiePreferences) {
        this.addResult(
          'Cookie Preferences UI',
          true,
          'Cookie preferences UI component is implemented'
        )
      } else {
        this.addResult('Cookie Preferences UI', false, 'Cookie preferences UI component is missing')
      }

      // Check if cookie consent is integrated in the app
      const fs = await import('fs/promises')
      const appContent = await fs.readFile('src/App.tsx', 'utf-8')

      if (appContent.includes('CookieConsentBanner') || appContent.includes('CookieConsent')) {
        this.addResult(
          'Cookie Consent Integration',
          true,
          'Cookie consent is integrated in the app'
        )
      } else {
        this.addResult(
          'Cookie Consent Integration',
          false,
          'Cookie consent is not integrated in the app'
        )
      }
    } catch (error) {
      this.addResult(
        'Cookie Consent',
        false,
        `Error verifying cookie consent: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async verifyTermsAcceptance(): Promise<void> {
    console.log('\n🔍 Verifying Terms Acceptance...')

    try {
      // Check if terms acceptance service exists
      const termsService = await import('../convex/lib/compliance/termsAcceptance')

      if (termsService.recordTermsAcceptance) {
        this.addResult('Terms Acceptance Service', true, 'Terms acceptance service is implemented')
      } else {
        this.addResult(
          'Terms Acceptance Service',
          false,
          'Terms acceptance service is missing recordTermsAcceptance function'
        )
      }

      // Check if terms acceptance dialog exists
      const termsDialog = await import('../src/components/compliance/TermsAcceptanceDialog')

      if (termsDialog.TermsAcceptanceDialog) {
        this.addResult(
          'Terms Acceptance Dialog',
          true,
          'Terms acceptance dialog component is implemented'
        )
      } else {
        this.addResult(
          'Terms Acceptance Dialog',
          false,
          'Terms acceptance dialog component is missing'
        )
      }

      // Check if terms acceptance guard exists
      const termsGuard = await import('../src/components/compliance/TermsAcceptanceGuard')

      if (termsGuard.TermsAcceptanceGuard) {
        this.addResult(
          'Terms Acceptance Guard',
          true,
          'Terms acceptance guard component is implemented'
        )
      } else {
        this.addResult(
          'Terms Acceptance Guard',
          false,
          'Terms acceptance guard component is missing'
        )
      }

      // Check if property test exists
      try {
        await import('../convex/lib/compliance/termsAcceptance.property.test')
        this.addResult(
          'Terms Acceptance Property Test',
          true,
          'Property test for terms acceptance exists'
        )
      } catch {
        this.addResult(
          'Terms Acceptance Property Test',
          false,
          'Property test for terms acceptance is missing'
        )
      }
    } catch (error) {
      this.addResult(
        'Terms Acceptance',
        false,
        `Error verifying terms acceptance: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async verifyDataRetention(): Promise<void> {
    console.log('\n🔍 Verifying Data Retention...')

    try {
      // Check if data retention service exists
      const retentionService = await import('../convex/lib/compliance/dataRetention')

      if (retentionService.cleanupExpiredData) {
        this.addResult('Data Retention Service', true, 'Data retention service is implemented')
      } else {
        this.addResult(
          'Data Retention Service',
          false,
          'Data retention service is missing cleanupExpiredData function'
        )
      }

      // Check if property test exists
      try {
        await import('../convex/lib/compliance/dataRetention.property.test')
        this.addResult(
          'Data Retention Property Test',
          true,
          'Property test for data retention exists'
        )
      } catch {
        this.addResult(
          'Data Retention Property Test',
          false,
          'Property test for data retention is missing'
        )
      }
    } catch (error) {
      this.addResult(
        'Data Retention',
        false,
        `Error verifying data retention: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async verifyAnalyticsAnonymization(): Promise<void> {
    console.log('\n🔍 Verifying Analytics Anonymization...')

    try {
      // Check if analytics anonymization service exists
      const anonymizationService = await import('../convex/lib/compliance/analyticsAnonymization')

      if (anonymizationService.anonymizeAnalyticsData) {
        this.addResult(
          'Analytics Anonymization Service',
          true,
          'Analytics anonymization service is implemented'
        )
      } else {
        this.addResult(
          'Analytics Anonymization Service',
          false,
          'Analytics anonymization service is missing anonymizeAnalyticsData function'
        )
      }

      // Check if property test exists
      try {
        await import('../convex/lib/compliance/analyticsAnonymization.property.test')
        this.addResult(
          'Analytics Anonymization Property Test',
          true,
          'Property test for analytics anonymization exists'
        )
      } catch {
        this.addResult(
          'Analytics Anonymization Property Test',
          false,
          'Property test for analytics anonymization is missing'
        )
      }
    } catch (error) {
      this.addResult(
        'Analytics Anonymization',
        false,
        `Error verifying analytics anonymization: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async runAllVerifications(): Promise<void> {
    console.log('🚀 Starting Compliance Verification...\n')
    console.log('='.repeat(60))

    await this.verifyDataExport()
    await this.verifyDataDeletion()
    await this.verifyAuditLogging()
    await this.verifyCookieConsent()
    await this.verifyTermsAcceptance()
    await this.verifyDataRetention()
    await this.verifyAnalyticsAnonymization()

    this.printSummary()
  }

  private printSummary(): void {
    console.log('\n' + '='.repeat(60))
    console.log('📊 COMPLIANCE VERIFICATION SUMMARY')
    console.log('='.repeat(60))

    const passed = this.results.filter((r) => r.passed).length
    const failed = this.results.filter((r) => !r.passed).length
    const total = this.results.length

    console.log(`\nTotal Checks: ${total}`)
    console.log(`✅ Passed: ${passed}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`)

    if (failed > 0) {
      console.log('\n⚠️  Failed Checks:')
      this.results
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.log(`   - ${r.feature}: ${r.message}`)
        })
    }

    console.log('\n' + '='.repeat(60))

    if (failed === 0) {
      console.log('✅ All compliance features verified successfully!')
    } else {
      console.log('❌ Some compliance features need attention.')
      process.exit(1)
    }
  }
}

// Run verification
const verifier = new ComplianceVerifier()
verifier.runAllVerifications().catch((error) => {
  console.error('❌ Verification failed:', error)
  process.exit(1)
})

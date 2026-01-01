/**
 * Two-Factor Authentication Setup Component
 *
 * Provides a step-by-step wizard for setting up 2FA with TOTP.
 */

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { cn } from '@/lib/utils'
import {
  Shield,
  QrCode,
  Key,
  Check,
  Copy,
  Warning,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeSlash,
} from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface TwoFactorSetupProps {
  onComplete?: () => void
  onCancel?: () => void
}

type SetupStep = 'intro' | 'scan' | 'verify' | 'backup' | 'complete'

export function TwoFactorSetup({ onComplete, onCancel }: TwoFactorSetupProps) {
  const [step, setStep] = useState<SetupStep>('intro')
  const [setupData, setSetupData] = useState<{
    secret: string
    otpauthUrl: string
  } | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [showSecret, setShowSecret] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const beginSetup = useMutation(api.twoFactorAuth.beginSetup)
  const completeSetup = useMutation(api.twoFactorAuth.completeSetup)

  const handleStartSetup = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await beginSetup()
      setSetupData(data)
      setStep('scan')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start 2FA setup')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code')
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const result = await completeSetup({ code: verificationCode })
      if (result.backupCodes) {
        setBackupCodes(result.backupCodes)
      }
      setStep('backup')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const copyAllBackupCodes = () => {
    const codesText = backupCodes.join('\n')
    navigator.clipboard.writeText(codesText)
    toast.success('All backup codes copied to clipboard')
  }

  const downloadBackupCodes = () => {
    const content = `OpenEvent Two-Factor Authentication Backup Codes
================================================

Keep these codes safe! Each code can only be used once.
If you lose access to your authenticator app, use one of
these codes to sign in.

${backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

Generated: ${new Date().toISOString()}
`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'openevent-backup-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Backup codes downloaded')
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {(['intro', 'scan', 'verify', 'backup'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                step === s
                  ? 'bg-primary text-primary-foreground'
                  : step === 'complete' ||
                      (['intro', 'scan', 'verify', 'backup'] as const).indexOf(
                        step as 'intro' | 'scan' | 'verify' | 'backup'
                      ) > i
                    ? 'bg-emerald-500 text-white'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              {step === 'complete' ||
              (['intro', 'scan', 'verify', 'backup'] as const).indexOf(
                step as 'intro' | 'scan' | 'verify' | 'backup'
              ) > i ? (
                <Check size={14} weight="bold" />
              ) : (
                i + 1
              )}
            </div>
            {i < 3 && <div className="w-8 h-0.5 bg-muted" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {step === 'intro' && (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Shield size={32} weight="duotone" className="text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Set Up Two-Factor Authentication</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Add an extra layer of security to your account. You'll need an authenticator app like
            Google Authenticator, Authy, or 1Password.
          </p>

          <div className="space-y-3 text-left max-w-sm mx-auto">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <QrCode size={20} className="text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Scan a QR code</p>
                <p className="text-xs text-muted-foreground">Use your authenticator app to scan</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Key size={20} className="text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Enter verification code</p>
                <p className="text-xs text-muted-foreground">Confirm setup with a 6-digit code</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Shield size={20} className="text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Save backup codes</p>
                <p className="text-xs text-muted-foreground">
                  Keep backup codes for account recovery
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-4">
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleStartSetup}
              disabled={isLoading}
              className={cn(
                'inline-flex items-center gap-2 px-6 py-2 rounded-lg',
                'bg-primary text-primary-foreground text-sm font-medium',
                'hover:bg-primary/90 transition-colors cursor-pointer',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isLoading ? 'Starting...' : 'Get Started'}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {step === 'scan' && setupData && (
        <div className="text-center space-y-4">
          <h3 className="text-lg font-semibold">Scan QR Code</h3>
          <p className="text-sm text-muted-foreground">
            Open your authenticator app and scan this QR code
          </p>

          {/* QR Code Placeholder - In production, use a QR code library */}
          <div className="w-48 h-48 mx-auto bg-white p-4 rounded-xl border border-border flex items-center justify-center">
            <div className="text-center">
              <QrCode size={64} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                Use a QR code generator with:
                <br />
                <code className="text-[10px] break-all">
                  {setupData.otpauthUrl.slice(0, 50)}...
                </code>
              </p>
            </div>
          </div>

          {/* Manual Entry Option */}
          <div className="max-w-sm mx-auto">
            <button
              onClick={() => setShowSecret(!showSecret)}
              className="text-sm text-primary hover:underline cursor-pointer flex items-center gap-1 mx-auto"
            >
              {showSecret ? <EyeSlash size={14} /> : <Eye size={14} />}
              {showSecret ? 'Hide' : 'Show'} manual entry key
            </button>

            {showSecret && (
              <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">
                  Can't scan? Enter this key manually:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono bg-background px-2 py-1 rounded break-all">
                    {setupData.secret}
                  </code>
                  <button
                    onClick={() => copyToClipboard(setupData.secret, 'Secret key')}
                    className="p-1.5 rounded hover:bg-muted transition-colors cursor-pointer"
                    title="Copy"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => setStep('intro')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <button
              onClick={() => setStep('verify')}
              className={cn(
                'inline-flex items-center gap-2 px-6 py-2 rounded-lg',
                'bg-primary text-primary-foreground text-sm font-medium',
                'hover:bg-primary/90 transition-colors cursor-pointer'
              )}
            >
              Continue
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {step === 'verify' && (
        <div className="text-center space-y-4">
          <h3 className="text-lg font-semibold">Enter Verification Code</h3>
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code from your authenticator app
          </p>

          <div className="max-w-xs mx-auto">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '')
                setVerificationCode(value)
                setError(null)
              }}
              placeholder="000000"
              className="text-center text-2xl font-mono tracking-widest"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 max-w-sm mx-auto">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => setStep('scan')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <button
              onClick={handleVerify}
              disabled={isLoading || verificationCode.length !== 6}
              className={cn(
                'inline-flex items-center gap-2 px-6 py-2 rounded-lg',
                'bg-primary text-primary-foreground text-sm font-medium',
                'hover:bg-primary/90 transition-colors cursor-pointer',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isLoading ? 'Verifying...' : 'Verify'}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {step === 'backup' && (
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
            <Warning size={24} weight="duotone" className="text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold">Save Your Backup Codes</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            If you lose access to your authenticator app, you can use these codes to sign in. Each
            code can only be used once.
          </p>

          {/* Backup Codes Grid */}
          <div className="max-w-sm mx-auto p-4 rounded-lg bg-muted/50 border border-border">
            <div className="grid grid-cols-2 gap-2 mb-4">
              {backupCodes.map((code, i) => (
                <div key={i} className="px-3 py-2 bg-background rounded font-mono text-sm">
                  {code}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={copyAllBackupCodes}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer text-sm"
              >
                <Copy size={14} />
                Copy All
              </button>
              <button
                onClick={downloadBackupCodes}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer text-sm"
              >
                <Key size={14} />
                Download
              </button>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 max-w-sm mx-auto">
            <p className="text-xs text-amber-600">
              Store these codes in a secure location. You won't be able to see them again.
            </p>
          </div>

          <div className="pt-4">
            <button
              onClick={() => {
                setStep('complete')
                onComplete?.()
              }}
              className={cn(
                'inline-flex items-center gap-2 px-6 py-2 rounded-lg',
                'bg-emerald-600 text-white text-sm font-medium',
                'hover:bg-emerald-700 transition-colors cursor-pointer'
              )}
            >
              <Check size={16} weight="bold" />
              I've Saved My Codes
            </button>
          </div>
        </div>
      )}

      {step === 'complete' && (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
            <Check size={32} weight="bold" className="text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold">Two-Factor Authentication Enabled</h3>
          <p className="text-sm text-muted-foreground">
            Your account is now protected with two-factor authentication.
          </p>
        </div>
      )}
    </div>
  )
}

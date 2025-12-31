/**
 * Two-Factor Authentication Status Component
 *
 * Displays the current 2FA status and provides management options.
 */

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { cn } from '@/lib/utils'
import {
  Shield,
  ShieldCheck,
  ShieldWarning,
  Key,
  Trash,
  ArrowsClockwise,
  Check,
  X,
} from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface TwoFactorStatusProps {
  onEnableClick?: () => void
}

export function TwoFactorStatus({ onEnableClick }: TwoFactorStatusProps) {
  const status = useQuery(api.twoFactorAuth.getStatus)
  const disableTwoFactor = useMutation(api.twoFactorAuth.disable)
  const regenerateBackupCodes = useMutation(api.twoFactorAuth.regenerateBackupCodes)

  const [showDisableModal, setShowDisableModal] = useState(false)
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null)

  // Loading state
  if (status === undefined) {
    return (
      <div className="p-6 rounded-xl border border-border bg-card animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3 mb-4" />
        <div className="h-4 bg-muted rounded w-2/3" />
      </div>
    )
  }

  // User not authenticated - don't render anything
  if (status === null) {
    return null
  }

  const handleDisable = async () => {
    if (!verificationCode) {
      setError('Please enter a verification code')
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      await disableTwoFactor({ verificationCode })
      toast.success('Two-factor authentication disabled')
      setShowDisableModal(false)
      setVerificationCode('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable 2FA')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegenerate = async () => {
    if (!verificationCode) {
      setError('Please enter a verification code')
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const result = await regenerateBackupCodes({ verificationCode })
      setNewBackupCodes(result.backupCodes)
      setVerificationCode('')
      toast.success('Backup codes regenerated')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate backup codes')
    } finally {
      setIsLoading(false)
    }
  }

  const copyBackupCodes = () => {
    if (newBackupCodes) {
      navigator.clipboard.writeText(newBackupCodes.join('\n'))
      toast.success('Backup codes copied to clipboard')
    }
  }

  if (!status.enabled) {
    return (
      <div className="p-6 rounded-xl border border-border bg-card">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <ShieldWarning size={24} weight="duotone" className="text-amber-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold flex items-center gap-2">
              Two-Factor Authentication
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600">
                Disabled
              </span>
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add an extra layer of security to your account by requiring a verification code in
              addition to your password.
            </p>
            <button
              onClick={onEnableClick}
              className={cn(
                'mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg',
                'bg-primary text-primary-foreground text-sm font-medium',
                'hover:bg-primary/90 transition-colors cursor-pointer'
              )}
            >
              <Shield size={16} />
              Enable 2FA
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="p-6 rounded-xl border border-border bg-card">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={24} weight="duotone" className="text-emerald-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold flex items-center gap-2">
              Two-Factor Authentication
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600">
                Enabled
              </span>
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your account is protected with two-factor authentication.
            </p>

            {/* Backup Codes Status */}
            <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key size={16} className="text-muted-foreground" />
                  <span className="text-sm">Backup Codes</span>
                </div>
                <span
                  className={cn(
                    'text-sm font-medium',
                    status.backupCodesCount > 5
                      ? 'text-emerald-600'
                      : status.backupCodesCount > 2
                        ? 'text-amber-600'
                        : 'text-red-600'
                  )}
                >
                  {status.backupCodesCount} remaining
                </span>
              </div>
              {status.backupCodesCount <= 2 && (
                <p className="text-xs text-amber-600 mt-2">
                  You're running low on backup codes. Consider regenerating them.
                </p>
              )}
            </div>

            {/* Last Verified */}
            {status.verifiedAt && (
              <p className="text-xs text-muted-foreground mt-3">
                Last verified: {new Date(status.verifiedAt).toLocaleString()}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => setShowRegenerateModal(true)}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
                  'border border-border text-sm font-medium',
                  'hover:bg-muted transition-colors cursor-pointer'
                )}
              >
                <ArrowsClockwise size={16} />
                Regenerate Backup Codes
              </button>
              <button
                onClick={() => setShowDisableModal(true)}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
                  'border border-destructive/30 text-destructive text-sm font-medium',
                  'hover:bg-destructive/5 transition-colors cursor-pointer'
                )}
              >
                <Trash size={16} />
                Disable 2FA
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Disable Modal */}
      {showDisableModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Disable Two-Factor Authentication</h3>
              <button
                onClick={() => {
                  setShowDisableModal(false)
                  setVerificationCode('')
                  setError(null)
                }}
                className="p-1 hover:bg-muted rounded transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Enter your authenticator code or a backup code to confirm disabling 2FA.
            </p>

            <Input
              type="text"
              value={verificationCode}
              onChange={(e) => {
                setVerificationCode(e.target.value.toUpperCase())
                setError(null)
              }}
              placeholder="Enter code"
              className="font-mono"
              autoFocus
            />

            {error && <p className="text-sm text-destructive mt-2">{error}</p>}

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDisableModal(false)
                  setVerificationCode('')
                  setError(null)
                }}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDisable}
                disabled={isLoading || !verificationCode}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
                  'bg-destructive text-destructive-foreground text-sm font-medium',
                  'hover:bg-destructive/90 transition-colors cursor-pointer',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isLoading ? 'Disabling...' : 'Disable 2FA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Modal */}
      {showRegenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">
                {newBackupCodes ? 'New Backup Codes' : 'Regenerate Backup Codes'}
              </h3>
              <button
                onClick={() => {
                  setShowRegenerateModal(false)
                  setVerificationCode('')
                  setError(null)
                  setNewBackupCodes(null)
                }}
                className="p-1 hover:bg-muted rounded transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {!newBackupCodes ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  This will invalidate your existing backup codes. Enter your authenticator code to
                  confirm.
                </p>

                <Input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => {
                    setVerificationCode(e.target.value)
                    setError(null)
                  }}
                  placeholder="Enter 6-digit code"
                  className="font-mono"
                  maxLength={6}
                  autoFocus
                />

                {error && <p className="text-sm text-destructive mt-2">{error}</p>}

                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowRegenerateModal(false)
                      setVerificationCode('')
                      setError(null)
                    }}
                    className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRegenerate}
                    disabled={isLoading || verificationCode.length !== 6}
                    className={cn(
                      'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
                      'bg-primary text-primary-foreground text-sm font-medium',
                      'hover:bg-primary/90 transition-colors cursor-pointer',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {isLoading ? 'Regenerating...' : 'Regenerate'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Save these new backup codes. Your old codes are now invalid.
                </p>

                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {newBackupCodes.map((code, i) => (
                      <div key={i} className="px-3 py-2 bg-background rounded font-mono text-sm">
                        {code}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={copyBackupCodes}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer text-sm"
                  >
                    <Key size={14} />
                    Copy All Codes
                  </button>
                </div>

                <div className="flex items-center justify-end mt-6">
                  <button
                    onClick={() => {
                      setShowRegenerateModal(false)
                      setNewBackupCodes(null)
                    }}
                    className={cn(
                      'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
                      'bg-primary text-primary-foreground text-sm font-medium',
                      'hover:bg-primary/90 transition-colors cursor-pointer'
                    )}
                  >
                    <Check size={16} />
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Two-Factor Verification Modal
 *
 * Modal for verifying 2FA codes during login or sensitive operations.
 */

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { cn } from '@/lib/utils'
import { Shield, Key, X } from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'

interface TwoFactorVerifyModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (result: { usedBackupCode: boolean; remainingBackupCodes?: number }) => void
  title?: string
  description?: string
}

export function TwoFactorVerifyModal({
  open,
  onClose,
  onSuccess,
  title = 'Two-Factor Authentication',
  description = 'Enter the code from your authenticator app to continue.',
}: TwoFactorVerifyModalProps) {
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useBackupCode, setUseBackupCode] = useState(false)

  const verify = useMutation(api.twoFactorAuth.verify)

  const handleVerify = async () => {
    if (!code) {
      setError('Please enter a code')
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const result = await verify({ code })
      onSuccess(result)
      onClose()
      setCode('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setCode('')
    setError(null)
    setUseBackupCode(false)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl border border-border shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield size={20} weight="duotone" className="text-primary" />
            </div>
            <h3 className="font-semibold">{title}</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-muted rounded transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-6">{description}</p>

        {/* Code Input */}
        {!useBackupCode ? (
          <div className="space-y-4">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '')
                setCode(value)
                setError(null)
              }}
              placeholder="000000"
              className="text-center text-2xl font-mono tracking-widest"
              autoFocus
            />

            <button
              onClick={() => {
                setUseBackupCode(true)
                setCode('')
                setError(null)
              }}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Key size={14} />
              Use a backup code instead
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Enter one of your backup codes:</p>
              <Input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase())
                  setError(null)
                }}
                placeholder="XXXX-XXXX"
                className="font-mono"
                autoFocus
              />
            </div>

            <button
              onClick={() => {
                setUseBackupCode(false)
                setCode('')
                setError(null)
              }}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Shield size={14} />
              Use authenticator app instead
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleVerify}
            disabled={
              isLoading || (!useBackupCode && code.length !== 6) || (useBackupCode && !code)
            }
            className={cn(
              'inline-flex items-center gap-2 px-6 py-2 rounded-lg',
              'bg-primary text-primary-foreground text-sm font-medium',
              'hover:bg-primary/90 transition-colors cursor-pointer',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isLoading ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      </div>
    </div>
  )
}

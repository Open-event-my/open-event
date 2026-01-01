/**
 * Terms Acceptance Guard
 *
 * Wraps protected routes and shows terms dialog if user hasn't accepted current version.
 */

import { useState } from 'react'
import { useTermsAcceptance } from '@/hooks/useTermsAcceptance'
import { TermsAcceptanceDialog } from './TermsAcceptanceDialog'

interface TermsAcceptanceGuardProps {
  children: React.ReactNode
}

export function TermsAcceptanceGuard({ children }: TermsAcceptanceGuardProps) {
  const { needsAcceptance, currentVersion, isLoading } = useTermsAcceptance()

  // Derive dialog visibility from needsAcceptance state
  // Use a separate dismissed state to track if user has interacted
  const [dismissed, setDismissed] = useState(false)
  const showDialog = !isLoading && needsAcceptance && !dismissed

  const handleAccept = () => {
    setDismissed(true)
  }

  if (isLoading) {
    return null // Or a loading spinner
  }

  return (
    <>
      {children}
      <TermsAcceptanceDialog
        open={showDialog}
        onAccept={handleAccept}
        version={currentVersion}
        canClose={false}
      />
    </>
  )
}

/**
 * Terms Acceptance Guard
 * 
 * Wraps protected routes and shows terms dialog if user hasn't accepted current version.
 */

import { useState, useEffect } from 'react';
import { useTermsAcceptance } from '@/hooks/useTermsAcceptance';
import { TermsAcceptanceDialog } from './TermsAcceptanceDialog';

interface TermsAcceptanceGuardProps {
  children: React.ReactNode;
}

export function TermsAcceptanceGuard({ children }: TermsAcceptanceGuardProps) {
  const { needsAcceptance, currentVersion, isLoading } = useTermsAcceptance();
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    if (!isLoading && needsAcceptance) {
      setShowDialog(true);
    }
  }, [needsAcceptance, isLoading]);

  const handleAccept = () => {
    setShowDialog(false);
  };

  if (isLoading) {
    return null; // Or a loading spinner
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
  );
}

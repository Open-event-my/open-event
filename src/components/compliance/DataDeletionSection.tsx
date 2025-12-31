/**
 * Data Deletion Section Component
 * 
 * Provides UI for users to request account deletion and data purge
 * in compliance with GDPR Article 17 (Right to Erasure / Right to be Forgotten).
 * 
 * NOTE: Backend compliance module not yet integrated. This is a placeholder UI.
 */

import { useState } from 'react';
import { Trash, Warning, ShieldWarning, CheckCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function DataDeletionSection() {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');

  const handleRequestDeletion = () => {
    setShowConfirmDialog(true);
  };

  const handleFirstConfirm = () => {
    setShowConfirmDialog(false);
    // TODO: Implement when backend compliance module is integrated
    toast.info('Account deletion is not yet available. Please contact support.');
  };

  return (
    <>
      <div className="rounded-xl border border-destructive/20 bg-card p-6">
        <h3 className="font-semibold mb-6 flex items-center gap-2 text-destructive">
          <Trash size={18} weight="duotone" />
          Delete Account
        </h3>

        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center flex-shrink-0">
                <ShieldWarning size={16} weight="duotone" className="text-destructive" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive mb-1">Permanent Action</p>
                <p className="text-xs text-destructive/80">
                  Account deletion is permanent and cannot be undone.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Warning size={16} weight="duotone" className="text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
                  Before You Delete
                </p>
                <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle size={12} weight="fill" className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <span>Export your data first if you want to keep a copy</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={12} weight="fill" className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <span>Contact support if you're having issues</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="deletion-reason" className="text-sm font-medium">
              Reason for deletion (optional)
            </label>
            <textarea
              id="deletion-reason"
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              placeholder="Help us improve by telling us why you're leaving..."
              className={cn(
                'w-full px-3 py-2 text-sm rounded-lg',
                'border border-border bg-background',
                'focus:outline-none focus:ring-2 focus:ring-primary/20',
                'resize-none'
              )}
              rows={3}
            />
          </div>

          <button
            onClick={handleRequestDeletion}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-3 text-sm rounded-lg',
              'bg-destructive text-destructive-foreground font-medium',
              'hover:bg-destructive/90 transition-colors cursor-pointer'
            )}
          >
            <Trash size={16} weight="bold" />
            Delete My Account
          </button>
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Warning size={20} weight="duotone" />
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFirstConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              I Understand, Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

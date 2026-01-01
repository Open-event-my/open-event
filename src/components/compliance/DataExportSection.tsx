/**
 * Data Export Section Component
 *
 * Provides UI for users to request and download their personal data
 * in compliance with GDPR Article 20 (Right to Data Portability).
 *
 * NOTE: Backend compliance module not yet integrated. This is a placeholder UI.
 */

import { useState } from 'react'
import { Download, FileText, CircleNotch, CheckCircle, Warning } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function DataExportSection() {
  const [isExporting, setIsExporting] = useState(false)

  const handleExportRequest = async () => {
    setIsExporting(true)
    // TODO: Implement when backend compliance module is integrated
    setTimeout(() => {
      setIsExporting(false)
      toast.info('Data export is not yet available. Please contact support.')
    }, 1000)
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="font-semibold mb-6 flex items-center gap-2">
        <FileText size={18} weight="duotone" className="text-primary" />
        Data Export
      </h3>

      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <FileText size={16} weight="duotone" className="text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                GDPR Data Portability
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                You have the right to receive a copy of all your personal data in a structured,
                commonly used, and machine-readable format (JSON).
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <FileText size={20} weight="duotone" className="text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">Request Data Export</p>
                <p className="text-xs text-muted-foreground">
                  Download all your personal data in JSON format
                </p>
              </div>
            </div>
            <button
              onClick={handleExportRequest}
              disabled={isExporting}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm rounded-lg',
                'bg-primary text-primary-foreground font-medium',
                'hover:bg-primary/90 transition-colors cursor-pointer',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isExporting ? (
                <>
                  <CircleNotch size={16} className="animate-spin" />
                  Preparing...
                </>
              ) : (
                <>
                  <Download size={16} weight="bold" />
                  Request Export
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-muted/50">
          <p className="text-sm font-medium mb-3">What's included in your export:</p>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle size={14} weight="fill" className="text-primary mt-0.5 flex-shrink-0" />
              <span>User profile and account information</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={14} weight="fill" className="text-primary mt-0.5 flex-shrink-0" />
              <span>All events you've created and organized</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={14} weight="fill" className="text-primary mt-0.5 flex-shrink-0" />
              <span>Organizations you own or are a member of</span>
            </li>
          </ul>
        </div>

        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Warning size={16} weight="duotone" className="text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
                Security Notice
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Your export file contains sensitive personal information. Store it securely.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

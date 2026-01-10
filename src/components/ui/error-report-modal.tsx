/**
 * Error Report Modal Component
 *
 * Allows users to submit error reports with pre-filled context,
 * additional description, and optional screenshots.
 *
 * Requirements: 5.2, 5.4, 5.6
 */

import { useState, useCallback, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Bug,
  CheckCircle,
  CircleNotch,
  Image as ImageIcon,
  X,
  Copy,
  Warning,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { EnhancedFormattedError } from '@/lib/errorFormatter'
import {
  createErrorReport,
  getErrorReporter,
  type ErrorReport,
  type ErrorReportResult,
} from '@/lib/errorReporter'

/**
 * Props for the ErrorReportModal component
 */
export interface ErrorReportModalProps {
  /** Error being reported */
  error: EnhancedFormattedError
  /** Whether modal is open */
  isOpen: boolean
  /** Called when modal closes */
  onClose: () => void
  /** Optional custom submit handler */
  onSubmit?: (report: ErrorReport) => Promise<ErrorReportResult>
}

/**
 * Modal state type
 */
type ModalState = 'form' | 'submitting' | 'success' | 'error'

/**
 * Error Report Modal Component
 *
 * Features:
 * - Pre-filled error context
 * - User description input
 * - Screenshot attachment
 * - Confirmation with reference number
 *
 * Requirements: 5.2, 5.4, 5.6
 */
export function ErrorReportModal({ error, isOpen, onClose, onSubmit }: ErrorReportModalProps) {
  const [state, setState] = useState<ModalState>('form')
  const [userDescription, setUserDescription] = useState('')
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /**
   * Handle screenshot file selection
   * Requirements: 5.6 - Allow users to add screenshots
   */
  const handleScreenshotSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setSubmitError('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError('Image must be less than 5MB')
      return
    }

    // Convert to data URL
    const reader = new FileReader()
    reader.onload = (e) => {
      setScreenshot(e.target?.result as string)
      setSubmitError(null)
    }
    reader.onerror = () => {
      setSubmitError('Failed to read image file')
    }
    reader.readAsDataURL(file)
  }, [])

  /**
   * Remove attached screenshot
   */
  const handleRemoveScreenshot = useCallback(() => {
    setScreenshot(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  /**
   * Handle form submission
   * Requirements: 5.2, 5.4
   */
  const handleSubmit = useCallback(async () => {
    setState('submitting')
    setSubmitError(null)

    try {
      // Create the error report
      const report = createErrorReport(error.id, error.message, {
        stackTrace: undefined, // Stack trace would come from the original error
        userDescription: userDescription.trim() || undefined,
        screenshot: screenshot || undefined,
      })

      // Submit the report
      let result: ErrorReportResult
      if (onSubmit) {
        result = await onSubmit(report)
      } else {
        const reporter = getErrorReporter()
        result = await reporter.submitReport(report)
      }

      setReferenceNumber(result.referenceNumber)
      setState('success')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit report'
      setSubmitError(errorMessage)
      setState('error')
    }
  }, [error, userDescription, screenshot, onSubmit])

  /**
   * Reset modal state when closing
   */
  const handleClose = useCallback(() => {
    // Reset state after a delay to allow animation
    setTimeout(() => {
      setState('form')
      setUserDescription('')
      setScreenshot(null)
      setReferenceNumber(null)
      setSubmitError(null)
    }, 200)
    onClose()
  }, [onClose])

  /**
   * Copy reference number to clipboard
   */
  const handleCopyReference = useCallback(async () => {
    if (referenceNumber) {
      try {
        await navigator.clipboard.writeText(referenceNumber)
      } catch {
        // Fallback for older browsers
        console.log('Reference number:', referenceNumber)
      }
    }
  }, [referenceNumber])

  /**
   * Render form state
   * Requirements: 5.2, 5.6
   */
  const renderForm = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Bug size={20} weight="duotone" className="text-primary" />
          Report an Issue
        </DialogTitle>
        <DialogDescription>
          Help us improve by reporting this error. Your feedback is valuable.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {/* Pre-filled error context */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Error Details</Label>
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <p className="font-medium text-foreground">{error.message}</p>
            <p className="mt-1 text-xs text-muted-foreground">Error ID: {error.id}</p>
            {error.context?.action && (
              <p className="mt-1 text-xs text-muted-foreground">Action: {error.context.action}</p>
            )}
          </div>
        </div>

        {/* User description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium">
            What were you trying to do?
          </Label>
          <Textarea
            id="description"
            placeholder="Describe what you were doing when this error occurred..."
            value={userDescription}
            onChange={(e) => setUserDescription(e.target.value)}
            className="min-h-[100px] resize-none"
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground text-right">{userDescription.length}/1000</p>
        </div>

        {/* Screenshot attachment */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Screenshot (optional)</Label>
          {screenshot ? (
            <div className="relative rounded-md border overflow-hidden">
              <img
                src={screenshot}
                alt="Screenshot preview"
                className="max-h-[150px] w-full object-contain bg-muted/30"
              />
              <button
                onClick={handleRemoveScreenshot}
                className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Remove screenshot"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex flex-col items-center justify-center gap-2 p-6',
                'rounded-md border-2 border-dashed cursor-pointer',
                'text-muted-foreground hover:text-foreground hover:border-primary/50',
                'transition-colors'
              )}
            >
              <ImageIcon size={24} weight="duotone" />
              <span className="text-sm">Click to attach a screenshot</span>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleScreenshotSelect}
            className="hidden"
            aria-label="Upload screenshot"
          />
        </div>

        {/* Error message */}
        {submitError && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <Warning size={16} weight="fill" />
            {submitError}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} className="gap-2">
          <Bug size={16} weight="duotone" />
          Submit Report
        </Button>
      </DialogFooter>
    </>
  )

  /**
   * Render submitting state
   */
  const renderSubmitting = () => (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <CircleNotch size={48} className="animate-spin text-primary" />
      <p className="text-muted-foreground">Submitting your report...</p>
    </div>
  )

  /**
   * Render success state
   * Requirements: 5.4 - Show confirmation with reference number
   */
  const renderSuccess = () => (
    <>
      <div className="flex flex-col items-center justify-center py-8 gap-4">
        <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
          <CheckCircle size={48} weight="duotone" className="text-green-600 dark:text-green-400" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold">Report Submitted</h3>
          <p className="text-sm text-muted-foreground mt-1">Thank you for helping us improve!</p>
        </div>

        {/* Reference number */}
        {referenceNumber && (
          <div className="mt-4 w-full">
            <Label className="text-sm font-medium">Reference Number</Label>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm font-mono">
                {referenceNumber}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyReference}
                className="shrink-0"
                aria-label="Copy reference number"
              >
                <Copy size={16} />
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Save this reference number if you need to follow up on your report.
            </p>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button onClick={handleClose}>Done</Button>
      </DialogFooter>
    </>
  )

  /**
   * Render error state
   */
  const renderError = () => (
    <>
      <div className="flex flex-col items-center justify-center py-8 gap-4">
        <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-4">
          <Warning size={48} weight="duotone" className="text-red-600 dark:text-red-400" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold">Submission Failed</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {submitError || "We couldn't submit your report. Please try again."}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Your report has been saved locally and will be submitted when possible.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={handleClose}>
          Close
        </Button>
        <Button onClick={() => setState('form')}>Try Again</Button>
      </DialogFooter>
    </>
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        {state === 'form' && renderForm()}
        {state === 'submitting' && renderSubmitting()}
        {state === 'success' && renderSuccess()}
        {state === 'error' && renderError()}
      </DialogContent>
    </Dialog>
  )
}

export default ErrorReportModal

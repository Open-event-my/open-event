/**
 * Example component demonstrating user-friendly error display
 *
 * This component shows how to use the error formatter to display
 * user-friendly error messages with recovery suggestions.
 *
 * Requirements: 11.1, 11.3
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WarningCircle, CheckCircle, Info } from '@phosphor-icons/react'
import { formatErrorMessage } from '@/lib/errorFormatter'
import { handleError } from '@/lib/errors'

/**
 * Example of handling errors with user-friendly messages
 */
export function ErrorDisplayExample() {
  const [lastError, setLastError] = useState<ReturnType<typeof formatErrorMessage> | null>(null)

  // Simulate different types of errors
  const simulateError = (errorType: string) => {
    let error: unknown

    switch (errorType) {
      case 'auth':
        error = { code: 'UNAUTHORIZED', message: 'Authentication required' }
        break
      case 'network':
        error = new Error('Failed to fetch: Network request failed')
        break
      case 'validation':
        error = { code: 'INVALID_INPUT', message: 'Validation failed' }
        break
      case 'technical':
        error = new Error(
          'TypeError: Cannot read property "foo" of undefined at Object.<anonymous> (/path/to/file.ts:42:10)'
        )
        break
      case 'payment':
        error = { code: 'CARD_DECLINED', message: 'Payment processing failed' }
        break
      default:
        error = new Error('Something went wrong')
    }

    // Format the error
    const formatted = formatErrorMessage(error)
    setLastError(formatted)

    // Also show toast notification
    handleError(error)
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Error Display Examples</CardTitle>
          <CardDescription>
            Demonstrating user-friendly error messages with recovery suggestions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => simulateError('auth')} variant="outline" size="sm">
              Auth Error
            </Button>
            <Button onClick={() => simulateError('network')} variant="outline" size="sm">
              Network Error
            </Button>
            <Button onClick={() => simulateError('validation')} variant="outline" size="sm">
              Validation Error
            </Button>
            <Button onClick={() => simulateError('technical')} variant="outline" size="sm">
              Technical Error
            </Button>
            <Button onClick={() => simulateError('payment')} variant="outline" size="sm">
              Payment Error
            </Button>
          </div>

          {lastError && (
            <div className={`p-4 rounded-lg border ${lastError.category === 'server' ? 'border-destructive bg-destructive/10' : 'border-border bg-muted'}`}>
              <div className="flex items-start gap-2">
                <WarningCircle size={16} weight="duotone" className="mt-0.5" />
                <div>
                  <p className="font-medium">{lastError.message}</p>
                  {lastError.suggestions && lastError.suggestions.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium mb-1">What you can try:</p>
                      <ul className="text-sm space-y-1">
                        {lastError.suggestions.map((suggestion, index) => (
                          <li key={index} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {lastError.actionText && (
                    <Button size="sm" className="mt-3">
                      {lastError.actionText}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <CheckCircle size={20} weight="duotone" className="inline mr-2 text-green-500" />
            Benefits of User-Friendly Error Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start">
              <Info size={16} className="mr-2 mt-0.5 text-blue-500" />
              <span>
                <strong>No Technical Jargon:</strong> Stack traces and technical details are
                stripped from user-facing messages
              </span>
            </li>
            <li className="flex items-start">
              <Info size={16} className="mr-2 mt-0.5 text-blue-500" />
              <span>
                <strong>Actionable Suggestions:</strong> Users get clear steps on how to resolve
                the issue
              </span>
            </li>
            <li className="flex items-start">
              <Info size={16} className="mr-2 mt-0.5 text-blue-500" />
              <span>
                <strong>Categorized Errors:</strong> Different error types get appropriate styling
                and messaging
              </span>
            </li>
            <li className="flex items-start">
              <Info size={16} className="mr-2 mt-0.5 text-blue-500" />
              <span>
                <strong>Consistent Experience:</strong> All errors follow the same format across
                the application
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

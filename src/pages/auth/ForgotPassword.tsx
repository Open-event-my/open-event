import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { EnvelopeSimple, ArrowLeft, CheckCircle, CircleNotch } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/types/errors'
import { isValidEmail } from '@/lib/validation'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const requestReset = useAction(api.passwordReset.requestPasswordReset)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError('')

    if (!email) {
      setEmailError('Email is required')
      return
    }

    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address')
      return
    }

    setIsLoading(true)

    try {
      const result = await requestReset({ email: email.toLowerCase() })

      if (result.success) {
        setEmailSent(true)
        toast.success('Password reset email sent!')
      } else {
        toast.error(result.message || 'Failed to send reset email')
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || 'Failed to send reset email')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Open Event
            </h1>
          </div>

          {!emailSent ? (
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <EnvelopeSimple
                  size={48}
                  weight="duotone"
                  className="text-purple-600 mx-auto mb-4"
                />
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  Forgot Password?
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  No worries! Enter your email and we'll send you reset instructions.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (emailError) setEmailError('')
                    }}
                    placeholder="you@example.com"
                    className={`w-full px-4 py-3 rounded-lg border ${emailError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all`}
                    disabled={isLoading}
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? 'email-error' : undefined}
                    aria-required
                  />
                  {emailError && (
                    <p
                      id="email-error"
                      role="alert"
                      className="mt-2 text-sm text-red-600 dark:text-red-400"
                    >
                      {emailError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? (
                    <>
                      <CircleNotch size={20} weight="bold" className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <EnvelopeSimple size={20} weight="bold" />
                      Send Reset Link
                    </>
                  )}
                </button>
              </form>

              {/* Back to Sign In */}
              <div className="mt-6 text-center">
                <Link
                  to="/sign-in"
                  className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  <ArrowLeft size={16} weight="bold" />
                  Back to Sign In
                </Link>
              </div>
            </>
          ) : (
            <>
              {/* Success State */}
              <div className="text-center">
                <div className="mb-6">
                  <CheckCircle size={64} weight="fill" className="text-green-500 mx-auto" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  Check Your Email
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  We've sent password reset instructions to <strong>{email}</strong>
                </p>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 text-left">
                  <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-2">
                    What to do next:
                  </p>
                  <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                    <li>Check your email inbox (and spam folder)</li>
                    <li>Click the reset link in the email</li>
                    <li>Create a new password</li>
                  </ol>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setEmailSent(false)}
                    className="w-full px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                  >
                    Try Different Email
                  </button>

                  <Link
                    to="/sign-in"
                    className="block text-center px-6 py-3 text-purple-600 dark:text-purple-400 font-medium hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all"
                  >
                    Back to Sign In
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Help Text */}
        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
          Didn't receive the email?{' '}
          <button
            onClick={() =>
              !isLoading && handleSubmit(new Event('submit') as unknown as React.FormEvent)
            }
            disabled={isLoading || !email}
            className="text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-50 disabled:no-underline"
          >
            Resend
          </button>
        </p>
      </div>
    </div>
  )
}

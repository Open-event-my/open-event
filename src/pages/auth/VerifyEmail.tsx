import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { CircleNotch, CheckCircle, XCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'

type VerificationState = 'verifying' | 'success' | 'error' | 'already_verified'

export function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [state, setState] = useState<VerificationState>('verifying')
  const [error, setError] = useState<string>('')

  const verifyEmail = useMutation(api.emailVerification.verifyEmailToken)

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional initialization
      setState('error')
      setError('No verification token provided')
      return
    }

    // Verify the token
    verifyEmail({ token })
      .then((result) => {
        if (result.success) {
          if (result.alreadyVerified) {
            setState('already_verified')
          } else {
            setState('success')
            toast.success('Email verified successfully!')

            // Redirect to dashboard after 3 seconds
            setTimeout(() => {
              navigate('/dashboard')
            }, 3000)
          }
        } else {
          setState('error')
          setError(result.message || 'Verification failed')
        }
      })
      .catch((err) => {
        setState('error')
        setError(err.message || 'Failed to verify email')
      })
  }, [token, verifyEmail, navigate])

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

          {/* Verifying State */}
          {state === 'verifying' && (
            <div className="text-center">
              <CircleNotch
                size={64}
                weight="bold"
                className="animate-spin text-purple-600 mx-auto mb-4"
              />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Verifying your email...
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Please wait while we verify your email address
              </p>
            </div>
          )}

          {/* Success State */}
          {state === 'success' && (
            <div className="text-center">
              <div className="mb-6">
                <CheckCircle size={64} weight="fill" className="text-green-500 mx-auto" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Email Verified!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your email has been successfully verified. You'll be redirected to your dashboard
                shortly.
              </p>
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
              >
                Go to Dashboard
              </Link>
            </div>
          )}

          {/* Already Verified State */}
          {state === 'already_verified' && (
            <div className="text-center">
              <div className="mb-6">
                <CheckCircle size={64} weight="fill" className="text-blue-500 mx-auto" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Already Verified
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This email address has already been verified. You can sign in to your account.
              </p>
              <div className="flex gap-3 justify-center">
                <Link
                  to="/sign-in"
                  className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          )}

          {/* Error State */}
          {state === 'error' && (
            <div className="text-center">
              <div className="mb-6">
                <XCircle size={64} weight="fill" className="text-red-500 mx-auto" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Verification Failed
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {error || "We couldn't verify your email. The link may have expired or is invalid."}
              </p>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Need a new verification link?
                </p>
                <Link
                  to="/sign-in"
                  className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                >
                  Go to Sign In to resend verification email
                </Link>
              </div>

              <Link
                to="/"
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                Back to Home
              </Link>
            </div>
          )}
        </div>

        {/* Help Text */}
        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
          Having trouble?{' '}
          <a
            href="mailto:support@openevent.com"
            className="text-purple-600 dark:text-purple-400 hover:underline"
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  )
}

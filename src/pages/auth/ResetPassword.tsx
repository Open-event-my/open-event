import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useMutation, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { LockKey, Eye, EyeSlash, CheckCircle, CircleNotch, XCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/types/errors'
import { validatePasswordStrength } from '@/lib/validation'

type ResetState = 'validating' | 'valid' | 'invalid' | 'resetting' | 'success'

export function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [state, setState] = useState<ResetState>('validating')
  const [error, setError] = useState<string>('')
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const verifyToken = useMutation(api.passwordReset.verifyResetToken)
  const resetPassword = useAction(api.passwordReset.resetPassword)

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional initialization
      setState('invalid')
      setError('No reset token provided')
      return
    }

    verifyToken({ token })
      .then((result) => {
        if (result.valid) {
          setState('valid')
        } else {
          setState('invalid')
          setError(result.error || 'Invalid reset token')
        }
      })
      .catch((err) => {
        setState('invalid')
        setError(err.message || 'Failed to verify reset token')
      })
  }, [token, verifyToken])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setConfirmError('')

    if (!password) {
      setPasswordError('Password is required')
      return
    }

    const passwordValidation = validatePasswordStrength(password)
    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.errors[0])
      return
    }

    if (password !== confirmPassword) {
      setConfirmError('Passwords do not match')
      return
    }

    if (!token) {
      toast.error('Reset token missing')
      return
    }

    setState('resetting')

    try {
      const result = await resetPassword({ token, newPassword: password })

      if (result.success) {
        setState('success')
        toast.success('Password reset successfully!')

        // Redirect to sign in after 3 seconds
        setTimeout(() => {
          navigate('/sign-in')
        }, 3000)
      } else {
        setState('valid')
        toast.error(result.message || 'Failed to reset password')
      }
    } catch (error: unknown) {
      setState('valid')
      toast.error(getErrorMessage(error) || 'Failed to reset password')
    }
  }

  // Use centralized password validation for strength indicator
  const getPasswordStrength = () => {
    if (!password) return { strength: 0, label: '', color: '' }
    const validation = validatePasswordStrength(password)
    const strengthColors = {
      weak: { strength: 1, label: 'Weak', color: 'bg-red-500' },
      medium: { strength: 2, label: 'Medium', color: 'bg-yellow-500' },
      strong: { strength: 3, label: 'Strong', color: 'bg-green-500' },
    }
    return strengthColors[validation.strength]
  }

  const passwordStrength = getPasswordStrength()

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

          {/* Validating State */}
          {state === 'validating' && (
            <div className="text-center">
              <CircleNotch
                size={64}
                weight="bold"
                className="animate-spin text-purple-600 mx-auto mb-4"
              />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Validating reset link...
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Please wait while we verify your reset link
              </p>
            </div>
          )}

          {/* Invalid Token State */}
          {state === 'invalid' && (
            <div className="text-center">
              <div className="mb-6">
                <XCircle size={64} weight="fill" className="text-red-500 mx-auto" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Invalid Reset Link
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {error || 'This reset link is invalid or has expired.'}
              </p>
              <Link
                to="/forgot-password"
                className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
              >
                Request New Reset Link
              </Link>
            </div>
          )}

          {/* Valid Token - Show Form */}
          {(state === 'valid' || state === 'resetting') && (
            <>
              <div className="text-center mb-8">
                <LockKey size={48} weight="duotone" className="text-purple-600 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  Reset Your Password
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Enter your new password below
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* New Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (passwordError) setPasswordError('')
                      }}
                      placeholder="Enter new password"
                      className={`w-full px-4 py-3 pr-12 rounded-lg border ${passwordError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all`}
                      disabled={state === 'resetting'}
                      aria-invalid={!!passwordError}
                      aria-describedby={passwordError ? 'password-error' : 'password-requirements'}
                      aria-required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                    </button>
                  </div>

                  {passwordError && (
                    <p
                      id="password-error"
                      role="alert"
                      className="mt-2 text-sm text-red-600 dark:text-red-400"
                    >
                      {passwordError}
                    </p>
                  )}

                  {/* Password Strength Indicator */}
                  {password && !passwordError && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded ${
                              level <= passwordStrength.strength
                                ? passwordStrength.color
                                : 'bg-gray-200 dark:bg-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                      <p
                        id="password-requirements"
                        className="text-xs text-gray-600 dark:text-gray-400"
                      >
                        Min 12 chars with uppercase, lowercase, number, and special character
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        if (confirmError) setConfirmError('')
                      }}
                      placeholder="Confirm new password"
                      className={`w-full px-4 py-3 pr-12 rounded-lg border ${confirmError || (confirmPassword && password !== confirmPassword) ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all`}
                      disabled={state === 'resetting'}
                      aria-invalid={
                        !!confirmError || (!!confirmPassword && password !== confirmPassword)
                      }
                      aria-describedby={
                        confirmError || (confirmPassword && password !== confirmPassword)
                          ? 'confirm-error'
                          : undefined
                      }
                      aria-required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {(confirmError || (confirmPassword && password !== confirmPassword)) && (
                    <p
                      id="confirm-error"
                      role="alert"
                      className="mt-2 text-sm text-red-600 dark:text-red-400"
                    >
                      {confirmError || 'Passwords do not match'}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={state === 'resetting'}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {state === 'resetting' ? (
                    <>
                      <CircleNotch size={20} weight="bold" className="animate-spin" />
                      Resetting Password...
                    </>
                  ) : (
                    <>
                      <LockKey size={20} weight="bold" />
                      Reset Password
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* Success State */}
          {state === 'success' && (
            <div className="text-center">
              <div className="mb-6">
                <CheckCircle size={64} weight="fill" className="text-green-500 mx-auto" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Password Reset Successfully!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your password has been reset. You can now sign in with your new password.
              </p>
              <Link
                to="/sign-in"
                className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
              >
                Go to Sign In
              </Link>
            </div>
          )}
        </div>

        {/* Help Text */}
        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
          Remember your password?{' '}
          <Link to="/sign-in" className="text-purple-600 dark:text-purple-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

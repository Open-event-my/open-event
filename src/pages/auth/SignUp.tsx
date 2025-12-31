import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Logo } from '@/components/ui/logo'
import { OptimizedImage } from '@/components/ui/optimized-image'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth } from 'convex/react'
import { cn } from '@/lib/utils'
import { validatePasswordStrength, PASSWORD_REQUIREMENTS, isValidEmail } from '@/lib/validation'
import { getErrorMessage } from '@/types/errors'
import {
  Envelope,
  Lock,
  CircleNotch,
  ArrowRight,
  User,
  Rocket,
  Shield,
  Heart,
  CheckCircle,
  XCircle,
  Eye,
  EyeSlash,
} from '@phosphor-icons/react'

export function SignUp() {
  const { signIn } = useAuthActions()
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Password validation
  const passwordValidation = useMemo(() => validatePasswordStrength(password), [password])

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      setRedirecting(true)
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, authLoading, navigate])

  // Show loading screen while checking auth or redirecting
  if (authLoading || redirecting) {
    return (
      <LoadingSpinner
        message={redirecting ? 'Setting up your account...' : 'Loading...'}
        fullScreen
      />
    )
  }

  const handlePasswordSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: { name?: string; email?: string; password?: string } = {}

    if (!email) {
      newErrors.email = 'Email is required'
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!password) {
      newErrors.password = 'Password is required'
    } else if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.errors[0]
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    setLoading(true)
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/bf0148c8-69d2-4cb6-82fd-f2bf765adef1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/pages/auth/SignUp.tsx:87',message:'Before signIn call',data:{email,hasPassword:!!password,hasName:!!name},timestamp:Date.now(),sessionId:'debug-session',runId:'signup-attempt',hypothesisId:'S1'})}).catch(()=>{});
      // #endregion
      await signIn('password', { email, password, flow: 'signUp', name: name || '' })
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/bf0148c8-69d2-4cb6-82fd-f2bf765adef1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/pages/auth/SignUp.tsx:90',message:'signIn success - before navigate',data:{email},timestamp:Date.now(),sessionId:'debug-session',runId:'signup-attempt',hypothesisId:'S2'})}).catch(()=>{});
      // #endregion
      toast.success('Welcome to Open Event!')
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/bf0148c8-69d2-4cb6-82fd-f2bf765adef1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/pages/auth/SignUp.tsx:93',message:'Before navigate to onboarding',data:{email},timestamp:Date.now(),sessionId:'debug-session',runId:'signup-attempt',hypothesisId:'S3'})}).catch(()=>{});
      // #endregion
      navigate('/onboarding')
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-[100dvh] flex overflow-hidden">
      {/* Left Panel - Decorative (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden bg-slate-50 dark:bg-slate-950/50">
        {/* Gradient background matching landing page */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-background to-slate-50 dark:from-slate-900 dark:via-background dark:to-slate-950" />
          <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-emerald-100/50 to-transparent dark:from-emerald-900/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-indigo-100/40 to-transparent dark:from-indigo-900/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-1/4 w-[300px] h-[300px] bg-gradient-to-l from-cyan-100/30 to-transparent dark:from-cyan-900/10 rounded-full blur-3xl" />
        </div>

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <Logo />
          </Link>

          {/* Main content */}
          <div className="max-w-lg">
            <h2 className="text-4xl xl:text-5xl font-semibold tracking-tight leading-[1.1] mb-6">
              finally.
              <br />
              <span className="relative inline-block mt-1">
                <span className="bg-gradient-to-r from-slate-800 via-slate-600 to-slate-800 dark:from-slate-200 dark:via-slate-400 dark:to-slate-200 bg-clip-text text-transparent">
                  event ops that don't suck.
                </span>
                <svg
                  className="absolute -bottom-1 left-0 w-full"
                  height="8"
                  viewBox="0 0 200 10"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 8 Q50 0 100 8 T200 8"
                    stroke="url(#signup-underline)"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="signup-underline" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="50%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              we just launched. you could be one of the first to ditch the spreadsheet chaos
              forever.
            </p>

            {/* Feature highlights */}
            <div className="mt-10 space-y-4">
              {[
                { icon: Rocket, text: 'Get started in minutes', color: 'text-emerald-500' },
                { icon: Shield, text: 'Enterprise-grade security', color: 'text-indigo-500' },
                { icon: Heart, text: 'Free forever, open source', color: 'text-rose-500' },
              ].map((feature) => {
                const Icon = feature.icon
                return (
                  <div key={feature.text} className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center">
                      <Icon size={16} weight="duotone" className={feature.color} />
                    </div>
                    <span className="text-sm">{feature.text}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bottom social proof - the team */}
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              <OptimizedImage
                src="https://github.com/hazlijohar95.png"
                alt="Hazli"
                lazy
                className="w-8 h-8 rounded-full border-2 border-background shadow-sm"
              />
              <OptimizedImage
                src="https://github.com/azmir32.png"
                alt="Azmir"
                lazy
                className="w-8 h-8 rounded-full border-2 border-background shadow-sm"
              />
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 border-2 border-background shadow-sm flex items-center justify-center text-white text-xs font-medium">
                You
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              be among the <span className="font-medium text-foreground">first</span>
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
        {/* Mobile gradient background */}
        <div className="lg:hidden absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-background to-background dark:from-slate-950/50 dark:via-background" />
          <div className="absolute top-0 left-0 w-[300px] h-[300px] bg-gradient-to-br from-emerald-100/40 to-transparent dark:from-emerald-900/20 rounded-full blur-3xl" />
        </div>

        {/* Header */}
        <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex-shrink-0">
          <Link
            to="/"
            className="lg:opacity-0 lg:pointer-events-none hover:opacity-80 transition-opacity"
          >
            <Logo />
          </Link>
          <ThemeToggle />
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-y-auto">
          <div className="w-full max-w-md">
            {/* Card with glass effect */}
            <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-xl p-5 sm:p-6">
              <div className="text-center mb-5">
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mb-1">
                  Create Account
                </h1>
                <p className="text-muted-foreground text-sm">
                  Get started with your free account today.
                </p>
              </div>

              <form onSubmit={handlePasswordSignUp} className="space-y-2.5">
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Name
                  </Label>
                  <div className="relative">
                    <User
                      size={16}
                      weight="duotone"
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value)
                        if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
                      }}
                      className={cn(
                        'pl-10 h-10 rounded-xl text-sm',
                        errors.name && 'border-destructive'
                      )}
                      aria-describedby={errors.name ? 'name-error' : undefined}
                    />
                  </div>
                  {errors.name && (
                    <p id="name-error" role="alert" className="text-sm text-destructive">
                      {errors.name}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email
                  </Label>
                  <div className="relative">
                    <Envelope
                      size={16}
                      weight="duotone"
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
                      }}
                      className={cn(
                        'pl-10 h-10 rounded-xl text-sm',
                        errors.email && 'border-destructive'
                      )}
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? 'email-error' : undefined}
                      aria-required
                    />
                  </div>
                  {errors.email && (
                    <p id="email-error" role="alert" className="text-sm text-destructive">
                      {errors.email}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock
                      size={16}
                      weight="duotone"
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10"
                    />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 12 characters"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
                      }}
                      onFocus={() => setShowPasswordRequirements(true)}
                      onBlur={() => password.length === 0 && setShowPasswordRequirements(false)}
                      className={cn(
                        'pl-10 pr-10 h-10 rounded-xl text-sm',
                        errors.password && 'border-destructive'
                      )}
                      aria-invalid={!!errors.password}
                      aria-describedby={
                        errors.password ? 'password-error' : 'password-requirements'
                      }
                      aria-required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeSlash size={16} weight="duotone" />
                      ) : (
                        <Eye size={16} weight="duotone" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p id="password-error" role="alert" className="text-sm text-destructive">
                      {errors.password}
                    </p>
                  )}

                  {/* Password Strength Indicator */}
                  {(showPasswordRequirements || password.length > 0) && (
                    <div id="password-requirements" className="mt-2 space-y-2">
                      {/* Strength bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full transition-all duration-300',
                              passwordValidation.strength === 'weak' && 'w-1/3 bg-red-500',
                              passwordValidation.strength === 'medium' && 'w-2/3 bg-yellow-500',
                              passwordValidation.strength === 'strong' && 'w-full bg-emerald-500'
                            )}
                          />
                        </div>
                        <span
                          className={cn(
                            'text-xs font-medium capitalize',
                            passwordValidation.strength === 'weak' && 'text-red-500',
                            passwordValidation.strength === 'medium' && 'text-yellow-600',
                            passwordValidation.strength === 'strong' && 'text-emerald-500'
                          )}
                        >
                          {password.length > 0 ? passwordValidation.strength : ''}
                        </span>
                      </div>

                      {/* Requirements list */}
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                        {[
                          {
                            label: `${PASSWORD_REQUIREMENTS.minLength}+ characters`,
                            met: password.length >= PASSWORD_REQUIREMENTS.minLength,
                          },
                          { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
                          { label: 'Lowercase letter', met: /[a-z]/.test(password) },
                          { label: 'Number', met: /[0-9]/.test(password) },
                          {
                            label: 'Special character',
                            met: /[!@#$%^&*(),.?":{}|<>[\]\\;'`~_+=-]/.test(password),
                          },
                        ].map((req) => (
                          <div
                            key={req.label}
                            className={cn(
                              'flex items-center gap-1 text-xs transition-colors',
                              req.met ? 'text-emerald-600' : 'text-muted-foreground'
                            )}
                          >
                            {req.met ? (
                              <CheckCircle size={12} weight="fill" className="text-emerald-500" />
                            ) : (
                              <XCircle
                                size={12}
                                weight="fill"
                                className="text-muted-foreground/50"
                              />
                            )}
                            <span>{req.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-foreground hover:bg-foreground/90 text-background py-2.5 px-4 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl group text-sm mt-1"
                >
                  {loading ? (
                    <>
                      <CircleNotch size={18} weight="bold" className="animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight
                        size={18}
                        weight="bold"
                        className="transition-transform group-hover:translate-x-1"
                      />
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-4">
                Already have an account?{' '}
                <Link
                  to="/sign-in"
                  className="text-foreground hover:text-emerald-500 font-medium transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle size={12} weight="fill" className="text-emerald-500" />
                Free forever
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle size={12} weight="fill" className="text-emerald-500" />
                No credit card
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle size={12} weight="fill" className="text-emerald-500" />
                Open source
              </span>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-4 sm:px-6 py-3 text-center flex-shrink-0">
          <p className="text-[11px] text-muted-foreground">
            By continuing, you agree to our{' '}
            <Link to="/terms" className="underline hover:text-foreground transition-colors">
              Terms
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="underline hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
          </p>
        </footer>
      </div>
    </div>
  )
}

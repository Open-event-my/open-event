import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Logo } from '@/components/ui/logo'
import { OptimizedImage } from '@/components/ui/optimized-image'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useAuthActions, useAuthToken } from '@convex-dev/auth/react'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { getErrorMessage } from '@/types/errors'
import { isValidEmail } from '@/lib/validation'
import { cn } from '@/lib/utils'
import {
  Envelope,
  Lock,
  CircleNotch,
  ArrowRight,
  Calendar,
  Sparkle,
  Users,
  CheckCircle,
  Eye,
  EyeSlash,
} from '@phosphor-icons/react'

export function SignIn() {
  const { signIn } = useAuthActions()
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const authToken = useAuthToken()
  const navigate = useNavigate()
  
  // Query user to check role for redirect
  const user = useQuery(
    api.queries.auth.getCurrentUser,
    (isAuthenticated || authToken) ? {} : 'skip'
  )
  
  // #region agent log
  useEffect(() => {
    if (isAuthenticated || authToken) {
      fetch('http://127.0.0.1:7242/ingest/bf0148c8-69d2-4cb6-82fd-f2bf765adef1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/pages/auth/SignIn.tsx:35',message:'User query state',data:{isAuthenticated,hasAuthToken:!!authToken,userState:user === undefined ? 'loading' : user === null ? 'null' : 'loaded',hasUser:!!user,userRole:user?.role},timestamp:Date.now(),sessionId:'debug-session',runId:'signin-user-query',hypothesisId:'U1'})}).catch(()=>{});
    }
  }, [isAuthenticated, authToken, user])
  // #endregion
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  // Redirect if already authenticated or if we have an auth token (token presence means we're authenticated)
  useEffect(() => {
    // Check both isAuthenticated and authToken - token presence means we're authenticated even if state hasn't updated
    if (!authLoading && (isAuthenticated || authToken)) {
      // Wait for user data to load if we're authenticated
      if (user === undefined) {
        // Still loading user data - wait a bit longer
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/bf0148c8-69d2-4cb6-82fd-f2bf765adef1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/pages/auth/SignIn.tsx:48',message:'Waiting for user query to complete',data:{isAuthenticated,hasAuthToken:!!authToken,userState:'loading'},timestamp:Date.now(),sessionId:'debug-session',runId:'signin-redirect',hypothesisId:'R0'})}).catch(()=>{});
        // #endregion
        return
      }
      
      // User query completed
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/bf0148c8-69d2-4cb6-82fd-f2bf765adef1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/pages/auth/SignIn.tsx:55',message:'Redirect decision based on role',data:{isAuthenticated,hasAuthToken:!!authToken,hasUser:!!user,userRole:user?.role,userState:user === null ? 'null' : 'loaded',willRedirectToAdmin:user?.role === 'admin' || user?.role === 'superadmin'},timestamp:Date.now(),sessionId:'debug-session',runId:'signin-redirect',hypothesisId:'R1'})}).catch(()=>{});
      // #endregion
      
      // If user is null but we have authToken, there might be an auth error
      // Wait a bit longer and retry, or redirect to dashboard as fallback
      if (user === null && authToken) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/bf0148c8-69d2-4cb6-82fd-f2bf765adef1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/pages/auth/SignIn.tsx:62',message:'User query returned null despite authToken - possible auth error',data:{isAuthenticated,hasAuthToken:!!authToken},timestamp:Date.now(),sessionId:'debug-session',runId:'signin-redirect',hypothesisId:'R3'})}).catch(()=>{});
        // #endregion
        // Fallback: redirect to dashboard if user query fails
        // This might happen if there's an OIDC verification error
        setRedirecting(true)
        navigate('/dashboard', { replace: true })
        return
      }
      
      setRedirecting(true)
      // Redirect to /admin if user is admin or superadmin, otherwise /dashboard
      const redirectPath = (user?.role === 'admin' || user?.role === 'superadmin') ? '/admin' : '/dashboard'
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/bf0148c8-69d2-4cb6-82fd-f2bf765adef1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/pages/auth/SignIn.tsx:72',message:'Navigating after role check',data:{redirectPath,userRole:user?.role},timestamp:Date.now(),sessionId:'debug-session',runId:'signin-redirect',hypothesisId:'R2'})}).catch(()=>{});
      // #endregion
      navigate(redirectPath, { replace: true })
    }
  }, [isAuthenticated, authLoading, authToken, user, navigate])

  // Show loading screen while checking auth, loading user data, or redirecting
  if (authLoading || redirecting || ((isAuthenticated || authToken) && user === undefined)) {
    return <LoadingSpinner message={redirecting ? 'Signing you in...' : 'Loading...'} fullScreen />
  }

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: { email?: string; password?: string } = {}

    if (!email) {
      newErrors.email = 'Email is required'
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!password) {
      newErrors.password = 'Password is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    setLoading(true)
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/bf0148c8-69d2-4cb6-82fd-f2bf765adef1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/pages/auth/SignIn.tsx:73',message:'Before signIn call',data:{email,hasPassword:!!password},timestamp:Date.now(),sessionId:'debug-session',runId:'signin-attempt',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      await signIn('password', { email, password, flow: 'signIn' })
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/bf0148c8-69d2-4cb6-82fd-f2bf765adef1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/pages/auth/SignIn.tsx:90',message:'signIn success',data:{email,isAuthenticated,isLoading:authLoading,hasAuthToken:!!authToken},timestamp:Date.now(),sessionId:'debug-session',runId:'signin-attempt',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      toast.success('Welcome back!')
      // Wait for auth state to update before navigating
      // The useEffect hook will handle navigation when isAuthenticated becomes true or authToken is available
      setRedirecting(true)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/bf0148c8-69d2-4cb6-82fd-f2bf765adef1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/pages/auth/SignIn.tsx:95',message:'Set redirecting=true, waiting for auth state update',data:{email,isAuthenticated,isLoading:authLoading,hasAuthToken:!!authToken},timestamp:Date.now(),sessionId:'debug-session',runId:'signin-attempt',hypothesisId:'N1'})}).catch(()=>{});
      // #endregion
      
      // Fallback: If auth state doesn't update within 2 seconds, navigate anyway if we have a token
      // This handles cases where useConvexAuth() is slow to update
      setTimeout(() => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/bf0148c8-69d2-4cb6-82fd-f2bf765adef1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/pages/auth/SignIn.tsx:100',message:'Fallback timeout check',data:{email,isAuthenticated,isLoading:authLoading,hasAuthToken:!!authToken,hasUser:!!user,userRole:user?.role,willNavigate:!!authToken},timestamp:Date.now(),sessionId:'debug-session',runId:'signin-attempt',hypothesisId:'T1'})}).catch(()=>{});
        // #endregion
        if (authToken && !isAuthenticated) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/bf0148c8-69d2-4cb6-82fd-f2bf765adef1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/pages/auth/SignIn.tsx:103',message:'Fallback navigation - token exists but isAuthenticated is false',data:{email,hasAuthToken:!!authToken,hasUser:!!user,userRole:user?.role},timestamp:Date.now(),sessionId:'debug-session',runId:'signin-attempt',hypothesisId:'T2'})}).catch(()=>{});
          // #endregion
          // Check user role for redirect path
          const redirectPath = (user?.role === 'admin' || user?.role === 'superadmin') ? '/admin' : '/dashboard'
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/bf0148c8-69d2-4cb6-82fd-f2bf765adef1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/pages/auth/SignIn.tsx:107',message:'Fallback navigation with role check',data:{redirectPath,userRole:user?.role},timestamp:Date.now(),sessionId:'debug-session',runId:'signin-attempt',hypothesisId:'T3'})}).catch(()=>{});
          // #endregion
          navigate(redirectPath, { replace: true })
        }
      }, 2000)
    } catch (error: unknown) {
      // #region agent log
      const errorMsg = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined
      const isPkcs8Error = errorMsg.includes('pkcs8') || errorMsg.includes('PKCS')
      fetch('http://127.0.0.1:7242/ingest/bf0148c8-69d2-4cb6-82fd-f2bf765adef1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/pages/auth/SignIn.tsx:82',message:'signIn error',data:{error:errorMsg,errorName:error instanceof Error?error.name:'unknown',isPkcs8Error,hasStack:!!errorStack,email},timestamp:Date.now(),sessionId:'debug-session',runId:'signin-attempt',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
      toast.error(getErrorMessage(error) || 'Invalid email or password')
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
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-indigo-100/60 to-transparent dark:from-indigo-900/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-violet-100/40 to-transparent dark:from-violet-900/20 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-gradient-to-r from-amber-100/30 to-transparent dark:from-amber-900/10 rounded-full blur-3xl" />
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
              welcome back.
              <br />
              <span className="relative inline-block mt-1">
                <span className="bg-gradient-to-r from-slate-800 via-slate-600 to-slate-800 dark:from-slate-200 dark:via-slate-400 dark:to-slate-200 bg-clip-text text-transparent">
                  we missed you.
                </span>
                <svg
                  className="absolute -bottom-1 left-0 w-full"
                  height="8"
                  viewBox="0 0 200 10"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 8 Q50 0 100 8 T200 8"
                    stroke="url(#signin-underline)"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="signin-underline" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="50%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              your events are waiting. let's get back to making things happen.
            </p>

            {/* Feature highlights */}
            <div className="mt-10 space-y-4">
              {[
                { icon: Calendar, text: 'Manage unlimited events' },
                { icon: Users, text: 'Connect with vendors & sponsors' },
                { icon: Sparkle, text: 'AI-powered planning assistance' },
              ].map((feature) => {
                const Icon = feature.icon
                return (
                  <div key={feature.text} className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center">
                      <Icon size={16} weight="duotone" className="text-indigo-500" />
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
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 border-2 border-background shadow-sm flex items-center justify-center text-white text-xs font-medium">
                ?
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              join us. <span className="font-medium text-foreground">seriously.</span>
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
        {/* Mobile gradient background */}
        <div className="lg:hidden absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-background to-background dark:from-slate-950/50 dark:via-background" />
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-bl from-indigo-100/40 to-transparent dark:from-indigo-900/20 rounded-full blur-3xl" />
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
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mb-1">Sign In</h1>
                <p className="text-muted-foreground text-sm">
                  Welcome back! Please sign in to continue.
                </p>
              </div>

              <form onSubmit={handlePasswordSignIn} className="space-y-3">
                <div className="space-y-1.5">
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
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock
                      size={16}
                      weight="duotone"
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10"
                    />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
                      }}
                      className={cn(
                        'pl-10 pr-10 h-10 rounded-xl text-sm',
                        errors.password && 'border-destructive'
                      )}
                      aria-invalid={!!errors.password}
                      aria-describedby={errors.password ? 'password-error' : undefined}
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
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-foreground hover:bg-foreground/90 text-background py-2.5 px-4 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl group text-sm"
                >
                  {loading ? (
                    <>
                      <CircleNotch size={18} weight="bold" className="animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
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
                Don't have an account?{' '}
                <Link
                  to="/sign-up"
                  className="text-foreground hover:text-indigo-500 font-medium transition-colors"
                >
                  Sign up
                </Link>
              </p>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle size={12} weight="fill" className="text-emerald-500" />
                Secure login
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle size={12} weight="fill" className="text-emerald-500" />
                No credit card
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

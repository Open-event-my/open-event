import { useQuery, useMutation, useAction } from 'convex/react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import { usePWA } from '@/hooks/use-pwa'
import { useAuth } from '@/contexts/AuthContext'
import { useAuthActions } from '@convex-dev/auth/react'
import {
  User,
  Buildings,
  Bell,
  Shield,
  CheckCircle,
  Envelope,
  Calendar,
  Users,
  Target,
  Briefcase,
  SignOut,
  DeviceMobile,
  WifiHigh,
  CheckSquare,
  Sparkle,
  Lightning,
  Clock,
  Lock,
  Eye,
  EyeSlash,
  Check,
  X,
  CircleNotch,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { TwoFactorSetup, TwoFactorStatus } from '@/components/security'
import { DataExportSection, DataDeletionSection, CookiePreferences } from '@/components/compliance'

const organizationTypes = [
  { value: 'company', label: 'Company' },
  { value: 'nonprofit', label: 'Non-Profit' },
  { value: 'government', label: 'Government' },
  { value: 'community', label: 'Community Group' },
  { value: 'educational', label: 'Educational Institution' },
  { value: 'individual', label: 'Individual' },
]

const eventTypeOptions = [
  'Conferences',
  'Workshops',
  'Meetups',
  'Hackathons',
  'Seminars',
  'Networking Events',
  'Product Launches',
  'Celebrations',
  'Corporate Events',
  'Virtual Events',
]

const eventScales = [
  { value: 'small', label: 'Small (< 50 attendees)' },
  { value: 'medium', label: 'Medium (50-200 attendees)' },
  { value: 'large', label: 'Large (200-1000 attendees)' },
  { value: 'enterprise', label: 'Enterprise (1000+ attendees)' },
]

const experienceLevels = [
  { value: 'first-time', label: 'First-time organizer' },
  { value: '1-5', label: '1-5 events organized' },
  { value: '5-20', label: '5-20 events organized' },
  { value: '20+', label: '20+ events organized' },
]

export function SettingsPage() {
  const { user, accessToken, refreshAuth, signOut: customSignOut } = useAuth()
  const { signOut: convexSignOut } = useAuthActions()
  const navigate = useNavigate()
  const convexUser = useQuery(api.queries.auth.getCurrentUser, {})
  const currentUser = convexUser ?? user
  const profile = useQuery(api.organizerProfiles.getMyProfile, {
    accessToken: accessToken ?? undefined,
  })
  const saveProfile = useMutation(api.organizerProfiles.saveProfile)
  const updateUser = useMutation(api.users.update)
  const { isInstalled, isInstallable, isOnline, promptInstall, getPlatform } = usePWA()

  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false)
  const [displayName, setDisplayName] = useState('')

  // Profile form state
  const [formData, setFormData] = useState({
    organizationName: '',
    organizationType: '',
    eventTypes: [] as string[],
    eventScale: '',
    experienceLevel: '',
  })

  // Notification settings (local state for now)
  const [notifications, setNotifications] = useState({
    emailEventUpdates: true,
    emailVendorMessages: true,
    emailSponsorMessages: true,
    emailWeeklyDigest: false,
    pushEventReminders: true,
    pushNewMessages: true,
  })

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const changePassword = useAction(api.passwordReset.changePassword)

  // Password validation
  const passwordRequirements = [
    { label: '12+ characters', met: passwordData.newPassword.length >= 12 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(passwordData.newPassword) },
    { label: 'Lowercase letter', met: /[a-z]/.test(passwordData.newPassword) },
    { label: 'Number', met: /[0-9]/.test(passwordData.newPassword) },
    {
      label: 'Special character',
      met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(passwordData.newPassword),
    },
  ]
  const allRequirementsMet = passwordRequirements.every((r) => r.met)
  const passwordsMatch =
    passwordData.newPassword === passwordData.confirmPassword &&
    passwordData.confirmPassword.length > 0

  const handlePasswordChange = async () => {
    if (!allRequirementsMet || !passwordsMatch || !passwordData.currentPassword) {
      toast.error('Please fill in all fields correctly')
      return
    }

    setIsChangingPassword(true)
    try {
      await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      })
      toast.success('Password changed successfully')
      setShowPasswordForm(false)
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to change password'
      toast.error(message)
    } finally {
      setIsChangingPassword(false)
    }
  }

  // Load profile data
  useEffect(() => {
    if (profile) {
      setFormData({
        organizationName: profile.organizationName || '',
        organizationType: profile.organizationType || '',
        eventTypes: profile.eventTypes || [],
        eventScale: profile.eventScale || '',
        experienceLevel: profile.experienceLevel || '',
      })
    }
  }, [profile])

  useEffect(() => {
    setDisplayName(currentUser?.name || '')
  }, [currentUser?.name])

  const handleChange = (field: string, value: string | string[]) => {
    setHasChanges(true)
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const toggleEventType = (eventType: string) => {
    setHasChanges(true)
    setFormData((prev) => ({
      ...prev,
      eventTypes: prev.eventTypes.includes(eventType)
        ? prev.eventTypes.filter((t) => t !== eventType)
        : [...prev.eventTypes, eventType],
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const trimmedName = displayName.trim()
      const currentName = (currentUser?.name || '').trim()
      const shouldUpdateName =
        !!currentUser?._id && trimmedName.length > 0 && trimmedName !== currentName

      await Promise.all([
        saveProfile({
          accessToken: accessToken ?? undefined,
          organizationName: formData.organizationName || undefined,
          organizationType: formData.organizationType || undefined,
          eventTypes: formData.eventTypes.length > 0 ? formData.eventTypes : undefined,
          eventScale: formData.eventScale || undefined,
          experienceLevel: formData.experienceLevel || undefined,
        }),
        shouldUpdateName
          ? updateUser({
              accessToken: accessToken ?? undefined,
              id: currentUser._id,
              name: trimmedName,
            })
          : Promise.resolve(),
      ])

      if (user) {
        refreshAuth().catch(() => {})
      }
      toast.success('Settings saved successfully')
      setHasChanges(false)
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSignOut = async () => {
    try {
      // Sign out from both auth systems
      await Promise.all([
        customSignOut().catch(() => {}), // Ignore errors, continue with sign out
        convexSignOut().catch(() => {}), // Ignore errors, continue with sign out
      ])
      navigate('/sign-in')
    } catch {
      toast.error('Failed to sign out')
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
        </div>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
              'bg-primary text-primary-foreground text-sm font-medium',
              'hover:bg-primary/90 transition-colors cursor-pointer',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <CheckCircle size={16} weight="bold" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      {/* Profile Card */}
      <div className="p-6 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-4">
          <div className="relative">
            {currentUser?.image ? (
              <img
                src={currentUser.image}
                alt={displayName || currentUser?.name || 'Profile'}
                className="w-20 h-20 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-border">
                <User size={40} weight="duotone" className="text-primary" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{displayName || currentUser?.name || 'User'}</h2>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Envelope size={14} />
              {currentUser?.email || 'Not set'}
            </p>
            {formData.organizationName && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Buildings size={14} />
                {formData.organizationName}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User size={16} weight="duotone" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="organization" className="flex items-center gap-2">
            <Buildings size={16} weight="duotone" />
            <span className="hidden sm:inline">Organization</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield size={16} weight="duotone" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell size={16} weight="duotone" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <Briefcase size={18} weight="duotone" className="text-primary" />
              Experience & Preferences
            </h3>

            <div className="space-y-6">
              <div>
                <Label>Experience Level</Label>
                <Select
                  value={formData.experienceLevel}
                  onValueChange={(value) => handleChange('experienceLevel', value)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select your experience level" />
                  </SelectTrigger>
                  <SelectContent>
                    {experienceLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Typical Event Scale</Label>
                <Select
                  value={formData.eventScale}
                  onValueChange={(value) => handleChange('eventScale', value)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select typical event size" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventScales.map((scale) => (
                      <SelectItem key={scale.value} value={scale.value}>
                        {scale.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-3 block">Event Types You Organize</Label>
                <div className="flex flex-wrap gap-2">
                  {eventTypeOptions.map((type) => {
                    const isSelected = formData.eventTypes.includes(type)
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleEventType(type)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80'
                        )}
                      >
                        {type}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <Shield size={18} weight="duotone" className="text-primary" />
              Account
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Envelope size={20} weight="duotone" className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Email Address</p>
                    <p className="text-xs text-muted-foreground">
                      {currentUser?.email || 'Not set'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <User size={20} weight="duotone" className="text-muted-foreground" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="font-medium text-sm">Display Name</p>
                    <Input
                      value={displayName}
                      onChange={(e) => {
                        setDisplayName(e.target.value)
                        setHasChanges(true)
                      }}
                      placeholder="Enter your name"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className={cn(
                  'w-full flex items-center justify-between p-4 rounded-lg border border-destructive/20',
                  'hover:bg-destructive/5 transition-colors cursor-pointer text-left'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <SignOut size={20} weight="duotone" className="text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-destructive">Sign Out</p>
                    <p className="text-xs text-muted-foreground">Sign out of your account</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* App Section */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <DeviceMobile size={18} weight="duotone" className="text-primary" />
              App
            </h3>

            <div className="space-y-4">
              {/* Network Status */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      isOnline ? 'bg-emerald-500/10' : 'bg-amber-500/10'
                    )}
                  >
                    <WifiHigh
                      size={20}
                      weight="duotone"
                      className={isOnline ? 'text-emerald-500' : 'text-amber-500'}
                    />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Network Status</p>
                    <p className="text-xs text-muted-foreground">
                      {isOnline ? 'Connected to the internet' : 'Currently offline'}
                    </p>
                  </div>
                </div>
                <div
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium',
                    isOnline
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-amber-500/10 text-amber-600'
                  )}
                >
                  {isOnline ? 'Online' : 'Offline'}
                </div>
              </div>

              {/* Install App */}
              {isInstalled ? (
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-emerald-500/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <CheckSquare size={20} weight="duotone" className="text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">App Installed</p>
                      <p className="text-xs text-muted-foreground">
                        You're using the installed version
                      </p>
                    </div>
                  </div>
                  <div className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600">
                    Installed
                  </div>
                </div>
              ) : isInstallable ? (
                <button
                  onClick={() => promptInstall()}
                  className={cn(
                    'w-full flex items-center justify-between p-4 rounded-lg border border-emerald-500/20',
                    'hover:bg-emerald-500/5 transition-colors cursor-pointer text-left'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                      <DeviceMobile size={20} weight="fill" className="text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Install App</p>
                      <p className="text-xs text-muted-foreground">
                        Get faster access and offline support
                      </p>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium">
                    Install
                  </div>
                </button>
              ) : (
                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <DeviceMobile size={20} weight="duotone" className="text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Install App</p>
                      <p className="text-xs text-muted-foreground">
                        {getPlatform() === 'ios'
                          ? 'Tap Share → Add to Home Screen in Safari'
                          : 'Install option not available in this browser'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Usage Section */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <Sparkle size={18} weight="duotone" className="text-primary" />
              AI Assistant Usage
            </h3>
            <AIUsageStats />
          </div>
        </TabsContent>

        {/* Organization Tab */}
        <TabsContent value="organization" className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <Buildings size={18} weight="duotone" className="text-primary" />
              Organization Details
            </h3>

            <div className="space-y-6">
              <div>
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  value={formData.organizationName}
                  onChange={(e) => handleChange('organizationName', e.target.value)}
                  placeholder="e.g., Acme Corp"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label>Organization Type</Label>
                <Select
                  value={formData.organizationType}
                  onValueChange={(value) => handleChange('organizationType', value)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select organization type" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizationTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <Target size={18} weight="duotone" className="text-primary" />
              Organization Stats
            </h3>

            <OrgStats />
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          {showTwoFactorSetup ? (
            <div className="rounded-xl border border-border bg-card p-6">
              <TwoFactorSetup
                onComplete={() => {
                  setShowTwoFactorSetup(false)
                  toast.success('Two-factor authentication enabled successfully!')
                }}
                onCancel={() => setShowTwoFactorSetup(false)}
              />
            </div>
          ) : (
            <TwoFactorStatus onEnableClick={() => setShowTwoFactorSetup(true)} />
          )}

          {/* Password Section */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <Lock size={18} weight="duotone" className="text-primary" />
              Password
            </h3>

            {!showPasswordForm ? (
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Lock size={20} weight="duotone" className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Change Password</p>
                    <p className="text-xs text-muted-foreground">
                      Update your password to keep your account secure
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className={cn(
                    'px-4 py-2 text-sm rounded-lg border border-border',
                    'hover:bg-muted transition-colors cursor-pointer'
                  )}
                >
                  Update
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Current Password */}
                <div>
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))
                      }
                      placeholder="Enter your current password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))
                      }
                      placeholder="Enter your new password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showNewPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Password Requirements */}
                  {passwordData.newPassword.length > 0 && (
                    <div className="mt-3 p-3 rounded-lg bg-muted/50 space-y-1.5">
                      {passwordRequirements.map((req) => (
                        <div key={req.label} className="flex items-center gap-2 text-xs">
                          {req.met ? (
                            <Check size={14} weight="bold" className="text-emerald-500" />
                          ) : (
                            <X size={14} weight="bold" className="text-muted-foreground" />
                          )}
                          <span className={req.met ? 'text-emerald-600' : 'text-muted-foreground'}>
                            {req.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      placeholder="Confirm your new password"
                      className={cn(
                        'pr-10',
                        passwordData.confirmPassword.length > 0 &&
                          !passwordsMatch &&
                          'border-destructive focus-visible:ring-destructive'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {passwordData.confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="mt-1.5 text-xs text-destructive">Passwords do not match</p>
                  )}
                  {passwordsMatch && (
                    <p className="mt-1.5 text-xs text-emerald-600 flex items-center gap-1">
                      <Check size={12} weight="bold" /> Passwords match
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowPasswordForm(false)
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                    }}
                    className={cn(
                      'px-4 py-2 text-sm rounded-lg border border-border',
                      'hover:bg-muted transition-colors cursor-pointer'
                    )}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePasswordChange}
                    disabled={
                      !allRequirementsMet ||
                      !passwordsMatch ||
                      !passwordData.currentPassword ||
                      isChangingPassword
                    }
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 text-sm rounded-lg',
                      'bg-primary text-primary-foreground font-medium',
                      'hover:bg-primary/90 transition-colors cursor-pointer',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {isChangingPassword ? (
                      <>
                        <CircleNotch size={16} className="animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} weight="bold" />
                        Update Password
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sessions Section */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <DeviceMobile size={18} weight="duotone" className="text-primary" />
              Active Sessions
            </h3>

            <div className="p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <DeviceMobile size={20} weight="duotone" className="text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Current Session</p>
                    <p className="text-xs text-muted-foreground">This device - Active now</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600">
                  Current
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4 text-center">
              Session management coming soon. You'll be able to view and revoke active sessions.
            </p>
          </div>

          {/* Data Export Section */}
          <DataExportSection />

          {/* Data Deletion Section */}
          <DataDeletionSection />

          {/* Cookie Preferences Section */}
          <div className="rounded-xl border border-border bg-card p-6">
            <CookiePreferences />
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <Envelope size={18} weight="duotone" className="text-primary" />
              Email Notifications
            </h3>

            <div className="space-y-4">
              <NotificationToggle
                label="Event Updates"
                description="Get notified when events are updated or status changes"
                checked={notifications.emailEventUpdates}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, emailEventUpdates: checked }))
                }
              />
              <NotificationToggle
                label="Vendor Messages"
                description="Receive emails when vendors respond to inquiries"
                checked={notifications.emailVendorMessages}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, emailVendorMessages: checked }))
                }
              />
              <NotificationToggle
                label="Sponsor Messages"
                description="Receive emails when sponsors respond to proposals"
                checked={notifications.emailSponsorMessages}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, emailSponsorMessages: checked }))
                }
              />
              <NotificationToggle
                label="Weekly Digest"
                description="Get a summary of your events and activities each week"
                checked={notifications.emailWeeklyDigest}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, emailWeeklyDigest: checked }))
                }
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <Bell size={18} weight="duotone" className="text-primary" />
              Push Notifications
            </h3>

            <div className="space-y-4">
              <NotificationToggle
                label="Event Reminders"
                description="Get reminded about upcoming events"
                checked={notifications.pushEventReminders}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, pushEventReminders: checked }))
                }
              />
              <NotificationToggle
                label="New Messages"
                description="Get notified when you receive new messages"
                checked={notifications.pushNewMessages}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, pushNewMessages: checked }))
                }
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-muted/50 border border-border text-center">
            <p className="text-sm text-muted-foreground">
              Notification preferences are saved locally for now. Full notification system coming
              soon.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Bottom Spacer for Mobile Save Button */}
      {hasChanges && <div className="h-20 sm:hidden" />}

      {/* Mobile Save Button */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border sm:hidden">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              'w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg',
              'bg-primary text-primary-foreground text-sm font-medium',
              'hover:bg-primary/90 transition-colors cursor-pointer',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <CheckCircle size={16} weight="bold" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  )
}

// Stat Card Component
function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{
    size?: string | number
    weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'
    className?: string
  }>
  label: string
  value: string
}) {
  return (
    <div className="p-4 rounded-lg bg-muted/50 text-center">
      <Icon size={24} weight="duotone" className="text-primary mx-auto mb-2" />
      <p className="text-2xl font-bold font-mono">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

// Notification Toggle Component
function NotificationToggle({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

// Organization Stats Component with real data
function OrgStats() {
  const stats = useQuery(api.events.getMyStats)

  if (stats === undefined) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 rounded-lg bg-muted/50 text-center animate-pulse">
            <div className="h-6 w-6 bg-muted rounded mx-auto mb-2" />
            <div className="h-8 bg-muted rounded w-12 mx-auto mb-1" />
            <div className="h-3 bg-muted rounded w-16 mx-auto" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Calendar} label="Total Events" value={String(stats?.totalEvents ?? 0)} />
        <StatCard icon={Users} label="Total Attendees" value={String(stats?.totalAttendees ?? 0)} />
        <StatCard icon={Buildings} label="Vendors" value={String(stats?.confirmedVendors ?? 0)} />
        <StatCard icon={Target} label="Sponsors" value={String(stats?.confirmedSponsors ?? 0)} />
      </div>

      {stats && stats.totalEvents === 0 && (
        <p className="text-xs text-muted-foreground text-center mt-4">
          Stats will update as you create and manage events
        </p>
      )}
    </>
  )
}

// AI Usage Stats Component
function AIUsageStats() {
  const usage = useQuery(api.aiUsage.getMyUsage)

  if (usage === undefined) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3" />
        <div className="h-2 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-1/4" />
      </div>
    )
  }

  if (usage === null) {
    return (
      <p className="text-sm text-muted-foreground">Sign in to view your AI usage statistics.</p>
    )
  }

  const {
    promptsUsed,
    promptsRemaining,
    dailyLimit,
    totalPrompts,
    status,
    timeUntilReset,
    isAdmin,
  } = usage
  const percentage = Math.min(100, Math.round((promptsUsed / dailyLimit) * 100))

  // Status colors
  const statusColors = {
    normal: { bg: 'bg-emerald-500', text: 'text-emerald-600' },
    warning: { bg: 'bg-amber-500', text: 'text-amber-600' },
    critical: { bg: 'bg-orange-500', text: 'text-orange-600' },
    exceeded: { bg: 'bg-red-500', text: 'text-red-600' },
  }
  const colors = statusColors[status as keyof typeof statusColors] || statusColors.normal

  return (
    <div className="space-y-4">
      {/* Usage Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Today's Usage</span>
          <span className={cn('text-sm font-mono', colors.text)}>
            {isAdmin ? (
              <span className="text-purple-600">Unlimited</span>
            ) : (
              `${promptsUsed} / ${dailyLimit}`
            )}
          </span>
        </div>
        {!isAdmin && (
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', colors.bg)}
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <Lightning size={18} weight="duotone" className="text-primary mx-auto mb-1" />
          <p className="text-lg font-bold font-mono">{isAdmin ? '∞' : promptsRemaining}</p>
          <p className="text-[10px] text-muted-foreground">Remaining</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <Sparkle size={18} weight="duotone" className="text-primary mx-auto mb-1" />
          <p className="text-lg font-bold font-mono">{totalPrompts}</p>
          <p className="text-[10px] text-muted-foreground">All Time</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <Clock size={18} weight="duotone" className="text-primary mx-auto mb-1" />
          <p className="text-lg font-bold font-mono">{timeUntilReset?.formatted || '-'}</p>
          <p className="text-[10px] text-muted-foreground">Until Reset</p>
        </div>
      </div>

      {/* Status Message */}
      {!isAdmin && status === 'exceeded' && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-600">
            You've reached your daily limit. Your quota will reset in {timeUntilReset?.formatted}.
          </p>
        </div>
      )}
      {!isAdmin && status === 'critical' && (
        <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <p className="text-xs text-orange-600">
            You're running low on prompts. {promptsRemaining} remaining today.
          </p>
        </div>
      )}
      {isAdmin && (
        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <p className="text-xs text-purple-600">As an admin, you have unlimited AI access.</p>
        </div>
      )}
    </div>
  )
}

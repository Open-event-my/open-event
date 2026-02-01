import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { cn } from '@/lib/utils'
import {
  Info,
  ShieldCheck,
  Database,
  Users,
  Storefront,
  Handshake,
  Calendar,
  Globe,
  Lock,
  Key,
  Code,
  Gear,
  Sparkle,
  UserPlus,
  Gauge,
  Flag,
  ArrowClockwise,
  FloppyDisk,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

type SettingValue = string | number | boolean | unknown[]

interface Setting {
  _id: string
  key: string
  category: string
  label: string
  description?: string
  value: SettingValue
  valueType: 'string' | 'number' | 'boolean' | 'json'
  defaultValue?: SettingValue
}

export function AdminSettings() {
  const currentUser = useQuery(api.queries.auth.getCurrentUser)
  const isSuperadmin = currentUser?.role === 'superadmin'

  // Platform settings
  const allSettings = useQuery(api.platformSettings.getAll)
  const initializeSettings = useMutation(api.platformSettings.initializeDefaults)
  const updateSetting = useMutation(api.platformSettings.update)
  const resetSetting = useMutation(api.platformSettings.resetToDefault)

  // Track modified settings
  const [modifiedSettings, setModifiedSettings] = useState<Record<string, SettingValue>>({})
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set())

  // Platform stats for the overview
  const users = useQuery(api.admin.listAllUsers, { limit: 1000 })
  const vendors = useQuery(api.vendors.listForAdmin, {})
  const sponsors = useQuery(api.sponsors.listForAdmin, {})

  const stats = {
    totalUsers: users?.length || 0,
    totalAdmins: users?.filter((u: { role?: string }) => u.role === 'admin').length || 0,
    totalOrganizers: users?.filter((u: { role?: string }) => u.role === 'organizer' || !u.role).length || 0,
    suspendedUsers: users?.filter((u: { status?: string }) => u.status === 'suspended').length || 0,
    totalVendors: vendors?.length || 0,
    approvedVendors: vendors?.filter((v: { status: string }) => v.status === 'approved').length || 0,
    pendingVendors: vendors?.filter((v: { status: string }) => v.status === 'pending').length || 0,
    totalSponsors: sponsors?.length || 0,
    approvedSponsors: sponsors?.filter((s: { status: string }) => s.status === 'approved').length || 0,
    pendingSponsors: sponsors?.filter((s: { status: string }) => s.status === 'pending').length || 0,
  }

  // Check if settings are initialized
  const hasSettings = allSettings && Object.keys(allSettings).length > 0

  // Handle initialize settings
  const handleInitializeSettings = async () => {
    try {
      const result = await initializeSettings({})
      toast.success(`Initialized ${result.created} settings (${result.skipped} already existed)`)
    } catch {
      toast.error('Failed to initialize settings')
    }
  }

  // Handle setting value change
  const handleSettingChange = (key: string, value: SettingValue) => {
    setModifiedSettings((prev) => ({ ...prev, [key]: value }))
  }

  // Save a single setting
  const handleSaveSetting = async (key: string) => {
    if (!(key in modifiedSettings)) return

    setSavingKeys((prev) => new Set(prev).add(key))
    try {
      await updateSetting({ key, value: modifiedSettings[key] })
      setModifiedSettings((prev) => {
        const newState = { ...prev }
        delete newState[key]
        return newState
      })
      toast.success(`Setting "${key}" updated`)
    } catch {
      toast.error(`Failed to update setting: ${key}`)
    } finally {
      setSavingKeys((prev) => {
        const newSet = new Set(prev)
        newSet.delete(key)
        return newSet
      })
    }
  }

  // Reset a setting to default
  const handleResetSetting = async (key: string) => {
    setSavingKeys((prev) => new Set(prev).add(key))
    try {
      await resetSetting({ key })
      setModifiedSettings((prev) => {
        const newState = { ...prev }
        delete newState[key]
        return newState
      })
      toast.success(`Setting "${key}" reset to default`)
    } catch {
      toast.error(`Failed to reset setting: ${key}`)
    } finally {
      setSavingKeys((prev) => {
        const newSet = new Set(prev)
        newSet.delete(key)
        return newSet
      })
    }
  }

  // Get current value (modified or saved)
  const getCurrentValue = (setting: Setting): SettingValue => {
    return setting.key in modifiedSettings ? modifiedSettings[setting.key] : setting.value
  }

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ai':
        return <Sparkle size={16} weight="duotone" className="text-purple-500" />
      case 'registration':
        return <UserPlus size={16} weight="duotone" className="text-blue-500" />
      case 'features':
        return <Gear size={16} weight="duotone" className="text-green-500" />
      case 'rateLimit':
        return <Gauge size={16} weight="duotone" className="text-orange-500" />
      case 'moderation':
        return <Flag size={16} weight="duotone" className="text-red-500" />
      default:
        return <Gear size={16} weight="duotone" className="text-muted-foreground" />
    }
  }

  // Render setting input based on type
  const renderSettingInput = (setting: Setting) => {
    const currentValue = getCurrentValue(setting)
    const isModified = setting.key in modifiedSettings
    const isSaving = savingKeys.has(setting.key)

    return (
      <div
        key={setting.key}
        className="flex items-center justify-between py-3 border-b border-border last:border-0"
      >
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2">
            <Label className="font-medium">{setting.label}</Label>
            {isModified && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600">
                Modified
              </span>
            )}
          </div>
          {setting.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {setting.valueType === 'boolean' ? (
            <Switch
              checked={currentValue as boolean}
              onCheckedChange={(checked) => handleSettingChange(setting.key, checked)}
              disabled={isSaving}
            />
          ) : setting.valueType === 'number' ? (
            <Input
              type="number"
              value={currentValue as number}
              onChange={(e) => handleSettingChange(setting.key, Number(e.target.value))}
              className="w-24 text-right"
              disabled={isSaving}
            />
          ) : setting.valueType === 'string' ? (
            <Input
              type="text"
              value={currentValue as string}
              onChange={(e) => handleSettingChange(setting.key, e.target.value)}
              className="w-40"
              disabled={isSaving}
            />
          ) : (
            <span className="text-sm text-muted-foreground">(JSON)</span>
          )}
          {isModified && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleSaveSetting(setting.key)}
              disabled={isSaving}
            >
              <FloppyDisk size={16} />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleResetSetting(setting.key)}
            disabled={isSaving}
            title="Reset to default"
          >
            <ArrowClockwise size={16} />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Admin Settings</h1>
        <p className="text-muted-foreground">Platform configuration and system information</p>
      </div>

      {/* Admin Info Card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <ShieldCheck size={20} weight="duotone" className="text-amber-500" />
            </div>
            <div>
              <h2 className="font-semibold">Your Admin Account</h2>
              <p className="text-sm text-muted-foreground">Current session information</p>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Name</p>
              <p className="font-medium">{currentUser?.name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Email</p>
              <p className="font-medium">{currentUser?.email || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Role</p>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full',
                  isSuperadmin
                    ? 'bg-purple-500/10 text-purple-600'
                    : 'bg-amber-500/10 text-amber-600'
                )}
              >
                <ShieldCheck size={14} weight="duotone" />
                {currentUser?.role || 'organizer'}
              </span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-green-500/10 text-green-600">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Overview */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Database size={20} weight="duotone" className="text-blue-500" />
            </div>
            <div>
              <h2 className="font-semibold">Platform Overview</h2>
              <p className="text-sm text-muted-foreground">Current platform statistics</p>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="grid gap-6 sm:grid-cols-3">
            {/* Users */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Users size={16} weight="duotone" />
                Users
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Users</span>
                  <span className="font-medium">{stats.totalUsers}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Admins</span>
                  <span className="font-medium text-amber-600">{stats.totalAdmins}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Organizers</span>
                  <span className="font-medium text-blue-600">{stats.totalOrganizers}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Suspended</span>
                  <span className="font-medium text-red-600">{stats.suspendedUsers}</span>
                </div>
              </div>
            </div>

            {/* Vendors */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Storefront size={16} weight="duotone" />
                Vendors
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total</span>
                  <span className="font-medium">{stats.totalVendors}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Approved</span>
                  <span className="font-medium text-green-600">{stats.approvedVendors}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Pending</span>
                  <span className="font-medium text-amber-600">{stats.pendingVendors}</span>
                </div>
              </div>
            </div>

            {/* Sponsors */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Handshake size={16} weight="duotone" />
                Sponsors
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total</span>
                  <span className="font-medium">{stats.totalSponsors}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Approved</span>
                  <span className="font-medium text-green-600">{stats.approvedSponsors}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Pending</span>
                  <span className="font-medium text-amber-600">{stats.pendingSponsors}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Settings - Superadmin Only */}
      {isSuperadmin && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Gear size={20} weight="duotone" className="text-purple-500" />
                </div>
                <div>
                  <h2 className="font-semibold">Platform Settings</h2>
                  <p className="text-sm text-muted-foreground">
                    Configure platform-wide settings (Superadmin only)
                  </p>
                </div>
              </div>
              {!hasSettings && (
                <Button onClick={handleInitializeSettings} size="sm">
                  Initialize Defaults
                </Button>
              )}
            </div>
          </div>
          <div className="p-4">
            {!hasSettings ? (
              <div className="text-center py-8 text-muted-foreground">
                <Gear size={48} weight="duotone" className="mx-auto mb-4 opacity-50" />
                <p className="text-sm">No settings configured yet.</p>
                <p className="text-sm">Click "Initialize Defaults" to set up platform settings.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(allSettings).map(([category, settings]) => (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-3">
                      {getCategoryIcon(category)}
                      <h3 className="text-sm font-semibold capitalize">
                        {category === 'rateLimit' ? 'Rate Limiting' : category}
                      </h3>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/20 px-4">
                      {(settings as Setting[]).map(renderSettingInput)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Access Levels */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Lock size={20} weight="duotone" className="text-purple-500" />
            </div>
            <div>
              <h2 className="font-semibold">Access Levels</h2>
              <p className="text-sm text-muted-foreground">Role permissions and capabilities</p>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-4">
            {/* Superadmin */}
            <div className="p-4 rounded-lg border border-border">
              <div className="flex items-center gap-3 mb-3">
                <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-purple-500/10 text-purple-600">
                  Superadmin
                </span>
                <span className="text-xs text-muted-foreground">Highest access level</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Create and manage admin accounts</li>
                <li>• Suspend/unsuspend any user including admins</li>
                <li>• Change user roles</li>
                <li>• All admin permissions</li>
              </ul>
            </div>

            {/* Admin */}
            <div className="p-4 rounded-lg border border-border">
              <div className="flex items-center gap-3 mb-3">
                <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-500/10 text-amber-600">
                  Admin
                </span>
                <span className="text-xs text-muted-foreground">Platform management</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Approve/reject vendor applications</li>
                <li>• Approve/reject sponsor applications</li>
                <li>• Suspend/unsuspend organizers</li>
                <li>• View moderation logs</li>
                <li>• Manage vendor/sponsor inquiries</li>
                <li>• Submit applications on behalf of vendors/sponsors</li>
              </ul>
            </div>

            {/* Organizer */}
            <div className="p-4 rounded-lg border border-border">
              <div className="flex items-center gap-3 mb-3">
                <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-500/10 text-blue-600">
                  Organizer
                </span>
                <span className="text-xs text-muted-foreground">Event management</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Create and manage events</li>
                <li>• Publish events to public directory</li>
                <li>• Review vendor/sponsor applications</li>
                <li>• Send inquiries to vendors/sponsors</li>
                <li>• Manage event vendors and sponsors</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Info size={20} weight="duotone" className="text-green-500" />
            </div>
            <div>
              <h2 className="font-semibold">System Information</h2>
              <p className="text-sm text-muted-foreground">Platform version and configuration</p>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Code size={20} weight="duotone" className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Version</p>
                <p className="font-medium">0.1.0</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Globe size={20} weight="duotone" className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Environment</p>
                <p className="font-medium">Development</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Database size={20} weight="duotone" className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Database</p>
                <p className="font-medium">Convex</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Key size={20} weight="duotone" className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Auth</p>
                <p className="font-medium">Convex Auth</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <h2 className="font-semibold">Quick Links</h2>
        </div>
        <div className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <a
              href="https://dashboard.convex.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <Database size={20} weight="duotone" className="text-orange-500" />
              <span className="text-sm font-medium">Convex Dashboard</span>
            </a>
            <a
              href="https://docs.convex.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <Code size={20} weight="duotone" className="text-blue-500" />
              <span className="text-sm font-medium">Documentation</span>
            </a>
            <a
              href="/events"
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <Globe size={20} weight="duotone" className="text-green-500" />
              <span className="text-sm font-medium">Public Directory</span>
            </a>
            <a
              href="/dashboard"
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <Calendar size={20} weight="duotone" className="text-purple-500" />
              <span className="text-sm font-medium">Organizer Dashboard</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

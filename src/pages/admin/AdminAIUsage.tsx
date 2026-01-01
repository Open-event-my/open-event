import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Sparkle,
  Users,
  Lightning,
  ChartBar,
  Clock,
  MagnifyingGlass,
  CaretUpDown,
  ArrowClockwise,
  Gauge,
  Warning,
  CheckCircle,
  Sliders,
} from '@phosphor-icons/react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type UsageStatus = 'normal' | 'warning' | 'critical' | 'exceeded'
type SortOption = 'promptCount' | 'totalPrompts' | 'updatedAt'

const statusConfig: Record<UsageStatus, { bg: string; text: string; label: string }> = {
  normal: { bg: 'bg-green-500/10', text: 'text-green-600', label: 'Normal' },
  warning: { bg: 'bg-amber-500/10', text: 'text-amber-600', label: 'Warning' },
  critical: { bg: 'bg-orange-500/10', text: 'text-orange-600', label: 'Critical' },
  exceeded: { bg: 'bg-red-500/10', text: 'text-red-600', label: 'At Limit' },
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'totalPrompts', label: 'Total Usage' },
  { value: 'promptCount', label: "Today's Usage" },
  { value: 'updatedAt', label: 'Last Active' },
]

// Helper function to format relative time - placed outside component to avoid purity issues
function formatLastActive(timestamp: number | undefined, now: number): string {
  if (!timestamp) return 'Never'
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export function AdminAIUsage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('totalPrompts')
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<{
    id: Id<'users'>
    name: string
    currentLimit: number
  } | null>(null)
  const [newLimit, setNewLimit] = useState('')

  // Queries
  const analytics = useQuery(api.aiUsage.getUsageAnalytics)
  const usageStats = useQuery(api.aiUsage.getAllUsageStats, { sortBy, limit: 100 })

  // Mutations
  const setUserLimit = useMutation(api.aiUsage.setUserLimit)
  const resetUserUsage = useMutation(api.aiUsage.resetUserUsage)
  const removeCustomLimit = useMutation(api.aiUsage.removeCustomLimit)

  // Filter users by search
  const filteredStats = usageStats?.filter((u) => {
    if (!searchQuery.trim()) return true
    const search = searchQuery.toLowerCase()
    return u.userName?.toLowerCase().includes(search) || u.userEmail?.toLowerCase().includes(search)
  })

  const handleSetLimit = async () => {
    if (!selectedUser || !newLimit) return

    const limit = parseInt(newLimit, 10)
    if (isNaN(limit) || limit < 0 || limit > 1000) {
      toast.error('Limit must be between 0 and 1000')
      return
    }

    try {
      await setUserLimit({ userId: selectedUser.id, dailyLimit: limit })
      toast.success(`Limit updated to ${limit} prompts/day`)
      setShowLimitModal(false)
      setSelectedUser(null)
      setNewLimit('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update limit')
    }
  }

  const handleResetUsage = async () => {
    if (!selectedUser) return

    try {
      await resetUserUsage({ userId: selectedUser.id })
      toast.success('Usage reset successfully')
      setShowResetModal(false)
      setSelectedUser(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reset usage')
    }
  }

  const handleRemoveCustomLimit = async (userId: Id<'users'>, userName: string) => {
    try {
      await removeCustomLimit({ userId })
      toast.success(`Reverted ${userName} to default limit`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove custom limit')
    }
  }

  const openLimitModal = (userId: Id<'users'>, userName: string, currentLimit: number) => {
    setSelectedUser({ id: userId, name: userName, currentLimit })
    setNewLimit(currentLimit.toString())
    setShowLimitModal(true)
  }

  const openResetModal = (userId: Id<'users'>, userName: string, currentLimit: number) => {
    setSelectedUser({ id: userId, name: userName, currentLimit })
    setShowResetModal(true)
  }

  // Use useState with lazy initializer - only evaluated once at mount
  const [now] = useState(() => Date.now())

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold font-mono">AI Usage Monitoring</h1>
        <p className="text-muted-foreground mt-1">
          Monitor AI prompt usage, manage rate limits, and view analytics
        </p>
      </div>

      {/* Analytics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
          <div className="p-3 rounded-xl bg-blue-500/10">
            <Users size={24} weight="duotone" className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{analytics?.totalUsers ?? '-'}</p>
            <p className="text-sm text-muted-foreground">AI Users</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
          <div className="p-3 rounded-xl bg-green-500/10">
            <Lightning size={24} weight="duotone" className="text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{analytics?.activeUsersToday ?? '-'}</p>
            <p className="text-sm text-muted-foreground">Active Today</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
          <div className="p-3 rounded-xl bg-purple-500/10">
            <Sparkle size={24} weight="duotone" className="text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{analytics?.totalPromptsToday ?? '-'}</p>
            <p className="text-sm text-muted-foreground">Prompts Today</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
          <div className="p-3 rounded-xl bg-amber-500/10">
            <Warning size={24} weight="duotone" className="text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{analytics?.usersAtLimit ?? '-'}</p>
            <p className="text-sm text-muted-foreground">At Limit</p>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <ChartBar size={16} weight="duotone" />
            <span className="text-sm">All-Time Prompts</span>
          </div>
          <p className="text-xl font-bold">
            {analytics?.totalPromptsAllTime?.toLocaleString() ?? '-'}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Gauge size={16} weight="duotone" />
            <span className="text-sm">Avg. Prompts/User</span>
          </div>
          <p className="text-xl font-bold">{analytics?.averagePromptsPerUser ?? '-'}</p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Sliders size={16} weight="duotone" />
            <span className="text-sm">Default Limit</span>
          </div>
          <p className="text-xl font-bold">{analytics?.defaultDailyLimit ?? '-'} / day</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass
            size={18}
            weight="bold"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background',
              'text-sm placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary/20'
            )}
          />
        </div>

        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-background',
                'text-sm font-medium hover:bg-muted transition-colors'
              )}
            >
              <CaretUpDown size={16} weight="bold" />
              Sort: {sortOptions.find((o) => o.value === sortBy)?.label}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {sortOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setSortBy(option.value)}
                className={cn(sortBy === option.value && 'bg-muted')}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Usage Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                  User
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Today
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Limit
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Status
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Total
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Last Active
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {!usageStats ? (
                // Loading skeleton
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-4">
                      <div className="h-4 bg-muted rounded w-32" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-muted rounded w-12 mx-auto" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-muted rounded w-12 mx-auto" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-6 bg-muted rounded-full w-16 mx-auto" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-muted rounded w-16 mx-auto" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-muted rounded w-16 mx-auto" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-8 bg-muted rounded w-20 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredStats?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Sparkle
                      size={48}
                      weight="duotone"
                      className="mx-auto text-muted-foreground/30 mb-4"
                    />
                    <p className="text-muted-foreground">
                      {searchQuery ? `No users match "${searchQuery}"` : 'No AI usage data yet'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStats?.map((user) => {
                  const status = statusConfig[user.status as UsageStatus] || statusConfig.normal
                  const isAdmin = user.userRole === 'admin' || user.userRole === 'superadmin'

                  return (
                    <tr key={user.userId} className="hover:bg-muted/30 transition-colors">
                      {/* User */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-primary">
                              {(user.userName || 'U')[0].toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">
                              {user.userName || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.userEmail}
                            </p>
                          </div>
                          {isAdmin && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-600 rounded">
                              {user.userRole}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Today Usage */}
                      <td className="px-4 py-4 text-center">
                        <span className="font-mono font-medium">
                          {isAdmin ? '∞' : user.todayUsage}
                        </span>
                      </td>

                      {/* Limit */}
                      <td className="px-4 py-4 text-center">
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className={cn(
                                  'font-mono',
                                  user.dailyLimit !== (analytics?.defaultDailyLimit ?? 5) &&
                                    'text-purple-600 font-medium'
                                )}
                              >
                                {isAdmin ? '∞' : user.dailyLimit}
                              </span>
                            </TooltipTrigger>
                            {user.dailyLimit !== (analytics?.defaultDailyLimit ?? 5) && (
                              <TooltipContent>
                                <p>Custom limit (default: {analytics?.defaultDailyLimit})</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 text-center">
                        {isAdmin ? (
                          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-purple-500/10 text-purple-600">
                            Unlimited
                          </span>
                        ) : (
                          <span
                            className={cn(
                              'px-2.5 py-1 text-xs font-medium rounded-full',
                              status.bg,
                              status.text
                            )}
                          >
                            {status.label}
                          </span>
                        )}
                      </td>

                      {/* Total */}
                      <td className="px-4 py-4 text-center">
                        <span className="font-mono text-sm">
                          {user.totalPrompts.toLocaleString()}
                        </span>
                      </td>

                      {/* Last Active */}
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm text-muted-foreground">
                          {formatLastActive(user.lastUsedAt, now)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 text-right">
                        {!isAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className={cn(
                                  'px-3 py-1.5 rounded-lg text-xs font-medium',
                                  'bg-muted hover:bg-muted/80 transition-colors'
                                )}
                              >
                                Manage
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() =>
                                  openLimitModal(user.userId, user.userName, user.dailyLimit)
                                }
                              >
                                <Sliders size={14} className="mr-2" />
                                Set Daily Limit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  openResetModal(user.userId, user.userName, user.dailyLimit)
                                }
                              >
                                <ArrowClockwise size={14} className="mr-2" />
                                Reset Today's Usage
                              </DropdownMenuItem>
                              {user.dailyLimit !== (analytics?.defaultDailyLimit ?? 5) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleRemoveCustomLimit(user.userId, user.userName)
                                    }
                                    className="text-amber-600"
                                  >
                                    <ArrowClockwise size={14} className="mr-2" />
                                    Revert to Default
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Configuration Info */}
      <div className="p-4 rounded-xl border border-border bg-muted/30">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Clock size={16} weight="duotone" className="text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">Rate Limit Configuration</p>
            <p className="text-xs text-muted-foreground mt-1">
              Users are limited to <strong>{analytics?.defaultDailyLimit ?? 5}</strong> prompts per
              day. Limits reset at <strong>midnight UTC</strong>. Warning shown at{' '}
              {(analytics?.config?.WARNING_THRESHOLD ?? 0.6) * 100}% usage, critical at{' '}
              {(analytics?.config?.CRITICAL_THRESHOLD ?? 0.9) * 100}%.
            </p>
          </div>
        </div>
      </div>

      {/* Set Limit Modal */}
      <Dialog open={showLimitModal} onOpenChange={setShowLimitModal}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sliders size={20} weight="duotone" className="text-primary" />
              </div>
              <DialogTitle>Set Daily Limit</DialogTitle>
            </div>
            <DialogDescription>
              Set a custom daily prompt limit for <strong>{selectedUser?.name}</strong>. Current
              limit: {selectedUser?.currentLimit} prompts/day.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="block text-sm font-medium mb-1.5">New Daily Limit</label>
            <input
              type="number"
              min="0"
              max="1000"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              placeholder="Enter limit (0-1000)"
              className={cn(
                'w-full px-3 py-2.5 rounded-lg border border-border bg-background',
                'text-sm placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-primary/20'
              )}
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Set to 0 to block all AI access. Default is {analytics?.defaultDailyLimit ?? 5}.
            </p>
          </div>

          <DialogFooter>
            <button
              onClick={() => setShowLimitModal(false)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSetLimit}
              disabled={!newLimit || parseInt(newLimit) < 0 || parseInt(newLimit) > 1000}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium',
                'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              Update Limit
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Usage Modal */}
      <Dialog open={showResetModal} onOpenChange={setShowResetModal}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-green-500/10">
                <ArrowClockwise size={20} weight="duotone" className="text-green-600" />
              </div>
              <DialogTitle>Reset Usage</DialogTitle>
            </div>
            <DialogDescription>
              Reset today's prompt count for <strong>{selectedUser?.name}</strong>? This will
              restore their daily quota to {selectedUser?.currentLimit ?? 5} prompts.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <button
              onClick={() => setShowResetModal(false)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleResetUsage}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              <CheckCircle size={16} weight="bold" className="inline mr-1.5" />
              Reset Usage
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

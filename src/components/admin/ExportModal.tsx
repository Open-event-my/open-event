/**
 * Export Modal Component
 *
 * Provides UI for bulk data export with format selection and filtering.
 * Supports CSV and JSON formats for users, vendors, sponsors, events, and moderation logs.
 */

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Download, Spinner, FileJs, FileCsv } from '@phosphor-icons/react'

type ExportType = 'users' | 'vendors' | 'sponsors' | 'events' | 'moderationLogs'
type ExportFormat = 'json' | 'csv'

interface ExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  exportType: ExportType
}

const exportTypeLabels: Record<ExportType, string> = {
  users: 'Users',
  vendors: 'Vendors',
  sponsors: 'Sponsors',
  events: 'Events',
  moderationLogs: 'Moderation Logs',
}

export function ExportModal({ open, onOpenChange, exportType }: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [isExporting, setIsExporting] = useState(false)

  // Filter states - use "all" instead of empty string to avoid Select.Item value error
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [industryFilter, setIndustryFilter] = useState<string>('')
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  // Build filters for users
  const buildUserFilters = () => {
    const filters: {
      role?: 'admin' | 'organizer' | 'superadmin'
      status?: 'active' | 'suspended' | 'pending'
      createdAfter?: number
      createdBefore?: number
    } = {}
    if (dateFrom) filters.createdAfter = new Date(dateFrom).getTime()
    if (dateTo) filters.createdBefore = new Date(dateTo).getTime()
    if (roleFilter && roleFilter !== 'all')
      filters.role = roleFilter as 'admin' | 'organizer' | 'superadmin'
    if (statusFilter && statusFilter !== 'all')
      filters.status = statusFilter as 'active' | 'suspended' | 'pending'
    return Object.keys(filters).length > 0 ? filters : undefined
  }

  // Build filters for vendors
  const buildVendorFilters = () => {
    const filters: {
      category?: string
      status?: string
      createdAfter?: number
      createdBefore?: number
    } = {}
    if (dateFrom) filters.createdAfter = new Date(dateFrom).getTime()
    if (dateTo) filters.createdBefore = new Date(dateTo).getTime()
    if (categoryFilter) filters.category = categoryFilter
    if (statusFilter && statusFilter !== 'all') filters.status = statusFilter
    return Object.keys(filters).length > 0 ? filters : undefined
  }

  // Build filters for sponsors
  const buildSponsorFilters = () => {
    const filters: {
      industry?: string
      status?: string
      createdAfter?: number
      createdBefore?: number
    } = {}
    if (dateFrom) filters.createdAfter = new Date(dateFrom).getTime()
    if (dateTo) filters.createdBefore = new Date(dateTo).getTime()
    if (industryFilter) filters.industry = industryFilter
    if (statusFilter && statusFilter !== 'all') filters.status = statusFilter
    return Object.keys(filters).length > 0 ? filters : undefined
  }

  // Build filters for events
  const buildEventFilters = () => {
    const filters: {
      status?: string
      eventType?: string
      createdAfter?: number
      createdBefore?: number
    } = {}
    if (dateFrom) filters.createdAfter = new Date(dateFrom).getTime()
    if (dateTo) filters.createdBefore = new Date(dateTo).getTime()
    if (statusFilter && statusFilter !== 'all') filters.status = statusFilter
    if (eventTypeFilter) filters.eventType = eventTypeFilter
    return Object.keys(filters).length > 0 ? filters : undefined
  }

  // Build filters for moderation logs
  const buildModerationFilters = () => {
    const filters: {
      action?: string
      targetType?: string
      createdAfter?: number
      createdBefore?: number
    } = {}
    if (dateFrom) filters.createdAfter = new Date(dateFrom).getTime()
    if (dateTo) filters.createdBefore = new Date(dateTo).getTime()
    if (actionFilter && actionFilter !== 'all') filters.action = actionFilter
    if (targetTypeFilter && targetTypeFilter !== 'all') filters.targetType = targetTypeFilter
    return Object.keys(filters).length > 0 ? filters : undefined
  }

  // Query based on export type
  const usersData = useQuery(
    api.exports.exportUsers,
    exportType === 'users' && open ? { format, filters: buildUserFilters() } : 'skip'
  )

  const vendorsData = useQuery(
    api.exports.exportVendors,
    exportType === 'vendors' && open ? { format, filters: buildVendorFilters() } : 'skip'
  )

  const sponsorsData = useQuery(
    api.exports.exportSponsors,
    exportType === 'sponsors' && open ? { format, filters: buildSponsorFilters() } : 'skip'
  )

  const eventsData = useQuery(
    api.exports.exportEvents,
    exportType === 'events' && open ? { format, filters: buildEventFilters() } : 'skip'
  )

  const moderationLogsData = useQuery(
    api.exports.exportModerationLogs,
    exportType === 'moderationLogs' && open ? { format, filters: buildModerationFilters() } : 'skip'
  )

  const getData = () => {
    switch (exportType) {
      case 'users':
        return usersData
      case 'vendors':
        return vendorsData
      case 'sponsors':
        return sponsorsData
      case 'events':
        return eventsData
      case 'moderationLogs':
        return moderationLogsData
      default:
        return null
    }
  }

  const data = getData()
  const isLoading = data === undefined

  const handleExport = () => {
    if (!data) return

    setIsExporting(true)

    try {
      const blob = new Blob([data.data], {
        type: format === 'json' ? 'application/json' : 'text/csv',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${exportType}-export-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      onOpenChange(false)
    } finally {
      setIsExporting(false)
    }
  }

  const resetFilters = () => {
    setRoleFilter('all')
    setStatusFilter('all')
    setCategoryFilter('')
    setIndustryFilter('')
    setEventTypeFilter('')
    setActionFilter('all')
    setTargetTypeFilter('all')
    setDateFrom('')
    setDateTo('')
  }

  const renderFilters = () => {
    switch (exportType) {
      case 'users':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    <SelectItem value="organizer">Organizer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="superadmin">Superadmin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )

      case 'vendors':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  placeholder="Filter by category..."
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )

      case 'sponsors':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Industry</Label>
                <Input
                  placeholder="Filter by industry..."
                  value={industryFilter}
                  onChange={(e) => setIndustryFilter(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )

      case 'events':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Event Type</Label>
                <Input
                  placeholder="Filter by event type..."
                  value={eventTypeFilter}
                  onChange={(e) => setEventTypeFilter(e.target.value)}
                />
              </div>
            </div>
          </>
        )

      case 'moderationLogs':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Action</Label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    <SelectItem value="user_suspended">User Suspended</SelectItem>
                    <SelectItem value="user_unsuspended">User Unsuspended</SelectItem>
                    <SelectItem value="user_role_changed">Role Changed</SelectItem>
                    <SelectItem value="event_flagged">Event Flagged</SelectItem>
                    <SelectItem value="event_unflagged">Event Unflagged</SelectItem>
                    <SelectItem value="event_removed">Event Removed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Type</Label>
                <Select value={targetTypeFilter} onValueChange={setTargetTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                    <SelectItem value="sponsor">Sponsor</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download size={20} />
            Export {exportTypeLabels[exportType]}
          </DialogTitle>
          <DialogDescription>
            Choose your export format and apply filters to customize the data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={format === 'csv' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setFormat('csv')}
              >
                <FileCsv size={18} className="mr-2" />
                CSV
              </Button>
              <Button
                type="button"
                variant={format === 'json' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setFormat('json')}
              >
                <FileJs size={18} className="mr-2" />
                JSON
              </Button>
            </div>
          </div>

          {/* Type-specific Filters */}
          {renderFilters()}

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Created From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Created To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>

          {/* Preview Count */}
          {data && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <span className="font-medium">{data.count}</span> records will be exported
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={resetFilters}>
            Reset Filters
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            disabled={isLoading || isExporting || !data || data.count === 0}
          >
            {isLoading || isExporting ? (
              <>
                <Spinner size={18} className="mr-2 animate-spin" />
                {isLoading ? 'Loading...' : 'Exporting...'}
              </>
            ) : (
              <>
                <Download size={18} className="mr-2" />
                Download {format.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

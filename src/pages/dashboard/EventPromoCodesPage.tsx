/**
 * Event Promo Codes Page
 * Manage discount codes for an event
 */

import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  ArrowLeft,
  Plus,
  PencilSimple,
  Trash,
  DotsThreeVertical,
  Tag,
  Percent,
  CurrencyDollar,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  Users,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface PromoCode {
  _id: Id<'promoCodes'>
  code: string
  description?: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  maxUses?: number
  usedCount: number
  maxUsesPerEmail?: number
  minOrderAmount?: number
  validFrom?: number
  validUntil?: number
  isActive: boolean
  createdAt: number
}

interface PromoFormData {
  code: string
  description: string
  discountType: 'percentage' | 'fixed'
  discountValue: string
  maxUses: string
  maxUsesPerEmail: string
  minOrderAmount: string
  validFrom: string
  validUntil: string
  isActive: boolean
}

const defaultFormData: PromoFormData = {
  code: '',
  description: '',
  discountType: 'percentage',
  discountValue: '',
  maxUses: '',
  maxUsesPerEmail: '',
  minOrderAmount: '',
  validFrom: '',
  validUntil: '',
  isActive: true,
}

export function EventPromoCodesPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [showModal, setShowModal] = useState(false)
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null)
  const [formData, setFormData] = useState<PromoFormData>(defaultFormData)
  const [saving, setSaving] = useState(false)

  const event = useQuery(api.events.get, eventId ? { id: eventId as Id<'events'> } : 'skip')
  const promoCodes = useQuery(
    api.promoCodes.getByOrganizer,
    eventId ? { eventId: eventId as Id<'events'> } : 'skip'
  )

  const createPromoCode = useMutation(api.promoCodes.create)
  const updatePromoCode = useMutation(api.promoCodes.update)
  const removePromoCode = useMutation(api.promoCodes.remove)

  if (!event) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData({ ...formData, code })
  }

  const handleOpenModal = (promoCode?: PromoCode) => {
    if (promoCode) {
      setEditingCode(promoCode)
      setFormData({
        code: promoCode.code,
        description: promoCode.description || '',
        discountType: promoCode.discountType,
        discountValue:
          promoCode.discountType === 'percentage'
            ? promoCode.discountValue.toString()
            : (promoCode.discountValue / 100).toString(),
        maxUses: promoCode.maxUses?.toString() || '',
        maxUsesPerEmail: promoCode.maxUsesPerEmail?.toString() || '',
        minOrderAmount: promoCode.minOrderAmount ? (promoCode.minOrderAmount / 100).toString() : '',
        validFrom: promoCode.validFrom
          ? new Date(promoCode.validFrom).toISOString().slice(0, 16)
          : '',
        validUntil: promoCode.validUntil
          ? new Date(promoCode.validUntil).toISOString().slice(0, 16)
          : '',
        isActive: promoCode.isActive,
      })
    } else {
      setEditingCode(null)
      setFormData(defaultFormData)
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingCode(null)
    setFormData(defaultFormData)
  }

  const handleSubmit = async () => {
    if (!formData.code.trim()) {
      toast.error('Please enter a promo code')
      return
    }

    const discountValue = parseFloat(formData.discountValue)
    if (isNaN(discountValue) || discountValue <= 0) {
      toast.error('Please enter a valid discount value')
      return
    }

    if (formData.discountType === 'percentage' && discountValue > 100) {
      toast.error('Percentage discount cannot exceed 100%')
      return
    }

    setSaving(true)
    try {
      const data = {
        code: formData.code.toUpperCase().trim(),
        description: formData.description.trim() || undefined,
        discountType: formData.discountType,
        discountValue:
          formData.discountType === 'percentage' ? discountValue : Math.round(discountValue * 100), // Convert to cents for fixed
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : undefined,
        maxUsesPerEmail: formData.maxUsesPerEmail ? parseInt(formData.maxUsesPerEmail) : undefined,
        minOrderAmount: formData.minOrderAmount
          ? Math.round(parseFloat(formData.minOrderAmount) * 100)
          : undefined,
        validFrom: formData.validFrom ? new Date(formData.validFrom).getTime() : undefined,
        validUntil: formData.validUntil ? new Date(formData.validUntil).getTime() : undefined,
        isActive: formData.isActive,
      }

      if (editingCode) {
        await updatePromoCode({ id: editingCode._id, ...data })
        toast.success('Promo code updated')
      } else {
        await createPromoCode({ eventId: eventId as Id<'events'>, ...data })
        toast.success('Promo code created')
      }

      handleCloseModal()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save promo code')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (promoCode: PromoCode) => {
    if (promoCode.usedCount > 0) {
      toast.error('Cannot delete promo code that has been used. Deactivate it instead.')
      return
    }

    if (!confirm(`Are you sure you want to delete "${promoCode.code}"?`)) {
      return
    }

    try {
      await removePromoCode({ id: promoCode._id })
      toast.success('Promo code deleted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete promo code')
    }
  }

  const handleToggleActive = async (promoCode: PromoCode) => {
    try {
      await updatePromoCode({ id: promoCode._id, isActive: !promoCode.isActive })
      toast.success(promoCode.isActive ? 'Promo code deactivated' : 'Promo code activated')
    } catch {
      toast.error('Failed to update promo code')
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('Code copied to clipboard')
  }

  const getPromoStatus = (promo: PromoCode) => {
    const now = Date.now()

    if (!promo.isActive) {
      return {
        label: 'Inactive',
        color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
        icon: XCircle,
      }
    }

    if (promo.validFrom && now < promo.validFrom) {
      return {
        label: 'Scheduled',
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        icon: Clock,
      }
    }

    if (promo.validUntil && now > promo.validUntil) {
      return {
        label: 'Expired',
        color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        icon: Clock,
      }
    }

    if (promo.maxUses && promo.usedCount >= promo.maxUses) {
      return {
        label: 'Exhausted',
        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        icon: XCircle,
      }
    }

    return {
      label: 'Active',
      color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      icon: CheckCircle,
    }
  }

  const totalCodes = promoCodes?.length || 0
  const activeCodes = promoCodes?.filter((p) => p.isActive).length || 0
  const totalUses = promoCodes?.reduce((sum, p) => sum + p.usedCount, 0) || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={`/dashboard/events/${eventId}`}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">Promo Codes</h1>
            <p className="text-muted-foreground text-sm">{event.title}</p>
          </div>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus size={16} className="mr-2" />
          Create Promo Code
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Tag size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Codes</p>
              <p className="text-2xl font-bold">{totalCodes}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Codes</p>
              <p className="text-2xl font-bold">{activeCodes}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Users size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Uses</p>
              <p className="text-2xl font-bold">{totalUses}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Promo Codes List */}
      <div className="bg-card border rounded-xl">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Discount Codes</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage promotional discount codes
          </p>
        </div>

        {!promoCodes?.length ? (
          <div className="p-8 text-center">
            <Tag size={48} className="mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-1">No promo codes yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create discount codes to offer special pricing to your attendees
            </p>
            <Button onClick={() => handleOpenModal()}>
              <Plus size={16} className="mr-2" />
              Create Promo Code
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {promoCodes.map((promo) => {
              const status = getPromoStatus(promo)
              const StatusIcon = status.icon

              return (
                <div
                  key={promo._id}
                  className={cn(
                    'p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors',
                    !promo.isActive && 'opacity-60'
                  )}
                >
                  <div className="p-2 rounded-lg bg-muted">
                    {promo.discountType === 'percentage' ? (
                      <Percent size={20} className="text-muted-foreground" />
                    ) : (
                      <CurrencyDollar size={20} className="text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-mono font-bold">{promo.code}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyCode(promo.code)}
                      >
                        <Copy size={14} />
                      </Button>
                    </div>
                    {promo.description && (
                      <p className="text-sm text-muted-foreground truncate">{promo.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>
                        {promo.discountType === 'percentage'
                          ? `${promo.discountValue}% off`
                          : `${formatCurrency(promo.discountValue / 100, 'USD')} off`}
                      </span>
                      <span>
                        {promo.usedCount} / {promo.maxUses || '∞'} used
                      </span>
                      {promo.validUntil && <span>Expires {formatDate(promo.validUntil)}</span>}
                    </div>
                  </div>

                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full',
                      status.color
                    )}
                  >
                    <StatusIcon size={12} weight="bold" />
                    {status.label}
                  </span>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <DotsThreeVertical size={16} weight="bold" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenModal(promo)}>
                        <PencilSimple size={14} className="mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyCode(promo.code)}>
                        <Copy size={14} className="mr-2" />
                        Copy Code
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(promo)}>
                        {promo.isActive ? (
                          <>
                            <XCircle size={14} className="mr-2" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <CheckCircle size={14} className="mr-2" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(promo)}
                        className="text-destructive"
                        disabled={promo.usedCount > 0}
                      >
                        <Trash size={14} className="mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCode ? 'Edit Promo Code' : 'Create Promo Code'}</DialogTitle>
            <DialogDescription>
              {editingCode
                ? 'Update the promo code settings below'
                : 'Create a new discount code for your event'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  placeholder="e.g. SUMMER20"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  disabled={!!editingCode}
                  className="font-mono"
                />
                {!editingCode && (
                  <Button type="button" variant="outline" onClick={generateCode}>
                    Generate
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Letters, numbers, hyphens, and underscores only
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="e.g. Summer sale discount"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select
                  value={formData.discountType}
                  onValueChange={(value: 'percentage' | 'fixed') =>
                    setFormData({ ...formData, discountType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discountValue">
                  {formData.discountType === 'percentage' ? 'Discount %' : 'Discount Amount'} *
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {formData.discountType === 'percentage' ? '%' : '$'}
                  </span>
                  <Input
                    id="discountValue"
                    type="number"
                    min="0"
                    max={formData.discountType === 'percentage' ? '100' : undefined}
                    step={formData.discountType === 'percentage' ? '1' : '0.01'}
                    placeholder="0"
                    className="pl-7"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxUses">Max Total Uses</Label>
                <Input
                  id="maxUses"
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxUsesPerEmail">Max Uses Per Customer</Label>
                <Input
                  id="maxUsesPerEmail"
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={formData.maxUsesPerEmail}
                  onChange={(e) => setFormData({ ...formData, maxUsesPerEmail: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minOrderAmount">Minimum Order Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="minOrderAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="No minimum"
                  className="pl-7"
                  value={formData.minOrderAmount}
                  onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="validFrom">Valid From</Label>
                <Input
                  id="validFrom"
                  type="datetime-local"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="validUntil">Valid Until</Label>
                <Input
                  id="validUntil"
                  type="datetime-local"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">
                  Only active codes can be used at checkout
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : editingCode ? 'Save Changes' : 'Create Code'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

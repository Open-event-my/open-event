import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { cn } from '@/lib/utils'
import { Buildings, CaretUpDown, Check, Plus } from '@phosphor-icons/react'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { CreateOrganizationModal } from '@/components/organizations'
import { useNavigate } from 'react-router-dom'

interface OrganizationSwitcherProps {
  collapsed?: boolean
}

export function OrganizationSwitcher({ collapsed }: OrganizationSwitcherProps) {
  const { accessToken } = useAuth()
  const navigate = useNavigate()
  const profile = useQuery(
    api.organizerProfiles.getMyProfile,
    accessToken ? { accessToken } : 'skip'
  )
  const [open, setOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Get organization name from profile or use default
  const orgName = profile?.organizationName || 'My Workspace'
  const orgInitial = orgName.charAt(0).toUpperCase()

  if (collapsed) {
    return (
      <button
        className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center',
          'bg-primary/10 text-primary font-semibold text-sm',
          'hover:bg-primary/20 transition-colors cursor-pointer'
        )}
        title={orgName}
      >
        {orgInitial}
      </button>
    )
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center gap-3 p-2 rounded-lg',
          'hover:bg-muted transition-colors cursor-pointer',
          open && 'bg-muted'
        )}
      >
        {/* Org Icon */}
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-primary font-semibold text-sm">{orgInitial}</span>
        </div>

        {/* Org Name */}
        <div className="flex-1 min-w-0 text-left">
          <p className="font-medium text-sm truncate">{orgName}</p>
          <p className="text-xs text-muted-foreground">Free plan</p>
        </div>

        {/* Caret */}
        <CaretUpDown size={14} className="text-muted-foreground flex-shrink-0" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-lg py-1 z-50 menu-entrance">
          {/* Current org */}
          <div className="px-2 py-1">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold text-sm">{orgInitial}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{orgName}</p>
                <p className="text-xs text-muted-foreground">Current workspace</p>
              </div>
              <Check size={16} className="text-primary flex-shrink-0" />
            </div>
          </div>

          <div className="h-px bg-border my-1" />

          {/* Create new org */}
          <button
            onClick={() => {
              setOpen(false)
              setCreateModalOpen(true)
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>Create workspace</span>
          </button>

          {/* Manage organizations */}
          <button
            onClick={() => {
              setOpen(false)
              navigate('/dashboard/settings?tab=organizations')
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <Buildings size={16} />
            <span>Manage workspaces</span>
          </button>
        </div>
      )}

      <CreateOrganizationModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={(_organizationId, slug) => {
          navigate(`/dashboard/organizations/${slug}`)
        }}
      />
    </div>
  )
}

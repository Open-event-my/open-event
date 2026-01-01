import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DotsThree,
  UserCircle,
  Crown,
  ShieldCheck,
  Briefcase,
  User,
  Eye,
  SignOut,
  CaretUp,
  CaretDown,
  Trash,
  CircleNotch,
} from '@phosphor-icons/react'

interface TeamMembersListProps {
  organizationId: Id<'organizations'>
  currentUserRole: string
}

const ROLE_CONFIG = {
  owner: { label: 'Owner', icon: Crown, color: 'text-amber-500' },
  admin: { label: 'Admin', icon: ShieldCheck, color: 'text-purple-500' },
  manager: { label: 'Manager', icon: Briefcase, color: 'text-blue-500' },
  member: { label: 'Member', icon: User, color: 'text-green-500' },
  viewer: { label: 'Viewer', icon: Eye, color: 'text-muted-foreground' },
} as const

const ROLE_ORDER = ['owner', 'admin', 'manager', 'member', 'viewer'] as const

export function TeamMembersList({ organizationId, currentUserRole }: TeamMembersListProps) {
  const members = useQuery(api.organizations.listMembers, { organizationId })
  const updateMemberRole = useMutation(api.organizations.updateMemberRole)
  const removeMember = useMutation(api.organizations.removeMember)

  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [memberToRemove, setMemberToRemove] = useState<{
    id: Id<'organizationMembers'>
    name: string
  } | null>(null)

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin'
  const isOwner = currentUserRole === 'owner'

  const handleRoleChange = async (
    memberId: Id<'organizationMembers'>,
    newRole: 'admin' | 'manager' | 'member' | 'viewer'
  ) => {
    setActionInProgress(memberId)
    try {
      await updateMemberRole({ memberId, role: newRole })
      toast.success('Role updated successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update role')
    } finally {
      setActionInProgress(null)
    }
  }

  const handleRemoveMember = async () => {
    if (!memberToRemove) return

    setActionInProgress(memberToRemove.id)
    try {
      await removeMember({ memberId: memberToRemove.id })
      toast.success('Member removed successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove member')
    } finally {
      setActionInProgress(null)
      setMemberToRemove(null)
    }
  }

  if (!members) {
    return (
      <div className="flex items-center justify-center py-8">
        <CircleNotch size={24} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <UserCircle size={48} className="mx-auto mb-2 opacity-50" />
        <p>No team members yet</p>
      </div>
    )
  }

  // Sort members by role hierarchy
  const sortedMembers = [...members].sort((a, b) => {
    const aIndex = ROLE_ORDER.indexOf(a.role as (typeof ROLE_ORDER)[number])
    const bIndex = ROLE_ORDER.indexOf(b.role as (typeof ROLE_ORDER)[number])
    return aIndex - bIndex
  })

  return (
    <>
      <div className="divide-y divide-border rounded-lg border border-border">
        {sortedMembers.map((member) => {
          const roleConfig = ROLE_CONFIG[member.role as keyof typeof ROLE_CONFIG]
          const RoleIcon = roleConfig?.icon || User
          const isProcessing = actionInProgress === member._id

          return (
            <div
              key={member._id}
              className={cn(
                'flex items-center justify-between p-4 transition-colors',
                isProcessing && 'opacity-50'
              )}
            >
              <div className="flex items-center gap-3">
                {member.user?.image ? (
                  <img
                    src={member.user.image}
                    alt={member.user.name || 'Member'}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {(member.user?.name || member.user?.email || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                <div>
                  <div className="font-medium text-sm">{member.user?.name || 'Unknown User'}</div>
                  <div className="text-xs text-muted-foreground">{member.user?.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={cn('flex items-center gap-1.5 text-xs', roleConfig?.color)}>
                  <RoleIcon size={14} weight="duotone" />
                  <span>{roleConfig?.label || member.role}</span>
                </div>

                {canManageMembers && member.role !== 'owner' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <DotsThree size={16} weight="bold" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {isOwner && (
                        <>
                          <DropdownMenuItem onClick={() => handleRoleChange(member._id, 'admin')}>
                            <CaretUp size={14} className="mr-2" />
                            Make Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRoleChange(member._id, 'manager')}>
                            <Briefcase size={14} className="mr-2" />
                            Make Manager
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRoleChange(member._id, 'member')}>
                            <User size={14} className="mr-2" />
                            Make Member
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRoleChange(member._id, 'viewer')}>
                            <CaretDown size={14} className="mr-2" />
                            Make Viewer
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem
                        onClick={() =>
                          setMemberToRemove({
                            id: member._id,
                            name: member.user?.name || member.user?.email || 'this member',
                          })
                        }
                        className="text-destructive focus:text-destructive"
                      >
                        <SignOut size={14} className="mr-2" />
                        Remove from team
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{memberToRemove?.name}</strong> from this
              organization? They will lose access to all organization content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash size={14} className="mr-2" />
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

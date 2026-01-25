import type { QueryCtx, MutationCtx } from '../../_generated/server'
import { assertRole as assertRoleAuth, getCurrentUser } from '../auth'
import type { Doc } from '../../_generated/dataModel'

// Re-export assertRole
export const assertRole = assertRoleAuth

export type AuthenticatedCtx<Ctx extends QueryCtx | MutationCtx> = Ctx & { user: Doc<'users'> }

/**
 * Middleware to ensure user is authenticated before executing the handler.
 */
export function withAuth<Args, Output>(
  handler: (ctx: AuthenticatedCtx<QueryCtx | MutationCtx>, args: Args) => Promise<Output>
) {
  return async (ctx: QueryCtx | MutationCtx, args: Args) => {
    const user = await getCurrentUser(ctx)
    if (!user) {
      throw new Error('Authentication required')
    }
    return handler({ ...ctx, user } as AuthenticatedCtx<typeof ctx>, args)
  }
}

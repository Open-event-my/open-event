/**
 * Metrics Integration Example
 *
 * This file demonstrates how to integrate metrics collection into Convex endpoints.
 * Use this as a reference when adding metrics to other files.
 *
 * NOTE: This is an EXAMPLE file showing patterns. The actual query/mutation
 * definitions should be in the root convex/ directory, not in lib/.
 *
 * Key endpoints that should have metrics:
 * - convex/events.ts (list, get, create, update, delete)
 * - convex/vendors.ts (list, get, create, approve, reject)
 * - convex/sponsors.ts (list, get, create, approve, reject)
 * - convex/users.ts (list, get, create, update)
 * - convex/orders.ts (list, get, create, update)
 * - convex/attendees.ts (list, get, create, update, checkIn)
 * - convex/auth.ts (signIn, signUp, signOut)
 * - convex/organizations.ts (list, get, create, update)
 */

import { withQueryMetrics, withMutationMetrics, withDatabaseMetrics } from './metricsMiddleware'

// Re-export the middleware functions for use in other files
export { withQueryMetrics, withMutationMetrics, withDatabaseMetrics }

/**
 * Integration Checklist
 *
 * When adding metrics to a file in the root convex/ directory:
 *
 * 1. Import the middleware functions:
 *    import { withQueryMetrics, withMutationMetrics, withDatabaseMetrics } from './lib/monitoring/metricsMiddleware';
 *
 * 2. Wrap query handlers:
 *    handler: withQueryMetrics('table:operation', async (ctx, args) => { ... })
 *
 * 3. Wrap mutation handlers:
 *    handler: withMutationMetrics('table:operation', async (ctx, args) => { ... })
 *
 * 4. Wrap expensive database queries:
 *    await withDatabaseMetrics(() => ctx.db.query(...), { queryType: 'read', table: 'tableName' })
 *
 * 5. Use consistent naming:
 *    - Format: 'table:operation'
 *    - Examples: 'events:list', 'vendors:create', 'users:update'
 *
 * 6. Test the integration:
 *    - Call the endpoint
 *    - Check that metrics are recorded
 *    - Verify response times are reasonable
 */

/**
 * Example Usage (to be placed in root convex/ files):
 *
 * ```typescript
 * // In convex/vendors.ts
 * import { query, mutation } from './_generated/server';
 * import { withQueryMetrics, withMutationMetrics, withDatabaseMetrics } from './lib/monitoring/metricsMiddleware';
 *
 * export const list = query({
 *   args: { category: v.optional(v.string()) },
 *   handler: withQueryMetrics('vendors:list', async (ctx, args) => {
 *     const items = await withDatabaseMetrics(
 *       () => ctx.db.query('vendors').collect(),
 *       { queryType: 'read', table: 'vendors' }
 *     );
 *     return items;
 *   }),
 * });
 *
 * export const create = mutation({
 *   args: { name: v.string(), category: v.string() },
 *   handler: withMutationMetrics('vendors:create', async (ctx, args) => {
 *     const id = await withDatabaseMetrics(
 *       () => ctx.db.insert('vendors', { ...args, status: 'pending', createdAt: Date.now() }),
 *       { queryType: 'write', table: 'vendors' }
 *     );
 *     return id;
 *   }),
 * });
 * ```
 */

/**
 * Priority Files for Metrics Integration
 *
 * High Priority (High Traffic):
 * - convex/events.ts
 * - convex/vendors.ts
 * - convex/sponsors.ts
 * - convex/auth.ts
 *
 * Medium Priority:
 * - convex/users.ts
 * - convex/orders.ts
 * - convex/attendees.ts
 * - convex/organizations.ts
 *
 * Low Priority:
 * - convex/ticketTypes.ts
 * - convex/eventTasks.ts
 * - convex/budgetItems.ts
 * - convex/webhooks.ts
 */

/**
 * Project-scoped access-control primitives (spec §7E). Two collaborator roles:
 * View-only and View+Edit. The owner has full control.
 *
 * These are the client-side gate (used to hide/disable edit affordances). The
 * authoritative enforcement is Supabase Row-Level Security in
 * `supabase/schema.sql` — a collaborator can never reach a project they weren't
 * invited to, even by calling the API directly.
 */

export type Role = 'view' | 'edit'

/** A user's effective role on a project (owner has full control). */
export type EffectiveRole = 'owner' | 'edit' | 'view'

export interface Membership {
  projectId: string
  userId: string
  role: Role
}

/** Everyone with a membership (or the owner) can view. */
export function canView(role: Role | 'owner' | null | undefined): boolean {
  return role === 'view' || role === 'edit' || role === 'owner'
}

/** Only View+Edit collaborators and the owner can modify content. */
export function canEdit(role: Role | 'owner' | null | undefined): boolean {
  return role === 'edit' || role === 'owner'
}

/** Only the owner can invite/remove collaborators or delete the project. */
export function canManage(role: Role | 'owner' | null | undefined): boolean {
  return role === 'owner'
}

/** Resolve a user's role for a project from the owner id + membership list. */
export function roleFor(
  userId: string | null | undefined,
  ownerId: string,
  memberships: Membership[],
): Role | 'owner' | null {
  if (!userId) return null
  if (userId === ownerId) return 'owner'
  const m = memberships.find((x) => x.userId === userId)
  return m ? m.role : null
}

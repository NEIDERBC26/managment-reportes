import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

export interface SessionUser {
  id: string
  email: string
  role: string
}

/** Returns the session user or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  return {
    id: session.user.id,
    email: session.user.email ?? '',
    role: (session.user as any).role ?? 'USER',
  }
}

/** Guard: any authenticated user. Throws a NextResponse (401) via the returned error. */
export async function requireAuth() {
  const user = await getSessionUser()
  if (!user) {
    return { user: null, error: NextResponse.json({ error: 'No autorizado.' }, { status: 401 }) }
  }
  return { user, error: null }
}

/** Guard: ADMIN only. */
export async function requireAdmin() {
  const user = await getSessionUser()
  if (!user) {
    return { user: null, error: NextResponse.json({ error: 'No autorizado.' }, { status: 401 }) }
  }
  if (user.role !== 'ADMIN') {
    return { user: null, error: NextResponse.json({ error: 'Acceso denegado. Se requieren permisos de administrador.' }, { status: 403 }) }
  }
  return { user, error: null }
}

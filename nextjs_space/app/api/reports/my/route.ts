export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  try {
    // Admins can see all active reports; users see only assigned ones.
    const where =
      user!.role === 'ADMIN'
        ? { isActive: true }
        : { isActive: true, accesses: { some: { userId: user!.id } } }

    const reports = await prisma.report.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        updatedAt: true,
        sqlConnection: { select: { name: true } },
        _count: { select: { parameters: true } },
      },
    })
    return NextResponse.json(reports)
  } catch (err) {
    console.error('[reports my GET]', err)
    return NextResponse.json({ error: 'Error al obtener tus informes.' }, { status: 500 })
  }
}

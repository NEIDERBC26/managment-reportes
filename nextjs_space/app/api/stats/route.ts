export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/api-auth'

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error
  try {
    const [users, activeUsers, reports, activeReports, connections] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.report.count(),
      prisma.report.count({ where: { isActive: true } }),
      prisma.sqlConnection.count(),
    ])
    return NextResponse.json({ users, activeUsers, reports, activeReports, connections })
  } catch (err) {
    console.error('[stats GET]', err)
    return NextResponse.json({ error: 'Error al obtener estadísticas.' }, { status: 500 })
  }
}

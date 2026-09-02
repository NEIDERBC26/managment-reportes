export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

/** Returns report metadata + parameters for a user who has access (no SQL exposed). */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireAuth()
  if (error) return error
  try {
    const report = await prisma.report.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        parameters: { orderBy: { displayOrder: 'asc' } },
        accesses: { select: { userId: true } },
      },
    })
    if (!report || !report.isActive) {
      return NextResponse.json({ error: 'Informe no encontrado.' }, { status: 404 })
    }
    const hasAccess =
      user!.role === 'ADMIN' || report.accesses.some((a) => a.userId === user!.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'No tienes acceso a este informe.' }, { status: 403 })
    }
    return NextResponse.json({
      id: report.id,
      name: report.name,
      description: report.description,
      parameters: report.parameters,
    })
  } catch (err) {
    console.error('[run-info GET]', err)
    return NextResponse.json({ error: 'Error al obtener el informe.' }, { status: 500 })
  }
}

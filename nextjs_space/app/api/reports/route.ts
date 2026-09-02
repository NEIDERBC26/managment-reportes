export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/api-auth'

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error
  try {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        sqlConnection: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, email: true } },
        _count: { select: { parameters: true, accesses: true } },
      },
    })
    return NextResponse.json(reports)
  } catch (err) {
    console.error('[reports GET]', err)
    return NextResponse.json({ error: 'Error al obtener los informes.' }, { status: 500 })
  }
}

interface ParamPayload {
  name: string
  label: string
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT'
  defaultValue?: string | null
  isRequired?: boolean
  displayOrder?: number
  options?: string | null
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin()
  if (error) return error
  try {
    const b = await req.json().catch(() => ({}))
    const { name, description, sqlQuery, sqlConnectionId, isActive } = b ?? {}
    if (!name || !sqlQuery || !sqlConnectionId) {
      return NextResponse.json({ error: 'Nombre, consulta SQL y conexión son obligatorios.' }, { status: 400 })
    }
    const params: ParamPayload[] = Array.isArray(b?.parameters) ? b.parameters : []
    const userIds: string[] = Array.isArray(b?.userIds) ? b.userIds : []

    const created = await prisma.report.create({
      data: {
        name: String(name),
        description: description ? String(description) : null,
        sqlQuery: String(sqlQuery),
        sqlConnectionId: String(sqlConnectionId),
        createdBy: user!.id,
        isActive: isActive === undefined ? true : Boolean(isActive),
        parameters: {
          create: params.map((p, i) => ({
            name: String(p.name),
            label: String(p.label || p.name),
            type: (['TEXT', 'NUMBER', 'DATE', 'SELECT'].includes(p.type) ? p.type : 'TEXT') as any,
            defaultValue: p.defaultValue ? String(p.defaultValue) : null,
            isRequired: Boolean(p.isRequired),
            displayOrder: Number(p.displayOrder ?? i),
            options: p.options ? String(p.options) : null,
          })),
        },
        accesses: {
          create: userIds.map((uid) => ({ userId: String(uid) })),
        },
      },
      select: { id: true, name: true },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    console.error('[reports POST]', err)
    return NextResponse.json({ error: 'Error al crear el informe.' }, { status: 500 })
  }
}

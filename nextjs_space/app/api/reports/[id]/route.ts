export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/api-auth'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error
  try {
    const report = await prisma.report.findUnique({
      where: { id: params.id },
      include: {
        parameters: { orderBy: { displayOrder: 'asc' } },
        accesses: { select: { userId: true } },
        sqlConnection: { select: { id: true, name: true } },
      },
    })
    if (!report) return NextResponse.json({ error: 'Informe no encontrado.' }, { status: 404 })
    return NextResponse.json(report)
  } catch (err) {
    console.error('[report GET]', err)
    return NextResponse.json({ error: 'Error al obtener el informe.' }, { status: 500 })
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

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error
  try {
    const b = await req.json().catch(() => ({}))
    const { name, description, sqlQuery, sqlConnectionId, isActive } = b ?? {}
    const paramList: ParamPayload[] = Array.isArray(b?.parameters) ? b.parameters : []
    const userIds: string[] = Array.isArray(b?.userIds) ? b.userIds : []

    await prisma.$transaction(async (tx) => {
      await tx.report.update({
        where: { id: params.id },
        data: {
          ...(name !== undefined ? { name: String(name) } : {}),
          ...(description !== undefined ? { description: description ? String(description) : null } : {}),
          ...(sqlQuery !== undefined ? { sqlQuery: String(sqlQuery) } : {}),
          ...(sqlConnectionId !== undefined ? { sqlConnectionId: String(sqlConnectionId) } : {}),
          ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
        },
      })

      if (b?.parameters !== undefined) {
        await tx.reportParameter.deleteMany({ where: { reportId: params.id } })
        if (paramList.length > 0) {
          await tx.reportParameter.createMany({
            data: paramList.map((p, i) => ({
              reportId: params.id,
              name: String(p.name),
              label: String(p.label || p.name),
              type: (['TEXT', 'NUMBER', 'DATE', 'SELECT'].includes(p.type) ? p.type : 'TEXT') as any,
              defaultValue: p.defaultValue ? String(p.defaultValue) : null,
              isRequired: Boolean(p.isRequired),
              displayOrder: Number(p.displayOrder ?? i),
              options: p.options ? String(p.options) : null,
            })),
          })
        }
      }

      if (b?.userIds !== undefined) {
        await tx.reportAccess.deleteMany({ where: { reportId: params.id } })
        if (userIds.length > 0) {
          await tx.reportAccess.createMany({
            data: userIds.map((uid) => ({ reportId: params.id, userId: String(uid) })),
            skipDuplicates: true,
          })
        }
      }
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[report PUT]', err)
    return NextResponse.json({ error: 'Error al actualizar el informe.' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error
  try {
    await prisma.report.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[report DELETE]', err)
    return NextResponse.json({ error: 'Error al eliminar el informe.' }, { status: 500 })
  }
}

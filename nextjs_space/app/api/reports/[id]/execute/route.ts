export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'
import { decrypt } from '@/lib/crypto'
import { executeQuery, ParamInput } from '@/lib/mssql'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireAuth()
  if (error) return error
  try {
    const report = await prisma.report.findUnique({
      where: { id: params.id },
      include: {
        parameters: { orderBy: { displayOrder: 'asc' } },
        accesses: { select: { userId: true } },
        sqlConnection: true,
      },
    })
    if (!report || !report.isActive) {
      return NextResponse.json({ error: 'Informe no encontrado.' }, { status: 404 })
    }

    // Access validation: user must be admin or explicitly assigned
    const hasAccess =
      user!.role === 'ADMIN' || report.accesses.some((a) => a.userId === user!.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'No tienes acceso a este informe.' }, { status: 403 })
    }

    if (!report.sqlConnection) {
      return NextResponse.json({ error: 'El informe no tiene una conexión válida.' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const provided: Record<string, unknown> = body?.params ?? {}

    // Validate required parameters and build SAFE parameter inputs
    const paramInputs: ParamInput[] = []
    for (const p of report.parameters) {
      const raw = provided[p.name]
      const isEmpty = raw === undefined || raw === null || raw === ''
      if (p.isRequired && isEmpty) {
        return NextResponse.json(
          { error: `El parámetro "${p.label}" es obligatorio.` },
          { status: 400 }
        )
      }
      const value = isEmpty ? (p.defaultValue ?? null) : raw
      paramInputs.push({ name: p.name, type: p.type as ParamInput['type'], value })
    }

    const config = {
      server: report.sqlConnection.server,
      port: report.sqlConnection.port,
      database: report.sqlConnection.database,
      username: report.sqlConnection.username,
      password: decrypt(report.sqlConnection.password),
    }

    const result = await executeQuery(config, report.sqlQuery, paramInputs)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[report execute]', err)
    return NextResponse.json(
      { error: err?.message ?? 'Error al ejecutar el informe contra SQL Server.' },
      { status: 500 }
    )
  }
}

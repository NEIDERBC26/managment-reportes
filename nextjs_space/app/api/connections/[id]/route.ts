export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/api-auth'
import { encrypt } from '@/lib/crypto'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error
  try {
    const conn = await prisma.sqlConnection.findUnique({
      where: { id: params.id },
      select: {
        id: true, name: true, server: true, port: true,
        database: true, username: true, createdAt: true, updatedAt: true,
      },
    })
    if (!conn) return NextResponse.json({ error: 'Conexión no encontrada.' }, { status: 404 })
    return NextResponse.json(conn)
  } catch (err) {
    console.error('[connection GET]', err)
    return NextResponse.json({ error: 'Error al obtener la conexión.' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error
  try {
    const b = await req.json().catch(() => ({}))
    const { name, server, port, database, username, password } = b ?? {}
    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = String(name)
    if (server !== undefined) data.server = String(server)
    if (port !== undefined) data.port = Number(port) || 1433
    if (database !== undefined) data.database = String(database)
    if (username !== undefined) data.username = String(username)
    if (password) data.password = encrypt(String(password))

    const updated = await prisma.sqlConnection.update({
      where: { id: params.id },
      data,
      select: { id: true, name: true },
    })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[connection PUT]', err)
    return NextResponse.json({ error: 'Error al actualizar la conexión.' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error
  try {
    const count = await prisma.report.count({ where: { sqlConnectionId: params.id } })
    if (count > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: hay ${count} informe(s) usando esta conexión.` },
        { status: 409 }
      )
    }
    await prisma.sqlConnection.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[connection DELETE]', err)
    return NextResponse.json({ error: 'Error al eliminar la conexión.' }, { status: 500 })
  }
}

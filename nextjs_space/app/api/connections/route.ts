export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/api-auth'
import { encrypt } from '@/lib/crypto'

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error
  try {
    const connections = await prisma.sqlConnection.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        server: true,
        port: true,
        database: true,
        username: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { reports: true } },
      },
    })
    return NextResponse.json(connections)
  } catch (err) {
    console.error('[connections GET]', err)
    return NextResponse.json({ error: 'Error al obtener las conexiones.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error
  try {
    const b = await req.json().catch(() => ({}))
    const { name, server, port, database, username, password } = b ?? {}
    if (!name || !server || !database || !username || !password) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios.' }, { status: 400 })
    }
    const created = await prisma.sqlConnection.create({
      data: {
        name: String(name),
        server: String(server),
        port: Number(port) || 1433,
        database: String(database),
        username: String(username),
        password: encrypt(String(password)),
      },
      select: { id: true, name: true },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    console.error('[connections POST]', err)
    return NextResponse.json({ error: 'Error al crear la conexión.' }, { status: 500 })
  }
}

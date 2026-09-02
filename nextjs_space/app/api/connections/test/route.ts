export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/api-auth'
import { decrypt } from '@/lib/crypto'
import { testConnection } from '@/lib/mssql'

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error
  try {
    const b = await req.json().catch(() => ({}))
    let { server, port, database, username, password } = b ?? {}

    // If an existing connection id is provided, load its stored (encrypted) password
    if (b?.connectionId) {
      const conn = await prisma.sqlConnection.findUnique({ where: { id: String(b.connectionId) } })
      if (!conn) return NextResponse.json({ ok: false, message: 'Conexión no encontrada.' }, { status: 404 })
      server = conn.server
      port = conn.port
      database = conn.database
      username = conn.username
      password = decrypt(conn.password)
    }

    if (!server || !database || !username || (!password && password !== '')) {
      return NextResponse.json({ ok: false, message: 'Faltan datos de conexión.' }, { status: 400 })
    }

    const result = await testConnection({
      server: String(server),
      port: Number(port) || 1433,
      database: String(database),
      username: String(username),
      password: String(password),
    })
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[connection test]', err)
    return NextResponse.json({ ok: false, message: err?.message ?? 'Error al probar la conexión.' }, { status: 500 })
  }
}

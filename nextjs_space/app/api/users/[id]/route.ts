export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/api-auth'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireAdmin()
  if (error) return error
  try {
    const b = await req.json().catch(() => ({}))
    const data: Record<string, unknown> = {}
    if (b?.name !== undefined) data.name = b.name ? String(b.name) : null
    if (b?.role !== undefined) data.role = b.role === 'ADMIN' ? 'ADMIN' : 'USER'
    if (b?.isActive !== undefined) data.isActive = Boolean(b.isActive)
    if (b?.password) {
      if (String(b.password).length < 6) {
        return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 })
      }
      data.password = await bcrypt.hash(String(b.password), 10)
    }

    // Prevent an admin from deactivating / demoting themselves
    if (params.id === user!.id && (data.isActive === false || data.role === 'USER')) {
      return NextResponse.json({ error: 'No puedes desactivar ni cambiar tu propio rol.' }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[user PUT]', err)
    return NextResponse.json({ error: 'Error al actualizar el usuario.' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireAdmin()
  if (error) return error
  try {
    if (params.id === user!.id) {
      return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta.' }, { status: 400 })
    }
    const reportCount = await prisma.report.count({ where: { createdBy: params.id } })
    if (reportCount > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: el usuario creó ${reportCount} informe(s). Desactívalo en su lugar.` },
        { status: 409 }
      )
    }
    await prisma.user.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[user DELETE]', err)
    return NextResponse.json({ error: 'Error al eliminar el usuario.' }, { status: 500 })
  }
}

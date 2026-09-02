export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/api-auth'

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, name: true, role: true,
        isActive: true, createdAt: true,
      },
    })
    return NextResponse.json(users)
  } catch (err) {
    console.error('[users GET]', err)
    return NextResponse.json({ error: 'Error al obtener usuarios.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error
  try {
    const b = await req.json().catch(() => ({}))
    const email = (b?.email ?? '').toLowerCase().trim()
    const password = b?.password ?? ''
    const name = b?.name ?? null
    const role = b?.role === 'ADMIN' ? 'ADMIN' : 'USER'
    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña son obligatorios.' }, { status: 400 })
    }
    if (String(password).length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 })
    }
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Ya existe un usuario con ese email.' }, { status: 409 })
    }
    const hashed = await bcrypt.hash(String(password), 10)
    const user = await prisma.user.create({
      data: { email, password: hashed, name, role, isActive: true },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    })
    return NextResponse.json(user, { status: 201 })
  } catch (err) {
    console.error('[users POST]', err)
    return NextResponse.json({ error: 'Error al crear el usuario.' }, { status: 500 })
  }
}

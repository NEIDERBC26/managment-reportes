import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.INITIAL_ADMIN_PASSWORD
  const name = process.env.INITIAL_ADMIN_NAME?.trim() || 'Administrador'

  if (!email || !password) {
    throw new Error('Defina INITIAL_ADMIN_EMAIL e INITIAL_ADMIN_PASSWORD antes de ejecutar el seed.')
  }
  if (password.length < 16) {
    throw new Error('INITIAL_ADMIN_PASSWORD debe tener al menos 16 caracteres.')
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.user.upsert({
    where: { email },
    update: {
      password: passwordHash,
      name,
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      email,
      password: passwordHash,
      name,
      role: 'ADMIN',
      isActive: true,
    },
  })

  console.log(`Administrador inicial preparado: ${email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/login')
  }
  const role = (session.user as any).role
  if (role === 'ADMIN') {
    redirect('/admin')
  }
  redirect('/dashboard')
}

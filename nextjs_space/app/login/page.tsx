import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { LoginForm } from '@/components/auth/login-form'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  if (session?.user) {
    const role = (session.user as any).role
    redirect(role === 'ADMIN' ? '/admin' : '/dashboard')
  }
  return <LoginForm />
}

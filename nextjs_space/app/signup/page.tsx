import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SignupForm } from '@/components/auth/signup-form'

export const dynamic = 'force-dynamic'

export default async function SignupPage() {
  const session = await getServerSession(authOptions)
  if (session?.user) {
    const role = (session.user as any).role
    redirect(role === 'ADMIN' ? '/admin' : '/dashboard')
  }
  return <SignupForm />
}

import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'

export const dynamic = 'force-dynamic'

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  return (
    <DashboardShell
      role={(session.user as any).role ?? 'USER'}
      userName={session.user.name ?? ''}
      userEmail={session.user.email ?? ''}
      instanceName={process.env.INSTANCE_NAME ?? 'ReportManager'}
    >
      {children}
    </DashboardShell>
  )
}

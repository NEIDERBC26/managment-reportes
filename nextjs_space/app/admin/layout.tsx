import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  if ((session.user as any).role !== 'ADMIN') redirect('/dashboard')

  return (
    <DashboardShell
      role="ADMIN"
      userName={session.user.name ?? ''}
      userEmail={session.user.email ?? ''}
      instanceName={process.env.INSTANCE_NAME ?? 'ReportManager'}
    >
      {children}
    </DashboardShell>
  )
}

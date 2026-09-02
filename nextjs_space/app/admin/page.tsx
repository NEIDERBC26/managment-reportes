'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, FileText, Database, Activity, ArrowRight, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layouts/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CountUp } from '@/components/dashboard/count-up'
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/animate'

interface Stats {
  users: number
  activeUsers: number
  reports: number
  activeReports: number
  connections: number
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => { if (mounted) setStats(d) })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  const cards = [
    { label: 'Usuarios', value: stats?.users ?? 0, sub: `${stats?.activeUsers ?? 0} activos`, icon: Users, href: '/admin/users', color: 'text-blue-500' },
    { label: 'Informes', value: stats?.reports ?? 0, sub: `${stats?.activeReports ?? 0} activos`, icon: FileText, href: '/admin/reports', color: 'text-violet-500' },
    { label: 'Conexiones SQL', value: stats?.connections ?? 0, sub: 'Servidores configurados', icon: Database, href: '/admin/connections', color: 'text-emerald-500' },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title="Panel de administración"
        description="Resumen general de la plataforma de informes dinámicos."
      />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => {
            const Icon = c.icon
            return (
              <StaggerItem key={c.label}>
                <Link href={c.href}>
                  <Card variant="interactive" className="h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                      <Icon className={`h-5 w-5 ${c.color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className="font-display text-3xl font-semibold tracking-tight">
                        <CountUp value={c.value} />
                      </div>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Activity className="h-3 w-3" /> {c.sub}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </StaggerItem>
            )
          })}
        </Stagger>
      )}

      <FadeIn>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Acciones rápidas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Nueva conexión SQL', href: '/admin/connections', icon: Database },
              { label: 'Nuevo informe', href: '/admin/reports', icon: FileText },
              { label: 'Gestionar usuarios', href: '/admin/users', icon: Users },
            ].map((a) => {
              const Icon = a.icon
              return (
                <Link
                  key={a.label}
                  href={a.href}
                  className="group flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="h-4 w-4 text-primary" />
                    {a.label}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </Link>
              )
            })}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  )
}

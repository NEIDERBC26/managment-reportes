'use client'

import { useEffect, useState, useCallback } from 'react'
import { FileText, Play, SlidersHorizontal, Database, Loader2, Inbox } from 'lucide-react'
import { PageHeader } from '@/components/layouts/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Stagger, StaggerItem } from '@/components/ui/animate'
import { ReportRunner } from '@/components/user/report-runner'

interface MyReport {
  id: string
  name: string
  description: string | null
  sqlConnection?: { name: string } | null
  _count?: { parameters: number }
}

export function ReportsGrid() {
  const [reports, setReports] = useState<MyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [runId, setRunId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/reports/my')
      const data = await res.json()
      setReports(Array.isArray(data) ? data : [])
    } catch { /* noop */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis informes"
        description="Ejecuta los informes asignados y exporta los resultados a Excel o PDF."
      />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : reports.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted"><Inbox className="h-6 w-6 text-muted-foreground" /></div>
          <div><p className="font-medium">No tienes informes asignados</p><p className="text-sm text-muted-foreground">Cuando un administrador te asigne informes, aparecerán aquí.</p></div>
        </CardContent></Card>
      ) : (
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((r) => (
            <StaggerItem key={r.id}>
              <Card variant="interactive" className="h-full flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="h-5 w-5" /></div>
                    <Badge variant="secondary" className="gap-1"><SlidersHorizontal className="h-3 w-3" />{r._count?.parameters ?? 0}</Badge>
                  </div>
                  <CardTitle className="text-base mt-2">{r.name}</CardTitle>
                  {r.description && <CardDescription className="line-clamp-2">{r.description}</CardDescription>}
                </CardHeader>
                <CardContent className="mt-auto space-y-3">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Database className="h-3 w-3" />{r.sqlConnection?.name ?? '—'}</p>
                  <Button className="w-full" onClick={() => setRunId(r.id)}><Play className="mr-2 h-4 w-4" />Ejecutar informe</Button>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <ReportRunner reportId={runId} open={Boolean(runId)} onOpenChange={(o) => !o && setRunId(null)} />
    </div>
  )
}

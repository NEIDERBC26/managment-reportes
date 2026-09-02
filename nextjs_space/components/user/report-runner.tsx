'use client'

import { useEffect, useState } from 'react'
import { Play, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { ResultsTable } from '@/components/reports/results-table'
import type { ExecuteResult } from '@/lib/types'

interface RunParam {
  id: string
  name: string
  label: string
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT'
  defaultValue: string | null
  isRequired: boolean
  options: string | null
}

interface RunInfo {
  id: string
  name: string
  description: string | null
  parameters: RunParam[]
}

export function ReportRunner({
  reportId, open, onOpenChange,
}: {
  reportId: string | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [info, setInfo] = useState<RunInfo | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<ExecuteResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !reportId) return
    setInfo(null); setResult(null); setErrorMsg(null); setValues({})
    setLoading(true)
    fetch(`/api/reports/${reportId}/run-info`)
      .then((r) => r.json())
      .then((d) => {
        if (!d || d.error) { toast.error(d?.error ?? 'No se pudo cargar el informe.'); return }
        setInfo(d)
        const initial: Record<string, string> = {}
        ;(d.parameters ?? []).forEach((p: RunParam) => { initial[p.name] = p.defaultValue ?? '' })
        setValues(initial)
      })
      .catch(() => toast.error('Error al cargar el informe.'))
      .finally(() => setLoading(false))
  }, [open, reportId])

  function setVal(name: string, v: string) { setValues((prev) => ({ ...prev, [name]: v })) }

  async function handleRun() {
    if (!reportId || !info) return
    for (const p of info.parameters) {
      if (p.isRequired && !values[p.name]) { toast.error(`El parámetro "${p.label}" es obligatorio.`); return }
    }
    setRunning(true); setResult(null); setErrorMsg(null)
    try {
      const res = await fetch(`/api/reports/${reportId}/execute`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ params: values }),
      })
      const data = await res.json()
      if (!res.ok) { setErrorMsg(data?.error ?? 'Error al ejecutar el informe.'); return }
      setResult(data)
      toast.success(`Informe ejecutado: ${data?.rowCount ?? 0} fila(s).`)
    } catch {
      setErrorMsg('Error de conexión al ejecutar el informe.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{info?.name ?? 'Ejecutar informe'}</DialogTitle>
          {info?.description && <DialogDescription>{info.description}</DialogDescription>}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="space-y-5">
            {info && info.parameters.length > 0 && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="mb-3 text-sm font-medium">Parámetros</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {info.parameters.map((p) => (
                    <div key={p.id} className="space-y-1.5">
                      <Label className="text-xs">{p.label}{p.isRequired && <span className="text-destructive"> *</span>}</Label>
                      {p.type === 'SELECT' ? (
                        <Select value={values[p.name] ?? ''} onValueChange={(v) => setVal(p.name, v)}>
                          <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                          <SelectContent>
                            {(p.options ?? '').split(',').map((o) => o.trim()).filter(Boolean).map((o) => (
                              <SelectItem key={o} value={o}>{o}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={p.type === 'NUMBER' ? 'number' : p.type === 'DATE' ? 'date' : 'text'}
                          value={values[p.name] ?? ''}
                          onChange={(e) => setVal(p.name, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleRun} disabled={running}>
                {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                Ejecutar
              </Button>
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div><p className="font-medium">No se pudo ejecutar el informe</p><p className="text-xs opacity-90 break-words">{errorMsg}</p></div>
              </div>
            )}

            {result && (
              <ResultsTable columns={result.columns} rows={result.rows} reportName={info?.name ?? 'informe'} durationMs={result.durationMs} />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

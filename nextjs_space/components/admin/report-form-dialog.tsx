'use client'

import { useEffect, useState } from 'react'
import { Loader2, Plus, Trash2, GripVertical, Info } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Connection, AppUser, ParamType } from '@/lib/types'

interface ParamRow {
  name: string
  label: string
  type: ParamType
  defaultValue: string
  isRequired: boolean
  options: string
}

const emptyParam = (): ParamRow => ({ name: '', label: '', type: 'TEXT', defaultValue: '', isRequired: false, options: '' })

export function ReportFormDialog({
  open, onOpenChange, reportId, connections, users, onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  reportId: string | null
  connections: Connection[]
  users: AppUser[]
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sqlConnectionId, setSqlConnectionId] = useState('')
  const [sqlQuery, setSqlQuery] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [params, setParams] = useState<ParamRow[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const editing = Boolean(reportId)

  useEffect(() => {
    if (!open) return
    // reset
    setName(''); setDescription(''); setSqlQuery(''); setIsActive(true)
    setParams([]); setSelectedUsers([])
    setSqlConnectionId(connections?.[0]?.id ?? '')

    if (reportId) {
      setLoading(true)
      fetch(`/api/reports/${reportId}`)
        .then((r) => r.json())
        .then((d) => {
          if (!d || d.error) { toast.error('No se pudo cargar el informe.'); return }
          setName(d.name ?? '')
          setDescription(d.description ?? '')
          setSqlConnectionId(d.sqlConnectionId ?? '')
          setSqlQuery(d.sqlQuery ?? '')
          setIsActive(Boolean(d.isActive))
          setParams((d.parameters ?? []).map((p: any) => ({
            name: p.name ?? '', label: p.label ?? '', type: p.type ?? 'TEXT',
            defaultValue: p.defaultValue ?? '', isRequired: Boolean(p.isRequired), options: p.options ?? '',
          })))
          setSelectedUsers((d.accesses ?? []).map((a: any) => a.userId))
        })
        .catch(() => toast.error('Error al cargar el informe.'))
        .finally(() => setLoading(false))
    }
  }, [open, reportId, connections])

  function updateParam(i: number, patch: Partial<ParamRow>) {
    setParams((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))
  }
  function removeParam(i: number) { setParams((prev) => prev.filter((_, idx) => idx !== i)) }
  function toggleUser(id: string) {
    setSelectedUsers((prev) => (prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]))
  }

  async function handleSave() {
    if (!name.trim()) { toast.error('El nombre es obligatorio.'); return }
    if (!sqlConnectionId) { toast.error('Selecciona una conexión.'); return }
    if (!sqlQuery.trim()) { toast.error('La consulta SQL es obligatoria.'); return }
    for (const p of params) {
      if (!p.name.trim()) { toast.error('Cada parámetro necesita un nombre (clave).'); return }
    }
    setSaving(true)
    try {
      const payload = {
        name, description, sqlConnectionId, sqlQuery, isActive,
        parameters: params.map((p, i) => ({
          name: p.name.trim(), label: p.label.trim() || p.name.trim(), type: p.type,
          defaultValue: p.defaultValue || null, isRequired: p.isRequired, displayOrder: i,
          options: p.type === 'SELECT' ? p.options || null : null,
        })),
        userIds: selectedUsers,
      }
      const url = editing ? `/api/reports/${reportId}` : '/api/reports'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) { toast.error(data?.error ?? 'Error al guardar.'); setSaving(false); return }
      toast.success(editing ? 'Informe actualizado.' : 'Informe creado.')
      onSaved()
    } catch { toast.error('Error al guardar el informe.') }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar informe' : 'Nuevo informe'}</DialogTitle>
          <DialogDescription>Define la consulta, sus parámetros dinámicos y quién puede ejecutarla.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Detalles</TabsTrigger>
              <TabsTrigger value="params">Parámetros <Badge variant="secondary" className="ml-2">{params.length}</Badge></TabsTrigger>
              <TabsTrigger value="access">Accesos <Badge variant="secondary" className="ml-2">{selectedUsers.length}</Badge></TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-4 pr-4" style={{ maxHeight: '55vh' }}>
              <TabsContent value="details" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Nombre *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Ventas por mes" /></div>
                  <div className="space-y-2"><Label>Conexión SQL *</Label>
                    <Select value={sqlConnectionId} onValueChange={setSqlConnectionId}>
                      <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                      <SelectContent>
                        {connections.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2"><Label>Descripción</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Breve descripción del informe" /></div>
                <div className="space-y-2">
                  <Label>Consulta SQL *</Label>
                  <Textarea value={sqlQuery} onChange={(e) => setSqlQuery(e.target.value)} rows={8} className="font-mono text-xs" placeholder="SELECT * FROM Ventas WHERE fecha >= @fechaInicio AND region = @region" />
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    Referencia los parámetros con <code className="font-mono">@nombre</code>. Se enlazan de forma segura (parametrizados) al ejecutar.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={isActive} onCheckedChange={setIsActive} id="active" />
                  <Label htmlFor="active" className="cursor-pointer">Informe activo</Label>
                </div>
              </TabsContent>

              <TabsContent value="params" className="space-y-3 mt-0">
                {params.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Sin parámetros. Añade uno si tu consulta usa <code className="font-mono">@variables</code>.</p>}
                {params.map((p, i) => (
                  <div key={i} className="rounded-lg border bg-muted/30 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground"><GripVertical className="h-3 w-3" />Parámetro {i + 1}</span>
                      <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => removeParam(i)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label className="text-xs">Nombre (clave) * <span className="text-muted-foreground">= @{p.name || 'nombre'}</span></Label><Input value={p.name} onChange={(e) => updateParam(i, { name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })} placeholder="fechaInicio" className="font-mono text-xs" /></div>
                      <div className="space-y-1.5"><Label className="text-xs">Etiqueta visible</Label><Input value={p.label} onChange={(e) => updateParam(i, { label: e.target.value })} placeholder="Fecha inicio" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label className="text-xs">Tipo</Label>
                        <Select value={p.type} onValueChange={(v) => updateParam(i, { type: v as ParamType })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TEXT">Texto</SelectItem>
                            <SelectItem value="NUMBER">Número</SelectItem>
                            <SelectItem value="DATE">Fecha</SelectItem>
                            <SelectItem value="SELECT">Lista (Select)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5"><Label className="text-xs">Valor por defecto</Label><Input value={p.defaultValue} onChange={(e) => updateParam(i, { defaultValue: e.target.value })} /></div>
                    </div>
                    {p.type === 'SELECT' && (
                      <div className="space-y-1.5"><Label className="text-xs">Opciones (separadas por coma)</Label><Input value={p.options} onChange={(e) => updateParam(i, { options: e.target.value })} placeholder="Norte,Sur,Este,Oeste" /></div>
                    )}
                    <div className="flex items-center gap-2">
                      <Switch checked={p.isRequired} onCheckedChange={(v) => updateParam(i, { isRequired: v })} id={`req-${i}`} />
                      <Label htmlFor={`req-${i}`} className="text-xs cursor-pointer">Obligatorio</Label>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setParams((p) => [...p, emptyParam()])}><Plus className="mr-2 h-4 w-4" />Añadir parámetro</Button>
              </TabsContent>

              <TabsContent value="access" className="space-y-2 mt-0">
                <p className="text-sm text-muted-foreground">Selecciona qué usuarios pueden ver y ejecutar este informe. Los administradores tienen acceso a todos.</p>
                {users.filter((u) => u.role !== 'ADMIN').length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No hay usuarios estándar.</p>}
                {users.filter((u) => u.role !== 'ADMIN').map((u) => (
                  <label key={u.id} className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent transition-colors">
                    <Checkbox checked={selectedUsers.includes(u.id)} onCheckedChange={() => toggleUser(u.id)} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.name || u.email}</p>
                      <p className="text-xs text-muted-foreground truncate" suppressHydrationWarning>{u.email}</p>
                    </div>
                    {!u.isActive && <Badge variant="outline" className="ml-auto">Inactivo</Badge>}
                  </label>
                ))}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || loading}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Guardar informe</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

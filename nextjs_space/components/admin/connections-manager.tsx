'use client'

import { useEffect, useState, useCallback } from 'react'
import { Database, Plus, Pencil, Trash2, Plug, Loader2, Server } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layouts/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Stagger, StaggerItem } from '@/components/ui/animate'
import type { Connection } from '@/lib/types'

interface FormState {
  id?: string
  name: string
  server: string
  port: string
  database: string
  username: string
  password: string
}

const EMPTY: FormState = { name: '', server: '', port: '1433', database: '', username: '', password: '' }

export function ConnectionsManager() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const editing = Boolean(form.id)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/connections')
      const data = await res.json()
      setConnections(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Error al cargar las conexiones.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openNew() { setForm(EMPTY); setDialogOpen(true) }
  function openEdit(c: Connection) {
    setForm({ id: c.id, name: c.name, server: c.server, port: String(c.port), database: c.database, username: c.username, password: '' })
    setDialogOpen(true)
  }

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleTest() {
    if (!form.server || !form.database || !form.username) {
      toast.error('Completa servidor, base de datos y usuario para probar.')
      return
    }
    setTesting(true)
    try {
      const payload: any = { server: form.server, port: Number(form.port) || 1433, database: form.database, username: form.username, password: form.password }
      if (editing && !form.password) payload.connectionId = form.id
      const res = await fetch('/api/connections/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data?.ok) toast.success(data.message ?? 'Conexión exitosa.')
      else toast.error(data?.message ?? 'No se pudo conectar.')
    } catch {
      toast.error('Error al probar la conexión.')
    } finally {
      setTesting(false)
    }
  }

  async function handleSave() {
    if (!form.name || !form.server || !form.database || !form.username || (!editing && !form.password)) {
      toast.error('Completa todos los campos obligatorios.')
      return
    }
    setSaving(true)
    try {
      const url = editing ? `/api/connections/${form.id}` : '/api/connections'
      const method = editing ? 'PUT' : 'POST'
      const body: any = { name: form.name, server: form.server, port: Number(form.port) || 1433, database: form.database, username: form.username }
      if (form.password) body.password = form.password
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { toast.error(data?.error ?? 'Error al guardar.'); setSaving(false); return }
      toast.success(editing ? 'Conexión actualizada.' : 'Conexión creada.')
      setDialogOpen(false)
      load()
    } catch {
      toast.error('Error al guardar la conexión.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/connections/${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { toast.error(data?.error ?? 'No se pudo eliminar.'); setDeleteId(null); return }
      toast.success('Conexión eliminada.')
      setDeleteId(null)
      load()
    } catch {
      toast.error('Error al eliminar.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conexiones SQL Server"
        description="Configura los servidores de origen de datos para tus informes."
        actions={<Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nueva conexión</Button>}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : connections.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted"><Database className="h-6 w-6 text-muted-foreground" /></div>
          <div><p className="font-medium">No hay conexiones configuradas</p><p className="text-sm text-muted-foreground">Crea tu primera conexión a SQL Server para empezar.</p></div>
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nueva conexión</Button>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nombre</TableHead><TableHead>Servidor</TableHead><TableHead>Base de datos</TableHead>
              <TableHead>Usuario</TableHead><TableHead>Informes</TableHead><TableHead className="text-right">Acciones</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {connections.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="font-mono text-xs" suppressHydrationWarning>{c.server}:{c.port}</TableCell>
                  <TableCell className="font-mono text-xs">{c.database}</TableCell>
                  <TableCell className="text-sm">{c.username}</TableCell>
                  <TableCell><Badge variant="secondary">{c._count?.reports ?? 0}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" title="Probar conexión" onClick={async () => {
                        const res = await fetch('/api/connections/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ connectionId: c.id }) })
                        const d = await res.json(); d?.ok ? toast.success(d.message) : toast.error(d?.message ?? 'Fallo')
                      }}><Plug className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon-sm" title="Eliminar" className="text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent></Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar conexión' : 'Nueva conexión SQL Server'}</DialogTitle>
            <DialogDescription>{editing ? 'Deja la contraseña vacía para conservar la actual.' : 'Introduce los datos del servidor SQL Server.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>Nombre descriptivo *</Label><Input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Ej. Producción Ventas" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2"><Label>Servidor *</Label>
                <div className="relative"><Server className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-10" value={form.server} onChange={(e) => update('server', e.target.value)} placeholder="10.0.0.5 / host" /></div>
              </div>
              <div className="space-y-2"><Label>Puerto</Label><Input type="number" value={form.port} onChange={(e) => update('port', e.target.value)} placeholder="1433" /></div>
            </div>
            <div className="space-y-2"><Label>Base de datos *</Label><Input value={form.database} onChange={(e) => update('database', e.target.value)} placeholder="nombre_bd" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Usuario *</Label><Input value={form.username} onChange={(e) => update('username', e.target.value)} autoComplete="off" /></div>
              <div className="space-y-2"><Label>Contraseña {editing ? '' : '*'}</Label><Input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} autoComplete="new-password" placeholder={editing ? 'Sin cambios' : ''} /></div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={handleTest} disabled={testing}>
              {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plug className="mr-2 h-4 w-4" />}Probar conexión
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Guardar</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta conexión?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer. No podrás eliminarla si tiene informes asociados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

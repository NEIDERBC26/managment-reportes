'use client'

import { useEffect, useState, useCallback } from 'react'
import { FileText, Plus, Pencil, Trash2, Loader2, Database, SlidersHorizontal, Users } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layouts/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ReportFormDialog } from '@/components/admin/report-form-dialog'
import type { Connection, AppUser } from '@/lib/types'

interface ReportRow {
  id: string
  name: string
  description: string | null
  isActive: boolean
  sqlConnection?: { name: string } | null
  _count?: { parameters: number; accesses: number }
}

export function ReportsManager() {
  const [reports, setReports] = useState<ReportRow[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, c, u] = await Promise.all([
        fetch('/api/reports').then((x) => x.json()),
        fetch('/api/connections').then((x) => x.json()),
        fetch('/api/users').then((x) => x.json()),
      ])
      setReports(Array.isArray(r) ? r : [])
      setConnections(Array.isArray(c) ? c : [])
      setUsers(Array.isArray(u) ? u : [])
    } catch { toast.error('Error al cargar los informes.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function openNew() {
    if (connections.length === 0) { toast.error('Primero crea una conexión SQL Server.'); return }
    setEditId(null); setDialogOpen(true)
  }
  function openEdit(id: string) { setEditId(id); setDialogOpen(true) }

  async function handleDelete() {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/reports/${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { toast.error(data?.error ?? 'No se pudo eliminar.'); setDeleteId(null); return }
      toast.success('Informe eliminado.'); setDeleteId(null); load()
    } catch { toast.error('Error al eliminar.') }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Informes"
        description="Crea y administra informes dinámicos con parámetros y control de accesos."
        actions={<Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nuevo informe</Button>}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : reports.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted"><FileText className="h-6 w-6 text-muted-foreground" /></div>
          <div><p className="font-medium">No hay informes creados</p><p className="text-sm text-muted-foreground">Crea tu primer informe dinámico.</p></div>
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nuevo informe</Button>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nombre</TableHead><TableHead>Conexión</TableHead>
              <TableHead>Parámetros</TableHead><TableHead>Accesos</TableHead>
              <TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.name}</div>
                    {r.description && <div className="text-xs text-muted-foreground line-clamp-1">{r.description}</div>}
                  </TableCell>
                  <TableCell><span className="inline-flex items-center gap-1 text-sm"><Database className="h-3 w-3 text-muted-foreground" />{r.sqlConnection?.name ?? '—'}</span></TableCell>
                  <TableCell><Badge variant="secondary" className="gap-1"><SlidersHorizontal className="h-3 w-3" />{r._count?.parameters ?? 0}</Badge></TableCell>
                  <TableCell><Badge variant="secondary" className="gap-1"><Users className="h-3 w-3" />{r._count?.accesses ?? 0}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={r.isActive ? 'default' : 'outline'} className={r.isActive ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400' : ''}>
                      {r.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => openEdit(r.id)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon-sm" title="Eliminar" className="text-destructive" onClick={() => setDeleteId(r.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent></Card>
      )}

      <ReportFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        reportId={editId}
        connections={connections}
        users={users}
        onSaved={() => { setDialogOpen(false); load() }}
      />

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este informe?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminarán también sus parámetros y accesos. Esta acción no se puede deshacer.</AlertDialogDescription>
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

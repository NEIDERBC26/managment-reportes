'use client'

import { useEffect, useState, useCallback } from 'react'
import { Users, Plus, Pencil, Trash2, Loader2, ShieldCheck, User as UserIcon } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layouts/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SafeDate } from '@/components/safe-format'
import type { AppUser } from '@/lib/types'

interface FormState {
  id?: string
  name: string
  email: string
  password: string
  role: 'ADMIN' | 'USER'
  isActive: boolean
}

const EMPTY: FormState = { name: '', email: '', password: '', role: 'USER', isActive: true }

export function UsersManager() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const editing = Boolean(form.id)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch { toast.error('Error al cargar usuarios.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function openNew() { setForm(EMPTY); setDialogOpen(true) }
  function openEdit(u: AppUser) {
    setForm({ id: u.id, name: u.name ?? '', email: u.email, password: '', role: u.role, isActive: u.isActive })
    setDialogOpen(true)
  }
  function update<K extends keyof FormState>(k: K, v: FormState[K]) { setForm((f) => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.email || (!editing && !form.password)) { toast.error('Email y contraseña son obligatorios.'); return }
    setSaving(true)
    try {
      const url = editing ? `/api/users/${form.id}` : '/api/users'
      const method = editing ? 'PUT' : 'POST'
      const body: any = { name: form.name, role: form.role, isActive: form.isActive }
      if (!editing) body.email = form.email
      if (form.password) body.password = form.password
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { toast.error(data?.error ?? 'Error al guardar.'); setSaving(false); return }
      toast.success(editing ? 'Usuario actualizado.' : 'Usuario creado.')
      setDialogOpen(false); load()
    } catch { toast.error('Error al guardar el usuario.') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/users/${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { toast.error(data?.error ?? 'No se pudo eliminar.'); setDeleteId(null); return }
      toast.success('Usuario eliminado.'); setDeleteId(null); load()
    } catch { toast.error('Error al eliminar.') }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        description="Administra las cuentas y permisos de acceso a la plataforma."
        actions={<Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nuevo usuario</Button>}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nombre</TableHead><TableHead>Email</TableHead><TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead><TableHead>Creado</TableHead><TableHead className="text-right">Acciones</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name || '—'}</TableCell>
                  <TableCell className="text-sm" suppressHydrationWarning>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'ADMIN' ? 'default' : 'secondary'} className="gap-1">
                      {u.role === 'ADMIN' ? <ShieldCheck className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                      {u.role === 'ADMIN' ? 'Administrador' : 'Usuario'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? 'default' : 'outline'} className={u.isActive ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400' : ''}>
                      {u.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground"><SafeDate date={u.createdAt} locale="es-ES" options={{ dateStyle: 'medium' }} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon-sm" title="Eliminar" className="text-destructive" onClick={() => setDeleteId(u.id)}><Trash2 className="h-4 w-4" /></Button>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
            <DialogDescription>{editing ? 'Actualiza los datos. Deja la contraseña vacía para conservarla.' : 'Crea una nueva cuenta de acceso.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>Nombre</Label><Input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Nombre completo" /></div>
            <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} disabled={editing} autoComplete="off" /></div>
            <div className="space-y-2"><Label>Contraseña {editing ? '' : '*'}</Label><Input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder={editing ? 'Sin cambios' : 'Mínimo 6 caracteres'} autoComplete="new-password" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Rol</Label>
                <Select value={form.role} onValueChange={(v) => update('role', v as 'ADMIN' | 'USER')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">Usuario</SelectItem>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Estado</Label>
                <div className="flex h-10 items-center gap-2">
                  <Switch checked={form.isActive} onCheckedChange={(v) => update('isActive', v)} />
                  <span className="text-sm text-muted-foreground">{form.isActive ? 'Activo' : 'Inactivo'}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este usuario?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
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

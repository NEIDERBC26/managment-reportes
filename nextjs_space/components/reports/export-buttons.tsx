'use client'

import { useState } from 'react'
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

function sanitize(name: string) {
  return (name || 'informe').replace(/[^a-z0-9-_]+/gi, '_').slice(0, 60)
}

function cellToString(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'object') {
    try { return JSON.stringify(v) } catch { return String(v) }
  }
  return String(v)
}

export function ExportButtons({
  columns,
  rows,
  reportName,
}: {
  columns: string[]
  rows: Record<string, unknown>[]
  reportName: string
}) {
  const [busy, setBusy] = useState<'excel' | 'pdf' | null>(null)
  const disabled = !rows || rows.length === 0

  async function exportExcel() {
    setBusy('excel')
    try {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet('Resultados')
      ws.columns = (columns ?? []).map((c) => ({ header: c, key: c, width: 20 }))
      ws.getRow(1).font = { bold: true }
      ;(rows ?? []).forEach((r) => {
        const obj: Record<string, unknown> = {}
        ;(columns ?? []).forEach((c) => { obj[c] = cellToString(r?.[c]) })
        ws.addRow(obj)
      })
      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      triggerDownload(blob, `${sanitize(reportName)}.xlsx`)
      toast.success('Excel exportado correctamente.')
    } catch (err) {
      console.error(err)
      toast.error('No se pudo exportar a Excel.')
    } finally {
      setBusy(null)
    }
  }

  async function exportPdf() {
    setBusy('pdf')
    try {
      const jsPDFModule = await import('jspdf')
      const jsPDF = jsPDFModule.default ?? (jsPDFModule as any).jsPDF
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF({ orientation: (columns?.length ?? 0) > 5 ? 'landscape' : 'portrait' })
      doc.setFontSize(14)
      doc.text(reportName || 'Informe', 14, 16)
      autoTable(doc, {
        startY: 22,
        head: [columns ?? []],
        body: (rows ?? []).map((r) => (columns ?? []).map((c) => cellToString(r?.[c]))),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [37, 99, 235] },
      })
      doc.save(`${sanitize(reportName)}.pdf`)
      toast.success('PDF exportado correctamente.')
    } catch (err) {
      console.error(err)
      toast.error('No se pudo exportar a PDF.')
    } finally {
      setBusy(null)
    }
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={exportExcel} disabled={disabled || busy !== null}>
        {busy === 'excel' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
        Excel
      </Button>
      <Button variant="outline" size="sm" onClick={exportPdf} disabled={disabled || busy !== null}>
        {busy === 'pdf' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
        PDF
      </Button>
    </div>
  )
}

export type UserRole = 'ADMIN' | 'USER'
export type ParamType = 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT'

export interface AppUser {
  id: string
  email: string
  name: string | null
  role: UserRole
  isActive: boolean
  createdAt: string
}

export interface Connection {
  id: string
  name: string
  server: string
  port: number
  database: string
  username: string
  createdAt: string
  updatedAt: string
  _count?: { reports: number }
}

export interface ReportParam {
  id?: string
  name: string
  label: string
  type: ParamType
  defaultValue: string | null
  isRequired: boolean
  displayOrder: number
  options: string | null
}

export interface Report {
  id: string
  name: string
  description: string | null
  sqlQuery: string
  sqlConnectionId: string
  createdBy: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  parameters: ReportParam[]
  sqlConnection?: { id: string; name: string }
  accesses?: { userId: string }[]
  _count?: { parameters: number }
}

export interface ExecuteResult {
  columns: string[]
  rows: Record<string, unknown>[]
  rowCount: number
  durationMs: number
}

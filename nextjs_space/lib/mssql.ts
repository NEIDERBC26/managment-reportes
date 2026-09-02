import sql from 'mssql'

export interface MssqlConfigInput {
  server: string
  port: number
  database: string
  username: string
  password: string
}

export interface ParamInput {
  name: string
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT'
  value: unknown
}

function buildConfig(input: MssqlConfigInput): sql.config {
  return {
    server: input.server,
    port: Number(input.port) || 1433,
    database: input.database,
    user: input.username,
    password: input.password,
    options: {
      encrypt: true,
      trustServerCertificate: true,
      enableArithAbort: true,
    },
    connectionTimeout: 15000,
    requestTimeout: 30000,
    pool: { max: 3, min: 0, idleTimeoutMillis: 10000 },
  }
}

/** Attempts to connect and run a trivial query. Returns {ok, message}. */
export async function testConnection(
  input: MssqlConfigInput
): Promise<{ ok: boolean; message: string }> {
  let pool: sql.ConnectionPool | null = null
  try {
    pool = new sql.ConnectionPool(buildConfig(input))
    await pool.connect()
    await pool.request().query('SELECT 1 AS ok')
    return { ok: true, message: 'Conexión exitosa con el servidor SQL Server.' }
  } catch (err: any) {
    return { ok: false, message: err?.message ?? 'No se pudo conectar al servidor.' }
  } finally {
    try {
      await pool?.close()
    } catch {
      /* ignore */
    }
  }
}

function mapType(type: ParamInput['type']) {
  switch (type) {
    case 'NUMBER':
      return sql.Float
    case 'DATE':
      return sql.DateTime
    default:
      return sql.NVarChar
  }
}

function coerceValue(type: ParamInput['type'], value: unknown): unknown {
  if (value === null || value === undefined || value === '') return null
  if (type === 'NUMBER') {
    const n = Number(value)
    return Number.isNaN(n) ? null : n
  }
  if (type === 'DATE') {
    const d = new Date(String(value))
    return Number.isNaN(d.getTime()) ? null : d
  }
  return String(value)
}

/**
 * Executes a report query against SQL Server using SAFE, parameterized inputs.
 * The query may reference parameters as @name. Values are bound via request.input().
 */
export async function executeQuery(
  config: MssqlConfigInput,
  query: string,
  params: ParamInput[]
): Promise<{ columns: string[]; rows: Record<string, unknown>[]; rowCount: number; durationMs: number }> {
  let pool: sql.ConnectionPool | null = null
  const start = Date.now()
  try {
    pool = new sql.ConnectionPool(buildConfig(config))
    await pool.connect()
    const request = pool.request()

    for (const p of params ?? []) {
      if (!p?.name) continue
      request.input(p.name, mapType(p.type), coerceValue(p.type, p.value))
    }

    const result = await request.query(query)
    const recordset = (result?.recordset ?? []) as Record<string, unknown>[]
    const columns =
      recordset.length > 0
        ? Object.keys(recordset[0])
        : Object.keys((result?.recordset as any)?.columns ?? {})

    return {
      columns,
      rows: recordset,
      rowCount: recordset.length,
      durationMs: Date.now() - start,
    }
  } finally {
    try {
      await pool?.close()
    } catch {
      /* ignore */
    }
  }
}

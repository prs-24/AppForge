import { query } from '../db/pool';
import { TableDefinition, ColumnSchema } from '../types';

const PG_TYPE_MAP: Record<string, string> = {
  text: 'TEXT',
  integer: 'INTEGER',
  boolean: 'BOOLEAN',
  timestamp: 'TIMESTAMP WITH TIME ZONE',
  jsonb: 'JSONB',
  uuid: 'UUID',
  decimal: 'DECIMAL(15,4)',
};

export function columnToSQL(col: ColumnSchema): string {
  const pgType = PG_TYPE_MAP[col.type] || 'TEXT';
  const parts: string[] = [`"${col.name}" ${pgType}`];

  if (col.primaryKey) parts.push('PRIMARY KEY');
  if (!col.nullable && !col.primaryKey) parts.push('NOT NULL');
  if (col.unique && !col.primaryKey) parts.push('UNIQUE');
  if (col.defaultValue) parts.push(`DEFAULT ${col.defaultValue}`);

  return parts.join(' ');
}

export async function createDynamicTable(appId: string, table: TableDefinition): Promise<void> {
  // We store dynamic data in app_data as JSONB — no actual table creation needed
  // This avoids schema pollution and handles all dynamic fields
  // Just log the intent
  console.log(`Dynamic table "${table.name}" for app ${appId} will use app_data JSONB storage`);
}

export async function insertDynamicRecord(
  appId: string,
  tableName: string,
  userId: string | undefined,
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const result = await query(
    `INSERT INTO app_data (app_id, table_name, user_id, data)
     VALUES ($1, $2, $3, $4)
     RETURNING id, data, created_at, updated_at`,
    [appId, tableName, userId || null, JSON.stringify(data)]
  );
  const row = result.rows[0];
  return { id: row.id, ...row.data, created_at: row.created_at, updated_at: row.updated_at };
}

export async function getDynamicRecords(
  appId: string,
  tableName: string,
  userId?: string,
  filters?: Record<string, unknown>,
  limit = 100,
  offset = 0
): Promise<{ rows: Record<string, unknown>[]; total: number }> {
  let whereClause = 'WHERE app_id = $1 AND table_name = $2';
  const params: unknown[] = [appId, tableName];
  let paramIdx = 3;

  // Optionally scope to user
  if (userId) {
    whereClause += ` AND user_id = $${paramIdx++}`;
    params.push(userId);
  }

  // Apply JSONB filters
  if (filters && Object.keys(filters).length > 0) {
    for (const [key, value] of Object.entries(filters)) {
      whereClause += ` AND data->>'${key}' = $${paramIdx++}`;
      params.push(String(value));
    }
  }

  const countResult = await query(
    `SELECT COUNT(*) FROM app_data ${whereClause}`,
    params
  );

  const dataResult = await query(
    `SELECT id, data, user_id, created_at, updated_at FROM app_data ${whereClause}
     ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
    [...params, limit, offset]
  );

  const rows = dataResult.rows.map(row => ({
    id: row.id,
    ...row.data,
    _user_id: row.user_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  return { rows, total: parseInt(countResult.rows[0].count) };
}

export async function getDynamicRecord(
  appId: string,
  tableName: string,
  recordId: string,
  userId?: string
): Promise<Record<string, unknown> | null> {
  let whereClause = 'WHERE app_id = $1 AND table_name = $2 AND id = $3';
  const params: unknown[] = [appId, tableName, recordId];

  if (userId) {
    whereClause += ' AND user_id = $4';
    params.push(userId);
  }

  const result = await query(
    `SELECT id, data, user_id, created_at, updated_at FROM app_data ${whereClause}`,
    params
  );

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return { id: row.id, ...row.data, created_at: row.created_at, updated_at: row.updated_at };
}

export async function updateDynamicRecord(
  appId: string,
  tableName: string,
  recordId: string,
  data: Record<string, unknown>,
  userId?: string
): Promise<Record<string, unknown> | null> {
  let whereClause = 'WHERE app_id = $1 AND table_name = $2 AND id = $3';
  const params: unknown[] = [appId, tableName, recordId];

  if (userId) {
    whereClause += ' AND user_id = $4';
    params.push(userId);
    params.push(JSON.stringify(data));
  } else {
    params.push(JSON.stringify(data));
  }

  const dataParamIdx = params.length;
  const result = await query(
    `UPDATE app_data SET data = $${dataParamIdx}, updated_at = NOW() ${whereClause}
     RETURNING id, data, created_at, updated_at`,
    params
  );

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return { id: row.id, ...row.data, created_at: row.created_at, updated_at: row.updated_at };
}

export async function deleteDynamicRecord(
  appId: string,
  tableName: string,
  recordId: string,
  userId?: string
): Promise<boolean> {
  let whereClause = 'WHERE app_id = $1 AND table_name = $2 AND id = $3';
  const params: unknown[] = [appId, tableName, recordId];

  if (userId) {
    whereClause += ' AND user_id = $4';
    params.push(userId);
  }

  const result = await query(`DELETE FROM app_data ${whereClause}`, params);
  return (result.rowCount || 0) > 0;
}

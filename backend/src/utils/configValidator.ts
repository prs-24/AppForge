import { AppConfig, ComponentDefinition, FieldDefinition, TableDefinition } from '../types';

// ================================================================
// Config Sanitizer — Handles incomplete, inconsistent, partially
// incorrect JSON configs gracefully
// ================================================================

const VALID_FIELD_TYPES = ['text', 'email', 'password', 'number', 'date', 'boolean', 'select', 'textarea', 'file'];
const VALID_COMPONENT_TYPES = ['form', 'table', 'dashboard', 'chart', 'card', 'list', 'custom'];
const VALID_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const VALID_COL_TYPES = ['text', 'integer', 'boolean', 'timestamp', 'jsonb', 'uuid', 'decimal'];

function sanitizeString(val: unknown, fallback = ''): string {
  if (typeof val === 'string') return val.trim();
  if (val != null) return String(val).trim();
  return fallback;
}

function sanitizeBoolean(val: unknown, fallback = false): boolean {
  if (typeof val === 'boolean') return val;
  if (val === 'true' || val === 1) return true;
  if (val === 'false' || val === 0) return false;
  return fallback;
}

function sanitizeField(field: unknown, index: number): FieldDefinition {
  if (!field || typeof field !== 'object') {
    return { name: `field_${index}`, type: 'text', label: `Field ${index}` };
  }
  const f = field as Record<string, unknown>;
  const type = VALID_FIELD_TYPES.includes(f.type as string) ? (f.type as FieldDefinition['type']) : 'text';
  return {
    name: sanitizeString(f.name, `field_${index}`).replace(/\s+/g, '_').toLowerCase(),
    label: sanitizeString(f.label || f.name, `Field ${index}`),
    type,
    required: sanitizeBoolean(f.required),
    placeholder: sanitizeString(f.placeholder),
    defaultValue: f.defaultValue,
    options: Array.isArray(f.options) ? f.options.map((o: unknown) => {
      if (typeof o === 'string') return { label: o, value: o };
      const opt = o as Record<string, unknown>;
      return {
        label: sanitizeString(opt?.label || opt?.value, String(o)),
        value: sanitizeString(opt?.value || opt?.label, String(o)),
      };
    }) : undefined,
  };
}

function sanitizeComponent(comp: unknown, index: number): ComponentDefinition {
  if (!comp || typeof comp !== 'object') {
    return { id: `component_${index}`, type: 'card', title: `Component ${index}` };
  }
  const c = comp as Record<string, unknown>;
  const type = VALID_COMPONENT_TYPES.includes(c.type as string)
    ? (c.type as ComponentDefinition['type'])
    : 'card';

  return {
    id: sanitizeString(c.id, `component_${index}`),
    type,
    title: sanitizeString(c.title || c.name, `Component ${index}`),
    fields: Array.isArray(c.fields) ? c.fields.map(sanitizeField) : undefined,
    columns: Array.isArray(c.columns) ? c.columns.map((col: unknown, i: number) => {
      if (!col || typeof col !== 'object') return { key: `col_${i}`, label: `Column ${i}` };
      const cc = col as Record<string, unknown>;
      return {
        key: sanitizeString(cc.key || cc.name, `col_${i}`),
        label: sanitizeString(cc.label || cc.key || cc.name, `Column ${i}`),
        type: sanitizeString(cc.type, 'text'),
        sortable: sanitizeBoolean(cc.sortable, false),
        filterable: sanitizeBoolean(cc.filterable, false),
      };
    }) : undefined,
    dataSource: sanitizeString(c.dataSource || c.datasource || c.data_source),
    config: typeof c.config === 'object' ? (c.config as Record<string, unknown>) : {},
  };
}

function sanitizeTableDefinition(table: unknown, index: number): TableDefinition {
  if (!table || typeof table !== 'object') {
    return {
      name: `table_${index}`,
      columns: [
        { name: 'id', type: 'uuid', primaryKey: true, defaultValue: 'uuid_generate_v4()' },
        { name: 'created_at', type: 'timestamp', defaultValue: 'NOW()' },
      ],
    };
  }
  const t = table as Record<string, unknown>;
  const columns = Array.isArray(t.columns)
    ? t.columns.map((col: unknown, i: number) => {
        if (!col || typeof col !== 'object') return { name: `col_${i}`, type: 'text' as const };
        const c = col as Record<string, unknown>;
        const colType = VALID_COL_TYPES.includes(c.type as string) ? c.type as 'text' : 'text';
        return {
          name: sanitizeString(c.name, `col_${i}`).replace(/\s+/g, '_').toLowerCase(),
          type: colType,
          nullable: sanitizeBoolean(c.nullable, true),
          unique: sanitizeBoolean(c.unique),
          primaryKey: sanitizeBoolean(c.primaryKey || c.primary_key),
          defaultValue: sanitizeString(c.defaultValue || c.default),
        };
      })
    : [];

  // Always ensure id + timestamps exist
  const hasId = columns.some(c => c.primaryKey || c.name === 'id');
  if (!hasId) {
    columns.unshift({ name: 'id', type: 'uuid', primaryKey: true, nullable: false, unique: true, defaultValue: 'uuid_generate_v4()' });
  }
  if (!columns.find(c => c.name === 'created_at')) {
    columns.push({ name: 'created_at', type: 'timestamp', nullable: true, unique: false, primaryKey: false, defaultValue: 'NOW()' });
  }

  return {
    name: sanitizeString(t.name, `table_${index}`).replace(/\s+/g, '_').toLowerCase(),
    columns,
  };
}

export function sanitizeConfig(raw: unknown): AppConfig {
  if (!raw || typeof raw !== 'object') {
    return { name: 'Untitled App' };
  }

  const config = raw as Record<string, unknown>;

  const sanitized: AppConfig = {
    name: sanitizeString(config.name, 'Untitled App'),
    description: sanitizeString(config.description),
    version: sanitizeString(config.version, '1.0.0'),
    language: sanitizeString(config.language, 'en'),
  };

  // Auth config
  if (config.auth && typeof config.auth === 'object') {
    const auth = config.auth as Record<string, unknown>;
    sanitized.auth = {
      enabled: sanitizeBoolean(auth.enabled, true),
      methods: Array.isArray(auth.methods)
        ? auth.methods.filter(m => ['email', 'google', 'github'].includes(m as string)) as ('email' | 'google' | 'github')[]
        : ['email'],
    };
  }

  // UI config
  if (config.ui && typeof config.ui === 'object') {
    const ui = config.ui as Record<string, unknown>;
    sanitized.ui = {
      layout: ['sidebar', 'topnav', 'minimal'].includes(ui.layout as string)
        ? (ui.layout as 'sidebar' | 'topnav' | 'minimal')
        : 'sidebar',
      pages: Array.isArray(ui.pages) ? ui.pages.map((p: unknown, i: number) => {
        if (!p || typeof p !== 'object') return { id: `page_${i}`, name: `Page ${i}`, path: `/page-${i}` };
        const page = p as Record<string, unknown>;
        return {
          id: sanitizeString(page.id, `page_${i}`),
          name: sanitizeString(page.name || page.title, `Page ${i}`),
          path: sanitizeString(page.path, `/page-${i}`),
          title: sanitizeString(page.title || page.name),
          components: Array.isArray(page.components)
            ? page.components.map(sanitizeComponent)
            : [],
          permissions: Array.isArray(page.permissions) ? page.permissions.map(String) : [],
        };
      }) : [],
    };
  }

  // API config
  if (config.api && typeof config.api === 'object') {
    const api = config.api as Record<string, unknown>;
    sanitized.api = {
      endpoints: Array.isArray(api.endpoints) ? api.endpoints.map((ep: unknown, i: number) => {
        if (!ep || typeof ep !== 'object') return { id: `ep_${i}`, name: `endpoint_${i}`, path: `/api/data`, method: 'GET' as const };
        const e = ep as Record<string, unknown>;
        const method = VALID_METHODS.includes((e.method as string)?.toUpperCase())
          ? (e.method as string).toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
          : 'GET';
        return {
          id: sanitizeString(e.id, `ep_${i}`),
          name: sanitizeString(e.name, `endpoint_${i}`),
          path: sanitizeString(e.path, `/api/data`),
          method,
          auth: sanitizeBoolean(e.auth, true),
          dataSource: sanitizeString(e.dataSource || e.table || e.datasource),
          body: Array.isArray(e.body) ? e.body.map(sanitizeField) : undefined,
        };
      }) : [],
    };
  }

  // Database config
  if (config.database && typeof config.database === 'object') {
    const db = config.database as Record<string, unknown>;
    sanitized.database = {
      tables: Array.isArray(db.tables) ? db.tables.map(sanitizeTableDefinition) : [],
    };
  }

  return sanitized;
}

export function validateConfig(config: AppConfig): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config.name) errors.push('App name is required');

  if (config.ui?.pages) {
    config.ui.pages.forEach((page, i) => {
      if (!page.path.startsWith('/')) {
        warnings.push(`Page ${i} path "${page.path}" should start with /`);
      }
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

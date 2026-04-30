import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, ChevronUp, ChevronDown, Search, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface Column {
  key: string;
  label?: string;
  type?: string;
  sortable?: boolean;
  filterable?: boolean;
}

interface Component {
  id: string;
  title?: string;
  columns?: Column[];
  dataSource?: string;
}

interface DynamicTableProps {
  component: Component;
  appId: string | null;
}

export default function DynamicTable({ component, appId }: DynamicTableProps) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const columns = component.columns || [];

  const fetchData = useCallback(async () => {
    if (!appId || !component.dataSource) return;
    setLoading(true);
    try {
      const res = await api.get(`/apps/${appId}/data/${component.dataSource}`, {
        params: { limit: pageSize, offset: page * pageSize },
      });
      setRows(res.data.rows || []);
      setTotal(res.data.total || 0);
    } catch {
      // silently fail in preview
    } finally {
      setLoading(false);
    }
  }, [appId, component.dataSource, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleDelete(id: unknown) {
    if (!appId || !component.dataSource) return;
    if (!confirm('Delete this record?')) return;
    try {
      await api.delete(`/apps/${appId}/data/${component.dataSource}/${id}`);
      toast.success('Deleted');
      fetchData();
    } catch {
      toast.error('Delete failed');
    }
  }

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  // Client-side sort + search
  let displayRows = [...rows];
  if (search.trim()) {
    const q = search.toLowerCase();
    displayRows = displayRows.filter(row =>
      Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q))
    );
  }
  if (sortKey) {
    displayRows.sort((a, b) => {
      const va = String(a[sortKey] ?? '');
      const vb = String(b[sortKey] ?? '');
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }

  const autoColumns: Column[] = columns.length > 0
    ? columns
    : rows.length > 0
      ? Object.keys(rows[0]).filter(k => k !== '_user_id').map(k => ({ key: k, label: k, sortable: true }))
      : [];

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="bg-dark-800 border border-slate-700/40 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700/40 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-white font-semibold">{component.title || 'Table'}</h3>
          {component.dataSource && (
            <p className="text-xs text-slate-500 mt-0.5">
              {total} record{total !== 1 ? 's' : ''} in <span className="font-mono">{component.dataSource}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="bg-dark-900 border border-slate-600/50 text-white text-sm rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-primary-500 w-44"
            />
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* No data source */}
      {!component.dataSource && (
        <div className="p-6 text-center text-amber-400 text-sm flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4" /> No dataSource configured
        </div>
      )}

      {/* No app saved */}
      {component.dataSource && !appId && (
        <div className="p-6 text-center text-slate-500 text-sm">
          Save the app to load data
        </div>
      )}

      {/* Table */}
      {component.dataSource && appId && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/40">
                  {autoColumns.map(col => (
                    <th
                      key={col.key}
                      className={`px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide ${
                        col.sortable !== false ? 'cursor-pointer hover:text-white select-none' : ''
                      }`}
                      onClick={() => col.sortable !== false && handleSort(col.key)}
                    >
                      <div className="flex items-center gap-1">
                        {col.label || col.key}
                        {col.sortable !== false && sortKey === col.key && (
                          sortDir === 'asc'
                            ? <ChevronUp className="w-3 h-3" />
                            : <ChevronDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={autoColumns.length + 1} className="px-4 py-8 text-center">
                      <Loader2 className="w-5 h-5 animate-spin text-slate-500 mx-auto" />
                    </td>
                  </tr>
                ) : displayRows.length === 0 ? (
                  <tr>
                    <td colSpan={autoColumns.length + 1} className="px-4 py-8 text-center text-slate-500 text-sm">
                      {search ? 'No matching records' : 'No records yet'}
                    </td>
                  </tr>
                ) : (
                  displayRows.map((row, i) => (
                    <tr
                      key={String(row.id || i)}
                      className="border-b border-slate-700/20 hover:bg-white/2 transition-colors"
                    >
                      {autoColumns.map(col => (
                        <td key={col.key} className="px-4 py-3 text-sm text-slate-300">
                          <CellValue value={row[col.key]} type={col.type} />
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="text-slate-500 hover:text-red-400 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-700/40 flex items-center justify-between text-sm text-slate-400">
              <span>Page {page + 1} of {totalPages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 rounded-lg bg-dark-900 border border-slate-600/50 disabled:opacity-40 hover:text-white transition-colors text-xs"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1 rounded-lg bg-dark-900 border border-slate-600/50 disabled:opacity-40 hover:text-white transition-colors text-xs"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CellValue({ value, type }: { value: unknown; type?: string }) {
  if (value === null || value === undefined) {
    return <span className="text-slate-600 italic text-xs">—</span>;
  }
  if (typeof value === 'boolean') {
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${value ? 'bg-green-500/10 text-green-400' : 'bg-slate-700/50 text-slate-400'}`}>
        {value ? 'Yes' : 'No'}
      </span>
    );
  }
  const str = String(value);
  // Detect timestamps
  if (type === 'timestamp' || /^\d{4}-\d{2}-\d{2}T/.test(str)) {
    try {
      return <span>{new Date(str).toLocaleDateString()}</span>;
    } catch { /**/ }
  }
  // Truncate long strings
  if (str.length > 60) return <span title={str}>{str.slice(0, 60)}…</span>;
  return <span>{str}</span>;
}

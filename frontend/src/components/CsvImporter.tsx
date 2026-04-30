import React, { useState, useRef } from 'react';
import { Upload, FileText, ArrowRight, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import Papa from 'papaparse';

interface CsvImporterProps {
  appId: string;
}

type Step = 'upload' | 'map' | 'importing' | 'done';

interface ParseResult {
  headers: string[];
  preview: Record<string, string>[];
  totalRows: number;
  filename: string;
}

interface ImportResult {
  inserted: number;
  failed: number;
  total: number;
}

export default function CsvImporter({ appId }: CsvImporterProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [tableName, setTableName] = useState('');
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    parseCsvClient(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.csv')) {
      setFile(f);
      parseCsvClient(f);
    } else {
      toast.error('Please drop a CSV file');
    }
  }

  function parseCsvClient(f: File) {
    setLoading(true);
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      preview: 5,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const cleanHeaders = headers.map(h => h.trim().replace(/\s+/g, '_').toLowerCase().replace(/[^a-z0-9_]/g, ''));
        const mapping: Record<string, string> = {};
        cleanHeaders.forEach((ch, i) => { mapping[headers[i]] = ch; });

        setParseResult({
          headers,
          preview: results.data as Record<string, string>[],
          totalRows: 0,
          filename: f.name,
        });
        setColumnMapping(mapping);
        setTableName(f.name.replace(/\.csv$/i, '').toLowerCase().replace(/[^a-z0-9_]/g, '_'));

        // Get full count
        Papa.parse(f, {
          header: true,
          skipEmptyLines: true,
          complete: (full) => {
            setParseResult(prev => prev ? { ...prev, totalRows: full.data.length } : prev);
            setLoading(false);
          },
        });
        setStep('map');
      },
      error: () => {
        toast.error('Failed to parse CSV');
        setLoading(false);
      },
    });
  }

  async function handleImport() {
    if (!file || !tableName) {
      toast.error('Table name is required');
      return;
    }

    setStep('importing');

    // Read full file and send as bulk JSON
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rawRows = results.data as Record<string, string>[];
        // Apply mapping
        const mappedRows = rawRows.map(row => {
          const mapped: Record<string, string> = {};
          for (const [orig, mapped_key] of Object.entries(columnMapping)) {
            if (mapped_key) mapped[mapped_key] = String(row[orig] ?? '').trim();
          }
          return mapped;
        });

        try {
          const res = await api.post(`/apps/${appId}/data/${tableName}/bulk`, { records: mappedRows });
          setImportResult(res.data);
          setStep('done');
          toast.success(`Imported ${res.data.inserted} records!`);
        } catch (err: unknown) {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Import failed';
          toast.error(msg);
          setStep('map');
        }
      },
      error: () => {
        toast.error('Failed to read CSV');
        setStep('map');
      },
    });
  }

  function reset() {
    setStep('upload');
    setFile(null);
    setParseResult(null);
    setTableName('');
    setColumnMapping({});
    setImportResult(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xl font-bold text-white mb-2">CSV Import</h2>
      <p className="text-slate-400 text-sm mb-6">Upload a CSV file, map its columns, and store the data in your app.</p>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(['upload', 'map', 'importing', 'done'] as Step[]).map((s, i) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-2 text-sm ${step === s ? 'text-primary-400' : ['done'].includes(step) ? 'text-slate-500' : i < (['upload', 'map', 'importing', 'done'] as Step[]).indexOf(step) ? 'text-green-400' : 'text-slate-600'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === s ? 'bg-primary-600 text-white' : 'bg-slate-700 text-slate-400'}`}>{i + 1}</span>
              <span className="capitalize hidden sm:block">{s}</span>
            </div>
            {i < 3 && <ArrowRight className="w-4 h-4 text-slate-700 flex-shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      {/* Step: Upload */}
      {step === 'upload' && (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-slate-600/50 hover:border-primary-500/50 rounded-2xl p-12 text-center cursor-pointer transition-all group"
        >
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
          <Upload className="w-12 h-12 text-slate-600 group-hover:text-primary-400 mx-auto mb-4 transition-colors" />
          <h3 className="text-white font-semibold mb-1">Drop your CSV here</h3>
          <p className="text-slate-400 text-sm">or click to browse</p>
          <p className="text-slate-600 text-xs mt-2">Max 10MB · Up to 5,000 rows</p>
          {loading && <Loader2 className="w-5 h-5 animate-spin text-primary-400 mx-auto mt-4" />}
        </div>
      )}

      {/* Step: Map */}
      {step === 'map' && parseResult && (
        <div className="space-y-5">
          {/* File info */}
          <div className="flex items-center gap-3 bg-dark-800 border border-slate-700/40 rounded-xl px-4 py-3">
            <FileText className="w-5 h-5 text-primary-400" />
            <div>
              <p className="text-white text-sm font-medium">{parseResult.filename}</p>
              <p className="text-slate-400 text-xs">{parseResult.totalRows} rows · {parseResult.headers.length} columns</p>
            </div>
          </div>

          {/* Table name */}
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Target Table Name</label>
            <input
              value={tableName}
              onChange={e => setTableName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
              placeholder="e.g. products, customers"
              className="w-full bg-dark-900 border border-slate-600/50 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-500 font-mono"
            />
          </div>

          {/* Column mapping */}
          <div>
            <h4 className="text-sm text-slate-400 font-medium mb-3">Column Mapping (CSV → Database)</h4>
            <div className="space-y-2">
              {parseResult.headers.map(header => (
                <div key={header} className="flex items-center gap-3">
                  <span className="flex-1 text-sm text-slate-300 font-mono bg-dark-900 border border-slate-700/40 rounded-lg px-3 py-2 truncate">
                    {header}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                  <input
                    value={columnMapping[header] || ''}
                    onChange={e => setColumnMapping(prev => ({ ...prev, [header]: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                    className="flex-1 bg-dark-900 border border-slate-600/50 text-white rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          {parseResult.preview.length > 0 && (
            <div>
              <h4 className="text-sm text-slate-400 font-medium mb-2">Preview (first {parseResult.preview.length} rows)</h4>
              <div className="overflow-x-auto rounded-xl border border-slate-700/40">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-700/40">
                      {parseResult.headers.slice(0, 6).map(h => (
                        <th key={h} className="px-3 py-2 text-left text-slate-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.preview.map((row, i) => (
                      <tr key={i} className="border-b border-slate-700/20">
                        {parseResult.headers.slice(0, 6).map(h => (
                          <td key={h} className="px-3 py-2 text-slate-300 max-w-24 truncate">{String(row[h] ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={reset} className="px-4 py-2.5 border border-slate-600/50 text-slate-400 hover:text-white rounded-xl text-sm transition-all">
              ← Back
            </button>
            <button
              onClick={handleImport}
              disabled={!tableName}
              className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-all"
            >
              Import {parseResult.totalRows} Rows
            </button>
          </div>
        </div>
      )}

      {/* Step: Importing */}
      {step === 'importing' && (
        <div className="text-center py-16">
          <Loader2 className="w-12 h-12 animate-spin text-primary-400 mx-auto mb-4" />
          <h3 className="text-white font-semibold text-lg mb-1">Importing data...</h3>
          <p className="text-slate-400 text-sm">This may take a moment for large files</p>
        </div>
      )}

      {/* Step: Done */}
      {step === 'done' && importResult && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/10 rounded-2xl mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="text-white font-semibold text-lg mb-2">Import Complete!</h3>
          <div className="flex justify-center gap-6 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{importResult.inserted}</p>
              <p className="text-slate-400 text-xs">Inserted</p>
            </div>
            {importResult.failed > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{importResult.failed}</p>
                <p className="text-slate-400 text-xs">Failed</p>
              </div>
            )}
          </div>
          <button
            onClick={reset}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
          >
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
}

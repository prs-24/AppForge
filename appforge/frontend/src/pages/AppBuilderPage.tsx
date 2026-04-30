import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Save, Eye, Github, Upload, AlertTriangle, CheckCircle, Loader2, ChevronLeft, Plus } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import AppPreview from '../components/renderer/AppPreview';
import CsvImporter from '../components/CsvImporter';

const EXAMPLE_CONFIG = {
  name: "My Task Manager",
  description: "A simple task management app",
  version: "1.0.0",
  language: "en",
  auth: { enabled: true, methods: ["email", "google"] },
  ui: {
    layout: "sidebar",
    pages: [
      {
        id: "tasks",
        name: "Tasks",
        path: "/tasks",
        components: [
          {
            id: "task_form",
            type: "form",
            title: "Add Task",
            fields: [
              { name: "title", label: "Task Title", type: "text", required: true, placeholder: "Enter task title" },
              { name: "description", label: "Description", type: "textarea", placeholder: "Optional details" },
              { name: "priority", label: "Priority", type: "select", options: [
                { label: "Low", value: "low" },
                { label: "Medium", value: "medium" },
                { label: "High", value: "high" }
              ]},
              { name: "due_date", label: "Due Date", type: "date" }
            ],
            dataSource: "tasks"
          },
          {
            id: "task_table",
            type: "table",
            title: "All Tasks",
            dataSource: "tasks",
            columns: [
              { key: "title", label: "Title", sortable: true },
              { key: "priority", label: "Priority" },
              { key: "due_date", label: "Due Date", sortable: true },
              { key: "created_at", label: "Created" }
            ]
          }
        ]
      },
      {
        id: "dashboard",
        name: "Dashboard",
        path: "/dashboard",
        components: [
          { id: "stats", type: "dashboard", title: "Overview", dataSource: "tasks" }
        ]
      }
    ]
  },
  api: {
    endpoints: [
      { id: "get_tasks", name: "Get Tasks", path: "/api/tasks", method: "GET", auth: true, dataSource: "tasks" },
      { id: "create_task", name: "Create Task", path: "/api/tasks", method: "POST", auth: true, dataSource: "tasks" }
    ]
  },
  database: {
    tables: [
      {
        name: "tasks",
        columns: [
          { name: "title", type: "text", nullable: false },
          { name: "description", type: "text", nullable: true },
          { name: "priority", type: "text", nullable: true },
          { name: "due_date", type: "timestamp", nullable: true },
          { name: "completed", type: "boolean", defaultValue: "false" }
        ]
      }
    ]
  }
};

type TabType = 'editor' | 'preview' | 'csv' | 'export';

export default function AppBuilderPage() {
  const { t } = useTranslation();
  const { appId } = useParams();
  const navigate = useNavigate();
  const isNew = appId === 'new';

  const [configText, setConfigText] = useState(JSON.stringify(EXAMPLE_CONFIG, null, 2));
  const [parsedConfig, setParsedConfig] = useState<Record<string, unknown> | null>(EXAMPLE_CONFIG);
  const [parseError, setParseError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabType>('editor');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savedAppId, setSavedAppId] = useState<string | null>(isNew ? null : appId || null);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (!isNew && appId) {
      loadApp(appId);
    }
  }, [appId]);

  async function loadApp(id: string) {
    try {
      const res = await api.get(`/apps/${id}`);
      const config = res.data.config;
      setConfigText(JSON.stringify(config, null, 2));
      setParsedConfig(config);
    } catch {
      toast.error('Failed to load app config');
    }
  }

  const handleConfigChange = useCallback((value: string) => {
    setConfigText(value);
    try {
      const parsed = JSON.parse(value);
      setParsedConfig(parsed);
      setParseError(null);
    } catch (e) {
      setParseError((e as Error).message);
      setParsedConfig(null);
    }
  }, []);

  async function handleSave() {
    if (!parsedConfig) {
      toast.error('Fix JSON errors before saving');
      return;
    }
    setSaving(true);
    try {
      let res;
      if (savedAppId) {
        res = await api.put(`/apps/${savedAppId}`, parsedConfig);
      } else {
        res = await api.post('/apps', parsedConfig);
        setSavedAppId(res.data.id);
        navigate(`/apps/${res.data.id}`, { replace: true });
      }
      setWarnings(res.data.warnings || []);
      toast.success('App saved!');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Save failed';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleGithubExport() {
    if (!savedAppId) {
      toast.error('Save the app first');
      return;
    }
    setExporting(true);
    try {
      const res = await api.post(`/apps/${savedAppId}/export/github`);
      toast.success('Exported to GitHub!');
      window.open(res.data.repoUrl, '_blank');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Export failed';
      toast.error(msg);
    } finally {
      setExporting(false);
    }
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'editor', label: 'Config Editor' },
    { id: 'preview', label: 'Preview' },
    { id: 'csv', label: 'CSV Import' },
    { id: 'export', label: 'Export' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-dark-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-white font-semibold">
            {isNew ? 'New App' : parsedConfig?.name as string || 'App Builder'}
          </h2>
          {warnings.length > 0 && (
            <span className="text-xs text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> {warnings.length} warning{warnings.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !!parseError}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t('save')}
          </button>
          <button
            onClick={handleGithubExport}
            disabled={exporting || !savedAppId}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
            GitHub
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-slate-700/50 bg-dark-900/30">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-primary-600/20 text-primary-300'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'editor' && (
          <div className="h-full flex flex-col">
            {parseError && (
              <div className="mx-4 mt-3 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {parseError}
              </div>
            )}
            {!parseError && parsedConfig && (
              <div className="mx-4 mt-3 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                Valid JSON — {Object.keys(parsedConfig).length} top-level keys
              </div>
            )}
            <textarea
              value={configText}
              onChange={e => handleConfigChange(e.target.value)}
              className="flex-1 bg-dark-950 text-slate-300 font-mono text-sm p-6 resize-none focus:outline-none border-0 leading-relaxed mt-3"
              spellCheck={false}
              placeholder="Paste your JSON config here..."
            />
          </div>
        )}

        {tab === 'preview' && (
          <div className="h-full overflow-auto">
            {parsedConfig ? (
              <AppPreview config={parsedConfig} appId={savedAppId} />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                Fix JSON errors to see preview
              </div>
            )}
          </div>
        )}

        {tab === 'csv' && (
          <div className="h-full overflow-auto p-6">
            {savedAppId ? (
              <CsvImporter appId={savedAppId} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
                <Upload className="w-10 h-10 opacity-30" />
                <p>Save your app first to import CSV data</p>
                <button
                  onClick={handleSave}
                  disabled={saving || !!parseError}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  Save App
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'export' && (
          <ExportTab appId={savedAppId} config={parsedConfig} />
        )}
      </div>
    </div>
  );
}

function ExportTab({ appId, config }: { appId: string | null; config: Record<string, unknown> | null }) {
  const [structure, setStructure] = useState<{ files: { path: string; content: string; language: string }[] } | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadStructure() {
    if (!appId) return;
    setLoading(true);
    try {
      const res = await api.get(`/apps/${appId}/export/structure`);
      setStructure(res.data);
      setSelectedFile(res.data.files[0]?.path || null);
    } catch {
      toast.error('Failed to generate structure');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (appId) loadStructure();
  }, [appId]);

  if (!appId) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        Save your app to see the export structure
      </div>
    );
  }

  const selectedContent = structure?.files.find(f => f.path === selectedFile)?.content || '';

  return (
    <div className="flex h-full">
      {/* File tree */}
      <div className="w-56 border-r border-slate-700/50 p-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Generated Files</h3>
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
        ) : (
          <div className="space-y-1">
            {structure?.files.map(f => (
              <button
                key={f.path}
                onClick={() => setSelectedFile(f.path)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-all ${
                  selectedFile === f.path ? 'bg-primary-600/20 text-primary-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                {f.path}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* File content */}
      <div className="flex-1 overflow-auto">
        {selectedContent && (
          <pre className="p-6 text-slate-300 font-mono text-xs leading-relaxed whitespace-pre-wrap">
            {selectedContent}
          </pre>
        )}
      </div>
    </div>
  );
}

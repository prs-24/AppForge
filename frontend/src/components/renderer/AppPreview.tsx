import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import api from '../../lib/api';
import DynamicForm from './DynamicForm';
import DynamicTable from './DynamicTable';
import DynamicDashboard from './DynamicDashboard';
import toast from 'react-hot-toast';

interface AppConfig {
  name?: string;
  ui?: {
    layout?: string;
    pages?: Page[];
  };
}

interface Page {
  id: string;
  name: string;
  path: string;
  title?: string;
  components?: Component[];
}

interface Component {
  id: string;
  type: string;
  title?: string;
  fields?: unknown[];
  columns?: unknown[];
  dataSource?: string;
  config?: Record<string, unknown>;
}

interface AppPreviewProps {
  config: Record<string, unknown>;
  appId: string | null;
}

export default function AppPreview({ config, appId }: AppPreviewProps) {
  const appConfig = config as AppConfig;
  const pages = appConfig.ui?.pages || [];
  const [activePage, setActivePage] = useState<Page | null>(pages[0] || null);

  useEffect(() => {
    if (pages.length > 0 && !activePage) setActivePage(pages[0]);
  }, [pages]);

  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
        <AlertTriangle className="w-10 h-10 opacity-30" />
        <p>No pages defined in config.</p>
        <p className="text-sm">Add a <code className="text-primary-400">ui.pages</code> array to your config.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-dark-950">
      {/* Sidebar nav */}
      <div className="w-52 border-r border-slate-700/50 bg-dark-900 flex flex-col">
        <div className="p-4 border-b border-slate-700/50">
          <h3 className="font-semibold text-white text-sm">{appConfig.name || 'App Preview'}</h3>
          <p className="text-xs text-slate-500 mt-0.5">Live Preview</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {pages.map(page => (
            <button
              key={page.id}
              onClick={() => setActivePage(page)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                activePage?.id === page.id
                  ? 'bg-primary-600/20 text-primary-300 font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {page.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-auto p-6">
        {activePage && (
          <PageRenderer page={activePage} appId={appId} />
        )}
      </div>
    </div>
  );
}

function PageRenderer({ page, appId }: { page: Page; appId: string | null }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-white">{page.title || page.name}</h1>
        <p className="text-xs text-slate-500 mt-0.5">{page.path}</p>
      </div>

      {(!page.components || page.components.length === 0) && (
        <div className="border border-dashed border-slate-700/50 rounded-xl p-8 text-center text-slate-500 text-sm">
          No components on this page
        </div>
      )}

      {page.components?.map(component => (
        <ComponentRenderer key={component.id} component={component} appId={appId} />
      ))}
    </div>
  );
}

function ComponentRenderer({ component, appId }: { component: Component; appId: string | null }) {
  switch (component.type) {
    case 'form':
      return <DynamicForm component={component as any} appId={appId} />;
    case 'table':
      return <DynamicTable component={component as any} appId={appId} />;
    case 'dashboard':
      return <DynamicDashboard component={component} appId={appId} />;
    case 'card':
      return <CardComponent component={component} />;
    case 'list':
      return <ListComponent component={component} appId={appId} />;
    case 'custom':
      return (
        <div className="bg-dark-800 border border-slate-700/40 rounded-xl p-5">
          <h3 className="text-white font-medium mb-2">{component.title || 'Custom Component'}</h3>
          <pre className="text-xs text-slate-400 overflow-auto">
            {JSON.stringify(component.config, null, 2)}
          </pre>
        </div>
      );
    default:
      return (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-400 text-sm">
          Unknown component type: <code className="font-mono">{component.type}</code>
        </div>
      );
  }
}

function CardComponent({ component }: { component: Component }) {
  return (
    <div className="bg-dark-800 border border-slate-700/40 rounded-xl p-5">
      <h3 className="text-white font-semibold mb-2">{component.title || 'Card'}</h3>
      <p className="text-slate-400 text-sm">Card component — configure via config.json</p>
    </div>
  );
}

function ListComponent({ component, appId }: { component: Component; appId: string | null }) {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (appId && component.dataSource) {
      api.get(`/apps/${appId}/data/${component.dataSource}`)
        .then(r => setItems(r.data.rows || []))
        .catch(() => {});
    }
  }, [appId, component.dataSource]);

  return (
    <div className="bg-dark-800 border border-slate-700/40 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-700/40">
        <h3 className="text-white font-semibold">{component.title || 'List'}</h3>
      </div>
      <div className="divide-y divide-slate-700/40">
        {items.length === 0 ? (
          <div className="p-5 text-slate-500 text-sm text-center">No items</div>
        ) : (
          items.map((item, i) => (
            <div key={i} className="px-5 py-3 text-slate-300 text-sm">
              {String(item.title || item.name || item.label || `Item ${i + 1}`)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

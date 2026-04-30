import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Plus, Zap, Clock, Github, Globe, Trash2, Edit3, Loader2 } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface AppCard {
  id: string;
  name: string;
  description: string;
  version: string;
  is_published: boolean;
  published_url?: string;
  github_repo?: string;
  created_at: string;
  updated_at: string;
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [apps, setApps] = useState<AppCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApps();
  }, []);

  async function fetchApps() {
    try {
      const res = await api.get('/apps');
      setApps(res.data.apps);
    } catch {
      toast.error('Failed to load apps');
    } finally {
      setLoading(false);
    }
  }

  async function deleteApp(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/apps/${id}`);
      setApps(prev => prev.filter(a => a.id !== id));
      toast.success('App deleted');
    } catch {
      toast.error('Failed to delete app');
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('myApps')}</h1>
          <p className="text-slate-400 mt-1">{apps.length} app{apps.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={() => navigate('/apps/new')}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-primary-600/20"
        >
          <Plus className="w-4 h-4" />
          {t('newApp')}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : apps.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-24 border-2 border-dashed border-slate-700/50 rounded-2xl"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600/10 rounded-2xl mb-4">
            <Zap className="w-8 h-8 text-primary-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{t('noApps')}</h3>
          <p className="text-slate-400 mb-6">Paste a JSON config and generate your app in seconds.</p>
          <button
            onClick={() => navigate('/apps/new')}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
          >
            Create First App
          </button>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {apps.map(app => (
            <motion.div key={app.id} variants={itemVariants}>
              <div className="bg-dark-800 border border-slate-700/40 rounded-2xl p-5 hover:border-primary-500/40 transition-all group">
                {/* App icon + name */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                      {app.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm">{app.name}</h3>
                      <span className="text-xs text-slate-500">v{app.version}</span>
                    </div>
                  </div>
                  {app.is_published && (
                    <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full">Live</span>
                  )}
                </div>

                {app.description && (
                  <p className="text-slate-400 text-xs mb-4 line-clamp-2">{app.description}</p>
                )}

                {/* Links */}
                <div className="flex items-center gap-2 mb-4">
                  {app.github_repo && (
                    <a href={app.github_repo} target="_blank" rel="noreferrer"
                      className="text-xs text-slate-500 hover:text-white flex items-center gap-1 transition-colors">
                      <Github className="w-3 h-3" /> GitHub
                    </a>
                  )}
                  {app.published_url && (
                    <a href={app.published_url} target="_blank" rel="noreferrer"
                      className="text-xs text-slate-500 hover:text-white flex items-center gap-1 transition-colors">
                      <Globe className="w-3 h-3" /> Live
                    </a>
                  )}
                  <span className="ml-auto text-xs text-slate-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(app.updated_at), { addSuffix: true })}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-slate-700/40">
                  <button
                    onClick={() => navigate(`/apps/${app.id}`)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-primary-600/10 hover:bg-primary-600/20 text-primary-400 rounded-lg py-2 text-xs font-medium transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => navigate(`/apps/${app.id}/preview`)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg py-2 text-xs font-medium transition-all"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => deleteApp(app.id, app.name)}
                    className="flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg py-2 px-2.5 text-xs transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

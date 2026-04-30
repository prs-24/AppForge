import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, TrendingUp, Database, Activity, Users } from 'lucide-react';
import api from '../../lib/api';

interface Component {
  id: string;
  title?: string;
  dataSource?: string;
  config?: Record<string, unknown>;
}

interface DynamicDashboardProps {
  component: Component;
  appId: string | null;
}

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

export default function DynamicDashboard({ component, appId }: DynamicDashboardProps) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (appId && component.dataSource) {
      setLoading(true);
      api.get(`/apps/${appId}/data/${component.dataSource}`, { params: { limit: 500 } })
        .then(r => setRows(r.data.rows || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [appId, component.dataSource]);

  if (loading) {
    return (
      <div className="bg-dark-800 border border-slate-700/40 rounded-xl p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  // Compute stats
  const totalRecords = rows.length;
  const today = new Date().toDateString();
  const todayCount = rows.filter(r => {
    const d = r.created_at ? new Date(String(r.created_at)).toDateString() : '';
    return d === today;
  }).length;

  // Group by any string field for chart
  const stringFields = rows.length > 0
    ? Object.keys(rows[0]).filter(k => {
        const val = rows[0][k];
        return typeof val === 'string' && !['id', '_user_id', 'created_at', 'updated_at'].includes(k) && val.length < 50;
      })
    : [];

  const groupField = stringFields[0];
  const groupCounts: Record<string, number> = {};
  if (groupField) {
    rows.forEach(r => {
      const val = String(r[groupField] || 'Unknown');
      groupCounts[val] = (groupCounts[val] || 0) + 1;
    });
  }
  const chartData = Object.entries(groupCounts).map(([name, count]) => ({ name, count }));

  // Daily counts for bar chart
  const dailyCounts: Record<string, number> = {};
  rows.forEach(r => {
    if (r.created_at) {
      const d = new Date(String(r.created_at)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyCounts[d] = (dailyCounts[d] || 0) + 1;
    }
  });
  const dailyData = Object.entries(dailyCounts).slice(-7).map(([date, count]) => ({ date, count }));

  return (
    <div className="space-y-4">
      <div className="bg-dark-800 border border-slate-700/40 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">{component.title || 'Dashboard'}</h3>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard icon={<Database className="w-5 h-5" />} label="Total Records" value={totalRecords} color="blue" />
          <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Today" value={todayCount} color="green" />
          <StatCard icon={<Activity className="w-5 h-5" />} label="Data Source" value={component.dataSource || '—'} color="purple" small />
          <StatCard icon={<Users className="w-5 h-5" />} label="Fields" value={rows.length > 0 ? Object.keys(rows[0]).length : 0} color="amber" />
        </div>

        {rows.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-8 border border-dashed border-slate-700/50 rounded-xl">
            No data yet — create records via the form component
          </div>
        )}

        {/* Charts */}
        {dailyData.length > 1 && (
          <div className="mb-4">
            <h4 className="text-sm text-slate-400 font-medium mb-3">Records over time</h4>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#818cf8' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartData.length > 1 && chartData.length <= 8 && (
          <div>
            <h4 className="text-sm text-slate-400 font-medium mb-3">Distribution by "{groupField}"</h4>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={chartData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, color, small,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  small?: boolean;
}) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-500/10',
    green: 'text-green-400 bg-green-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
  };
  return (
    <div className="bg-dark-900 border border-slate-700/40 rounded-xl p-4">
      <div className={`inline-flex p-2 rounded-lg mb-2 ${colorMap[color]}`}>{icon}</div>
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <p className={`font-bold ${small ? 'text-sm text-slate-300 truncate' : 'text-xl text-white'}`}>{value}</p>
    </div>
  );
}

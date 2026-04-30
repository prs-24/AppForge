import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Globe, Bell, Shield, Save, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SUPPORTED_LANGUAGES } from '../i18n';
import i18n from '../i18n';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user, updateLocale } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [locale, setLocale] = useState(user?.locale || i18n.language || 'en');
  const [saving, setSaving] = useState(false);
  const [testNotifSending, setTestNotifSending] = useState(false);

  async function handleSaveProfile() {
    setSaving(true);
    try {
      await api.put('/auth/me', { displayName, locale });
      i18n.changeLanguage(locale);
      updateLocale(locale);
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function sendTestNotification() {
    setTestNotifSending(true);
    try {
      await api.post('/notifications/trigger', {
        title: 'Test Notification',
        message: 'This is a test notification from AppForge!',
        type: 'info',
      });
      toast.success('Test notification sent!');
    } catch {
      toast.error('Failed to send notification');
    } finally {
      setTestNotifSending(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <div className="bg-dark-800 border border-slate-700/40 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-primary-600/10 rounded-xl flex items-center justify-center">
            <User className="w-5 h-5 text-primary-400" />
          </div>
          <h2 className="text-white font-semibold">Profile</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Email</label>
            <input
              value={user?.email || ''}
              disabled
              className="w-full bg-dark-900/50 border border-slate-700/40 text-slate-500 rounded-xl px-4 py-2.5 text-sm cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Display Name</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full bg-dark-900 border border-slate-600/50 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-500 transition-colors"
              placeholder="Your display name"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Role</label>
            <div className="inline-flex items-center gap-2 bg-primary-600/10 border border-primary-500/20 rounded-lg px-3 py-1.5">
              <Shield className="w-3.5 h-3.5 text-primary-400" />
              <span className="text-primary-300 text-sm capitalize">{user?.role || 'user'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Language */}
      <div className="bg-dark-800 border border-slate-700/40 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-primary-600/10 rounded-xl flex items-center justify-center">
            <Globe className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold">Language & Localization</h2>
            <p className="text-slate-500 text-xs mt-0.5">Choose your preferred language</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {SUPPORTED_LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => {
                setLocale(lang.code);
                i18n.changeLanguage(lang.code);
              }}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                locale === lang.code
                  ? 'bg-primary-600/20 border-primary-500/40 text-primary-300'
                  : 'bg-dark-900 border-slate-700/40 text-slate-400 hover:text-white hover:border-slate-600'
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notifications test */}
      <div className="bg-dark-800 border border-slate-700/40 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-primary-600/10 rounded-xl flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold">Notifications</h2>
            <p className="text-slate-500 text-xs mt-0.5">Test the notification system</p>
          </div>
        </div>

        <button
          onClick={sendTestNotification}
          disabled={testNotifSending}
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
        >
          {testNotifSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
          Send Test Notification
        </button>
      </div>

      {/* Save */}
      <button
        onClick={handleSaveProfile}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-all"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {t('save')} Changes
      </button>
    </div>
  );
}

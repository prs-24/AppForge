import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Zap, LayoutDashboard, Bell, Settings, LogOut,
  ChevronLeft, ChevronRight, Globe, User, Menu, X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SUPPORTED_LANGUAGES } from '../../i18n';
import i18n from '../../i18n';
import toast from 'react-hot-toast';
import NotificationBell from '../NotificationBell';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login');
    toast.success('Logged out');
  }

  const navItems = [
    { to: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, label: t('dashboard') },
    { to: '/notifications', icon: <Bell className="w-5 h-5" />, label: t('notifications') },
    { to: '/settings', icon: <Settings className="w-5 h-5" />, label: 'Settings' },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-slate-700/50 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        {!collapsed && <span className="font-bold text-white text-lg">AppForge</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                collapsed ? 'justify-center' : ''
              } ${isActive
                ? 'bg-primary-600/20 text-primary-300'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            {item.icon}
            {!collapsed && item.label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-slate-700/50 space-y-1">
        {/* Language switcher */}
        <div className="relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all ${collapsed ? 'justify-center' : ''}`}
          >
            <Globe className="w-5 h-5 flex-shrink-0" />
            {!collapsed && (
              <span>{SUPPORTED_LANGUAGES.find(l => l.code === i18n.language)?.flag || '🌐'} {i18n.language.toUpperCase()}</span>
            )}
          </button>
          {showLangMenu && (
            <div className="absolute bottom-full left-0 mb-2 w-44 bg-dark-800 border border-slate-700/50 rounded-xl shadow-xl overflow-hidden z-50">
              {SUPPORTED_LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => {
                    i18n.changeLanguage(lang.code);
                    setShowLangMenu(false);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                    i18n.language === lang.code ? 'bg-primary-600/20 text-primary-300' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span>{lang.flag}</span> {lang.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User */}
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.displayName || 'User'}</p>
              <p className="text-slate-500 text-xs truncate">{user?.email}</p>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && t('logout')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-dark-950 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col bg-dark-900 border-r border-slate-700/50 transition-all duration-300 flex-shrink-0 ${collapsed ? 'w-16' : 'w-56'}`}>
        <SidebarContent />
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute left-0 top-1/2 -translate-y-1/2 translate-x-full ml-0.5 w-5 h-10 bg-dark-800 border border-slate-700/50 rounded-r-lg flex items-center justify-center text-slate-500 hover:text-white transition-colors z-10"
          style={{ left: collapsed ? '4rem' : '14rem' }}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-dark-900 border-r border-slate-700/50 z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-dark-900/80 backdrop-blur-sm">
          <button onClick={() => setMobileOpen(true)} className="text-slate-400 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary-400" />
            <span className="font-bold text-white">AppForge</span>
          </div>
          <NotificationBell />
        </div>

        {/* Desktop topbar */}
        <div className="hidden md:flex items-center justify-end px-6 py-3 border-b border-slate-700/50 bg-dark-900/30 backdrop-blur-sm">
          <NotificationBell />
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

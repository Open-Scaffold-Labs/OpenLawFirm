import React, { useState } from 'react';
import { Scale, LayoutDashboard, Briefcase, Users, Clock, FileText, Landmark, CalendarDays, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';

const navItems = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'matters', label: 'Matters', icon: Briefcase },
  { key: 'clients', label: 'Clients', icon: Users },
  { key: 'time-entry', label: 'Time & Billing', icon: Clock },
  { key: 'billing', label: 'Invoices', icon: FileText },
  { key: 'trust', label: 'Trust Accounts', icon: Landmark },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export default function Layout({ activePage, onNavigate, user, onLogout, children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-56'} bg-law-900 text-white flex flex-col transition-all duration-200`}>
        <div className="flex items-center px-4 py-4 border-b border-law-800">
          <Scale className="w-7 h-7 text-law-300 flex-shrink-0" />
          {!collapsed && <span className="ml-3 font-semibold text-lg">OpenLawFirm</span>}
        </div>

        <nav className="flex-1 py-2 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activePage === item.key;
            return (
              <button key={item.key} onClick={() => onNavigate(item.key)}
                className={`w-full flex items-center px-4 py-2.5 text-sm transition
                  ${isActive ? 'bg-law-700 text-white' : 'text-law-300 hover:bg-law-800 hover:text-white'}`}>
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="ml-3">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-law-800 p-3">
          {!collapsed && (
            <div className="text-sm mb-2">
              <div className="font-medium text-law-200">{user?.full_name}</div>
              <div className="text-law-400 text-xs capitalize">{user?.role}</div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <button onClick={onLogout} className="text-law-400 hover:text-white transition" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
            <button onClick={() => setCollapsed(!collapsed)} className="text-law-400 hover:text-white transition">
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

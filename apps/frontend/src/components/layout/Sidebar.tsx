'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/auth';
import { useModulesStore } from '@/store/modules';

interface SubMenuItem {
  name: string;
  href: string;
  icon: string;
}

interface MenuItem {
  name: string;
  href: string;
  icon: string;
  gradient: string;
  hoverGradient: string;
  permission?: string;
  children?: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: 'fa-home',
    gradient: 'from-blue-500 to-blue-600',
    hoverGradient: 'hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-900/20 dark:hover:to-blue-800/20'
  },
  {
    name: 'Riparazioni',
    href: '/riparazioni',
    icon: 'fa-hammer',
    gradient: 'from-blue-500 to-blue-600',
    hoverGradient: 'hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-900/20 dark:hover:to-blue-800/20',
    permission: 'riparazioni',
    children: [
      { name: 'Dashboard', href: '/riparazioni', icon: 'fa-home' },
      { name: 'Nuova', href: '/riparazioni/create', icon: 'fa-plus' },
      { name: 'Elenco', href: '/riparazioni/list', icon: 'fa-list' },
    ]
  },
  {
    name: 'Controllo Qualità',
    href: '/quality',
    icon: 'fa-check-circle',
    gradient: 'from-green-500 to-emerald-600',
    hoverGradient: 'hover:from-green-50 hover:to-emerald-100 dark:hover:from-green-900/20 dark:hover:to-emerald-800/20',
    permission: 'qualita',
    children: [
      { name: 'Dashboard', href: '/quality', icon: 'fa-home' },
      { name: 'Consulto Record', href: '/quality/records', icon: 'fa-list' },
      { name: 'Report', href: '/quality/reports', icon: 'fa-file-alt' },
      { name: 'Reparti', href: '/quality/departments', icon: 'fa-building' },
      { name: 'Tipi Difetti', href: '/quality/defects', icon: 'fa-bug' },
    ]
  },
  {
    name: 'Produzione',
    href: '/produzione',
    icon: 'fa-calendar',
    gradient: 'from-yellow-500 to-orange-500',
    hoverGradient: 'hover:from-yellow-50 hover:to-orange-100 dark:hover:from-yellow-900/20 dark:hover:to-orange-800/20',
    permission: 'produzione',
    children: [
      { name: 'Dashboard', href: '/produzione', icon: 'fa-home' },
      { name: 'Nuova', href: '/produzione/new', icon: 'fa-plus' },
      { name: 'Calendario', href: '/produzione/calendario', icon: 'fa-calendar' },
      { name: 'Statistiche', href: '/produzione/statistics', icon: 'fa-chart-simple' },
      { name: 'Report', href: '/produzione/csv', icon: 'fa-file-csv' },
    ]
  },
  {
    name: 'Export',
    href: '/export',
    icon: 'fa-globe-europe',
    gradient: 'from-indigo-500 to-purple-600',
    hoverGradient: 'hover:from-indigo-50 hover:to-purple-100 dark:hover:from-indigo-900/20 dark:hover:to-purple-800/20',
    permission: 'export',
    children: [
      { name: 'Dashboard', href: '/export', icon: 'fa-home' },
      { name: 'Nuovo DDT', href: '/export/create', icon: 'fa-plus-circle' },
      { name: 'Archivio', href: '/export/archive', icon: 'fa-archive' },
      { name: 'Terzisti', href: '/export/terzisti', icon: 'fa-truck' },
      { name: 'Articoli', href: '/export/articles', icon: 'fa-box' },
    ]
  },
  {
    name: 'SCM',
    href: '/scm-admin',
    icon: 'fa-industry',
    gradient: 'from-orange-500 to-red-500',
    hoverGradient: 'hover:from-orange-50 hover:to-red-100 dark:hover:from-orange-900/20 dark:hover:to-red-800/20',
    permission: 'scm_admin',
    children: [
      { name: 'Dashboard', href: '/scm-admin', icon: 'fa-home' },
      { name: 'Lanci', href: '/scm-admin/launches', icon: 'fa-rocket' },
      { name: 'Laboratori', href: '/scm-admin/laboratories', icon: 'fa-building' },
    ]
  },
  {
    name: 'MRP',
    href: '/mrp',
    icon: 'fa-box',
    gradient: 'from-blue-500 to-indigo-600',
    hoverGradient: 'hover:from-blue-50 hover:to-indigo-100 dark:hover:from-blue-900/20 dark:hover:to-indigo-800/20',
    permission: 'mrp',
    children: [
      { name: 'Dashboard', href: '/mrp', icon: 'fa-home' },
      { name: 'Materiali', href: '/mrp/materials', icon: 'fa-list' },
      { name: 'Categorie', href: '/mrp/categories', icon: 'fa-tags' },
    ]
  },
  {
    name: 'Tracking',
    href: '/tracking',
    icon: 'fa-map-marker-alt',
    gradient: 'from-purple-500 to-pink-600',
    hoverGradient: 'hover:from-purple-50 hover:to-pink-100 dark:hover:from-purple-900/20 dark:hover:to-pink-800/20',
    permission: 'tracking',
    children: [
      { name: 'Dashboard', href: '/tracking', icon: 'fa-home' },
      { name: 'Ricerca Multipla', href: '/tracking/multi-search', icon: 'fa-search-plus' },
      { name: 'Inserimento Manuale', href: '/tracking/order-search', icon: 'fa-keyboard' },
      { name: 'Albero Dettagli', href: '/tracking/tree-view', icon: 'fa-sitemap' },
    ]
  },
];

const adminItems: MenuItem[] = [
  { name: 'Gestione Dati', href: '/data-management', icon: 'fa-database', gradient: 'from-cyan-500 to-cyan-600', hoverGradient: 'hover:from-cyan-50 hover:to-cyan-100 dark:hover:from-gray-800/50 dark:hover:to-gray-700/50' },
  { name: 'Log Attività', href: '/log-attivita', icon: 'fa-history', gradient: 'from-cyan-500 to-cyan-600', hoverGradient: 'hover:from-cyan-50 hover:to-cyan-100 dark:hover:from-cyan-800/50 dark:hover:to-cyan-700/50', permission: 'log' },
  { name: 'Cron Jobs', href: '/cron', icon: 'fa-clock', gradient: 'from-cyan-500 to-cyan-600', hoverGradient: 'hover:from-cyan-50 hover:to-cyan-100 dark:hover:from-gray-800/50 dark:hover:to-gray-700/50' },
];

const toolItems: MenuItem[] = [
  { name: 'Utenti', href: '/users', icon: 'fa-users', gradient: 'from-gray-500 to-gray-600', hoverGradient: 'hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800/50 dark:hover:to-gray-700/50', permission: 'users' },
  { name: 'Impostazioni', href: '/settings', icon: 'fa-cog', gradient: 'from-gray-500 to-gray-600', hoverGradient: 'hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800/50 dark:hover:to-gray-700/50', permission: 'settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, sidebarCollapsed, toggleSidebar, hasPermission } = useAuthStore();
  const { fetchModules, isModuleActive, lastFetched } = useModulesStore();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [popupMenu, setPopupMenu] = useState<string | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const sidebarRef = useRef<HTMLElement>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchModules();
  }, [fetchModules]);

  // Ricarica quando lastFetched cambia (cache invalidata)
  useEffect(() => {
    if (lastFetched === null && mounted) {
      fetchModules();
    }
  }, [lastFetched, mounted, fetchModules]);

  const isActive = (href: string) => pathname === href;
  const toggleMenu = (name: string, event?: React.MouseEvent) => {
    if (sidebarCollapsed) {
      if (popupMenu === name) {
        setPopupMenu(null);
      } else {
        if (event) {
          const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
          setPopupPosition({
            top: rect.top,
            left: rect.right + 8,
          });
        }
        setPopupMenu(name);
      }
    } else {
      setActiveMenu(activeMenu === name ? null : name);
    }
  };

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        (sidebarRef.current && sidebarRef.current.contains(target)) ||
        (popupRef.current && popupRef.current.contains(target as Node))
      ) {
        return;
      }
      if (sidebarRef.current && !sidebarRef.current.contains(target)) {
        setPopupMenu(null);
      }
    };

    if (popupMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [popupMenu]);

  const renderMenuItem = (item: MenuItem, index: number) => {
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = activeMenu === item.name;
    const isPopupOpen = popupMenu === item.name;

    // Filter by permissions
    if (item.permission && !hasPermission(item.permission)) return null;

    // Filter by active modules
    if (item.permission && !isModuleActive(item.permission)) return null;

    return (
      <motion.li
        key={item.name}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className="relative"
      >
        {hasChildren ? (
          <div>
            <motion.button
              onClick={(e) => toggleMenu(item.name, e)}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              className={`sidebar-item flex w-full items-center rounded-lg px-2.5 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gradient-to-r ${item.hoverGradient} dark:text-gray-300 shadow-sm hover:shadow-md group ${isOpen || isPopupOpen ? 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 shadow-md' : ''} ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}
            >
              <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2.5'}`}>
                <motion.div
                  className={`flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-r ${item.gradient} shadow-sm flex-shrink-0`}
                  whileHover={{ scale: 1.1 }}
                >
                  <i className={`fas ${item.icon} text-sm text-white`}></i>
                </motion.div>
                {!sidebarCollapsed && <span className="sidebar-text whitespace-nowrap">{item.name}</span>}
              </div>
              {!sidebarCollapsed && (
                <motion.i className="sidebar-text fas fa-chevron-down text-xs" animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }} />
              )}
            </motion.button>

            {/* Expanded Submenu */}
            <AnimatePresence>
              {isOpen && !sidebarCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden mt-2 pl-5 pr-1"
                >
                  <div className="rounded-md bg-gray-50/80 dark:bg-gray-800/40 p-1.5 shadow-inner backdrop-blur-sm">
                    {item.children?.map((child, i) => {
                      const iconColorClass = item.gradient.includes('blue') ? 'text-blue-500' :
                        item.gradient.includes('green') || item.gradient.includes('emerald') ? 'text-green-500' :
                        item.gradient.includes('yellow') || item.gradient.includes('orange') ? 'text-orange-500' :
                        item.gradient.includes('indigo') || item.gradient.includes('purple') ? 'text-purple-500' :
                        item.gradient.includes('red') ? 'text-red-500' :
                        item.gradient.includes('cyan') ? 'text-cyan-500' :
                        item.gradient.includes('pink') ? 'text-pink-500' : 'text-blue-500';

                      return (
                        <motion.div key={child.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                          <Link
                            href={child.href}
                            className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-all duration-200 hover:bg-white hover:text-gray-800 dark:hover:bg-gray-700 dark:hover:text-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 ${isActive(child.href) ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-md' : 'text-gray-600 dark:text-gray-400'}`}
                          >
                            <i className={`fas ${child.icon} text-xs ${iconColorClass}`}></i>
                            <span>{child.name}</span>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Collapsed Popup Submenu - rendered via portal */}
            {mounted && sidebarCollapsed && isPopupOpen && hasChildren && createPortal(
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, x: -10, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="fixed z-[9999]"
                  style={{ top: popupPosition.top, left: popupPosition.left }}
                  ref={(el) => (popupRef.current = el)}
                >
                  <div className="rounded-lg bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 p-2 min-w-[180px]">
                    <div className="px-2.5 py-1.5 mb-1 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.name}</span>
                    </div>
                    {item.children?.map((child) => {
                      const iconColorClass = item.gradient.includes('blue') ? 'text-blue-500' :
                        item.gradient.includes('green') || item.gradient.includes('emerald') ? 'text-green-500' :
                        item.gradient.includes('yellow') || item.gradient.includes('orange') ? 'text-orange-500' :
                        item.gradient.includes('indigo') || item.gradient.includes('purple') ? 'text-purple-500' :
                        item.gradient.includes('red') ? 'text-red-500' :
                        item.gradient.includes('cyan') ? 'text-cyan-500' :
                        item.gradient.includes('pink') ? 'text-pink-500' : 'text-blue-500';

                      return (
                        <Link
                          key={child.name}
                          href={child.href}
                          onClick={() => setPopupMenu(null)}
                          className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${isActive(child.href) ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}
                        >
                          <i className={`fas ${child.icon} text-xs ${iconColorClass}`}></i>
                          <span>{child.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>,
              document.body
            )}
          </div>
        ) : (
          <Link href={item.href}>
            <motion.div
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              className={`sidebar-item flex items-center rounded-lg px-2.5 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-white/70 hover:shadow-lg ${item.hoverGradient} dark:text-gray-300 shadow-sm group ${isActive(item.href) ? 'bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/30 dark:to-gray-800 shadow-md ring-1 ring-blue-100/60 dark:ring-blue-900/30' : 'text-gray-700'} ${sidebarCollapsed ? 'justify-center' : 'gap-2.5'}`}
            >
              <motion.div
                className={`flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-r ${item.gradient} shadow-sm flex-shrink-0 ring-1 ring-white/40 dark:ring-black/20`}
                whileHover={{ scale: 1.08 }}
              >
                <i className={`fas ${item.icon} text-sm text-white`}></i>
              </motion.div>
              {!sidebarCollapsed && <span className="sidebar-text whitespace-nowrap">{item.name}</span>}
            </motion.div>
          </Link>
        )}
      </motion.li>
    );
  };

  return (
    <>
      <AnimatePresence>
        {!sidebarCollapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={toggleSidebar} className="fixed inset-0 bg-black/50 z-40 lg:hidden" />
        )}
      </AnimatePresence>

      <motion.aside
        ref={sidebarRef}
        initial={false}
        animate={{ width: sidebarCollapsed ? 72 : 260 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed inset-y-0 left-0 z-50 flex h-screen flex-col overflow-visible border-r border-gray-200 bg-gradient-to-b from-white via-gray-50 to-white shadow-xl dark:border-gray-700 dark:bg-gradient-to-b dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
      >
        {/* Header */}
        <div className={`flex items-center border-b border-gray-200/60 dark:border-gray-700/60 bg-gradient-to-r from-gray-50 via-white to-white dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 py-4 px-3 shadow-sm ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {sidebarCollapsed ? (
            <motion.button
              onClick={toggleSidebar}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 shadow-md text-white"
            >
              <motion.i
                className="fas fa-chevron-right text-xs"
                animate={{ x: [0, 2, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </motion.button>
          ) : (
            <>
              <Link href="/" className="flex items-center group">
                <motion.div className="p-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 shadow-md" whileHover={{ y: -1 }}>
                  <img className="h-5 w-5" src="/assets/logo-white.png" alt="COREGRE" />
                </motion.div>
                <span className="ml-2.5 text-base font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent whitespace-nowrap">
                  COREGRE
                </span>
              </Link>

              <motion.button
                onClick={toggleSidebar}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-white hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white shadow-sm transition-all"
              >
                <i className="fas fa-chevron-left text-xs" />
              </motion.button>

              <motion.button
                onClick={toggleSidebar}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-white hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white shadow-sm transition-all lg:hidden"
              >
                <i className="fas fa-times text-xs"></i>
              </motion.button>
            </>
          )}
        </div>

        {/* Menu */}
        <div className={`flex flex-1 flex-col overflow-y-auto overflow-x-visible scrollbar-hidden py-3 ${sidebarCollapsed ? 'px-2' : 'px-3'}`}>
          <nav>
            {/* Dashboard */}
            <div className="mb-6">
              <ul className="space-y-1.5">{renderMenuItem(menuItems[0], 0)}</ul>
            </div>

            {/* Funzioni */}
            <div className="mb-6">
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sidebar-text mb-3 px-2.5 py-1.5 rounded-md bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-700">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">Funzioni</h3>
                  </motion.div>
                )}
              </AnimatePresence>
              {sidebarCollapsed && (
                <div className="mb-1.5 flex justify-center">
                  <div className="h-px w-6 bg-gray-300 dark:bg-gray-600"></div>
                </div>
              )}
              <ul className="space-y-1.5">{menuItems.slice(1).map((item, i) => renderMenuItem(item, i + 1))}</ul>
            </div>

            {user?.userType === 'admin' && (
              <div className="mb-6">
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sidebar-text mb-3 px-2.5 py-1.5 rounded-md bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-700">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">Admin</h3>
                    </motion.div>
                  )}
                </AnimatePresence>
                {sidebarCollapsed && (
                  <div className="mb-1.5 flex justify-center">
                    <div className="h-px w-6 bg-gray-300 dark:bg-gray-600"></div>
                  </div>
                )}
                <ul className="space-y-1.5">{adminItems.map((item, i) => renderMenuItem(item, i + menuItems.length))}</ul>
              </div>
            )}

            <div>
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sidebar-text mb-3 px-2.5 py-1.5 rounded-md bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-700">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">Strumenti</h3>
                  </motion.div>
                )}
              </AnimatePresence>
              {sidebarCollapsed && (
                <div className="mb-1.5 flex justify-center">
                  <div className="h-px w-6 bg-gray-300 dark:bg-gray-600"></div>
                </div>
              )}
              <ul className="space-y-1.5">{toolItems.map((item, i) => renderMenuItem(item, i + menuItems.length + adminItems.length))}</ul>
            </div>
          </nav>
        </div>
      </motion.aside>
    </>
  );
}

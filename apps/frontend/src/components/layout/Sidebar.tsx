'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/auth';
import { useModulesStore } from '@/store/modules';
import { settingsApi } from '@/lib/api';

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
    permission: 'quality',
    children: [
      { name: 'Dashboard', href: '/quality', icon: 'fa-home' },
      { name: 'Consulto Record', href: '/quality/records', icon: 'fa-list' },
      { name: 'Report', href: '/quality/reports', icon: 'fa-file-alt' },
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
      { name: 'Elenco', href: '/export/archive', icon: 'fa-archive' },
    ]
  },
  {
    name: 'SCM',
    href: '/scm',
    icon: 'fa-network-wired',
    gradient: 'from-orange-500 to-red-500',
    hoverGradient: 'hover:from-orange-50 hover:to-red-100 dark:hover:from-orange-900/20 dark:hover:to-red-800/20',
    permission: 'scm_admin',
    children: [
      { name: 'Dashboard', href: '/scm', icon: 'fa-home' },
      { name: 'Lanci', href: '/scm/launches', icon: 'fa-rocket' },
    ]
  },
  {
    name: 'Tracking',
    href: '/tracking',
    icon: 'fa-map-marker-alt',
    gradient: 'from-pink-500 to-rose-500',
    hoverGradient: 'hover:from-purple-50 hover:to-pink-100 dark:hover:from-purple-900/20 dark:hover:to-pink-800/20',
    permission: 'tracking',
    children: [
      { name: 'Dashboard', href: '/tracking', icon: 'fa-home' },
      { name: 'Ricerca Multipla', href: '/tracking/multi-search', icon: 'fa-search-plus' },
      { name: 'Inserimento Manuale', href: '/tracking/order-search', icon: 'fa-keyboard' },
      { name: 'Albero Dettagli', href: '/tracking/tree-view', icon: 'fa-sitemap' },
    ]
  },
  {
    name: 'Analitiche',
    href: '/analitiche',
    icon: 'fa-chart-line',
    gradient: 'from-emerald-500 to-teal-600',
    hoverGradient: 'hover:from-emerald-50 hover:to-teal-100 dark:hover:from-emerald-900/20 dark:hover:to-teal-800/20',
    permission: 'analitiche',
    children: [
      { name: 'Dashboard', href: '/analitiche', icon: 'fa-home' },
      { name: 'Carica Dati', href: '/analitiche/upload', icon: 'fa-file-upload' },
      { name: 'Elenco Record', href: '/analitiche/records', icon: 'fa-list' },
      { name: 'Storico Import', href: '/analitiche/imports', icon: 'fa-history' },
    ]
  },
];

const adminItems: MenuItem[] = [
  { name: 'Gestione Dati', href: '/data-management', icon: 'fa-database', gradient: 'from-cyan-500 to-cyan-600', hoverGradient: 'hover:from-cyan-50 hover:to-cyan-100 dark:hover:from-gray-800/50 dark:hover:to-gray-700/50', permission: 'dbsql' },
  { name: 'Log Attività', href: '/log-attivita', icon: 'fa-history', gradient: 'from-cyan-500 to-cyan-600', hoverGradient: 'hover:from-cyan-50 hover:to-cyan-100 dark:hover:from-gray-800/50 dark:hover:to-gray-700/50', permission: 'log' },
  { name: 'InWork', href: '/inwork', icon: 'fa-mobile', gradient: 'from-cyan-500 to-cyan-600', hoverGradient: 'hover:from-cyan-50 hover:to-cyan-100 dark:hover:from-gray-800/50 dark:hover:to-gray-700/50', permission: 'inwork' },
  { name: 'File Manager', href: '/file-manager', icon: 'fa-folder-open', gradient: 'from-cyan-500 to-cyan-600', hoverGradient: 'hover:from-cyan-50 hover:to-cyan-100 dark:hover:from-gray-800/50 dark:hover:to-gray-700/50', permission: 'file-manager' },
];

const toolItems: MenuItem[] = [
  { name: 'Utenti', href: '/users', icon: 'fa-users', gradient: 'from-gray-500 to-gray-600', hoverGradient: 'hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800/50 dark:hover:to-gray-700/50', permission: 'users' },
  { name: 'Impostazioni', href: '/settings', icon: 'fa-cog', gradient: 'from-gray-500 to-gray-600', hoverGradient: 'hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800/50 dark:hover:to-gray-700/50', permission: 'settings' },
];

// Helper: get submenu icon badge gradient from parent gradient
const getSubIconGradient = (gradient: string) => {
  if (gradient.includes('green') || gradient.includes('emerald') || gradient.includes('teal')) return 'from-emerald-400 to-emerald-600';
  if (gradient.includes('yellow') || gradient.includes('orange')) return 'from-orange-400 to-orange-500';
  if (gradient.includes('indigo') || gradient.includes('purple')) return 'from-indigo-400 to-purple-500';
  if (gradient.includes('red') || gradient.includes('rose')) return 'from-red-400 to-red-500';
  if (gradient.includes('cyan')) return 'from-cyan-400 to-cyan-600';
  if (gradient.includes('pink')) return 'from-pink-400 to-rose-500';
  return 'from-blue-400 to-blue-600';
};

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
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [hasLogoIcona, setHasLogoIcona] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchModules();
    // Verifica se esiste logo icona personalizzato
    settingsApi.getLogoExists('icona').then(res => {
      if (res.exists) setHasLogoIcona(true);
    }).catch(() => {});
  }, [fetchModules]);

  useEffect(() => {
    if (lastFetched === null && mounted) {
      fetchModules();
    }
  }, [lastFetched, mounted, fetchModules]);

  const isActive = (href: string) => pathname === href;
  const isParentActive = (item: MenuItem) => {
    if (isActive(item.href)) return true;
    return item.children?.some(child => isActive(child.href)) || false;
  };

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

  const isItemVisible = (item: MenuItem) => {
    if (item.permission && !hasPermission(item.permission)) return false;
    if (item.permission) {
      const moduleMap: Record<string, string> = {
        'quality': 'qualita',
        'scm_admin': 'scm_admin',
      };
      const moduleName = moduleMap[item.permission] || item.permission;
      if (!isModuleActive(moduleName)) return false;
    }
    return true;
  };

  // Active state classes
  const getActiveClasses = (item: MenuItem, category?: 'FUNZIONI' | 'FRAMEWORK' | 'STRUMENTI') => {
    if (!isActive(item.href) && !isParentActive(item)) return 'text-gray-600 dark:text-gray-300';

    if (category === 'STRUMENTI') {
      return 'bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-700/50 shadow-sm ring-1 ring-gray-200/60 dark:ring-gray-700/30';
    } else if (category === 'FRAMEWORK') {
      return 'bg-gradient-to-r from-cyan-50/80 to-white dark:from-cyan-900/30 dark:to-gray-800 shadow-sm ring-1 ring-cyan-100/60 dark:ring-cyan-900/30';
    }
    return 'bg-gradient-to-r from-blue-50/80 to-white dark:from-blue-900/30 dark:to-gray-800 shadow-sm ring-1 ring-blue-100/60 dark:ring-blue-900/30';
  };

  const renderMenuItem = (item: MenuItem, index: number, category?: 'FUNZIONI' | 'FRAMEWORK' | 'STRUMENTI') => {
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = activeMenu === item.name;
    const isPopupOpen = popupMenu === item.name;
    const subIconGradient = getSubIconGradient(item.gradient);

    if (!isItemVisible(item)) return null;

    return (
      <motion.li
        key={item.name}
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.04, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative"
        onMouseEnter={() => setHoveredItem(item.name)}
        onMouseLeave={() => setHoveredItem(null)}
      >
        {hasChildren ? (
          <div>
            <motion.button
              onClick={(e) => toggleMenu(item.name, e)}
              whileHover={{ scale: 1.01, y: -1, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
              whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
              className={`sidebar-item flex w-full items-center rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-150 hover:bg-gradient-to-r ${item.hoverGradient} group ${isOpen || isPopupOpen ? 'bg-gradient-to-r from-gray-50 to-gray-100/80 dark:from-gray-800/50 dark:to-gray-700/50 shadow-sm' : 'hover:shadow-sm'} ${getActiveClasses(item, category)} ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}
            >
              <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                <motion.div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${item.gradient} shadow-sm ring-1 ring-white/30 flex-shrink-0`}
                  whileHover={{ scale: 1.08, rotate: 2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                  <i className={`fas ${item.icon} text-sm text-white`}></i>
                </motion.div>
                {!sidebarCollapsed && <span className="sidebar-text whitespace-nowrap">{item.name}</span>}
              </div>
              {!sidebarCollapsed && (
                <motion.i
                  className="sidebar-text fas fa-chevron-down text-[10px] text-gray-400"
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                />
              )}
            </motion.button>

            {/* Collapsed tooltip */}
            {sidebarCollapsed && !hasChildren && hoveredItem === item.name && mounted && createPortal(
              <div className="fixed z-[9999] pointer-events-none" style={{ top: popupPosition.top, left: popupPosition.left }}>
                <div className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg whitespace-nowrap">
                  {item.name}
                </div>
              </div>,
              document.body
            )}

            {/* Expanded Submenu */}
            <AnimatePresence>
              {isOpen && !sidebarCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="overflow-hidden mt-1.5 pl-4 pr-1"
                >
                  <div className="rounded-xl bg-gray-50/60 dark:bg-gray-800/40 border border-gray-100/80 dark:border-gray-700/40 p-2 shadow-inset-subtle backdrop-blur-sm">
                    {item.children?.map((child, i) => (
                      <motion.div
                        key={child.name}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03, duration: 0.2 }}
                      >
                        <Link
                          href={child.href}
                          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-all duration-150 hover:bg-white hover:text-gray-800 dark:hover:bg-gray-700 dark:hover:text-gray-200 hover:shadow-sm hover:-translate-y-px ${isActive(child.href) ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                          <div className={`flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br ${subIconGradient} shadow-sm flex-shrink-0`}>
                            <i className={`fas ${child.icon} text-[10px] text-white`}></i>
                          </div>
                          <span>{child.name}</span>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Collapsed Popup Submenu - rendered via portal */}
            {mounted && sidebarCollapsed && isPopupOpen && hasChildren && createPortal(
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, x: -8, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -6, scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30, mass: 0.8 }}
                  className="fixed z-[9999]"
                  style={{ top: popupPosition.top, left: popupPosition.left }}
                  ref={(el) => (popupRef.current = el)}
                >
                  <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-[0_8px_30px_-4px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.4)] p-2.5 min-w-[200px]">
                    <div className="px-3 py-2 mb-1.5 border-b border-gray-100/80 dark:border-gray-700">
                      <span className="text-[13px] font-semibold text-gray-900 dark:text-white">{item.name}</span>
                    </div>
                    {item.children?.map((child) => (
                      <motion.div key={child.name} whileHover={{ x: 2 }} transition={{ duration: 0.15 }}>
                        <Link
                          href={child.href}
                          onClick={() => setPopupMenu(null)}
                          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-700 ${isActive(child.href) ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                          <div className={`flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br ${subIconGradient} shadow-sm flex-shrink-0`}>
                            <i className={`fas ${child.icon} text-[10px] text-white`}></i>
                          </div>
                          <span>{child.name}</span>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>,
              document.body
            )}
          </div>
        ) : (
          <Link href={item.href}>
            <motion.div
              whileHover={{ scale: 1.01, y: -1, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
              whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
              className={`sidebar-item flex items-center rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-150 hover:bg-gray-50/80 hover:shadow-sm ${item.hoverGradient} group ${getActiveClasses(item, category)} ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}
            >
              <motion.div
                className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${item.gradient} shadow-sm ring-1 ring-white/30 flex-shrink-0`}
                whileHover={{ scale: 1.08, rotate: 2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              >
                <i className={`fas ${item.icon} text-sm text-white`}></i>
              </motion.div>
              {!sidebarCollapsed && <span className="sidebar-text whitespace-nowrap">{item.name}</span>}
            </motion.div>
          </Link>
        )}

        {/* Collapsed tooltip for items without children */}
        {sidebarCollapsed && !hasChildren && hoveredItem === item.name && mounted && createPortal(
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15, delay: 0.3 }}
            className="fixed z-[9999] pointer-events-none"
            style={{ top: 0, left: 80 }}
          >
            <div className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg whitespace-nowrap">
              {item.name}
            </div>
          </motion.div>,
          document.body
        )}
      </motion.li>
    );
  };

  const renderCategoryHeader = (label: string) => (
    <>
      <AnimatePresence>
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="sidebar-text mb-3.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-gray-100/70 to-gray-50/50 dark:from-gray-800 dark:to-gray-700 border border-gray-100/60 dark:border-gray-700/40"
          >
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 dark:text-gray-400">{label}</h3>
          </motion.div>
        )}
      </AnimatePresence>
      {sidebarCollapsed && (
        <div className="mb-2 flex justify-center">
          <div className="h-px w-5 bg-gradient-to-r from-transparent via-gray-300 to-transparent dark:via-gray-600"></div>
        </div>
      )}
    </>
  );

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
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed inset-y-0 left-0 z-50 flex h-screen flex-col overflow-visible border-r border-gray-200/80 bg-gradient-to-b from-white via-gray-50/80 to-white shadow-[2px_0_8px_-2px_rgba(0,0,0,0.06),3px_0_16px_-4px_rgba(0,0,0,0.04)] dark:border-gray-700 dark:bg-gradient-to-b dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 dark:shadow-[2px_0_8px_-2px_rgba(0,0,0,0.2)]"
      >
        {/* Header */}
        <div className={`flex items-center border-b border-gray-100/80 dark:border-gray-700/60 bg-gradient-to-r from-gray-50/80 via-white to-white dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 py-5 px-4 ${sidebarCollapsed ? 'justify-center px-3' : 'justify-between'}`}>
          {sidebarCollapsed ? (
            <motion.button
              onClick={toggleSidebar}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/20 text-white ring-1 ring-orange-500/10"
            >
              <motion.i
                className="fas fa-chevron-right text-xs"
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.button>
          ) : (
            <>
              <Link href="/" className="flex items-center group">
                <motion.div
                  className="p-2 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-md ring-1 ring-orange-500/20"
                  whileHover={{ y: -2, scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  {hasLogoIcona ? (
                    <img
                      className="h-5 w-5 object-contain"
                      style={{ filter: 'brightness(0) invert(1)' }}
                      src={settingsApi.getLogoImageUrl('icona')}
                      alt="COREGRE"
                    />
                  ) : (
                    <img className="h-5 w-5" src="/assets/logo-white.png" alt="COREGRE" />
                  )}
                </motion.div>
                <span className="ml-3 text-[15px] font-extrabold tracking-tight bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-300 bg-clip-text text-transparent whitespace-nowrap">
                  COREGRE
                </span>
              </Link>

              <motion.button
                onClick={toggleSidebar}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white transition-all duration-200"
              >
                <i className="fas fa-chevron-left text-xs" />
              </motion.button>

              <motion.button
                onClick={toggleSidebar}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white transition-all duration-200 lg:hidden"
              >
                <i className="fas fa-times text-xs"></i>
              </motion.button>
            </>
          )}
        </div>

        {/* Menu */}
        <div className={`flex flex-1 flex-col overflow-y-auto overflow-x-visible scrollbar-hidden py-4 ${sidebarCollapsed ? 'px-2' : 'px-3'}`}>
          <nav>
            {/* Dashboard */}
            <div className="mb-6">
              <ul className="space-y-1.5">{renderMenuItem(menuItems[0], 0)}</ul>
            </div>

            {/* Funzioni */}
            {menuItems.slice(1).filter(isItemVisible).length > 0 && (
              <div className="mb-6">
                {renderCategoryHeader('Funzioni')}
                <ul className="space-y-1.5">{menuItems.slice(1).map((item, i) => renderMenuItem(item, i + 1, 'FUNZIONI'))}</ul>
              </div>
            )}

            {adminItems.filter(isItemVisible).length > 0 && (
              <div className="mb-6">
                {renderCategoryHeader('Frameworks')}
                <ul className="space-y-1.5">{adminItems.map((item, i) => renderMenuItem(item, i + menuItems.length, 'FRAMEWORK'))}</ul>
              </div>
            )}

            {toolItems.filter(isItemVisible).length > 0 && (
              <div>
                {renderCategoryHeader('Strumenti')}
                <ul className="space-y-1.5">{toolItems.map((item, i) => renderMenuItem(item, i + menuItems.length + adminItems.length, 'STRUMENTI'))}</ul>
              </div>
            )}
          </nav>
        </div>

      </motion.aside>
    </>
  );
}

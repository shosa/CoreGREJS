'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
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
  permission?: string;
  children?: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: 'fa-home',
    gradient: 'from-blue-500 to-blue-600',
  },
  {
    name: 'Riparazioni',
    href: '/riparazioni',
    icon: 'fa-hammer',
    gradient: 'from-blue-500 to-blue-600',
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
    permission: 'tracking',
    children: [
      { name: 'Dashboard', href: '/tracking', icon: 'fa-home' },
      { name: 'Ricerca Multipla', href: '/tracking/multi-search', icon: 'fa-search-plus' },
      { name: 'Inserimento Manuale', href: '/tracking/order-search', icon: 'fa-keyboard' },
      { name: 'Albero Dettagli', href: '/tracking/tree-view', icon: 'fa-sitemap' },
      { name: 'Archivio', href: '/tracking/archive', icon: 'fa-archive' },
    ]
  },
  {
    name: 'Analitiche',
    href: '/analitiche',
    icon: 'fa-chart-line',
    gradient: 'from-emerald-500 to-teal-600',
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
  { name: 'Gestione Dati', href: '/data-management', icon: 'fa-database', gradient: 'from-cyan-500 to-cyan-600', permission: 'dbsql' },
  { name: 'Log Attività', href: '/log-attivita', icon: 'fa-history', gradient: 'from-cyan-500 to-cyan-600', permission: 'log' },
  { name: 'InWork', href: '/inwork', icon: 'fa-mobile', gradient: 'from-cyan-500 to-cyan-600', permission: 'inwork' },
  { name: 'File Manager', href: '/file-manager', icon: 'fa-folder-open', gradient: 'from-cyan-500 to-cyan-600', permission: 'file-manager' },
];

const toolItems: MenuItem[] = [
  { name: 'Utenti', href: '/users', icon: 'fa-users', gradient: 'from-gray-500 to-gray-600', permission: 'users' },
  { name: 'Impostazioni', href: '/settings', icon: 'fa-cog', gradient: 'from-gray-500 to-gray-600', permission: 'settings' },
];

// --- Magnification constants ---
const ICON_SIZE = 44;
// Pixel spread: how many px around cursor center trigger magnification
const MAGNIFY_RADIUS = 80;

// Returns a spring-smoothed scale value based on pixel distance from cursor
function useMagnification(mouseX: ReturnType<typeof useMotionValue>, iconCenterX: ReturnType<typeof useMotionValue>) {
  const scaleRaw = useTransform([mouseX, iconCenterX] as const, ([mx, cx]: number[]) => {
    if (mx === -1) return 1;
    const dist = Math.abs(mx - cx);
    if (dist >= MAGNIFY_RADIUS) return 1;
    return 1 + 0.46 * (1 - dist / MAGNIFY_RADIUS);
  });
  return useSpring(scaleRaw, { stiffness: 600, damping: 38, mass: 0.35 });
}

// --- Single dock icon ---
interface DockIconProps {
  item: MenuItem;
  mouseX: ReturnType<typeof useMotionValue>;
  isActive: boolean;
  isParentActive: boolean;
  onPopover: (name: string | null, rect?: DOMRect) => void;
  activePopover: string | null;
}

function DockIcon({ item, mouseX, isActive, isParentActive, onPopover, activePopover }: DockIconProps) {
  const ref = useRef<HTMLDivElement>(null);
  const iconCenterX = useMotionValue(0);
  const scale = useMagnification(mouseX, iconCenterX);

  // Track the icon's center X in page coordinates
  useEffect(() => {
    const updateCenter = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        iconCenterX.set(rect.left + rect.width / 2);
      }
    };
    updateCenter();
    window.addEventListener('resize', updateCenter);
    return () => window.removeEventListener('resize', updateCenter);
  }, [iconCenterX]);
  const isOpen = activePopover === item.name;
  const hasChildren = !!(item.children && item.children.length > 0);

  const handleClick = () => {
    if (hasChildren) {
      if (isOpen) {
        onPopover(null);
      } else {
        const rect = ref.current?.getBoundingClientRect();
        onPopover(item.name, rect);
      }
    } else {
      onPopover(null);
    }
  };

  const inner = (
    <div className="relative flex flex-col items-center gap-1" style={{ width: ICON_SIZE + 16 }}>
      {/* Icon — scales upward via transformOrigin bottom center */}
      <motion.div
        ref={ref}
        style={{
          scale,
          transformOrigin: 'bottom center',
          width: ICON_SIZE,
          height: ICON_SIZE,
        }}
        className={`flex items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} shadow-lg ring-1 ring-white/30 cursor-pointer flex-shrink-0`}
        whileTap={{ scale: 0.88 }}
        onClick={handleClick}
      >
        <i className={`fas ${item.icon} text-white`} style={{ fontSize: `${ICON_SIZE * 0.38}px` }} />
      </motion.div>
      {/* Label */}
      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap leading-none max-w-[64px] text-center truncate">{item.name}</span>
      {/* Active dot — outside dock bar, centered under this icon */}
      <motion.span
        className="absolute left-1/2 -translate-x-1/2 rounded-full bg-blue-500"
        style={{ bottom: -10, width: 5, height: 5 }}
        animate={isActive || isParentActive ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.4 }}
        transition={{ duration: 0.18 }}
      />
    </div>
  );

  return hasChildren ? (
    <div>{inner}</div>
  ) : (
    <Link href={item.href}>{inner}</Link>
  );
}

// --- Popover above dock icon ---
interface PopoverProps {
  item: MenuItem;
  anchorRect: DOMRect;
  onClose: () => void;
  isActivePath: (href: string) => boolean;
}

function DockPopover({ item, anchorRect, onClose, isActivePath }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Position: centered above the anchor icon, above the dock bar
  const left = anchorRect.left + anchorRect.width / 2;
  // bottom offset: viewport height - anchorRect.top + gap
  const bottom = window.innerHeight - anchorRect.top + 12;

  const getSubIconGradient = (gradient: string) => {
    if (gradient.includes('green') || gradient.includes('emerald') || gradient.includes('teal')) return 'from-emerald-400 to-emerald-600';
    if (gradient.includes('yellow') || gradient.includes('orange')) return 'from-orange-400 to-orange-500';
    if (gradient.includes('indigo') || gradient.includes('purple')) return 'from-indigo-400 to-purple-500';
    if (gradient.includes('red') || gradient.includes('rose')) return 'from-red-400 to-red-500';
    if (gradient.includes('cyan')) return 'from-cyan-400 to-cyan-600';
    if (gradient.includes('pink')) return 'from-pink-400 to-rose-500';
    return 'from-blue-400 to-blue-600';
  };
  const subGrad = getSubIconGradient(item.gradient);

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={ref}
        key={item.name}
        initial={{ opacity: 0, y: 10, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32, mass: 0.7 }}
        className="fixed z-[9999]"
        style={{ bottom, left, transform: 'translateX(-50%)' }}
      >
        <div className="rounded-2xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/80 dark:border-gray-700/60 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.25)] dark:shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)] p-2.5 min-w-[190px]">
          {/* Title */}
          <div className="px-2.5 pt-1 pb-2 mb-1 border-b border-gray-100/80 dark:border-gray-700/50">
            <div className="flex items-center gap-2">
              <div className={`flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br ${item.gradient} shadow-sm`}>
                <i className={`fas ${item.icon} text-[10px] text-white`} />
              </div>
              <span className="text-[13px] font-semibold text-gray-900 dark:text-white">{item.name}</span>
            </div>
          </div>
          {/* Children */}
          <div className="space-y-0.5">
            {item.children?.map((child, i) => (
              <motion.div
                key={child.name}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  href={child.href}
                  onClick={onClose}
                  className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-all duration-150 ${isActivePath(child.href) ? 'bg-blue-50 dark:bg-blue-900/25 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  <div className={`flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br ${subGrad} shadow-sm flex-shrink-0`}>
                    <i className={`fas ${child.icon} text-[10px] text-white`} />
                  </div>
                  <span>{child.name}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
        {/* Caret */}
        <div className="flex justify-center mt-1">
          <div className="w-3 h-1.5 bg-white/90 dark:bg-gray-800/90 clip-caret" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}


// --- Main Dock ---
export default function Dock() {
  const pathname = usePathname();
  const { user, hasPermission } = useAuthStore();
  const { fetchModules, isModuleActive, lastFetched } = useModulesStore();
  const [mounted, setMounted] = useState(false);
  const [hasLogoIcona, setHasLogoIcona] = useState(false);
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<DOMRect | null>(null);
  const [popoverItem, setPopoverItem] = useState<MenuItem | null>(null);

  const mouseX = useMotionValue(-1);

  useEffect(() => {
    setMounted(true);
    fetchModules();
    settingsApi.getLogoExists('icona').then(res => {
      if (res.exists) setHasLogoIcona(true);
    }).catch(() => {});
  }, [fetchModules]);

  useEffect(() => {
    if (lastFetched === null && mounted) fetchModules();
  }, [lastFetched, mounted, fetchModules]);

  // Close popover on route change
  useEffect(() => { setActivePopover(null); }, [pathname]);

  const isActive = (href: string) => pathname === href;
  const isParentActive = (item: MenuItem) => {
    if (isActive(item.href)) return true;
    return item.children?.some(child => isActive(child.href)) || false;
  };

  const isItemVisible = useCallback((item: MenuItem) => {
    if (item.permission && !hasPermission(item.permission)) return false;
    if (item.permission) {
      const moduleMap: Record<string, string> = { 'quality': 'qualita', 'scm_admin': 'scm_admin' };
      const moduleName = moduleMap[item.permission] || item.permission;
      if (!isModuleActive(moduleName)) return false;
    }
    return true;
  }, [hasPermission, isModuleActive]);

  const handlePopover = (name: string | null, rect?: DOMRect) => {
    if (!name) {
      setActivePopover(null);
      setPopoverItem(null);
      setPopoverAnchor(null);
      return;
    }
    const found = [...menuItems, ...adminItems, ...toolItems].find(i => i.name === name) || null;
    setActivePopover(name);
    setPopoverItem(found);
    setPopoverAnchor(rect || null);
  };

  const visibleMain = menuItems.filter(isItemVisible);
  const visibleAdmin = adminItems.filter(isItemVisible);
  const visibleTools = toolItems.filter(isItemVisible);

  // Compute flat index for magnification (main items only for spread effect, by section)
  const renderGroup = (items: MenuItem[]) =>
    items.map((item) => (
      <DockIcon
        key={item.name}
        item={item}
        mouseX={mouseX}
        isActive={isActive(item.href)}
        isParentActive={isParentActive(item)}
        onPopover={handlePopover}
        activePopover={activePopover}
      />
    ));

  if (!mounted) return null;

  return (
    <>
      {/* Popover */}
      {activePopover && popoverItem && popoverAnchor && (
        <DockPopover
          item={popoverItem}
          anchorRect={popoverAnchor}
          onClose={() => handlePopover(null)}
          isActivePath={isActive}
        />
      )}

      {/* Dock bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <motion.div
          className="relative flex items-end gap-2 px-4 py-3 rounded-2xl bg-white/40 dark:bg-gray-900/50 backdrop-blur-3xl border border-white/50 dark:border-white/10 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.12),0_2px_8px_-2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] overflow-visible"
          onMouseMove={(e) => mouseX.set(e.clientX)}
          onMouseLeave={() => mouseX.set(-1)}
        >
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 mr-1" style={{ width: ICON_SIZE + 16 }}>
            <div className="flex flex-col items-center gap-1">
              <motion.div
                className="flex items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg ring-1 ring-white/30"
                style={{ width: ICON_SIZE, height: ICON_SIZE }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
              >
                {hasLogoIcona ? (
                  <img className="h-5 w-5 object-contain" style={{ filter: 'brightness(0) invert(1)' }} src={settingsApi.getLogoImageUrl('icona')} alt="COREGRE" />
                ) : (
                  <img className="h-5 w-5" src="/assets/logo-white.png" alt="COREGRE" />
                )}
              </motion.div>
              <span className="text-[10px] font-semibold text-orange-500 whitespace-nowrap leading-none">COREGRE</span>
            </div>
          </Link>

          {/* Divisore dopo logo */}
          <div className="w-px self-stretch bg-gray-200/80 dark:bg-gray-700/60 mx-1" />

          {/* Funzioni principali */}
          {renderGroup(visibleMain)}

          {/* Divisore admin */}
          {visibleAdmin.length > 0 && (
            <div className="w-px self-stretch bg-gray-200/80 dark:bg-gray-700/60 mx-1" />
          )}

          {renderGroup(visibleAdmin)}

          {/* Divisore strumenti */}
          {visibleTools.length > 0 && (
            <div className="w-px self-stretch bg-gray-200/80 dark:bg-gray-700/60 mx-1" />
          )}

          {renderGroup(visibleTools)}
        </motion.div>

      </div>
    </>
  );
}

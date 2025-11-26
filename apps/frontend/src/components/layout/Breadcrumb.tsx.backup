'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <motion.nav
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex mb-6"
      aria-label="Breadcrumb"
    >
      <ol className="inline-flex items-center space-x-1 md:space-x-3 text-sm text-gray-500 dark:text-gray-400">
        {items.map((item, index) => (
          <li key={index} className={index === 0 ? 'inline-flex items-center' : ''}>
            {index > 0 && (
              <i className="fas fa-chevron-right text-gray-400 mx-2"></i>
            )}
            {item.href ? (
              <Link
                href={item.href}
                className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white"
              >
                {item.icon && <i className={`fas ${item.icon} mr-2`}></i>}
                {item.label}
              </Link>
            ) : (
              <span className="inline-flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
                {item.icon && <i className={`fas ${item.icon} mr-2`}></i>}
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </motion.nav>
  );
}

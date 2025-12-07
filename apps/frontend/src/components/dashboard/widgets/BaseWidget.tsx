"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface BaseWidgetProps {
  children: ReactNode;
  gradient: string;
  onClick?: () => void;
  className?: string;
}

const cardHover = {
  scale: 1.02,
  y: -4,
  transition: { duration: 0.2 },
};

export default function BaseWidget({ children, gradient, onClick, className = "" }: BaseWidgetProps) {
  return (
    <motion.div
      whileHover={cardHover}
      className={`h-full w-full group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 lg:p-6 shadow-lg backdrop-blur-sm flex flex-col ${gradient} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

export function WidgetHeader({ icon, title, iconGradient, badgeColor }: {
  icon: string;
  title: string;
  iconGradient: string;
  badgeColor: string;
}) {
  return (
    <div className="flex items-center justify-between mb-2 sm:mb-4 flex-shrink-0 relative z-10">
      <div className={`flex h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 items-center justify-center rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300 ${iconGradient}`}>
        <i className={`fas fa-${icon} text-white text-sm sm:text-lg lg:text-xl`}></i>
      </div>
      <span className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wider ${badgeColor}`}>
        {title}
      </span>
    </div>
  );
}

export function WidgetStat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex-shrink-0">
      <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-1 truncate">
        {value}
      </h3>
      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3 line-clamp-2">
        {label}
      </p>
    </div>
  );
}

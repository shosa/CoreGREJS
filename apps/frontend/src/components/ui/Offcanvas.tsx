"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface OffcanvasProps {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: string;
  iconColor?: string;
  headerBg?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: "sm" | "md" | "lg" | "xl" | "2xl";
  position?: "left" | "right";
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  loading?: boolean;
}

const widthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
};

export default function Offcanvas({
  open,
  onClose,
  title,
  icon = "fa-bars",
  iconColor = "text-blue-500",
  headerBg = "bg-gray-50 dark:bg-gray-900/20",
  children,
  footer,
  width = "2xl",
  position = "right",
  searchValue,
  onSearchChange,
  searchPlaceholder = "Cerca...",
  loading = false,
}: OffcanvasProps) {
  const isRight = position === "right";
  const hasSearch = searchValue !== undefined && onSearchChange !== undefined;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen bg-black/50 z-[9998]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: isRight ? "100%" : "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: isRight ? "100%" : "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`fixed ${isRight ? "right-0" : "left-0"} inset-y-0 w-full ${widthClasses[width]} bg-white dark:bg-gray-800 shadow-2xl z-[9999] flex flex-col`}
          >
            {/* Header */}
            <div
              className={`p-4 border-b border-gray-200 dark:border-gray-700 ${headerBg}`}
            >
              <div
                className={`flex items-center justify-between ${hasSearch ? "mb-4" : ""}`}
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <i className={`fas ${icon} ${iconColor}`}></i>
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              {/* Search */}
              {hasSearch && (
                <div className="relative">
                  <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="text"
                    value={searchValue}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent"
                  />
                </div>
              ) : (
                children
              )}
            </div>

            {/* Footer */}
            {footer && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

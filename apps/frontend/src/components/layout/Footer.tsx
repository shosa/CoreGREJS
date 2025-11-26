'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface FooterProps {
  children?: ReactNode;
  show?: boolean;
  reserveSpace?: boolean; // aggiunge spazio per evitare che il footer copra il contenuto
}

const FOOTER_HEIGHT_PX = 96; // spazio riservato per il footer fisso

export default function Footer({
  children,
  show = true,
  reserveSpace = true,
}: FooterProps) {
  if (!show || !children) {
    return null;
  }

  return (
    <>
      {reserveSpace && (
        <div
          style={{ height: FOOTER_HEIGHT_PX }}
          aria-hidden="true"
        />
      )}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg"
      >
        <div className="mx-auto max-w-screen-2xl px-4 md:px-6 2xl:px-10 py-4">
          {children}
        </div>
      </motion.div>
    </>
  );
}

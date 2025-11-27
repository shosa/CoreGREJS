"use client";

import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import Breadcrumb from "@/components/layout/Breadcrumb";

export default function NotFound() {
  return (
    <div className="min-h-screen">
      <PageHeader title="404 - Pagina non trovata" subtitle="La risorsa richiesta non esiste." />
      <Breadcrumb items={[{ label: "Dashboard", href: "/", icon: "fa-home" }, { label: "Errore 404" }]} />

      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <div className="mx-auto flex items-center justify-center gap-4 text-red-600 dark:text-red-400">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-red-100 dark:bg-red-900/30">
            <i className="fas fa-exclamation-triangle text-4xl"></i>
          </div>
          <div className="text-5xl font-extrabold text-gray-900 dark:text-white">404</div>
        </div>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Non riusciamo a trovare la pagina che stai cercando.
        </p>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import Breadcrumb from "@/components/layout/Breadcrumb";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen">
      <PageHeader title="403 - Accesso negato" subtitle="Non hai i permessi per accedere a questa pagina." />
      <Breadcrumb items={[{ label: "Dashboard", href: "/", icon: "fa-home" }, { label: "Errore 403" }]} />

      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30">
          <i className="fas fa-ban text-3xl"></i>
        </div>
        <h1 className="mt-4 text-4xl font-extrabold text-gray-900 dark:text-white">403</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Accesso non autorizzato. Contatta l’amministratore se pensi sia un errore.
        </p>
      </div>
    </div>
  );
}

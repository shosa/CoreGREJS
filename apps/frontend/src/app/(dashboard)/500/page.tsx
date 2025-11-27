"use client";

import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import Breadcrumb from "@/components/layout/Breadcrumb";

export default function ServerErrorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900">
      <PageHeader title="500 - Errore server" subtitle="Qualcosa è andato storto. Stiamo lavorando per risolvere." />
      <Breadcrumb items={[{ label: "Dashboard", href: "/", icon: "fa-home" }, { label: "Errore 500" }]} />

      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-lg dark:border-gray-800 dark:bg-gray-900/50">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 shadow-md dark:bg-blue-900/30">
            <i className="fas fa-server text-3xl"></i>
          </div>
          <h1 className="mt-4 text-4xl font-extrabold text-gray-900 dark:text-white">500</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Errore interno del server. Riprova tra poco o contatta il supporto.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:shadow-lg"
            >
              <i className="fas fa-home mr-2"></i> Torna alla Dashboard
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <i className="fas fa-redo mr-2"></i> Riprova
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

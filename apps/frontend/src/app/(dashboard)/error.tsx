"use client";

import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import Breadcrumb from "@/components/layout/Breadcrumb";

export default function DashboardError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="min-h-screen">
      <PageHeader title="Errore" subtitle="Qualcosa è andato storto." />
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/", icon: "fa-home" },
          { label: "Errore" },
        ]}
      />

      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <div className="mx-auto flex items-center justify-center gap-4 text-blue-600 dark:text-blue-400">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-blue-100 dark:bg-blue-900/30">
            <i className="fas fa-server text-4xl"></i>
          </div>
          <div className="text-5xl font-extrabold text-gray-900 dark:text-white">
            500
          </div>
        </div>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Errore interno del server. Riprova tra poco o contatta il supporto.
        </p>
      </div>
    </div>
  );
}

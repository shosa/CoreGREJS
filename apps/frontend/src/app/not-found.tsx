"use client";

import DashboardLayout from "./(dashboard)/layout";
import DashboardNotFound from "./(dashboard)/not-found";

export default function NotFound() {
  return (
    <DashboardLayout>
      <DashboardNotFound />
    </DashboardLayout>
  );
}

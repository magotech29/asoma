"use client";

import { useEffect, useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [tenantName, setTenantName] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/tenant")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setTenantName(data.name))
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {tenantName && (
        <div className="bg-emerald-700 text-white text-xs px-4 py-1.5 flex items-center gap-1.5 font-semibold">
          <span className="opacity-70">管理中：</span>
          <span>{tenantName}</span>
        </div>
      )}
      {children}
    </div>
  );
}

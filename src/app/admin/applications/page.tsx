"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Application = {
  id: string;
  name: string;
  contact: string;
  message: string | null;
  status: "pending" | "won" | "lost";
  createdAt: string;
};

const STATUS_LABEL = { pending: "未対応", won: "当選", lost: "落選" };
const STATUS_COLOR = {
  pending: "bg-gray-100 text-gray-600",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-red-100 text-red-500",
};

export default function ApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = () => {
    fetch("/api/admin/applications")
      .then((r) => {
        if (r.status === 401) { router.replace("/admin/login"); return null; }
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => { if (data) setApps(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: Application["status"]) => {
    await fetch("/api/admin/applications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  };

  const pendingCount = apps.filter((a) => a.status === "pending").length;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-gray-800 text-white px-4 py-4 shadow flex items-center gap-3">
        <Link href="/admin" className="text-gray-300 hover:text-white">← 戻る</Link>
        <div>
          <h1 className="text-lg font-bold">🎁 景品応募者一覧</h1>
          {!loading && <p className="text-xs text-gray-400">{apps.length}件（未対応 {pendingCount}件）</p>}
        </div>
      </header>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        {loading ? (
          <p className="text-gray-400 text-center py-8">読み込み中...</p>
        ) : apps.length === 0 ? (
          <p className="text-gray-400 text-center py-8">応募はまだありません</p>
        ) : (
          <ul className="space-y-3">
            {apps.map((app) => (
              <li key={app.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-gray-800">{app.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLOR[app.status]}`}>
                        {STATUS_LABEL[app.status]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{app.contact}</p>
                    {app.message && (
                      <p className="text-xs text-gray-400 mt-1 italic">「{app.message}」</p>
                    )}
                    <p className="text-xs text-gray-300 mt-1">
                      {new Date(app.createdAt).toLocaleString("ja-JP")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {app.status !== "won" && (
                      <button
                        onClick={() => updateStatus(app.id, "won")}
                        className="text-xs bg-emerald-500 text-white px-3 py-1 rounded-lg"
                      >
                        当選
                      </button>
                    )}
                    {app.status !== "lost" && (
                      <button
                        onClick={() => updateStatus(app.id, "lost")}
                        className="text-xs bg-red-400 text-white px-3 py-1 rounded-lg"
                      >
                        落選
                      </button>
                    )}
                    {app.status !== "pending" && (
                      <button
                        onClick={() => updateStatus(app.id, "pending")}
                        className="text-xs bg-gray-200 text-gray-600 px-3 py-1 rounded-lg"
                      >
                        戻す
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

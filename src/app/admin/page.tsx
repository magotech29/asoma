"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Stats = {
  participantCount: number;
  stampCount: number;
  completedCount: number;
  completionRate: number;
  courseCount: number;
  spotCount: number;
  spotRanking: { name: string; count: number }[];
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => {
        if (r.status === 401) { router.replace("/admin/login"); return null; }
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => { if (data) setStats(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  };

  const menuItems = [
    { href: "/admin/courses", icon: "🗺️", label: "コース管理" },
    { href: "/admin/spots", icon: "📍", label: "スポット管理" },
    { href: "/admin/qrcodes", icon: "🔲", label: "QRコード" },
    { href: "/admin/settings", icon: "⚙️", label: "イベント設定" },
    { href: "/admin/applications", icon: "🎁", label: "景品応募者" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-gray-800 text-white px-4 py-4 shadow flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">管理画面</h1>
          <p className="text-gray-400 text-xs">ぐるっとスタンプラリー</p>
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-300 hover:text-white">
          ログアウト
        </button>
      </header>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        {/* 統計ダッシュボード */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 mb-3">📊 統計</h2>
          {loading ? (
            <p className="text-gray-400 text-sm text-center py-4">読み込み中...</p>
          ) : stats ? (
            <>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                  <p className="text-3xl font-bold text-emerald-600">{stats.participantCount}</p>
                  <p className="text-xs text-gray-500 mt-1">参加者数</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                  <p className="text-3xl font-bold text-emerald-600">{stats.stampCount}</p>
                  <p className="text-xs text-gray-500 mt-1">スタンプ取得数</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                  <p className="text-3xl font-bold text-amber-500">{stats.completedCount}</p>
                  <p className="text-xs text-gray-500 mt-1">完走者数</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                  <p className="text-3xl font-bold text-amber-500">{stats.completionRate}%</p>
                  <p className="text-xs text-gray-500 mt-1">完走率</p>
                </div>
              </div>

              {/* スポット別訪問数 */}
              {stats.spotRanking.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <p className="text-xs font-semibold text-gray-500 mb-3">スポット別訪問数</p>
                  <ul className="space-y-2">
                    {stats.spotRanking.map((s, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                        <span className="flex-1 text-sm text-gray-700">{s.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-100 rounded-full h-1.5">
                            <div
                              className="bg-emerald-400 h-1.5 rounded-full"
                              style={{
                                width: stats.spotRanking[0].count > 0
                                  ? `${(Number(s.count) / Number(stats.spotRanking[0].count)) * 100}%`
                                  : "0%"
                              }}
                            />
                          </div>
                          <span className="text-xs font-bold text-gray-600 w-6 text-right">{s.count}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-400 text-sm text-center py-4">統計を取得できませんでした</p>
          )}
        </section>

        {/* メニュー */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 mb-3">メニュー</h2>
          <div className="grid grid-cols-2 gap-3">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition flex items-center gap-3"
              >
                <span className="text-2xl">{item.icon}</span>
                <p className="font-semibold text-gray-800 text-sm">{item.label}</p>
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-6">
          <Link href="/" className="block text-center text-sm text-gray-400 hover:text-gray-600">
            参加者画面を見る →
          </Link>
        </div>
      </main>
    </div>
  );
}

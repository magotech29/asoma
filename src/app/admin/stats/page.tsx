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

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => {
        if (r.status === 401) { router.replace("/admin/login"); return null; }
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => { if (data) setStats(data); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-gray-800 text-white px-4 py-4 shadow flex items-center gap-3">
        <Link href="/admin" className="text-gray-300 hover:text-white">← 戻る</Link>
        <h1 className="text-lg font-bold">📊 統計</h1>
      </header>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        {loading ? (
          <p className="text-gray-400 text-center py-8">読み込み中...</p>
        ) : error ? (
          <p className="text-red-400 text-center py-8">読み込みに失敗しました</p>
        ) : stats ? (
          <>
            {/* サマリー */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: "参加者数", value: stats.participantCount, color: "text-emerald-600" },
                { label: "スタンプ取得数", value: stats.stampCount, color: "text-emerald-600" },
                { label: "完走者数", value: stats.completedCount, color: "text-amber-500" },
                { label: "完走率", value: `${stats.completionRate}%`, color: "text-amber-500" },
              ].map((item) => (
                <div key={item.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                  <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                </div>
              ))}
            </div>

            {/* 完走率バー */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-semibold text-gray-700">完走率</p>
                <p className="text-sm font-bold text-amber-500">{stats.completionRate}%</p>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className="bg-amber-400 h-3 rounded-full transition-all"
                  style={{ width: `${stats.completionRate}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {stats.participantCount}人中 {stats.completedCount}人が全スポット制覇
              </p>
            </div>

            {/* スポット別訪問数 */}
            {stats.spotRanking.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-sm font-semibold text-gray-700 mb-4">スポット別訪問数</p>
                <ul className="space-y-3">
                  {stats.spotRanking.map((s, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-4 text-right">{i + 1}</span>
                      <span className="flex-1 text-sm text-gray-700">{s.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-emerald-400 h-2 rounded-full"
                            style={{
                              width: stats.spotRanking[0].count > 0
                                ? `${(Number(s.count) / Number(stats.spotRanking[0].count)) * 100}%`
                                : "0%"
                            }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-600 w-6 text-right">{s.count}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}

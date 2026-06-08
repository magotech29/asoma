"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const [checking, setChecking] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [participantUrl, setParticipantUrl] = useState("/");
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats").then((r) => {
        if (r.status === 401) router.replace("/admin/login");
        return r;
      }),
      fetch("/api/super-admin/tenants").then((r) => r.status !== 401),
      fetch("/api/admin/tenant").then((r) => r.ok ? r.json() : null),
    ])
      .then(([, isSuper, tenant]) => {
        setIsSuperAdmin(!!isSuper);
        if (tenant?.tenantToken) {
          setParticipantUrl(`/?t=${tenant.tenantToken}`);
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">確認中...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-gray-800 text-white px-4 py-4 shadow flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">管理画面</h1>
          <p className="text-gray-400 text-xs">ぐるっとスタンプラリー</p>
        </div>
        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <Link
              href="/super-admin"
              className="text-xs bg-gray-700 hover:bg-gray-600 text-emerald-400 px-3 py-1.5 rounded-lg"
            >
              ← スーパー管理者
            </Link>
          )}
          <button onClick={handleLogout} className="text-sm text-gray-300 hover:text-white">
            ログアウト
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">

        {/* 階層イメージ */}
        <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 mb-5 shadow-sm">
          <p className="text-xs text-gray-400 font-semibold mb-1">管理の構造</p>
          <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-bold">イベント</span>
            <span className="text-gray-300">›</span>
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">コース</span>
            <span className="text-gray-300">›</span>
            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-bold">スポット（QR）</span>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">イベント管理から順番に設定します。</p>
        </div>

        {/* メインメニュー */}
        <div className="space-y-3 mb-6">
          {/* イベント管理：大ボタン（最重要） */}
          <Link href="/admin/events"
            className="flex items-center gap-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl p-4 shadow-sm transition">
            <span className="text-3xl">🗓️</span>
            <div>
              <p className="font-bold text-base">イベント管理</p>
              <p className="text-xs text-emerald-100">開催期間の設定・コース構成の管理</p>
            </div>
            <span className="ml-auto text-emerald-200 text-xl">›</span>
          </Link>

          {/* サブメニュー：2列グリッド */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/admin/courses"
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition">
              <span className="text-3xl">📚</span>
              <p className="font-bold text-gray-800 mt-2">コースライブラリ</p>
              <p className="text-xs text-gray-400 mt-0.5">全コース一覧・管理</p>
            </Link>
            <Link href="/admin/qrcodes"
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition">
              <span className="text-3xl">🔲</span>
              <p className="font-bold text-gray-800 mt-2">QRコード</p>
              <p className="text-xs text-gray-400 mt-0.5">QRコードの発行・印刷</p>
            </Link>
            <Link href="/admin/stats"
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition">
              <span className="text-3xl">📊</span>
              <p className="font-bold text-gray-800 mt-2">統計</p>
              <p className="text-xs text-gray-400 mt-0.5">参加者・完走率・分析</p>
            </Link>
            <Link href="/admin/participants"
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition">
              <span className="text-3xl">👥</span>
              <p className="font-bold text-gray-800 mt-2">参加者</p>
              <p className="text-xs text-gray-400 mt-0.5">参加者一覧・CSVエクスポート</p>
            </Link>
            <Link href="/admin/applications"
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition">
              <span className="text-3xl">🎁</span>
              <p className="font-bold text-gray-800 mt-2">景品応募者</p>
              <p className="text-xs text-gray-400 mt-0.5">応募一覧・当選管理</p>
            </Link>
          </div>

          {/* テナント設定：小さめ */}
          <Link href="/admin/settings"
            className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 hover:shadow-md transition">
            <span className="text-xl">⚙️</span>
            <div>
              <p className="font-semibold text-gray-700 text-sm">テナント設定</p>
              <p className="text-xs text-gray-400">データのインポート・エクスポート</p>
            </div>
            <span className="ml-auto text-gray-300">›</span>
          </Link>
        </div>

        <div className="mt-2">
          <a href={participantUrl} className="block text-center text-sm text-gray-400 hover:text-gray-600">
            参加者画面を見る →
          </a>
        </div>
      </main>
    </div>
  );
}

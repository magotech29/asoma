"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/courses")
      .then((r) => {
        if (r.status === 401) router.replace("/admin/login");
        setChecking(false);
      })
      .catch(() => {
        router.replace("/admin/login");
      });
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

  const menuItems = [
    { href: "/admin/courses", icon: "🗺️", label: "コース管理", desc: "コースの追加・編集・削除" },
    { href: "/admin/spots", icon: "📍", label: "スポット管理", desc: "チェックポイントの管理" },
    { href: "/admin/qrcodes", icon: "🔲", label: "QRコード", desc: "QRコードの発行・印刷" },
    { href: "/admin/settings", icon: "⚙️", label: "イベント設定", desc: "開催期間・イベント情報" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-gray-800 text-white px-4 py-4 shadow flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">管理画面</h1>
          <p className="text-gray-400 text-xs">ぐるっとスタンプラリー</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-300 hover:text-white"
        >
          ログアウト
        </button>
      </header>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        <div className="grid grid-cols-2 gap-3">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition"
            >
              <span className="text-3xl">{item.icon}</span>
              <p className="font-bold text-gray-800 mt-2">{item.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
            </Link>
          ))}
        </div>

        <div className="mt-6">
          <Link
            href="/"
            className="block text-center text-sm text-gray-400 hover:text-gray-600"
          >
            参加者画面を見る →
          </Link>
        </div>
      </main>
    </div>
  );
}

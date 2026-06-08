"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Participant = {
  id: string;
  nickname: string | null;
  createdAt: string;
  stampCount: number;
  stampedSpots: string;
  applicationStatus: "pending" | "won" | "lost" | null;
  completed: boolean;
};

const APP_STATUS_LABEL: Record<string, string> = {
  pending: "未対応",
  won: "当選",
  lost: "落選",
};

const APP_STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-red-100 text-red-500",
};

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [totalSpots, setTotalSpots] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/participants")
      .then((r) => {
        if (r.status === 401) { router.replace("/admin/login"); return null; }
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        if (data) {
          setParticipants(data.participants);
          setTotalSpots(data.totalSpots);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [router]);

  const handleExport = () => {
    window.location.href = "/api/admin/participants/export";
  };

  const completedCount = participants.filter((p) => p.completed).length;
  const appliedCount = participants.filter((p) => p.applicationStatus !== null).length;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-gray-800 text-white px-4 py-4 shadow flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-gray-300 hover:text-white">← 戻る</Link>
          <div>
            <h1 className="text-lg font-bold">👥 参加者一覧</h1>
            {!loading && (
              <p className="text-xs text-gray-400">
                {participants.length}人（完走 {completedCount}人・応募 {appliedCount}人）
              </p>
            )}
          </div>
        </div>
        {!loading && !error && participants.length > 0 && (
          <button
            onClick={handleExport}
            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-semibold"
          >
            CSVエクスポート
          </button>
        )}
      </header>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        {loading ? (
          <p className="text-gray-400 text-center py-8">読み込み中...</p>
        ) : error ? (
          <p className="text-red-400 text-center py-8">読み込みに失敗しました</p>
        ) : participants.length === 0 ? (
          <p className="text-gray-400 text-center py-8">まだ参加者はいません</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 mb-5">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{participants.length}</p>
                <p className="text-xs text-gray-500 mt-0.5">参加者数</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
                <p className="text-2xl font-bold text-amber-500">{completedCount}</p>
                <p className="text-xs text-gray-500 mt-0.5">完走者数</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
                <p className="text-2xl font-bold text-indigo-500">{appliedCount}</p>
                <p className="text-xs text-gray-500 mt-0.5">応募者数</p>
              </div>
            </div>

            <ul className="space-y-3">
              {participants.map((p) => (
                <li key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-bold text-gray-800 truncate">
                          {p.nickname ?? "（名前なし）"}
                        </p>
                        {p.completed && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-700">
                            完走
                          </span>
                        )}
                        {p.applicationStatus && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${APP_STATUS_COLOR[p.applicationStatus]}`}>
                            {APP_STATUS_LABEL[p.applicationStatus]}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        スタンプ取得数: <span className="font-semibold text-emerald-600">{p.stampCount}</span>
                        {totalSpots > 0 && <span className="text-gray-400"> / {totalSpots}</span>}
                      </p>
                      {p.stampedSpots && (
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                          {p.stampedSpots}
                        </p>
                      )}
                      <p className="text-xs text-gray-300 mt-1">
                        参加: {new Date(p.createdAt).toLocaleString("ja-JP")}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}

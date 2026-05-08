"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Spot = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
};

type Course = {
  id: string;
  name: string;
  spots: Spot[];
};

type StampData = {
  courses: Course[];
  stampedSpotIds: string[];
};

export default function StampsPage() {
  const [data, setData] = useState<StampData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/courses").then((r) => r.json()),
      fetch("/api/my-stamps").then((r) => r.json()),
    ])
      .then(([courses, stamps]) => {
        setData({
          courses: Array.isArray(courses) ? courses : [],
          stampedSpotIds: Array.isArray(stamps) ? stamps : [],
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    );
  }

  const allSpotIds = data?.courses.flatMap((c) => c.spots.map((s) => s.id)) ?? [];
  const totalCount = allSpotIds.length;
  const stampedCount = data?.stampedSpotIds.filter((id) => allSpotIds.includes(id)).length ?? 0;
  const isComplete = totalCount > 0 && stampedCount >= totalCount;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-emerald-600 text-white px-4 py-4 shadow flex items-center gap-3">
        <Link href="/" className="text-emerald-100 hover:text-white">← 戻る</Link>
        <h1 className="text-lg font-bold">スタンプ帳</h1>
      </header>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        {/* 進捗バー */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-gray-700">取得状況</span>
            <span className="text-lg font-bold text-emerald-600">{stampedCount} / {totalCount}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className="bg-emerald-500 h-3 rounded-full transition-all"
              style={{ width: totalCount > 0 ? `${(stampedCount / totalCount) * 100}%` : "0%" }}
            />
          </div>
          {isComplete && (
            <p className="text-emerald-600 font-bold text-center mt-3">🎉 全スポット制覇！</p>
          )}
        </div>

        {/* 景品応募ボタン */}
        {isComplete && (
          <Link
            href="/apply"
            className="block w-full bg-amber-400 hover:bg-amber-500 text-white text-center font-bold py-4 rounded-2xl shadow mb-6 transition"
          >
            🎁 景品に応募する
          </Link>
        )}

        {/* コース別スタンプ */}
        {data?.courses.map((course) => {
          const courseStamped = course.spots.filter((s) =>
            data.stampedSpotIds.includes(s.id)
          ).length;
          return (
            <section key={course.id} className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-bold text-gray-700">{course.name}</h2>
                <span className="text-sm text-gray-400">{courseStamped}/{course.spots.length}</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {course.spots.map((spot) => {
                  const stamped = data.stampedSpotIds.includes(spot.id);
                  return (
                    <div
                      key={spot.id}
                      className={`rounded-xl border p-3 text-center transition ${
                        stamped
                          ? "bg-emerald-50 border-emerald-200"
                          : "bg-white border-gray-100"
                      }`}
                    >
                      <div className={`text-3xl mb-1 ${stamped ? "" : "grayscale opacity-30"}`}>
                        🏅
                      </div>
                      <p className="text-xs text-gray-600 leading-tight">{spot.name}</p>
                      {stamped && (
                        <p className="text-xs text-emerald-500 font-bold mt-1">取得済み</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        <Link
          href="/scan"
          className="block w-full bg-emerald-500 text-white text-center font-bold py-4 rounded-2xl shadow"
        >
          📷 スタンプを集める
        </Link>
      </main>
    </div>
  );
}

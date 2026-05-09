"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Spot = { id: string; name: string; description: string | null; sortOrder: number };
type Course = {
  id: string;
  name: string;
  description: string | null;
  distanceKm: number | null;
  durationMin: number | null;
  spots: Spot[];
};

export default function Home() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/courses")
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((data) => setCourses(Array.isArray(data) ? data : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-emerald-600 text-white px-4 py-4 shadow">
        <h1 className="text-xl font-bold">🗺️ ぐるっとスタンプラリー</h1>
        <p className="text-emerald-100 text-sm mt-0.5">春日市まちめぐり</p>
      </header>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        <Link
          href="/scan"
          className="block w-full bg-emerald-500 hover:bg-emerald-600 text-white text-center font-bold text-lg py-4 rounded-2xl shadow-md mb-4 transition"
        >
          📷 QRコードをスキャン
        </Link>

        <Link
          href="/stamps"
          className="block w-full bg-white border border-emerald-200 text-emerald-700 text-center font-semibold py-3 rounded-xl mb-6 shadow-sm hover:bg-emerald-50 transition"
        >
          🎯 スタンプ帳を見る
        </Link>

        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-3">コース一覧</h2>
          {loading ? (
            <p className="text-gray-400 text-center py-8">読み込み中...</p>
          ) : error ? (
            <p className="text-red-400 text-center py-8">読み込みに失敗しました</p>
          ) : courses.length === 0 ? (
            <p className="text-gray-400 text-center py-8">現在開催中のコースはありません</p>
          ) : (
            <ul className="space-y-3">
              {courses.map((course) => (
                <li key={course.id}>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <h3 className="font-bold text-gray-800">{course.name}</h3>
                    {course.description && (
                      <p className="text-sm text-gray-500 mt-1">{course.description}</p>
                    )}
                    <div className="flex gap-3 mt-2 text-xs text-gray-400">
                      {course.distanceKm && <span>📍 {course.distanceKm}km</span>}
                      {course.durationMin && <span>⏱ 約{course.durationMin}分</span>}
                      <span>🏁 {course.spots.length}スポット</span>
                    </div>
                    {course.spots.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {course.spots.map((spot, i) => (
                          <li key={spot.id} className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                              {i + 1}
                            </span>
                            {spot.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="text-center text-xs text-gray-400 py-4">
        © 春日市地域イベント実行委員会
      </footer>
    </div>
  );
}

"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

type Spot = {
  id: string;
  courseId: string;
  name: string;
  qrToken: string;
};

type Course = { id: string; name: string };

export default function AdminQRCodesPage() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/spots").then((r) => r.status === 401 ? null : r.json()),
      fetch("/api/admin/courses").then((r) => r.status === 401 ? null : r.json()),
    ]).then(([s, c]) => {
      if (!s) { router.replace("/admin/login"); return; }
      setSpots(s ?? []);
      setCourses(c ?? []);
      setLoading(false);
    });
  }, [router]);

  const handlePrint = () => window.print();

  const courseMap = Object.fromEntries(courses.map((c) => [c.id, c.name]));

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-gray-800 text-white px-4 py-4 shadow flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-gray-300 hover:text-white">← 戻る</Link>
          <h1 className="text-lg font-bold">🔲 QRコード</h1>
        </div>
        <button
          onClick={handlePrint}
          className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold"
        >
          印刷
        </button>
      </header>

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        {loading ? (
          <p className="text-gray-400 text-center py-8">読み込み中...</p>
        ) : spots.length === 0 ? (
          <p className="text-gray-400 text-center py-8">スポットがありません</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 print:grid-cols-2">
            {spots.map((spot) => (
              <div
                key={spot.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col items-center text-center print:break-inside-avoid"
              >
                <p className="text-xs text-emerald-600 font-semibold mb-1">
                  {courseMap[spot.courseId] ?? ""}
                </p>
                <p className="font-bold text-gray-800 mb-3">{spot.name}</p>
                <QRCodeSVG
                  value={spot.qrToken}
                  size={150}
                  level="M"
                />
                <p className="text-xs text-gray-300 mt-2 font-mono break-all">
                  {spot.qrToken.slice(0, 8)}...
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Course = { id: string; name: string };
type Spot = {
  id: string;
  courseId: string;
  name: string;
  description: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  qrToken: string;
  sortOrder: number;
};

function decodePlusCode(input: string): { lat: number; lng: number } | null {
  try {
    // "MQJ8+GR 千代田区、東京都" → コード部分だけ取り出す
    const code = input.trim().split(" ")[0];
    // open-location-code はグローバルに読み込む必要があるためダイナミックに処理
    const OpenLocationCode = (window as unknown as { OpenLocationCode?: { decode: (code: string) => { latitudeCenter: number; longitudeCenter: number } } }).OpenLocationCode;
    if (!OpenLocationCode) return null;
    const decoded = OpenLocationCode.decode(code);
    return { lat: decoded.latitudeCenter, lng: decoded.longitudeCenter };
  } catch {
    return null;
  }
}

export default function AdminSpotsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ courseId: "", name: "", description: "", address: "", lat: "", lng: "" });
  const [editing, setEditing] = useState<Spot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [plusCode, setPlusCode] = useState("");
  const [plusCodeError, setPlusCodeError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // open-location-code をスクリプトタグで読み込む
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/gh/google/open-location-code/javascript/openlocationcode.js";
    script.async = true;
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  const load = () => {
    Promise.all([
      fetch("/api/admin/courses").then((r) => r.status === 401 ? null : r.json()),
      fetch("/api/admin/spots").then((r) => r.status === 401 ? null : r.json()),
    ]).then(([c, s]) => {
      if (!c) { router.replace("/admin/login"); return; }
      setCourses(c ?? []);
      setSpots(s ?? []);
      if (c.length > 0 && !form.courseId) setForm((f) => ({ ...f, courseId: c[0].id }));
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handlePlusCode = () => {
    setPlusCodeError(null);
    const result = decodePlusCode(plusCode);
    if (!result) {
      setPlusCodeError("プラスコードを認識できませんでした。形式を確認してください。");
      return;
    }
    setForm((f) => ({
      ...f,
      lat: result.lat.toFixed(6),
      lng: result.lng.toFixed(6),
    }));
    setPlusCode("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const body = {
      ...(editing ? { id: editing.id } : {}),
      courseId: form.courseId,
      name: form.name,
      description: form.description || null,
      address: form.address || null,
      lat: form.lat ? parseFloat(form.lat) : null,
      lng: form.lng ? parseFloat(form.lng) : null,
    };
    await fetch("/api/admin/spots", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setForm({ courseId: courses[0]?.id ?? "", name: "", description: "", address: "", lat: "", lng: "" });
    setEditing(null);
    setSubmitting(false);
    setPlusCode("");
    load();
  };

  const handleEdit = (s: Spot) => {
    setEditing(s);
    setForm({
      courseId: s.courseId,
      name: s.name,
      description: s.description ?? "",
      address: s.address ?? "",
      lat: s.lat?.toString() ?? "",
      lng: s.lng?.toString() ?? "",
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このスポットを削除しますか？")) return;
    await fetch("/api/admin/spots", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  };

  const courseMap = Object.fromEntries(courses.map((c) => [c.id, c.name]));

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-gray-800 text-white px-4 py-4 shadow flex items-center gap-3">
        <Link href="/admin" className="text-gray-300 hover:text-white">← 戻る</Link>
        <h1 className="text-lg font-bold">📍 スポット管理</h1>
      </header>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
          <h2 className="font-bold text-gray-700 mb-3">
            {editing ? "スポットを編集" : "スポットを追加"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <select
              required
              value={form.courseId}
              onChange={(e) => setForm({ ...form, courseId: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="">コースを選択</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input
              required
              placeholder="スポット名"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <input
              placeholder="説明（任意）"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <input
              placeholder="住所（任意）"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />

            {/* プラスコード入力 */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-emerald-700 mb-1.5">
                📍 Googleプラスコードから位置を入力
              </p>
              <p className="text-xs text-gray-500 mb-2">
                Google マップで場所を右クリック → 表示されるコードをコピー
              </p>
              <div className="flex gap-2">
                <input
                  placeholder="例）MQJ8+GR 千代田区、東京都"
                  value={plusCode}
                  onChange={(e) => { setPlusCode(e.target.value); setPlusCodeError(null); }}
                  className="flex-1 border border-emerald-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                />
                <button
                  type="button"
                  onClick={handlePlusCode}
                  className="bg-emerald-500 text-white px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap"
                >
                  変換
                </button>
              </div>
              {plusCodeError && <p className="text-red-500 text-xs mt-1">{plusCodeError}</p>}
            </div>

            {/* 緯度経度（手動入力or自動入力） */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">緯度 (lat)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="35.681236"
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">経度 (lng)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="139.767125"
                  value={form.lng}
                  onChange={(e) => setForm({ ...form, lng: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-emerald-500 text-white py-2 rounded-lg font-semibold text-sm"
              >
                {editing ? "更新" : "追加"}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setForm({ courseId: courses[0]?.id ?? "", name: "", description: "", address: "", lat: "", lng: "" });
                  }}
                  className="px-4 bg-gray-100 text-gray-600 py-2 rounded-lg text-sm"
                >
                  キャンセル
                </button>
              )}
            </div>
          </form>
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-8">読み込み中...</p>
        ) : spots.length === 0 ? (
          <p className="text-gray-400 text-center py-8">スポットがありません</p>
        ) : (
          <ul className="space-y-3">
            {spots.map((s) => (
              <li key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-emerald-600 font-semibold">{courseMap[s.courseId] ?? "不明"}</p>
                    <p className="font-bold text-gray-800">{s.name}</p>
                    {s.address && <p className="text-xs text-gray-400 mt-0.5">{s.address}</p>}
                    {s.lat && s.lng && (
                      <p className="text-xs text-gray-300 mt-0.5">{s.lat.toFixed(4)}, {s.lng.toFixed(4)}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(s)} className="text-sm text-blue-500 hover:underline">編集</button>
                    <button onClick={() => handleDelete(s.id)} className="text-sm text-red-400 hover:underline">削除</button>
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

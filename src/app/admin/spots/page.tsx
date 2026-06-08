"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Course = { id: string; name: string };
type Spot = {
  id: string;
  courseId: string;
  name: string;
  description: string | null;
  address: string | null;
  lat: string | null;
  lng: string | null;
  instagramUrl: string | null;
  websiteUrl: string | null;
  qrToken: string;
  sortOrder: number;
};

const EMPTY_FORM = { courseId: "", name: "", description: "", address: "", lat: "", lng: "", instagramUrl: "", websiteUrl: "" };

function parseCoords(input: string): { lat: number; lng: number } | null {
  const parts = input.trim().split(/[,\s]+/).filter(Boolean);
  if (parts.length < 2) return null;
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  if (isNaN(lat) || isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export default function AdminSpotsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState<Spot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [plusCode, setPlusCode] = useState("");
  const [plusCodeError, setPlusCodeError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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
    const parts = plusCode.trim().split(/[,\s]+/).filter(Boolean);
    if (parts.length < 2) {
      setPlusCodeError("座標を認識できませんでした。「35.6813, 139.7660」の形式で入力してください。");
      return;
    }
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setPlusCodeError("座標を認識できませんでした。「35.6813, 139.7660」の形式で入力してください。");
      return;
    }
    // 元の文字列をそのまま使い、桁数を落とさない
    setForm((f) => ({ ...f, lat: parts[0].trim(), lng: parts[1].trim() }));
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
      lat: form.lat ? form.lat : null,
      lng: form.lng ? form.lng : null,
      instagramUrl: form.instagramUrl || null,
      websiteUrl: form.websiteUrl || null,
    };
    await fetch("/api/admin/spots", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setForm({ ...EMPTY_FORM, courseId: courses[0]?.id ?? "" });
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
      lat: s.lat ?? "",
      lng: s.lng ?? "",
      instagramUrl: s.instagramUrl ?? "",
      websiteUrl: s.websiteUrl ?? "",
    });
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const handleCancel = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, courseId: courses[0]?.id ?? "" });
    setPlusCode("");
    setPlusCodeError(null);
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

  // コース別にスポットをグルーピング
  const spotsByCourse = courses.map((c) => ({
    course: c,
    spots: spots.filter((s) => s.courseId === c.id),
  }));

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-gray-800 text-white px-4 py-4 shadow flex items-center gap-3">
        <Link href="/admin" className="text-gray-300 hover:text-white">← 戻る</Link>
        <h1 className="text-lg font-bold flex-1">📍 スポット管理</h1>
        <a
          href="/api/admin/spots/export"
          download="spots.csv"
          className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-3 py-1.5 rounded-lg font-semibold"
        >
          ⬇ CSV出力
        </a>
      </header>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">

        {/* フォーム */}
        <div
          ref={formRef}
          className={`rounded-xl border shadow-sm p-4 mb-6 transition-all ${
            editing
              ? "bg-amber-50 border-amber-400 ring-2 ring-amber-300"
              : "bg-white border-gray-100"
          }`}
        >
          {editing && (
            <div className="flex items-center gap-2 mb-3 bg-amber-100 border border-amber-300 rounded-lg px-3 py-2">
              <span className="text-amber-600 font-bold text-sm">✏️ 編集モード：</span>
              <span className="text-amber-800 text-sm font-semibold truncate">{editing.name}</span>
            </div>
          )}
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

            {/* 座標入力 */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-emerald-700 mb-1.5">📍 Google マップから座標を入力</p>
              <div className="text-xs text-gray-500 mb-2 space-y-1">
                <p><span className="font-semibold">PC:</span> 右クリック → 数字（例: 35.6813, 139.7660）をクリックでコピー</p>
                <p><span className="font-semibold">スマホ:</span> 長押し → 上部の数字をタップしてコピー</p>
              </div>
              <div className="flex gap-2">
                <input
                  placeholder="例）35.6813, 139.7660"
                  value={plusCode}
                  onChange={(e) => { setPlusCode(e.target.value); setPlusCodeError(null); }}
                  className="flex-1 border border-emerald-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white font-mono"
                />
                <button
                  type="button"
                  onClick={handlePlusCode}
                  className="bg-emerald-500 text-white px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap"
                >
                  入力
                </button>
              </div>
              {plusCodeError && <p className="text-red-500 text-xs mt-1">{plusCodeError}</p>}
            </div>

            {/* 緯度経度 */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">緯度 (lat)</label>
                <input
                  type="text" inputMode="decimal" placeholder="35.681236"
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">経度 (lng)</label>
                <input
                  type="text" inputMode="decimal" placeholder="139.767125"
                  value={form.lng}
                  onChange={(e) => setForm({ ...form, lng: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono"
                />
              </div>
            </div>

            {/* SNSリンク */}
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-purple-700 mb-1.5">📱 SNSリンク（任意）</p>
              <div className="flex items-center gap-2">
                <span className="text-base">📷</span>
                <input
                  type="url"
                  placeholder="InstagramページURL"
                  value={form.instagramUrl}
                  onChange={(e) => setForm({ ...form, instagramUrl: e.target.value })}
                  className="flex-1 border border-purple-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">🌐</span>
                <input
                  type="url"
                  placeholder="WebサイトURL（HP・Facebookなど）"
                  value={form.websiteUrl}
                  onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                  className="flex-1 border border-purple-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className={`flex-1 text-white py-2 rounded-lg font-semibold text-sm ${editing ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-500 hover:bg-emerald-600"}`}
              >
                {editing ? "✏️ 更新する" : "追加"}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 bg-gray-100 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-200"
                >
                  キャンセル
                </button>
              )}
            </div>
          </form>
        </div>

        {/* スポット一覧（コース別グループ） */}
        {loading ? (
          <p className="text-gray-400 text-center py-8">読み込み中...</p>
        ) : spots.length === 0 ? (
          <p className="text-gray-400 text-center py-8">スポットがありません</p>
        ) : (
          <div className="space-y-6">
            {spotsByCourse.map(({ course, spots: courseSpots }) => (
              courseSpots.length === 0 ? null : (
                <section key={course.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
                      🗺️ {course.name}
                    </span>
                    <span className="text-xs text-gray-400">{courseSpots.length}件</span>
                  </div>
                  <ul className="space-y-2">
                    {courseSpots.map((s) => (
                      <li
                        key={s.id}
                        className={`bg-white rounded-xl border shadow-sm px-4 py-3 transition ${
                          editing?.id === s.id ? "border-amber-400 ring-1 ring-amber-300" : "border-gray-100"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 truncate">{s.name}</p>
                            {s.address && <p className="text-xs text-gray-400 truncate mt-0.5">{s.address}</p>}
                            <div className="flex items-center gap-3 mt-1">
                              {s.lat && s.lng && (
                                <span className="text-xs text-gray-300">📍 {s.lat}, {s.lng}</span>
                              )}
                              {s.instagramUrl && (
                                <a href={s.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-500 hover:underline">📷 IG</a>
                              )}
                              {s.websiteUrl && (
                                <a href={s.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">🌐 Web</a>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-3 ml-3 shrink-0">
                            <button onClick={() => handleEdit(s)} className="text-sm text-blue-500 hover:underline">編集</button>
                            <button onClick={() => handleDelete(s.id)} className="text-sm text-red-400 hover:underline">削除</button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

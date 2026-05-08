"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Course = {
  id: string;
  name: string;
  description: string | null;
  distanceKm: number | null;
  durationMin: number | null;
  sortOrder: number;
  spots: { id: string }[];
};

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", description: "", distanceKm: "", durationMin: "" });
  const [editing, setEditing] = useState<Course | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const load = () => {
    fetch("/api/admin/courses")
      .then((r) => {
        if (r.status === 401) { router.replace("/admin/login"); return null; }
        return r.json();
      })
      .then((data) => { if (data) { setCourses(data); setLoading(false); } });
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const body = {
      ...(editing ? { id: editing.id } : {}),
      name: form.name,
      description: form.description || null,
      distanceKm: form.distanceKm ? parseFloat(form.distanceKm) : null,
      durationMin: form.durationMin ? parseInt(form.durationMin) : null,
    };
    await fetch("/api/admin/courses", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setForm({ name: "", description: "", distanceKm: "", durationMin: "" });
    setEditing(null);
    setSubmitting(false);
    load();
  };

  const handleEdit = (c: Course) => {
    setEditing(c);
    setForm({
      name: c.name,
      description: c.description ?? "",
      distanceKm: c.distanceKm?.toString() ?? "",
      durationMin: c.durationMin?.toString() ?? "",
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このコースを削除しますか？")) return;
    await fetch("/api/admin/courses", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-gray-800 text-white px-4 py-4 shadow flex items-center gap-3">
        <Link href="/admin" className="text-gray-300 hover:text-white">← 戻る</Link>
        <h1 className="text-lg font-bold">🗺️ コース管理</h1>
      </header>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        {/* 追加・編集フォーム */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
          <h2 className="font-bold text-gray-700 mb-3">
            {editing ? "コースを編集" : "コースを追加"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              required
              placeholder="コース名"
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
            <div className="flex gap-2">
              <input
                type="number"
                step="0.1"
                placeholder="距離(km)"
                value={form.distanceKm}
                onChange={(e) => setForm({ ...form, distanceKm: e.target.value })}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <input
                type="number"
                placeholder="所要時間(分)"
                value={form.durationMin}
                onChange={(e) => setForm({ ...form, durationMin: e.target.value })}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
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
                  onClick={() => { setEditing(null); setForm({ name: "", description: "", distanceKm: "", durationMin: "" }); }}
                  className="px-4 bg-gray-100 text-gray-600 py-2 rounded-lg text-sm"
                >
                  キャンセル
                </button>
              )}
            </div>
          </form>
        </div>

        {/* コース一覧 */}
        {loading ? (
          <p className="text-gray-400 text-center py-8">読み込み中...</p>
        ) : courses.length === 0 ? (
          <p className="text-gray-400 text-center py-8">コースがありません</p>
        ) : (
          <ul className="space-y-3">
            {courses.map((c) => (
              <li key={c.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-gray-800">{c.name}</p>
                    {c.description && <p className="text-sm text-gray-500 mt-0.5">{c.description}</p>}
                    <div className="flex gap-2 text-xs text-gray-400 mt-1">
                      {c.distanceKm && <span>{c.distanceKm}km</span>}
                      {c.durationMin && <span>{c.durationMin}分</span>}
                      <span>{c.spots.length}スポット</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(c)} className="text-sm text-blue-500 hover:underline">編集</button>
                    <button onClick={() => handleDelete(c.id)} className="text-sm text-red-400 hover:underline">削除</button>
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

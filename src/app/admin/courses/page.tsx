"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Event = { id: string; name: string };
type Course = {
  id: string;
  eventId: string | null;
  name: string;
  description: string | null;
  distanceKm: number | null;
  durationMin: number | null;
  sortOrder: number;
  spots: { id: string }[];
};

export default function AdminCoursesPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ eventId: "", name: "", description: "", distanceKm: "", durationMin: "" });
  const [editing, setEditing] = useState<Course | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const load = () => {
    Promise.all([
      fetch("/api/admin/events").then((r) => {
        if (r.status === 401) { router.replace("/admin/login"); return null; }
        return r.json();
      }),
      fetch("/api/admin/courses").then((r) => r.ok ? r.json() : []),
    ]).then(([evts, crs]) => {
      if (!evts) return;
      setEvents(evts);
      setCourses(crs);
      if (evts.length > 0 && !form.eventId) setForm((f) => ({ ...f, eventId: evts[0].id }));
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const body = {
      ...(editing ? { id: editing.id } : {}),
      eventId: form.eventId || null,
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
    setForm({ eventId: events[0]?.id ?? "", name: "", description: "", distanceKm: "", durationMin: "" });
    setEditing(null);
    setSubmitting(false);
    load();
  };

  const handleEdit = (c: Course) => {
    setEditing(c);
    setForm({
      eventId: c.eventId ?? "",
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

  const eventMap = Object.fromEntries(events.map((e) => [e.id, e.name]));

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-gray-800 text-white px-4 py-4 shadow flex items-center gap-3">
        <Link href="/admin" className="text-gray-300 hover:text-white">← 戻る</Link>
        <h1 className="text-lg font-bold">🗺️ コース管理</h1>
      </header>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        {events.length === 0 && !loading && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-amber-700">
              コースを追加するには、先に
              <Link href="/admin/settings" className="underline font-semibold mx-1">イベントを作成</Link>
              してください。
            </p>
          </div>
        )}

        {/* 追加・編集フォーム */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
          <h2 className="font-bold text-gray-700 mb-3">{editing ? "コースを編集" : "コースを追加"}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">イベント <span className="text-red-500">*</span></label>
              <select
                required
                value={form.eventId}
                onChange={(e) => setForm({ ...form, eventId: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="">イベントを選択</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            </div>
            <input
              required
              placeholder="コース名（例：Aコース・北エリア）"
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
              <input type="number" step="0.1" placeholder="距離(km)"
                value={form.distanceKm} onChange={(e) => setForm({ ...form, distanceKm: e.target.value })}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <input type="number" placeholder="所要時間(分)"
                value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: e.target.value })}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={submitting || events.length === 0}
                className="flex-1 bg-emerald-500 text-white py-2 rounded-lg font-semibold text-sm disabled:opacity-50">
                {editing ? "更新" : "追加"}
              </button>
              {editing && (
                <button type="button"
                  onClick={() => { setEditing(null); setForm({ eventId: events[0]?.id ?? "", name: "", description: "", distanceKm: "", durationMin: "" }); }}
                  className="px-4 bg-gray-100 text-gray-600 py-2 rounded-lg text-sm">
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
                    {c.eventId && (
                      <p className="text-xs text-emerald-600 font-semibold mb-0.5">{eventMap[c.eventId] ?? ""}</p>
                    )}
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Event = {
  id: string;
  name: string;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
};

export default function AdminSettingsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", description: "", startsAt: "", endsAt: "" });
  const [editing, setEditing] = useState<Event | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const load = () => {
    fetch("/api/admin/events")
      .then((r) => {
        if (r.status === 401) { router.replace("/admin/login"); return null; }
        return r.json();
      })
      .then((data) => { if (data) { setEvents(data); setLoading(false); } });
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const body = {
      ...(editing ? { id: editing.id } : {}),
      name: form.name,
      description: form.description || null,
      startsAt: form.startsAt || null,
      endsAt: form.endsAt || null,
    };
    await fetch("/api/admin/events", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setForm({ name: "", description: "", startsAt: "", endsAt: "" });
    setEditing(null);
    setSubmitting(false);
    load();
  };

  const toggleActive = async (ev: Event) => {
    await fetch("/api/admin/events", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ev.id, isActive: !ev.isActive }),
    });
    load();
  };

  const handleEdit = (ev: Event) => {
    setEditing(ev);
    setForm({
      name: ev.name,
      description: ev.description ?? "",
      startsAt: ev.startsAt ? ev.startsAt.slice(0, 16) : "",
      endsAt: ev.endsAt ? ev.endsAt.slice(0, 16) : "",
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-gray-800 text-white px-4 py-4 shadow flex items-center gap-3">
        <Link href="/admin" className="text-gray-300 hover:text-white">← 戻る</Link>
        <h1 className="text-lg font-bold">⚙️ イベント設定</h1>
      </header>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
          <h2 className="font-bold text-gray-700 mb-3">
            {editing ? "イベントを編集" : "イベントを追加"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              required
              placeholder="イベント名"
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
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">開始日時</label>
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">終了日時</label>
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
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
                  onClick={() => { setEditing(null); setForm({ name: "", description: "", startsAt: "", endsAt: "" }); }}
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
        ) : events.length === 0 ? (
          <p className="text-gray-400 text-center py-8">イベントがありません</p>
        ) : (
          <ul className="space-y-3">
            {events.map((ev) => (
              <li key={ev.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-800">{ev.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ev.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
                        {ev.isActive ? "開催中" : "停止中"}
                      </span>
                    </div>
                    {ev.startsAt && (
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(ev.startsAt).toLocaleString("ja-JP")} 〜{" "}
                        {ev.endsAt ? new Date(ev.endsAt).toLocaleString("ja-JP") : "未定"}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => toggleActive(ev)} className="text-xs text-blue-500 hover:underline">
                      {ev.isActive ? "停止" : "開始"}
                    </button>
                    <button onClick={() => handleEdit(ev)} className="text-xs text-gray-500 hover:underline">編集</button>
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

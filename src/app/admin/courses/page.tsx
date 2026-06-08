"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
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
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
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
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitResult(null);
    const body = {
      ...(editing ? { id: editing.id } : {}),
      eventId: form.eventId || null,
      name: form.name,
      description: form.description || null,
      distanceKm: form.distanceKm ? parseFloat(form.distanceKm) : null,
      durationMin: form.durationMin ? parseInt(form.durationMin) : null,
    };
    const res = await fetch("/api/admin/courses", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setSubmitResult({ ok: true, msg: editing ? "コースを更新しました" : "コースを追加しました" });
      setForm({ eventId: "", name: "", description: "", distanceKm: "", durationMin: "" });
      setEditing(null);
      load();
    } else {
      setSubmitResult({ ok: false, msg: "保存に失敗しました" });
    }
    setSubmitting(false);
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
    setSubmitResult(null);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
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

  // イベント別にグループ化
  const grouped: { event: Event | null; courses: Course[] }[] = [];
  const eventIds = events.map((e) => e.id);
  // イベントありのコースをイベント別にグループ
  events.forEach((ev) => {
    const evCourses = courses.filter((c) => c.eventId === ev.id);
    if (evCourses.length > 0) {
      grouped.push({ event: ev, courses: evCourses });
    }
  });
  // イベントなしのコース
  const floating = courses.filter((c) => !c.eventId || !eventIds.includes(c.eventId));
  if (floating.length > 0) {
    grouped.push({ event: null, courses: floating });
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-gray-800 text-white px-4 py-4 shadow flex items-center gap-3">
        <Link href="/admin" className="text-gray-300 hover:text-white">← 戻る</Link>
        <h1 className="text-lg font-bold flex-1">📚 コースライブラリ</h1>
        <a href="/api/admin/courses/export" download="courses.csv"
          className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-3 py-1.5 rounded-lg font-semibold">
          ⬇ CSV出力
        </a>
      </header>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">

        {/* 説明 */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-5 text-xs text-blue-700">
          <p className="font-semibold mb-0.5">📌 コースライブラリとは</p>
          <p>このテナントに登録されているすべてのコース一覧です。イベントごとに表示しています。</p>
          <p className="mt-1">コースのスポットを管理したい場合は、
            <Link href="/admin/events" className="underline font-semibold ml-1">イベント管理</Link>
            からイベント→コースの順に進んでください。
          </p>
        </div>

        {/* 追加・編集フォーム */}
        <div
          ref={formRef}
          className={`rounded-xl border shadow-sm p-4 mb-6 transition-all ${
            editing ? "bg-amber-50 border-amber-400 ring-2 ring-amber-300" : "bg-white border-gray-100"
          }`}
        >
          {editing && (
            <div className="flex items-center gap-2 mb-3 bg-amber-100 border border-amber-300 rounded-lg px-3 py-2">
              <span className="text-amber-600 font-bold text-sm">✏️ 編集モード：</span>
              <span className="text-amber-800 text-sm font-semibold truncate">{editing.name}</span>
            </div>
          )}
          <h2 className="font-bold text-gray-700 mb-3">{editing ? "コースを編集" : "＋ コースを追加"}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">イベント（任意）</label>
              <select value={form.eventId} onChange={(e) => setForm({ ...form, eventId: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                <option value="">未割り当て（ライブラリ保管）</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            </div>
            <input required placeholder="コース名（例：Aコース・北エリア）" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <input placeholder="説明（任意）" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <div className="flex gap-2">
              <input type="number" step="0.1" placeholder="距離(km)" value={form.distanceKm}
                onChange={(e) => setForm({ ...form, distanceKm: e.target.value })}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <input type="number" placeholder="所要時間(分)" value={form.durationMin}
                onChange={(e) => setForm({ ...form, durationMin: e.target.value })}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={submitting}
                className={`flex-1 text-white py-2 rounded-lg font-semibold text-sm disabled:opacity-50 ${editing ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-500 hover:bg-emerald-600"}`}>
                {submitting ? "保存中..." : editing ? "✏️ 更新する" : "追加"}
              </button>
              {editing && (
                <button type="button"
                  onClick={() => { setEditing(null); setForm({ eventId: "", name: "", description: "", distanceKm: "", durationMin: "" }); setSubmitResult(null); }}
                  className="px-4 bg-gray-100 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-200">
                  キャンセル
                </button>
              )}
            </div>
            {submitResult && (
              <div className={`rounded-lg px-3 py-2 text-sm font-semibold text-center ${submitResult.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                {submitResult.ok ? "✓ " : "✗ "}{submitResult.msg}
              </div>
            )}
          </form>
        </div>

        {/* コース一覧（イベント別グループ表示） */}
        {loading ? (
          <p className="text-gray-400 text-center py-8">読み込み中...</p>
        ) : courses.length === 0 ? (
          <p className="text-gray-400 text-center py-8">コースがありません</p>
        ) : (
          <div className="space-y-5">
            {grouped.map(({ event: ev, courses: gCourses }) => (
              <div key={ev?.id ?? "floating"}>
                <div className="flex items-center gap-2 mb-2">
                  {ev ? (
                    <Link href={`/admin/events/${ev.id}`}
                      className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full hover:bg-emerald-200">
                      🗓️ {ev.name} →
                    </Link>
                  ) : (
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      📦 未割り当て（ライブラリ保管中）
                    </span>
                  )}
                </div>
                <ul className="space-y-2 pl-2">
                  {gCourses.map((c) => (
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
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

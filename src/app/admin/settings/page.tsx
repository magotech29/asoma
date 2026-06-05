"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// UTC文字列 → JST の datetime-local 入力値（"YYYY-MM-DDTHH:MM"）
function utcToJSTInput(utcStr: string | null): string {
  if (!utcStr) return "";
  const d = new Date(utcStr);
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 16);
}

// datetime-local の値（JST想定）→ ISO文字列（+09:00付き）
function jstInputToISO(val: string): string | null {
  if (!val) return null;
  return `${val}:00+09:00`;
}

// UTC文字列 → JST表示文字列
function formatJST(utcStr: string | null): string {
  if (!utcStr) return "未定";
  return new Date(utcStr).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

function DateTimePicker({ value, onChange, label }: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const parse = (v: string) => {
    const [d = "", t = ""] = v ? v.split("T") : [];
    const [h = "", mm = ""] = t.split(":");
    return { d, h, mm };
  };

  const { d: initD, h: initH, mm: initMm } = parse(value);
  const [d, setD] = useState(initD);
  const [h, setH] = useState(initH);
  const [mm, setMm] = useState(initMm);

  // 親のvalue変更（フォームリセット等）に追従
  useEffect(() => {
    const { d: nd, h: nh, mm: nmm } = parse(value);
    setD(nd); setH(nh); setMm(nmm);
  }, [value]);

  const notify = (nd: string, nh: string, nmm: string) => {
    if (nd && nh && nmm) {
      onChange(`${nd}T${nh}:${nmm}`);
    }
  };

  return (
    <div className="flex-1">
      <label className="block text-xs text-gray-500 mb-1">{label}（日本時間）</label>
      <div className="flex gap-1 items-center flex-wrap">
        <input
          type="date"
          value={d}
          onChange={(e) => { setD(e.target.value); notify(e.target.value, h, mm); }}
          className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 min-w-0"
        />
        <select
          value={h}
          onChange={(e) => { setH(e.target.value); notify(d, e.target.value, mm); }}
          className="border border-gray-200 rounded-lg px-1 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="">時</option>
          {HOURS.map((hh) => <option key={hh} value={hh}>{hh}</option>)}
        </select>
        <span className="text-gray-400 text-sm font-bold">:</span>
        <select
          value={mm}
          onChange={(e) => { setMm(e.target.value); notify(d, h, e.target.value); }}
          className="border border-gray-200 rounded-lg px-1 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="">分</option>
          {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
    </div>
  );
}

type Spot = { id: string; name: string };
type Course = { id: string; name: string; spots: Spot[] };
type Event = {
  id: string;
  name: string;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
};
type EventWithCourses = Event & { courses: Course[] };

export default function AdminSettingsPage() {
  const [events, setEvents] = useState<EventWithCourses[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", description: "", startsAt: "", endsAt: "" });
  const [editing, setEditing] = useState<Event | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [copySource, setCopySource] = useState("");
  const [copyTarget, setCopyTarget] = useState("");
  const [copying, setCopying] = useState(false);
  const [copyResult, setCopyResult] = useState<string | null>(null);
  const router = useRouter();

  const load = async () => {
    try {
      const [evtsRes, crsRes, spsRes] = await Promise.all([
        fetch("/api/admin/events"),
        fetch("/api/admin/courses"),
        fetch("/api/admin/spots"),
      ]);
      if (evtsRes.status === 401) { router.replace("/admin/login"); return; }
      if (!evtsRes.ok) throw new Error("events fetch failed");
      const evts: Event[] = await evtsRes.json();
      const crs: (Course & { eventId: string })[] = crsRes.ok ? await crsRes.json() : [];
      const sps: (Spot & { courseId: string })[] = spsRes.ok ? await spsRes.json() : [];

      const enriched: EventWithCourses[] = evts.map((e) => ({
        ...e,
        courses: crs
          .filter((c) => c.eventId === e.id)
          .map((c) => ({
            ...c,
            spots: sps.filter((s) => s.courseId === c.id),
          })),
      }));
      setEvents(enriched);
    } catch {
      // エラーは無視してリストをクリアしない
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const body = {
        ...(editing ? { id: editing.id } : {}),
        name: form.name,
        description: form.description || null,
        startsAt: jstInputToISO(form.startsAt),
        endsAt: jstInputToISO(form.endsAt),
      };
      const res = await fetch("/api/admin/events", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSubmitResult({ ok: true, msg: editing ? "イベントを更新しました" : "イベントを追加しました" });
        setForm({ name: "", description: "", startsAt: "", endsAt: "" });
        setEditing(null);
        await load();
      } else {
        const data = await res.json().catch(() => ({}));
        setSubmitResult({ ok: false, msg: data.error ?? "保存に失敗しました" });
      }
    } catch {
      setSubmitResult({ ok: false, msg: "通信エラーが発生しました" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (ev: Event) => {
    setEditing(ev);
    setForm({
      name: ev.name,
      description: ev.description ?? "",
      startsAt: utcToJSTInput(ev.startsAt),
      endsAt: utcToJSTInput(ev.endsAt),
    });
  };

  const toggleActive = async (ev: Event) => {
    await fetch("/api/admin/events", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ev.id, isActive: !ev.isActive }),
    });
    load();
  };

  const handleCopy = async () => {
    if (!copySource || !copyTarget || copySource === copyTarget) return;
    setCopying(true);
    setCopyResult(null);
    const res = await fetch("/api/admin/events/copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceEventId: copySource, targetEventId: copyTarget }),
    });
    const data = await res.json();
    if (res.ok) {
      setCopyResult(`✓ ${data.copiedCourses}コース・${data.copiedSpots}スポットをコピーしました`);
      load();
    } else {
      setCopyResult("コピーに失敗しました");
    }
    setCopying(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-gray-800 text-white px-4 py-4 shadow flex items-center gap-3">
        <Link href="/admin" className="text-gray-300 hover:text-white">← 戻る</Link>
        <h1 className="text-lg font-bold">⚙️ イベント管理</h1>
      </header>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        {/* 追加・編集フォーム */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
          <h2 className="font-bold text-gray-700 mb-3">{editing ? "イベントを編集" : "イベントを追加"}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              required
              placeholder="イベント名（例：初詣スタンプラリー2026）"
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
            <div className="flex gap-3">
              <DateTimePicker
                label="開始日時"
                value={form.startsAt}
                onChange={(v) => setForm({ ...form, startsAt: v })}
              />
              <DateTimePicker
                label="終了日時"
                value={form.endsAt}
                onChange={(v) => setForm({ ...form, endsAt: v })}
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={submitting}
                className="flex-1 bg-emerald-500 text-white py-2 rounded-lg font-semibold text-sm disabled:opacity-50">
                {submitting ? "保存中..." : editing ? "更新" : "追加"}
              </button>
              {editing && (
                <button type="button"
                  onClick={() => { setEditing(null); setForm({ name: "", description: "", startsAt: "", endsAt: "" }); setSubmitResult(null); }}
                  className="px-4 bg-gray-100 text-gray-600 py-2 rounded-lg text-sm">
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

        {/* コピー機能 */}
        {events.length >= 2 && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
            <h2 className="font-bold text-blue-700 mb-2 text-sm">📋 コース・スポットをコピー</h2>
            <p className="text-xs text-gray-500 mb-3">過去のイベントのコース・スポット構成を別のイベントにコピーします（QRコードは新規発行）</p>
            <div className="space-y-2">
              <select value={copySource} onChange={(e) => setCopySource(e.target.value)}
                className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">コピー元イベントを選択</option>
                {events.map((e) => <option key={e.id} value={e.id}>{e.name}（{e.courses.length}コース）</option>)}
              </select>
              <select value={copyTarget} onChange={(e) => setCopyTarget(e.target.value)}
                className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">コピー先イベントを選択</option>
                {events.filter((e) => e.id !== copySource).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <button onClick={handleCopy} disabled={copying || !copySource || !copyTarget}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold">
                {copying ? "コピー中..." : "コピーを実行"}
              </button>
              {copyResult && <p className="text-sm text-center text-emerald-600">{copyResult}</p>}
            </div>
          </div>
        )}

        {/* イベント一覧 */}
        {loading ? (
          <p className="text-gray-400 text-center py-8">読み込み中...</p>
        ) : events.length === 0 ? (
          <p className="text-gray-400 text-center py-8">イベントがありません</p>
        ) : (
          <ul className="space-y-4">
            {events.map((ev) => (
              <li key={ev.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-800">{ev.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ev.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
                        {ev.isActive ? "開催中" : "停止中"}
                      </span>
                    </div>
                    {ev.startsAt && (
                      <p className="text-xs text-gray-400 mt-1">
                        {formatJST(ev.startsAt)} 〜 {formatJST(ev.endsAt)}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => toggleActive(ev)}
                      className="text-xs text-blue-500 hover:underline">
                      {ev.isActive ? "停止" : "開始"}
                    </button>
                    <button onClick={() => handleEdit(ev)}
                      className="text-xs text-gray-500 hover:underline">編集</button>
                  </div>
                </div>

                {/* コース一覧 */}
                {ev.courses.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {ev.courses.map((c) => (
                      <div key={c.id} className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-sm font-semibold text-gray-700">🗺️ {c.name}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {c.spots.map((s, i) => (
                            <span key={s.id} className="text-xs bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-500">
                              {i + 1}. {s.name}
                            </span>
                          ))}
                          {c.spots.length === 0 && (
                            <span className="text-xs text-gray-400">スポットなし</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mt-2">
                    コースなし →{" "}
                    <Link href="/admin/courses" className="text-emerald-500 underline">コースを追加</Link>
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

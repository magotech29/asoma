"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function utcToJSTInput(utcStr: string | null): string {
  if (!utcStr) return "";
  const d = new Date(utcStr);
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 16);
}

function jstInputToISO(val: string): string | null {
  if (!val) return null;
  return `${val}:00+09:00`;
}

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

  useEffect(() => {
    const { d: nd, h: nh, mm: nmm } = parse(value);
    setD(nd); setH(nh); setMm(nmm);
  }, [value]);

  const notify = (nd: string, nh: string, nmm: string) => {
    if (nd && nh && nmm) onChange(`${nd}T${nh}:${nmm}`);
  };

  return (
    <div className="flex-1">
      <label className="block text-xs text-gray-500 mb-1">{label}（JST）</label>
      <div className="flex gap-1 items-center flex-wrap">
        <input type="date" value={d}
          onChange={(e) => { setD(e.target.value); notify(e.target.value, h, mm); }}
          className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 min-w-0"
        />
        <select value={h} onChange={(e) => { setH(e.target.value); notify(d, e.target.value, mm); }}
          className="border border-gray-200 rounded-lg px-1 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
          <option value="">時</option>
          {HOURS.map((hh) => <option key={hh} value={hh}>{hh}</option>)}
        </select>
        <span className="text-gray-400 text-sm font-bold">:</span>
        <select value={mm} onChange={(e) => { setMm(e.target.value); notify(d, h, e.target.value); }}
          className="border border-gray-200 rounded-lg px-1 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
          <option value="">分</option>
          {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
    </div>
  );
}

type Event = {
  id: string;
  name: string;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
};
type CourseCount = { eventId: string | null };

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [courseCounts, setCourseCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", description: "", startsAt: "", endsAt: "" });
  const [editing, setEditing] = useState<Event | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [copySource, setCopySource] = useState("");
  const [copyTarget, setCopyTarget] = useState("");
  const [copying, setCopying] = useState(false);
  const [copyResult, setCopyResult] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const load = async () => {
    try {
      const [evtsRes, crsRes] = await Promise.all([
        fetch("/api/admin/events"),
        fetch("/api/admin/courses"),
      ]);
      if (evtsRes.status === 401) { router.replace("/admin/login"); return; }
      if (!evtsRes.ok) throw new Error();
      const evts: Event[] = await evtsRes.json();
      const crs: CourseCount[] = crsRes.ok ? await crsRes.json() : [];
      const counts: Record<string, number> = {};
      crs.forEach((c) => { if (c.eventId) counts[c.eventId] = (counts[c.eventId] ?? 0) + 1; });
      setEvents(evts);
      setCourseCounts(counts);
    } catch {
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
        setSubmitResult({ ok: true, msg: editing ? "更新しました" : "イベントを作成しました" });
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
    setSubmitResult(null);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
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
        <h1 className="text-lg font-bold">🗓️ イベント管理</h1>
      </header>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">

        {/* 階層説明 */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6 text-xs text-blue-700">
          <p className="font-semibold mb-1">📌 管理の階層構造</p>
          <p className="font-mono">イベント → コース → スポット（QR）</p>
          <p className="mt-1 text-blue-600">イベントをタップするとコース・スポットを管理できます。</p>
        </div>

        {/* 作成・編集フォーム */}
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
          <h2 className="font-bold text-gray-700 mb-3">{editing ? "イベントを編集" : "＋ 新しいイベントを作成"}</h2>
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
              <DateTimePicker label="開始日時" value={form.startsAt} onChange={(v) => setForm({ ...form, startsAt: v })} />
              <DateTimePicker label="終了日時" value={form.endsAt} onChange={(v) => setForm({ ...form, endsAt: v })} />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={submitting}
                className={`flex-1 text-white py-2 rounded-lg font-semibold text-sm disabled:opacity-50 ${editing ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-500 hover:bg-emerald-600"}`}>
                {submitting ? "保存中..." : editing ? "✏️ 更新する" : "作成"}
              </button>
              {editing && (
                <button type="button"
                  onClick={() => { setEditing(null); setForm({ name: "", description: "", startsAt: "", endsAt: "" }); setSubmitResult(null); }}
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

        {/* イベント一覧 */}
        {loading ? (
          <p className="text-gray-400 text-center py-8">読み込み中...</p>
        ) : events.length === 0 ? (
          <p className="text-gray-400 text-center py-8">イベントがありません。上から作成してください。</p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 font-semibold px-1">イベント一覧（タップして詳細へ）</p>
            {events.map((ev) => (
              <div key={ev.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <Link href={`/admin/events/${ev.id}`} className="block p-4 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${ev.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
                          {ev.isActive ? "● 開催中" : "○ 停止中"}
                        </span>
                        <p className="font-bold text-gray-800 truncate">{ev.name}</p>
                      </div>
                      {ev.startsAt && (
                        <p className="text-xs text-gray-400">
                          {formatJST(ev.startsAt)} 〜 {formatJST(ev.endsAt)}
                        </p>
                      )}
                      <p className="text-xs text-emerald-600 mt-1">
                        {courseCounts[ev.id] ?? 0}コース登録済み
                      </p>
                    </div>
                    <span className="text-gray-300 text-lg ml-2">›</span>
                  </div>
                </Link>
                <div className="border-t border-gray-50 px-4 py-2 flex gap-3 bg-gray-50">
                  <button onClick={() => handleEdit(ev)}
                    className="text-xs text-blue-500 hover:underline">編集</button>
                  <button onClick={() => toggleActive(ev)}
                    className="text-xs text-gray-400 hover:underline">
                    {ev.isActive ? "停止する" : "開始する"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* コースコピー機能 */}
        {events.length >= 2 && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mt-6">
            <h2 className="font-bold text-blue-700 mb-1 text-sm">📋 コース・スポットを別イベントへコピー</h2>
            <p className="text-xs text-gray-500 mb-3">過去イベントのコース・スポット構成をまるごと別イベントにコピーします（QRコードは新規発行）</p>
            <div className="space-y-2">
              <select value={copySource} onChange={(e) => setCopySource(e.target.value)}
                className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">コピー元イベントを選択</option>
                {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
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
      </main>
    </div>
  );
}

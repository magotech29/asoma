"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";

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
  value: string; onChange: (v: string) => void; label: string;
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
          className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 min-w-0 bg-white"
        />
        <select value={h} onChange={(e) => { setH(e.target.value); notify(d, e.target.value, mm); }}
          className="border border-gray-200 rounded-lg px-1 py-2 text-sm bg-white">
          <option value="">時</option>
          {HOURS.map((hh) => <option key={hh} value={hh}>{hh}</option>)}
        </select>
        <span className="text-gray-400 text-sm font-bold">:</span>
        <select value={mm} onChange={(e) => { setMm(e.target.value); notify(d, h, e.target.value); }}
          className="border border-gray-200 rounded-lg px-1 py-2 text-sm bg-white">
          <option value="">分</option>
          {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
    </div>
  );
}

type Event = {
  id: string; name: string; description: string | null;
  startsAt: string | null; endsAt: string | null; isActive: boolean;
};
type Spot = { id: string; name: string; sortOrder: number };
type Course = {
  id: string; name: string; description: string | null;
  distanceKm: number | null; durationMin: number | null;
  sortOrder: number; eventId: string | null; spots: Spot[];
};

const EMPTY_COURSE_FORM = { name: "", description: "", distanceKm: "", durationMin: "" };

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  const router = useRouter();

  const [event, setEvent] = useState<Event | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [allSpots, setAllSpots] = useState<{ id: string; courseId: string; name: string; sortOrder: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingEvent, setEditingEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ name: "", description: "", startsAt: "", endsAt: "" });
  const [savingEvent, setSavingEvent] = useState(false);
  const eventFormRef = useRef<HTMLDivElement>(null);

  const [courseMode, setCourseMode] = useState<"hidden" | "add" | "edit">("hidden");
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState(EMPTY_COURSE_FORM);
  const [savingCourse, setSavingCourse] = useState(false);
  const courseFormRef = useRef<HTMLDivElement>(null);

  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const [copySourceId, setCopySourceId] = useState("");
  const [copying, setCopying] = useState(false);
  const [copyResult, setCopyResult] = useState<string | null>(null);

  const showToast = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 2500);
  };

  const load = async () => {
    try {
      const [evtsRes, crsRes, spsRes] = await Promise.all([
        fetch("/api/admin/events"),
        fetch("/api/admin/courses"),
        fetch("/api/admin/spots"),
      ]);
      if (evtsRes.status === 401) { router.replace("/admin/login"); return; }
      const evts: Event[] = evtsRes.ok ? await evtsRes.json() : [];
      const crs: Course[] = crsRes.ok ? await crsRes.json() : [];
      const sps: { id: string; courseId: string; name: string; sortOrder: number }[] = spsRes.ok ? await spsRes.json() : [];

      const found = evts.find((e) => e.id === eventId);
      if (!found) { router.replace("/admin/events"); return; }

      setEvent(found);
      setEventForm({
        name: found.name,
        description: found.description ?? "",
        startsAt: utcToJSTInput(found.startsAt),
        endsAt: utcToJSTInput(found.endsAt),
      });

      const enriched = crs
        .filter((c) => c.eventId === eventId)
        .map((c) => ({ ...c, spots: sps.filter((s) => s.courseId === c.id).sort((a, b) => a.sortOrder - b.sortOrder) }));
      setCourses(enriched);
      setAllCourses(crs);
      setAllSpots(sps);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [eventId]);

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEvent(true);
    try {
      const res = await fetch("/api/admin/events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: eventId,
          name: eventForm.name,
          description: eventForm.description || null,
          startsAt: jstInputToISO(eventForm.startsAt),
          endsAt: jstInputToISO(eventForm.endsAt),
        }),
      });
      if (res.ok) {
        showToast(true, "イベント情報を更新しました");
        setEditingEvent(false);
        await load();
      } else {
        showToast(false, "保存に失敗しました");
      }
    } catch {
      showToast(false, "通信エラー");
    } finally {
      setSavingEvent(false);
    }
  };

  const toggleActive = async () => {
    if (!event) return;
    await fetch("/api/admin/events", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: eventId, isActive: !event.isActive }),
    });
    load();
  };

  const openAddCourse = () => {
    setEditingCourse(null);
    setCourseForm(EMPTY_COURSE_FORM);
    setCourseMode("add");
    setTimeout(() => courseFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const openEditCourse = (c: Course) => {
    setEditingCourse(c);
    setCourseForm({
      name: c.name,
      description: c.description ?? "",
      distanceKm: c.distanceKm?.toString() ?? "",
      durationMin: c.durationMin?.toString() ?? "",
    });
    setCourseMode("edit");
    setTimeout(() => courseFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const closeCourseForm = () => {
    setCourseMode("hidden");
    setEditingCourse(null);
    setCourseForm(EMPTY_COURSE_FORM);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCourse(true);
    try {
      const body = {
        ...(editingCourse ? { id: editingCourse.id } : {}),
        eventId,
        name: courseForm.name,
        description: courseForm.description || null,
        distanceKm: courseForm.distanceKm ? parseFloat(courseForm.distanceKm) : null,
        durationMin: courseForm.durationMin ? parseInt(courseForm.durationMin) : null,
      };
      const res = await fetch("/api/admin/courses", {
        method: editingCourse ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showToast(true, editingCourse ? "コースを更新しました" : "コースを追加しました");
        closeCourseForm();
        await load();
      } else {
        showToast(false, "保存に失敗しました");
      }
    } catch {
      showToast(false, "通信エラー");
    } finally {
      setSavingCourse(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("このコースを削除しますか？")) return;
    await fetch("/api/admin/courses", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  };

  const handleCopyCourse = async () => {
    if (!copySourceId) return;
    setCopying(true);
    setCopyResult(null);
    try {
      const sourceCourse = allCourses.find((c) => c.id === copySourceId);
      if (!sourceCourse) { setCopyResult("コースが見つかりません"); setCopying(false); return; }
      const spotsOfSource = allSpots.filter((s) => s.courseId === copySourceId);

      const crsRes = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          name: `${sourceCourse.name}（コピー）`,
          description: sourceCourse.description,
          distanceKm: sourceCourse.distanceKm,
          durationMin: sourceCourse.durationMin,
        }),
      });
      if (!crsRes.ok) { setCopyResult("コースのコピーに失敗しました"); setCopying(false); return; }
      const newCourse = await crsRes.json();

      for (const sp of spotsOfSource) {
        await fetch("/api/admin/spots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId: newCourse.id, name: sp.name, sortOrder: sp.sortOrder }),
        });
      }

      setCopyResult(`✓ 「${sourceCourse.name}」を${spotsOfSource.length}スポットごとコピーしました`);
      setCopySourceId("");
      await load();
    } catch {
      setCopyResult("コピーに失敗しました");
    } finally {
      setCopying(false);
    }
  };

  const otherCourses = allCourses.filter((c) => c.eventId !== eventId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-gray-800 text-white px-4 py-4 shadow flex items-center gap-3">
        <Link href="/admin/events" className="text-gray-300 hover:text-white">← イベント一覧</Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{event.name}</h1>
          <p className="text-xs text-gray-400">イベント詳細</p>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full space-y-5">

        {/* トースト */}
        {toast && (
          <div className={`rounded-xl px-4 py-3 text-sm font-semibold text-center ${toast.ok ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-600"}`}>
            {toast.ok ? "✓ " : "✗ "}{toast.msg}
          </div>
        )}

        {/* イベント情報カード */}
        <div ref={eventFormRef}
          className={`rounded-xl border shadow-sm p-4 transition-all ${editingEvent ? "bg-amber-50 border-amber-400 ring-2 ring-amber-300" : "bg-white border-gray-100"}`}>
          {editingEvent ? (
            <>
              <div className="flex items-center gap-2 mb-3 bg-amber-100 border border-amber-300 rounded-lg px-3 py-2">
                <span className="text-amber-600 font-bold text-sm">✏️ イベント情報を編集中</span>
              </div>
              <form onSubmit={handleSaveEvent} className="space-y-3">
                <input required value={eventForm.name}
                  onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                />
                <input placeholder="説明（任意）" value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                />
                <div className="flex gap-3">
                  <DateTimePicker label="開始日時" value={eventForm.startsAt} onChange={(v) => setEventForm({ ...eventForm, startsAt: v })} />
                  <DateTimePicker label="終了日時" value={eventForm.endsAt} onChange={(v) => setEventForm({ ...eventForm, endsAt: v })} />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={savingEvent}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
                    {savingEvent ? "保存中..." : "✏️ 更新する"}
                  </button>
                  <button type="button" onClick={() => setEditingEvent(false)}
                    className="px-4 bg-gray-100 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-200">
                    キャンセル
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${event.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
                      {event.isActive ? "● 開催中" : "○ 停止中"}
                    </span>
                  </div>
                  <p className="font-bold text-gray-800 text-lg">{event.name}</p>
                  {event.description && <p className="text-sm text-gray-500 mt-0.5">{event.description}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    {formatJST(event.startsAt)} 〜 {formatJST(event.endsAt)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    setEditingEvent(true);
                    setTimeout(() => eventFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                  }}
                  className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                  ✏️ 編集
                </button>
                <button onClick={toggleActive}
                  className={`text-xs border px-3 py-1.5 rounded-lg ${event.isActive ? "border-gray-200 text-gray-500 hover:bg-gray-50" : "border-emerald-300 text-emerald-600 hover:bg-emerald-50"}`}>
                  {event.isActive ? "停止する" : "開始する"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── コース管理 ── */}
        <div>
          {/* コースセクションヘッダー */}
          <div className="flex items-center justify-between px-1 mb-2">
            <p className="text-xs text-gray-500 font-semibold">
              📍 コース一覧 — このイベントのルート（{courses.length}件）
            </p>
            {courseMode === "hidden" && (
              <button onClick={openAddCourse}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                ＋ コースを追加
              </button>
            )}
          </div>

          {/* コース追加・編集フォーム（accordion） */}
          {courseMode !== "hidden" && (
            <div
              ref={courseFormRef}
              className={`rounded-xl border shadow-sm p-4 mb-3 transition-all ${
                courseMode === "edit"
                  ? "bg-amber-50 border-amber-400 ring-2 ring-amber-300"
                  : "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200"
              }`}
            >
              {courseMode === "edit" && editingCourse && (
                <div className="flex items-center gap-2 mb-3 bg-amber-100 border border-amber-300 rounded-lg px-3 py-2">
                  <span className="text-amber-600 font-bold text-sm">✏️ 編集中：</span>
                  <span className="text-amber-800 text-sm font-semibold truncate">{editingCourse.name}</span>
                </div>
              )}
              <h2 className="font-bold text-gray-700 mb-3">
                {courseMode === "edit" ? "コースを編集" : "＋ コースを追加"}
              </h2>
              <form onSubmit={handleSaveCourse} className="space-y-3">
                <input required placeholder="コース名（例：Aコース・北エリア）" value={courseForm.name}
                  onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                />
                <input placeholder="説明（任意）" value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                />
                <div className="flex gap-2">
                  <input type="number" step="0.1" placeholder="距離(km)" value={courseForm.distanceKm}
                    onChange={(e) => setCourseForm({ ...courseForm, distanceKm: e.target.value })}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                  />
                  <input type="number" placeholder="所要時間(分)" value={courseForm.durationMin}
                    onChange={(e) => setCourseForm({ ...courseForm, durationMin: e.target.value })}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={savingCourse}
                    className={`flex-1 text-white py-2 rounded-lg font-semibold text-sm disabled:opacity-50 ${courseMode === "edit" ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-500 hover:bg-emerald-600"}`}>
                    {savingCourse ? "保存中..." : courseMode === "edit" ? "✏️ 更新する" : "追加する"}
                  </button>
                  <button type="button" onClick={closeCourseForm}
                    className="px-4 bg-gray-100 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-200">
                    キャンセル
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* コース一覧 */}
          {courses.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-xl p-6 text-center">
              <p className="text-sm text-gray-400 mb-3">コースがまだありません</p>
              {courseMode === "hidden" && (
                <button onClick={openAddCourse}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg">
                  ＋ 最初のコースを追加
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {courses.map((c) => (
                <div key={c.id}
                  className={`bg-white rounded-xl border shadow-sm overflow-hidden transition ${courseMode === "edit" && editingCourse?.id === c.id ? "border-amber-300 ring-1 ring-amber-200" : "border-gray-100"}`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800">{c.name}</p>
                        {c.description && <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>}
                        <div className="flex gap-2 text-xs text-gray-400 mt-1">
                          {c.distanceKm && <span>{c.distanceKm}km</span>}
                          {c.durationMin && <span>{c.durationMin}分</span>}
                          <span className="text-emerald-600 font-semibold">{c.spots.length}スポット</span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-2">
                        <button onClick={() => openEditCourse(c)} className="text-xs text-blue-500 hover:underline">編集</button>
                        <button onClick={() => handleDeleteCourse(c.id)} className="text-xs text-red-400 hover:underline">削除</button>
                      </div>
                    </div>

                    {c.spots.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {c.spots.map((s, i) => (
                          <span key={s.id} className="text-xs bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-gray-500">
                            {i + 1}. {s.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="border-t border-gray-50 px-4 py-2 bg-gray-50">
                    <Link href={`/admin/spots?courseId=${c.id}`}
                      className="text-xs text-emerald-600 font-semibold hover:underline">
                      📍 スポットを管理 →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 他イベントのコースをコピー */}
        {otherCourses.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <h3 className="font-bold text-blue-700 text-sm mb-1">📋 他のコースをコピーして追加</h3>
            <p className="text-xs text-gray-500 mb-3">
              他のイベントで使用しているコースをコピーします（元のコースは変更されません）
            </p>
            <select value={copySourceId} onChange={(e) => setCopySourceId(e.target.value)}
              className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">コピー元コースを選択</option>
              {otherCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}（{allSpots.filter((s) => s.courseId === c.id).length}スポット）
                </option>
              ))}
            </select>
            <button onClick={handleCopyCourse} disabled={copying || !copySourceId}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold">
              {copying ? "コピー中..." : "このコースをコピーして追加"}
            </button>
            {copyResult && (
              <p className={`text-sm text-center mt-2 ${copyResult.startsWith("✓") ? "text-emerald-600" : "text-red-500"}`}>
                {copyResult}
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

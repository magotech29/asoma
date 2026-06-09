"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

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

function AdminSpotsContent() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"hidden" | "add" | "edit">("hidden");
  const [editingSpot, setEditingSpot] = useState<Spot | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [plusCode, setPlusCode] = useState("");
  const [plusCodeError, setPlusCodeError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [backEventId, setBackEventId] = useState<string | null>(null);
  const [preselectedCourseId, setPreselectedCourseId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const showToast = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 2500);
  };

  const load = () => {
    Promise.all([
      fetch("/api/admin/courses").then((r) => r.status === 401 ? null : r.json()),
      fetch("/api/admin/spots").then((r) => r.status === 401 ? null : r.json()),
    ]).then(([c, s]) => {
      if (!c) { router.replace("/admin/login"); return; }
      const cList: Course[] = c ?? [];
      setCourses(cList);
      setSpots(s ?? []);
      setLoading(false);
    });
  };

  useEffect(() => {
    const courseIdParam = searchParams.get("courseId");
    setPreselectedCourseId(courseIdParam);
    if (courseIdParam) {
      fetch("/api/admin/courses")
        .then((r) => r.ok ? r.json() : [])
        .then((crs: { id: string; eventId: string | null }[]) => {
          const course = crs.find((c) => c.id === courseIdParam);
          if (course?.eventId) setBackEventId(course.eventId);
        });
    }
    load();
  }, []);

  const openAdd = (defaultCourseId?: string) => {
    setEditingSpot(null);
    const courseId = defaultCourseId ?? preselectedCourseId ?? courses[0]?.id ?? "";
    setForm({ ...EMPTY_FORM, courseId });
    setPlusCode("");
    setPlusCodeError(null);
    setMode("add");
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const openEdit = (s: Spot) => {
    setEditingSpot(s);
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
    setPlusCode("");
    setPlusCodeError(null);
    setMode("edit");
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const closeForm = () => {
    setMode("hidden");
    setEditingSpot(null);
    setForm(EMPTY_FORM);
    setPlusCode("");
    setPlusCodeError(null);
  };

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
    setForm((f) => ({ ...f, lat: parts[0].trim(), lng: parts[1].trim() }));
    setPlusCode("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const body = {
      ...(editingSpot ? { id: editingSpot.id } : {}),
      courseId: form.courseId,
      name: form.name,
      description: form.description || null,
      address: form.address || null,
      lat: form.lat ? form.lat : null,
      lng: form.lng ? form.lng : null,
      instagramUrl: form.instagramUrl || null,
      websiteUrl: form.websiteUrl || null,
    };
    const res = await fetch("/api/admin/spots", {
      method: editingSpot ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSubmitting(false);
    if (res.ok) {
      showToast(true, editingSpot ? "スポットを更新しました" : "スポットを追加しました");
      closeForm();
      load();
    } else {
      showToast(false, "保存に失敗しました");
    }
  };

  const handleMove = async (spotId: string, courseId: string, direction: "up" | "down") => {
    const courseSpots = spots
      .filter((s) => s.courseId === courseId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = courseSpots.findIndex((s) => s.id === spotId);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= courseSpots.length) return;
    const reordered = [...courseSpots];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    await Promise.all(
      reordered.map((s, newIdx) =>
        fetch("/api/admin/spots", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: s.id, sortOrder: newIdx }),
        })
      )
    );
    load();
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

  const spotsByCourse = courses.map((c) => ({
    course: c,
    spots: spots.filter((s) => s.courseId === c.id),
  }));

  const totalSpots = spots.length;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-gray-800 text-white px-4 py-4 shadow flex items-center gap-3">
        {backEventId ? (
          <Link href={`/admin/events/${backEventId}`} className="text-gray-300 hover:text-white text-sm">← イベントへ</Link>
        ) : (
          <Link href="/admin" className="text-gray-300 hover:text-white">← 戻る</Link>
        )}
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

        {/* トースト */}
        {toast && (
          <div className={`rounded-xl px-4 py-3 mb-4 text-sm font-semibold text-center ${toast.ok ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-600"}`}>
            {toast.ok ? "✓ " : "✗ "}{toast.msg}
          </div>
        )}

        {/* 一覧ヘッダー + 追加ボタン */}
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs text-gray-500 font-semibold">
            {loading ? "読み込み中..." : `スポット一覧（全${totalSpots}件）`}
          </p>
          {mode === "hidden" && (
            <button
              onClick={() => openAdd()}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1"
            >
              ＋ スポットを追加
            </button>
          )}
        </div>

        {/* 追加・編集フォーム（accordion） */}
        {mode !== "hidden" && (
          <div
            ref={formRef}
            className={`rounded-xl border shadow-sm p-4 mb-5 transition-all ${
              mode === "edit"
                ? "bg-amber-50 border-amber-400 ring-2 ring-amber-300"
                : "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200"
            }`}
          >
            {mode === "edit" && editingSpot && (
              <div className="flex items-center gap-2 mb-3 bg-amber-100 border border-amber-300 rounded-lg px-3 py-2">
                <span className="text-amber-600 font-bold text-sm">✏️ 編集中：</span>
                <span className="text-amber-800 text-sm font-semibold truncate">{editingSpot.name}</span>
              </div>
            )}
            <h2 className="font-bold text-gray-700 mb-3">
              {mode === "edit" ? "スポットを編集" : "＋ スポットを追加"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <select
                required
                value={form.courseId}
                onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
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
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
              />
              <input
                placeholder="説明（任意）"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
              />
              <input
                placeholder="住所（任意）"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
              />

              {/* 座標入力 */}
              <div className="bg-white border border-emerald-100 rounded-lg p-3">
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
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white font-mono"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">経度 (lng)</label>
                  <input
                    type="text" inputMode="decimal" placeholder="139.767125"
                    value={form.lng}
                    onChange={(e) => setForm({ ...form, lng: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white font-mono"
                  />
                </div>
              </div>

              {/* SNSリンク */}
              <div className="bg-white border border-purple-100 rounded-lg p-3 space-y-2">
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
                  className={`flex-1 text-white py-2 rounded-lg font-semibold text-sm disabled:opacity-50 ${mode === "edit" ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-500 hover:bg-emerald-600"}`}
                >
                  {submitting ? "保存中..." : mode === "edit" ? "✏️ 更新する" : "追加する"}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 bg-gray-100 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-200"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        )}

        {/* スポット一覧（コース別グループ） */}
        {loading ? (
          <p className="text-gray-400 text-center py-8">読み込み中...</p>
        ) : courses.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center">
            <p className="text-gray-400 text-sm mb-3">コースがまだありません。先にコースを追加してください。</p>
          </div>
        ) : (
          <div className="space-y-6">
            {spotsByCourse.map(({ course, spots: courseSpots }) => (
                <section key={course.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
                        🗺️ {course.name}
                      </span>
                      <span className="text-xs text-gray-400">{courseSpots.length}件</span>
                    </div>
                    {mode === "hidden" && (
                      <button
                        onClick={() => openAdd(course.id)}
                        className="text-xs text-emerald-600 border border-emerald-200 hover:bg-emerald-50 px-2 py-1 rounded-lg font-semibold"
                      >
                        ＋ 追加
                      </button>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {courseSpots.map((s, i) => (
                      <li
                        key={s.id}
                        className={`bg-white rounded-xl border shadow-sm px-4 py-3 transition ${
                          mode === "edit" && editingSpot?.id === s.id ? "border-amber-400 ring-1 ring-amber-300" : "border-gray-100"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 font-mono w-5 shrink-0">{i + 1}.</span>
                              <p className="font-semibold text-gray-800 truncate">{s.name}</p>
                            </div>
                            {s.address && <p className="text-xs text-gray-400 truncate mt-0.5 ml-7">{s.address}</p>}
                            <div className="flex items-center gap-3 mt-1 ml-7">
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
                          <div className="flex items-center gap-2 ml-3 shrink-0">
                            {mode === "hidden" && (
                              <div className="flex flex-col gap-0.5">
                                <button
                                  onClick={() => handleMove(s.id, s.courseId, "up")}
                                  disabled={i === 0}
                                  className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-20 leading-none px-1"
                                  title="上へ"
                                >▲</button>
                                <button
                                  onClick={() => handleMove(s.id, s.courseId, "down")}
                                  disabled={i === courseSpots.length - 1}
                                  className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-20 leading-none px-1"
                                  title="下へ"
                                >▼</button>
                              </div>
                            )}
                            <button onClick={() => openEdit(s)} className="text-sm text-blue-500 hover:underline">編集</button>
                            <button onClick={() => handleDelete(s.id)} className="text-sm text-red-400 hover:underline">削除</button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function AdminSpotsPage() {
  return (
    <Suspense fallback={<div className="flex flex-col min-h-screen bg-gray-50"><p className="text-gray-400 text-center py-8">読み込み中...</p></div>}>
      <AdminSpotsContent />
    </Suspense>
  );
}

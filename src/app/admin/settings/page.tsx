"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ImportResult = { added: number; updated: number; errors: string[] } | null;

export default function AdminSettingsPage() {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult>(null);
  const [importingCourses, setImportingCourses] = useState(false);
  const [importCourseResult, setImportCourseResult] = useState<ImportResult>(null);
  const [importingBulk, setImportingBulk] = useState(false);
  const [importBulkResult, setImportBulkResult] = useState<{
    courses: { added: number; updated: number };
    spots: { added: number; updated: number };
    errors: string[];
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/stats").then((r) => {
      if (r.status === 401) router.replace("/admin/login");
    });
  }, [router]);

  const downloadCSV = async (endpoint: string, filename: string) => {
    const res = await fetch(endpoint);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/spots/import", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) setImportResult(data);
      else setImportResult({ added: 0, updated: 0, errors: [data.error ?? "インポートに失敗しました"] });
    } catch {
      setImportResult({ added: 0, updated: 0, errors: ["通信エラーが発生しました"] });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handleImportBulk = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingBulk(true);
    setImportBulkResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/import/bulk", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) setImportBulkResult(data);
      else setImportBulkResult({ courses: { added: 0, updated: 0 }, spots: { added: 0, updated: 0 }, errors: [data.error ?? "インポートに失敗しました"] });
    } catch {
      setImportBulkResult({ courses: { added: 0, updated: 0 }, spots: { added: 0, updated: 0 }, errors: ["通信エラーが発生しました"] });
    } finally {
      setImportingBulk(false);
      e.target.value = "";
    }
  };

  const handleImportCourses = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingCourses(true);
    setImportCourseResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/courses/import", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) setImportCourseResult(data);
      else setImportCourseResult({ added: 0, updated: 0, errors: [data.error ?? "インポートに失敗しました"] });
    } catch {
      setImportCourseResult({ added: 0, updated: 0, errors: ["通信エラーが発生しました"] });
    } finally {
      setImportingCourses(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-gray-800 text-white px-4 py-4 shadow flex items-center gap-3">
        <Link href="/admin" className="text-gray-300 hover:text-white">← 戻る</Link>
        <h1 className="text-lg font-bold">⚙️ テナント設定</h1>
      </header>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full space-y-4">

        {/* ナビゲーション誘導 */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
          <p className="text-xs text-emerald-800 font-semibold mb-2">イベント・コース・スポットの管理はこちら</p>
          <div className="flex gap-2 flex-wrap">
            <Link href="/admin/events" className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-emerald-600">
              🗓️ イベント管理
            </Link>
            <Link href="/admin/courses" className="text-xs bg-white border border-emerald-300 text-emerald-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-emerald-50">
              📚 コースライブラリ
            </Link>
          </div>
        </div>

        {/* データ管理 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h2 className="font-bold text-gray-700 mb-4">📂 データ管理</h2>

          {/* 一括エクスポート */}
          <div className="mb-5 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-700 mb-1 font-semibold">⬇ コース・スポットを一括エクスポート</p>
            <p className="text-xs text-gray-500 mb-2">
              このテナントの<strong>全コース・全スポット</strong>をCSVで書き出します。<br />
              インポート用テンプレートとしても使えます。
            </p>
            <button
              onClick={() => downloadCSV("/api/admin/export/bulk", "bulk-export.csv")}
              className="w-full border border-gray-400 text-gray-700 bg-white hover:bg-gray-100 py-2 rounded-lg text-sm font-semibold transition"
            >
              ⬇ CSVエクスポート（インポート用テンプレート兼用）
            </button>
          </div>

          {/* 一括インポート（コース＋スポット） */}
          <div className="mb-5 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-xs text-emerald-800 mb-1 font-semibold">⚡ 一括インポート（コース＋スポット）</p>
            <p className="text-xs text-gray-500 mb-1">
              <span className="font-mono bg-white px-1 rounded">type</span> 列で種別を指定した1つのCSVをアップロードします。
              コース行が先に処理され、スポットは <span className="font-mono bg-white px-1 rounded">course_name</span> で紐付けられます。
            </p>
            <p className="text-xs text-gray-400 mb-2">
              コース列: type=course, name, description, distance_km, duration_min, sort_order<br />
              スポット列: type=spot, name, description, address, lat, lng, instagram_url, website_url, sort_order, course_name
            </p>
            <label className={`block w-full text-center border-2 border-dashed rounded-lg py-3 text-sm font-semibold cursor-pointer transition
              ${importingBulk ? "border-emerald-200 text-emerald-300" : "border-emerald-300 text-emerald-700 hover:border-emerald-500 hover:bg-emerald-100"}`}>
              {importingBulk ? "インポート中..." : "一括CSVファイルを選択"}
              <input type="file" accept=".csv" disabled={importingBulk} className="hidden" onChange={handleImportBulk} />
            </label>
            {importBulkResult && (
              <div className={`mt-2 rounded-lg px-3 py-2 text-sm ${importBulkResult.errors.length > 0 && importBulkResult.courses.added + importBulkResult.courses.updated + importBulkResult.spots.added + importBulkResult.spots.updated === 0 ? "bg-red-50 text-red-600" : "bg-white border border-emerald-200 text-emerald-700"}`}>
                {(importBulkResult.courses.added + importBulkResult.courses.updated + importBulkResult.spots.added + importBulkResult.spots.updated) > 0 && (
                  <p className="font-semibold">
                    ✓ コース {importBulkResult.courses.added}件追加・{importBulkResult.courses.updated}件更新 ／
                    スポット {importBulkResult.spots.added}件追加・{importBulkResult.spots.updated}件更新
                  </p>
                )}
                {importBulkResult.errors.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {importBulkResult.errors.map((err, i) => (
                      <li key={i} className="text-xs text-red-600">⚠ {err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* 個別エクスポート */}
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2 font-semibold">個別エクスポート</p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => downloadCSV("/api/admin/spots/export", "spots.csv")}
                className="flex-1 border border-emerald-200 text-emerald-700 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-50 transition">
                スポット一覧 (CSV)
              </button>
              <button onClick={() => downloadCSV("/api/admin/courses/export", "courses.csv")}
                className="flex-1 border border-emerald-200 text-emerald-700 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-50 transition">
                コース一覧 (CSV)
              </button>
            </div>
          </div>

          {/* コースインポート */}
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-1 font-semibold">コースをCSVからインポート</p>
            <p className="text-xs text-gray-400 mb-2">列: name, description, distance_km, duration_min, sort_order</p>
            <label className={`block w-full text-center border-2 border-dashed rounded-lg py-3 text-sm cursor-pointer transition
              ${importingCourses ? "border-gray-200 text-gray-300" : "border-gray-300 text-gray-500 hover:border-emerald-300 hover:text-emerald-600"}`}>
              {importingCourses ? "インポート中..." : "CSVファイルを選択"}
              <input type="file" accept=".csv" disabled={importingCourses} className="hidden" onChange={handleImportCourses} />
            </label>
            {importCourseResult && (
              <div className={`mt-2 rounded-lg px-3 py-2 text-sm ${importCourseResult.errors.length > 0 && importCourseResult.added + importCourseResult.updated === 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
                {(importCourseResult.added > 0 || importCourseResult.updated > 0) && (
                  <p className="font-semibold">✓ {importCourseResult.added}件追加・{importCourseResult.updated}件更新しました</p>
                )}
                {importCourseResult.errors.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {importCourseResult.errors.map((err, i) => (
                      <li key={i} className="text-xs text-red-600">⚠ {err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* スポットインポート */}
          <div>
            <p className="text-xs text-gray-500 mb-1 font-semibold">スポットをCSVからインポート</p>
            <p className="text-xs text-gray-400 mb-2">
              列: name, description, address, lat, lng, instagram_url, website_url, sort_order, course_name
            </p>
            <label className={`block w-full text-center border-2 border-dashed rounded-lg py-3 text-sm cursor-pointer transition
              ${importing ? "border-gray-200 text-gray-300" : "border-gray-300 text-gray-500 hover:border-emerald-300 hover:text-emerald-600"}`}>
              {importing ? "インポート中..." : "CSVファイルを選択"}
              <input type="file" accept=".csv" disabled={importing} className="hidden" onChange={handleImport} />
            </label>
            {importResult && (
              <div className={`mt-2 rounded-lg px-3 py-2 text-sm ${importResult.errors.length > 0 && importResult.added + importResult.updated === 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
                {(importResult.added > 0 || importResult.updated > 0) && (
                  <p className="font-semibold">✓ {importResult.added}件追加・{importResult.updated}件更新しました</p>
                )}
                {importResult.errors.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {importResult.errors.map((err, i) => (
                      <li key={i} className="text-xs text-red-600">⚠ {err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

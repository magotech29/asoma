import { readFileSync } from "fs";
import path from "path";
import { marked } from "marked";
import Link from "next/link";

const CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; }
  .guide-body {
    font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif;
    font-size: 15px;
    line-height: 1.9;
    color: #1f2937;
  }
  .guide-body h1 {
    font-size: 20px;
    border-bottom: 3px solid #10b981;
    padding-bottom: 10px;
    color: #065f46;
    margin-top: 0;
  }
  .guide-body h2 {
    font-size: 16px;
    border-left: 5px solid #10b981;
    padding: 6px 10px;
    margin-top: 28px;
    color: #047857;
    background: #f0fdf4;
    border-radius: 0 4px 4px 0;
  }
  .guide-body h3 { font-size: 14px; color: #374151; margin-top: 20px; }
  .guide-body table {
    border-collapse: collapse;
    width: 100%;
    margin: 14px 0;
    font-size: 14px;
  }
  .guide-body th {
    background: #d1fae5;
    padding: 8px 12px;
    border: 1px solid #6ee7b7;
    text-align: left;
  }
  .guide-body td { padding: 7px 12px; border: 1px solid #d1d5db; }
  .guide-body tr:nth-child(even) td { background: #f9fafb; }
  .guide-body code {
    background: #f3f4f6;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: monospace;
    font-size: 13px;
    color: #dc2626;
    word-break: break-all;
  }
  .guide-body pre {
    background: #f3f4f6;
    padding: 14px;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
    overflow-x: auto;
    font-size: 13px;
  }
  .guide-body pre code { color: #374151; background: none; padding: 0; }
  .guide-body blockquote {
    border-left: 4px solid #6ee7b7;
    margin: 14px 0;
    padding: 6px 16px;
    background: #f0fdf4;
    color: #374151;
    border-radius: 0 4px 4px 0;
  }
  .guide-body hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
  .guide-body ul, .guide-body ol { padding-left: 24px; }
  .guide-body li { margin: 4px 0; }
  .guide-body strong { color: #111827; }
`;

export default async function GuidePage() {
  const md = readFileSync(
    path.join(process.cwd(), "docs/participant-guide.md"),
    "utf-8"
  );
  const body = await marked(md);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-emerald-600 text-white px-4 py-4 shadow flex items-center gap-3">
        <Link href="/" className="text-emerald-100 hover:text-white text-sm">← トップへ戻る</Link>
        <h1 className="text-lg font-bold">使い方ガイド</h1>
      </header>

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div
          className="guide-body bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          dangerouslySetInnerHTML={{ __html: body }}
        />
      </main>

      <footer className="text-center text-xs text-gray-400 py-4">
        © スタンプラリー実行委員会
      </footer>
    </div>
  );
}

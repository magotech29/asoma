import { readFileSync } from "fs";
import path from "path";
import { marked } from "marked";
import Link from "next/link";

const CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; }
  .faq-body {
    font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif;
    font-size: 15px;
    line-height: 1.9;
    color: #1f2937;
  }
  .faq-body h1 {
    font-size: 20px;
    border-bottom: 3px solid #10b981;
    padding-bottom: 10px;
    color: #065f46;
    margin-top: 0;
  }
  .faq-body h2 {
    font-size: 15px;
    border-left: 5px solid #10b981;
    padding: 6px 10px;
    margin-top: 28px;
    color: #047857;
    background: #f0fdf4;
    border-radius: 0 4px 4px 0;
  }
  .faq-body h3 {
    font-size: 14px;
    color: #374151;
    margin-top: 20px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 8px 12px;
  }
  .faq-body p { margin: 8px 0 12px; }
  .faq-body hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
  .faq-body ul, .faq-body ol { padding-left: 24px; }
  .faq-body li { margin: 4px 0; }
  .faq-body strong { color: #111827; }
  .faq-body code {
    background: #f3f4f6;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: monospace;
    font-size: 13px;
    color: #dc2626;
    word-break: break-all;
  }
  .faq-body blockquote {
    border-left: 4px solid #fbbf24;
    margin: 14px 0;
    padding: 6px 16px;
    background: #fffbeb;
    color: #374151;
    border-radius: 0 4px 4px 0;
    font-size: 14px;
  }
`;

export default async function FaqPage() {
  const md = readFileSync(
    path.join(process.cwd(), "docs/faq.md"),
    "utf-8"
  );
  const body = await marked(md);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-emerald-600 text-white px-4 py-4 shadow flex items-center gap-3">
        <Link href="/" className="text-emerald-100 hover:text-white text-sm">← トップへ戻る</Link>
        <h1 className="text-lg font-bold">よくあるご質問（FAQ）</h1>
      </header>

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-5 text-sm text-emerald-800">
          解決しない場合は{" "}
          <Link href="/guide" className="underline font-semibold">使い方ガイド</Link>
          {" "}もご覧ください。
        </div>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div
          className="faq-body bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          dangerouslySetInnerHTML={{ __html: body }}
        />
      </main>

      <footer className="text-center text-xs text-gray-400 py-4">
        © スタンプラリー実行委員会
      </footer>
    </div>
  );
}

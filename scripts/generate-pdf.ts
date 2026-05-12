import { config } from "dotenv";
config({ path: ".env.local" });

import { marked } from "marked";
import { readFileSync, writeFileSync } from "fs";
import path from "path";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap');

  * { box-sizing: border-box; }
  body {
    font-family: 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif;
    font-size: 13px;
    line-height: 1.9;
    color: #1f2937;
    max-width: 800px;
    margin: 0 auto;
    padding: 24px 48px 48px;
  }
  h1 {
    font-size: 20px;
    border-bottom: 3px solid #10b981;
    padding-bottom: 10px;
    color: #065f46;
    margin-top: 0;
  }
  h2 {
    font-size: 15px;
    border-left: 5px solid #10b981;
    padding-left: 10px;
    margin-top: 32px;
    color: #047857;
    background: #f0fdf4;
    padding: 6px 10px;
    border-radius: 0 4px 4px 0;
  }
  h3 { font-size: 13px; color: #374151; margin-top: 20px; }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 14px 0;
    font-size: 12px;
  }
  th {
    background: #d1fae5;
    padding: 8px 12px;
    border: 1px solid #6ee7b7;
    text-align: left;
  }
  td { padding: 7px 12px; border: 1px solid #d1d5db; }
  tr:nth-child(even) td { background: #f9fafb; }
  code {
    background: #f3f4f6;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    color: #dc2626;
  }
  pre {
    background: #f3f4f6;
    padding: 14px;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
    overflow-x: auto;
    font-size: 12px;
  }
  pre code { color: #374151; background: none; padding: 0; }
  blockquote {
    border-left: 4px solid #6ee7b7;
    margin: 14px 0;
    padding: 6px 16px;
    background: #f0fdf4;
    color: #374151;
    border-radius: 0 4px 4px 0;
  }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
  ul, ol { padding-left: 24px; }
  li { margin: 4px 0; }
  strong { color: #111827; }

  @media print {
    body { padding: 0; }
    h2 { break-before: avoid; }
    table { break-inside: avoid; }
  }
`;

const files = [
  {
    input: "docs/admin-manual.md",
    output: "docs/admin-manual.html",
    label: "コミュニティ管理者マニュアル",
  },
  {
    input: "docs/participant-guide.md",
    output: "docs/participant-guide.html",
    label: "参加者操作ガイド",
  },
];

async function generate() {
  for (const { input, output, label } of files) {
    const md = readFileSync(input, "utf-8");
    const body = await marked(md);
    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${label}</title>
  <style>${CSS}</style>
</head>
<body>
${body}
</body>
</html>`;
    writeFileSync(output, html, "utf-8");
    console.log(`✓ ${output} を生成しました`);
  }
  console.log("\n📄 ブラウザで開いてCtrl+P（Mac: ⌘+P）→「PDFに保存」で出力してください。");
}

generate().catch((e) => { console.error(e); process.exit(1); });

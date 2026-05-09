"use client";

import { useState } from "react";
import Link from "next/link";

export default function ApplyPage() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contact, message }),
      });

      if (res.ok) {
        setDone(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "送信に失敗しました");
      }
    } catch {
      setError("通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="bg-emerald-600 text-white px-4 py-4 shadow">
          <h1 className="text-lg font-bold">景品応募</h1>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="text-center">
            <p className="text-5xl mb-4">🎉</p>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">応募完了！</h2>
            <p className="text-gray-500 mb-8">
              ご応募ありがとうございます。<br />
              抽選結果はご連絡先にお知らせします。
            </p>
            <Link href="/" className="bg-emerald-500 text-white py-3 px-8 rounded-xl font-semibold">
              トップに戻る
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-emerald-600 text-white px-4 py-4 shadow flex items-center gap-3">
        <Link href="/stamps" className="text-emerald-100 hover:text-white">← 戻る</Link>
        <h1 className="text-lg font-bold">🎁 景品に応募</h1>
      </header>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-amber-700">
            全スポット制覇おめでとうございます！<br />
            必要事項を入力して景品にご応募ください。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              お名前 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="春日 太郎"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              ご連絡先（メール or 電話番号） <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="example@email.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">ひとこと（任意）</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="ウォーキングの感想など"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow transition"
          >
            {submitting ? "送信中..." : "応募する"}
          </button>
        </form>
      </main>
    </div>
  );
}

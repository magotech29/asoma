"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type ScanResult = {
  success?: boolean;
  alreadyStamped?: boolean;
  spotName?: string;
  error?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QrScanner = any;

export default function ScanPage() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<QrScanner>(null);

  useEffect(() => {
    const startScanner = async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText: string) => {
            setScanning(false);
            try { await scanner.stop(); } catch { /* already stopped */ }

            try {
              const res = await fetch("/api/stamps", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ qrToken: decodedText }),
              });
              if (!res.ok) {
                setResult({ error: "サーバーエラーが発生しました" });
                return;
              }
              const data: ScanResult = await res.json();
              setResult(data);
            } catch {
              setResult({ error: "通信エラーが発生しました" });
            }
          },
          () => {}
        );
      } catch {
        setError("カメラへのアクセスが拒否されました。\nブラウザの設定でカメラを許可してください。");
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(() => {});
        } catch { /* already stopped */ }
      }
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-emerald-600 text-white px-4 py-4 shadow flex items-center gap-3">
        <Link href="/" className="text-emerald-100 hover:text-white">← 戻る</Link>
        <h1 className="text-lg font-bold">QRコードをスキャン</h1>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {error ? (
          <div className="text-center">
            <p className="text-red-500 whitespace-pre-line mb-4">{error}</p>
            <Link href="/" className="text-emerald-600 underline">トップに戻る</Link>
          </div>
        ) : result ? (
          <div className="text-center max-w-sm w-full">
            {result.success && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
                <p className="text-5xl mb-3">🎉</p>
                <p className="text-xl font-bold text-emerald-700 mb-1">スタンプ取得！</p>
                <p className="text-gray-600 mb-6"><strong>{result.spotName}</strong> のスタンプをゲットしました</p>
                <div className="flex flex-col gap-2">
                  <Link href="/stamps" className="block bg-emerald-500 text-white text-center py-3 rounded-xl font-semibold">
                    スタンプ帳を確認
                  </Link>
                  <button
                    onClick={() => window.location.reload()}
                    className="block bg-white border border-gray-200 text-gray-600 py-3 rounded-xl w-full"
                  >
                    続けてスキャン
                  </button>
                </div>
              </div>
            )}
            {result.alreadyStamped && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <p className="text-5xl mb-3">✅</p>
                <p className="text-xl font-bold text-amber-700 mb-1">取得済みです</p>
                <p className="text-gray-600 mb-6"><strong>{result.spotName}</strong> はすでにスタンプ済みです</p>
                <Link href="/stamps" className="block bg-amber-500 text-white text-center py-3 rounded-xl font-semibold">
                  スタンプ帳を確認
                </Link>
              </div>
            )}
            {result.error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                <p className="text-5xl mb-3">❌</p>
                <p className="text-gray-600 mb-4">{result.error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-gray-200 text-gray-700 py-3 px-6 rounded-xl"
                >
                  もう一度試す
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full max-w-sm">
            <p className="text-center text-gray-500 mb-4">スポットのQRコードにカメラを向けてください</p>
            <div id="qr-reader" className="rounded-xl overflow-hidden" />
            {scanning && <p className="text-center text-sm text-gray-400 mt-3">スキャン中...</p>}
          </div>
        )}
      </main>
    </div>
  );
}

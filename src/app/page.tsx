"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const LAST_TOKEN_KEY = "stamp_last_token";

type Spot = { id: string; name: string; description: string | null; sortOrder: number };
type Course = {
  id: string;
  name: string;
  description: string | null;
  distanceKm: number | null;
  durationMin: number | null;
  spots: Spot[];
};

type ErrorKind = "expired" | "invalid" | "network" | "load";

function HomeContent() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const urlToken = searchParams.get("t");

    const tryInit = async (token: string): Promise<boolean> => {
      try {
        const res = await fetch("/api/tenant/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (res.ok) {
          const data = await res.json();
          setTenantName(data.tenantName);
          try {
            localStorage.setItem(LAST_TOKEN_KEY, token);
          } catch {
          }
          return true;
        }
        return false;
      } catch {
        return false;
      }
    };

    const loadCourses = () => {
      fetch("/api/courses")
        .then((r) => {
          if (r.status === 403) {
            setErrorKind("expired");
            return null;
          }
          if (!r.ok) throw new Error();
          return r.json();
        })
        .then((data) => {
          if (data) setCourses(Array.isArray(data) ? data : []);
        })
        .catch(() => setErrorKind("load"))
        .finally(() => setLoading(false));
    };

    const init = async () => {
      if (urlToken) {
        const ok = await tryInit(urlToken);
        if (!ok) {
          setErrorKind("invalid");
          setLoading(false);
          return;
        }
        loadCourses();
        return;
      }

      let savedToken: string | null = null;
      try {
        savedToken = localStorage.getItem(LAST_TOKEN_KEY);
      } catch {
      }

      if (savedToken) {
        const ok = await tryInit(savedToken);
        if (!ok) {
          setErrorKind("expired");
          setLoading(false);
          return;
        }
        loadCourses();
        return;
      }

      loadCourses();
    };

    init();
  }, [searchParams]);

  const handleRetry = async () => {
    let savedToken: string | null = null;
    try {
      savedToken = localStorage.getItem(LAST_TOKEN_KEY);
    } catch {
    }
    if (!savedToken) return;
    setLoading(true);
    setErrorKind(null);
    try {
      const res = await fetch("/api/tenant/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: savedToken }),
      });
      if (res.ok) {
        const data = await res.json();
        setTenantName(data.tenantName);
        const r = await fetch("/api/courses");
        if (r.ok) {
          const fetchedCourses = await r.json();
          setCourses(Array.isArray(fetchedCourses) ? fetchedCourses : []);
        } else {
          setErrorKind("load");
        }
      } else {
        try { localStorage.removeItem(LAST_TOKEN_KEY); } catch { }
        setErrorKind("expired");
      }
    } catch {
      setErrorKind("network");
    } finally {
      setLoading(false);
    }
  };

  if (errorKind) {
    const isExpired = errorKind === "expired";
    return (
      <div className="flex flex-col min-h-screen">
        <header className="bg-emerald-600 text-white px-4 py-4 shadow">
          <h1 className="text-xl font-bold">🗺️ ぐるっとスタンプラリー</h1>
        </header>
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <p className="text-6xl mb-4">{isExpired ? "⏰" : "🔗"}</p>
            {isExpired ? (
              <>
                <p className="text-gray-800 font-semibold text-lg mb-2">
                  セッションが期限切れです
                </p>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">
                  スタンプ記録はサーバーに保存されています。
                  <br />
                  「再接続する」をタップして続きからご参加ください。
                </p>
                <button
                  onClick={handleRetry}
                  className="block w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl shadow transition mb-3"
                >
                  🔄 再接続する
                </button>
                <Link href="/faq#セッションが期限切れです" className="text-sm text-emerald-600 underline">
                  うまくいかない場合はFAQを確認する
                </Link>
              </>
            ) : errorKind === "network" ? (
              <p className="text-gray-600">通信エラーが発生しました。電波の良い場所で再度お試しください。</p>
            ) : errorKind === "load" ? (
              <p className="text-gray-600">読み込みに失敗しました。しばらくしてから再度お試しください。</p>
            ) : (
              <>
                <p className="text-gray-800 font-semibold text-lg mb-2">
                  URLが無効です
                </p>
                <p className="text-gray-500 text-sm mb-4">
                  QRコードを再度読み取ってください。
                </p>
                <Link href="/faq" className="text-sm text-emerald-600 underline">
                  お困りの場合はFAQを確認する
                </Link>
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-emerald-600 text-white px-4 py-4 shadow">
        <h1 className="text-xl font-bold">🗺️ ぐるっとスタンプラリー</h1>
        {tenantName && <p className="text-emerald-100 text-sm mt-0.5">{tenantName}</p>}
      </header>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        <Link
          href="/scan"
          className="block w-full bg-emerald-500 hover:bg-emerald-600 text-white text-center font-bold text-lg py-4 rounded-2xl shadow-md mb-4 transition"
        >
          📷 QRコードをスキャン
        </Link>
        <Link
          href="/stamps"
          className="block w-full bg-white border border-emerald-200 text-emerald-700 text-center font-semibold py-3 rounded-xl mb-6 shadow-sm hover:bg-emerald-50 transition"
        >
          🗺️ スタンプ地図帳を見る
        </Link>

        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-3">コース一覧</h2>
          {loading ? (
            <p className="text-gray-400 text-center py-8">読み込み中...</p>
          ) : courses.length === 0 ? (
            <p className="text-gray-400 text-center py-8">現在開催中のコースはありません</p>
          ) : (
            <ul className="space-y-3">
              {courses.map((course) => (
                <li key={course.id}>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <h3 className="font-bold text-gray-800">{course.name}</h3>
                    {course.description && (
                      <p className="text-sm text-gray-500 mt-1">{course.description}</p>
                    )}
                    <div className="flex gap-3 mt-2 text-xs text-gray-400">
                      {course.distanceKm && <span>📍 {course.distanceKm}km</span>}
                      {course.durationMin && <span>⏱ 約{course.durationMin}分</span>}
                      <span>🏁 {course.spots.length}スポット</span>
                    </div>
                    {course.spots.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {course.spots.map((spot, i) => (
                          <li key={spot.id} className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                              {i + 1}
                            </span>
                            {spot.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="text-center text-xs text-gray-400 py-4 space-y-1">
        <div>
          <Link href="/guide" className="text-emerald-600 hover:underline text-sm">📖 使い方ガイド</Link>
        </div>
        <div>© スタンプラリー実行委員会</div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-gray-400">読み込み中...</p></div>}>
      <HomeContent />
    </Suspense>
  );
}

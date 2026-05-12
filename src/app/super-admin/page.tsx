"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Tenant = {
  id: string;
  slug: string;
  name: string;
  tenantToken: string;
  isActive: boolean;
  createdAt: string;
};

type EditForm = { name: string; adminPassword: string };

export default function SuperAdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", slug: "", adminPassword: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", adminPassword: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const load = () => {
    fetch("/api/super-admin/tenants")
      .then((r) => {
        if (r.status === 401) { router.replace("/super-admin/login"); return null; }
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => { if (data) setTenants(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/super-admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ name: "", slug: "", adminPassword: "" });
        load();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "作成に失敗しました");
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (t: Tenant) => {
    setEditingId(t.id);
    setEditForm({ name: t.name, adminPassword: "" });
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    const body: Record<string, string> = { id: editingId, name: editForm.name };
    if (editForm.adminPassword) body.adminPassword = editForm.adminPassword;
    await fetch("/api/super-admin/tenants", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setEditingId(null);
    load();
  };

  const handleLogout = async () => {
    await fetch("/api/super-admin/logout", { method: "POST" });
    router.replace("/super-admin/login");
  };

  const copyAdminUrl = (token: string) => {
    const url = `${window.location.origin}/admin/login?t=${token}`;
    navigator.clipboard.writeText(url);
    alert("管理者URLをコピーしました");
  };

  const copyParticipantUrl = (token: string) => {
    const url = `${window.location.origin}/?t=${token}`;
    navigator.clipboard.writeText(url);
    alert("参加者URLをコピーしました");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 px-4 py-4 border-b border-gray-700 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">スーパー管理者</h1>
          <p className="text-gray-400 text-xs">テナント管理</p>
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white">ログアウト</button>
      </header>

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        {/* テナント追加フォーム */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 mb-6">
          <h2 className="font-bold text-gray-200 mb-3">テナントを追加</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input required placeholder="コミュニティ名"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input required placeholder="スラッグ（英数字）"
                value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input required type="password" placeholder="管理者パスワード"
                value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                className="col-span-2 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2 rounded-lg text-sm">
              {submitting ? "作成中..." : "テナントを作成"}
            </button>
          </form>
        </div>

        {/* テナント一覧 */}
        <h2 className="font-bold text-gray-300 mb-3">テナント一覧（{tenants.length}件）</h2>
        {loading ? (
          <p className="text-gray-400 text-center py-8">読み込み中...</p>
        ) : tenants.length === 0 ? (
          <p className="text-gray-500 text-center py-8">テナントがありません</p>
        ) : (
          <ul className="space-y-4">
            {tenants.map((t) => (
              <li key={t.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                {editingId === t.id ? (
                  /* 編集フォーム */
                  <div className="space-y-3">
                    <p className="text-xs text-gray-400 font-mono">トークン: <span className="text-emerald-400">{t.tenantToken}</span></p>
                    <input
                      placeholder="コミュニティ名"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <input
                      type="password"
                      placeholder="新しいパスワード（変更する場合のみ）"
                      value={editForm.adminPassword}
                      onChange={(e) => setEditForm({ ...editForm, adminPassword: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex gap-2">
                      <button onClick={handleUpdate}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-sm">
                        保存
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="px-4 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded-lg text-sm">
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 通常表示 */
                  <>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white">{t.name}</p>
                          <span className="text-xs text-gray-400">({t.slug})</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${t.isActive ? "bg-emerald-900 text-emerald-400" : "bg-gray-700 text-gray-400"}`}>
                            {t.isActive ? "有効" : "無効"}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-gray-400 mt-1">
                          トークン: <span className="text-emerald-400">{t.tenantToken}</span>
                        </p>
                      </div>
                      <button onClick={() => handleEdit(t)}
                        className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-3 py-1.5 rounded-lg whitespace-nowrap">
                        編集
                      </button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => copyParticipantUrl(t.tenantToken)}
                        className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg">
                        参加者URL
                      </button>
                      <button onClick={() => copyAdminUrl(t.tenantToken)}
                        className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg">
                        管理者URL
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

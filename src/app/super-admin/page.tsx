"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Tenant = {
  id: string;
  slug: string;
  name: string;
  tenantToken: string;
  isActive: boolean;
  sessionMaxAgeDays: number;
  createdAt: string;
};

type EditForm = { name: string; adminPassword: string; sessionMaxAgeDays: number };

export default function SuperAdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", adminPassword: "", sessionMaxAgeDays: 30 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", adminPassword: "", sessionMaxAgeDays: 30 });
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
        setForm({ name: "", adminPassword: "", sessionMaxAgeDays: 30 });
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
    setEditForm({ name: t.name, adminPassword: "", sessionMaxAgeDays: t.sessionMaxAgeDays ?? 30 });
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    const body: Record<string, unknown> = {
      id: editingId,
      name: editForm.name,
      sessionMaxAgeDays: editForm.sessionMaxAgeDays,
    };
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

  const enterAdmin = async (tenantId: string) => {
    const res = await fetch("/api/super-admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId }),
    });
    if (res.ok) {
      router.push("/admin");
    } else {
      alert("管理画面への切り替えに失敗しました");
    }
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
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 mb-6">
          <h2 className="font-bold text-gray-200 mb-1">新しいコミュニティを追加</h2>
          <p className="text-xs text-gray-500 mb-4">追加後、参加者URL・管理者URLが自動生成されます</p>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">
                コミュニティ名 <span className="text-red-400">*</span>
              </label>
              <input
                required
                placeholder="例）春日市ウォーキングラリー"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">
                管理者パスワード <span className="text-red-400">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-1.5">このコミュニティの管理画面にログインするためのパスワードです</p>
              <input
                required
                type="password"
                autoComplete="new-password"
                placeholder="8文字以上を推奨"
                value={form.adminPassword}
                onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">
                セッション保持日数
              </label>
              <p className="text-xs text-gray-500 mb-1.5">参加者がブラウザを閉じても記録が維持される日数（スタンプラリーの開催期間に合わせて設定）</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={form.sessionMaxAgeDays}
                  onChange={(e) => setForm({ ...form, sessionMaxAgeDays: parseInt(e.target.value) || 30 })}
                  className="w-24 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-400">日間</span>
              </div>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg text-sm"
            >
              {submitting ? "作成中..." : "コミュニティを作成"}
            </button>
          </form>
        </div>

        {/* テナント一覧 */}
        <h2 className="font-bold text-gray-300 mb-3">コミュニティ一覧（{tenants.length}件）</h2>
        {loading ? (
          <p className="text-gray-400 text-center py-8">読み込み中...</p>
        ) : tenants.length === 0 ? (
          <p className="text-gray-500 text-center py-8">コミュニティがありません</p>
        ) : (
          <ul className="space-y-4">
            {tenants.map((t) => (
              <li key={t.id} className={`rounded-xl border p-4 transition-all ${editingId === t.id ? "bg-amber-950 border-amber-500 ring-2 ring-amber-400" : "bg-gray-800 border-gray-700"}`}>
                {editingId === t.id ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 bg-amber-900/50 border border-amber-600 rounded-lg px-3 py-2 mb-1">
                      <span className="text-amber-400 font-bold text-sm">✏️ 編集中：</span>
                      <span className="text-amber-200 text-sm font-semibold">{t.name}</span>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">コミュニティ名</label>
                      <input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">新しいパスワード（変更しない場合は空欄）</label>
                      <p className="text-xs text-gray-500 mb-1">※ パスワードはハッシュ化保存のため現在値は確認できません</p>
                      <input
                        type="password"
                        autoComplete="new-password"
                        placeholder="変更する場合のみ入力"
                        value={editForm.adminPassword}
                        onChange={(e) => setEditForm({ ...editForm, adminPassword: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">セッション保持日数</label>
                      <p className="text-xs text-gray-500 mb-1">参加者のスタンプ記録が同じブラウザで維持される日数</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={editForm.sessionMaxAgeDays}
                          onChange={(e) => setEditForm({ ...editForm, sessionMaxAgeDays: parseInt(e.target.value) || 30 })}
                          className="w-24 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <span className="text-xs text-gray-400">日間</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleUpdate}
                        className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 rounded-lg text-sm">
                        ✏️ 保存する
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="px-4 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded-lg text-sm">
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white">{t.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${t.isActive ? "bg-emerald-900 text-emerald-400" : "bg-gray-700 text-gray-400"}`}>
                            {t.isActive ? "有効" : "無効"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          作成日: {new Date(t.createdAt).toLocaleDateString("ja-JP")}
                          　セッション: {t.sessionMaxAgeDays ?? 30}日間
                        </p>
                      </div>
                      <button onClick={() => handleEdit(t)}
                        className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-3 py-1.5 rounded-lg">
                        編集
                      </button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => enterAdmin(t.id)}
                        className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-semibold">
                        🔑 管理画面を開く
                      </button>
                      <button onClick={() => copyParticipantUrl(t.tenantToken)}
                        className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-3 py-1.5 rounded-lg">
                        📋 参加者URL
                      </button>
                      <button onClick={() => copyAdminUrl(t.tenantToken)}
                        className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-3 py-1.5 rounded-lg">
                        📋 管理者URL
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

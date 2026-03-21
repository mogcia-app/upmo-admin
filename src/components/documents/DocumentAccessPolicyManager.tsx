'use client';

import { useState } from 'react';
import { getAuthToken } from '@/lib/auth';
import {
  DOCUMENT_ACCESS_PERMISSION,
  DOCUMENT_ACCESS_ROLES,
  type DocumentAccessPolicyInput,
  type DocumentAccessPolicyResponse,
  type DocumentVisibilityMode,
} from '@/types/document-access';

function buildPolicyKey(policy: Pick<DocumentAccessPolicyInput, 'scopeType' | 'scopeId'>) {
  return `${policy.scopeType}:${policy.scopeId}`;
}

function dedupePolicies(policies: DocumentAccessPolicyInput[]) {
  const unique = new Map<string, DocumentAccessPolicyInput>();

  for (const policy of policies) {
    unique.set(buildPolicyKey(policy), policy);
  }

  return Array.from(unique.values());
}

export default function DocumentAccessPolicyManager() {
  const [orgId, setOrgId] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [draftVisibilityMode, setDraftVisibilityMode] = useState<DocumentVisibilityMode>('org');
  const [draftPolicies, setDraftPolicies] = useState<DocumentAccessPolicyInput[]>([]);
  const [userScopeInput, setUserScopeInput] = useState('');
  const [loadedDocument, setLoadedDocument] = useState<DocumentAccessPolicyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const resetStatus = () => {
    setError(null);
    setMessage(null);
  };

  const fetchPolicies = async () => {
    resetStatus();

    if (!orgId.trim() || !documentId.trim()) {
      setError('orgId と documentId を入力してください。');
      return;
    }

    try {
      setLoading(true);

      const token = await getAuthToken();
      if (!token) {
        throw new Error('認証トークンが取得できませんでした。');
      }

      const response = await fetch(
        `/api/admin/organizations/${orgId.trim()}/documents/${documentId.trim()}/access-policies`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || `Failed: ${response.status}`);
      }

      const data = result as DocumentAccessPolicyResponse;
      setLoadedDocument(data);
      setDraftVisibilityMode(data.visibilityMode);
      setDraftPolicies(
        data.policies.map((policy) => ({
          scopeType: policy.scopeType,
          scopeId: policy.scopeId,
          permission: policy.permission,
        })),
      );
      setMessage('現在の設定を取得しました。');
    } catch (err) {
      console.error('Failed to fetch document access policies:', err);
      setLoadedDocument(null);
      setError(err instanceof Error ? err.message : '設定の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const toggleRolePolicy = (role: (typeof DOCUMENT_ACCESS_ROLES)[number]) => {
    setDraftPolicies((current) => {
      const exists = current.some(
        (policy) => policy.scopeType === 'role' && policy.scopeId === role,
      );

      if (exists) {
        return current.filter(
          (policy) => !(policy.scopeType === 'role' && policy.scopeId === role),
        );
      }

      return dedupePolicies([
        ...current,
        {
          scopeType: 'role',
          scopeId: role,
          permission: DOCUMENT_ACCESS_PERMISSION,
        },
      ]);
    });
  };

  const addUserPolicy = () => {
    const normalizedUid = userScopeInput.trim();
    if (!normalizedUid) {
      return;
    }

    setDraftPolicies((current) =>
      dedupePolicies([
        ...current,
        {
          scopeType: 'user',
          scopeId: normalizedUid,
          permission: DOCUMENT_ACCESS_PERMISSION,
        },
      ]),
    );
    setUserScopeInput('');
  };

  const removePolicy = (policy: DocumentAccessPolicyInput) => {
    setDraftPolicies((current) =>
      current.filter((item) => buildPolicyKey(item) !== buildPolicyKey(policy)),
    );
  };

  const savePolicies = async () => {
    resetStatus();

    if (!orgId.trim() || !documentId.trim()) {
      setError('orgId と documentId を入力してください。');
      return;
    }

    if (
      draftVisibilityMode === 'policy' &&
      draftPolicies.length === 0 &&
      !window.confirm('個別制御で許可対象が 0 件です。この状態では誰も閲覧できません。保存しますか。')
    ) {
      return;
    }

    try {
      setSaving(true);

      const token = await getAuthToken();
      if (!token) {
        throw new Error('認証トークンが取得できませんでした。');
      }

      const response = await fetch(
        `/api/admin/organizations/${orgId.trim()}/documents/${documentId.trim()}/access-policies`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            visibilityMode: draftVisibilityMode,
            policies: draftVisibilityMode === 'org' ? [] : draftPolicies,
          }),
        },
      );

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || `Failed: ${response.status}`);
      }

      setLoadedDocument({
        documentId: documentId.trim(),
        orgId: orgId.trim(),
        visibilityMode: draftVisibilityMode,
        policies:
          draftVisibilityMode === 'org'
            ? []
            : draftPolicies.map((policy) => ({
                ...policy,
                id: `${policy.scopeType}_${policy.scopeId}`,
              })),
      });
      setMessage('アクセス制御を更新しました。');
    } catch (err) {
      console.error('Failed to save document access policies:', err);
      setError(err instanceof Error ? err.message : '設定の保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  const rolePolicies = draftPolicies.filter((policy) => policy.scopeType === 'role');

  return (
    <div className="space-y-6">
      <section className="border border-slate-200 bg-white p-6">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
          <label className="block">
            <div className="mb-2 text-sm font-medium text-slate-700">orgId</div>
            <input
              value={orgId}
              onChange={(event) => setOrgId(event.target.value)}
              className="w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
              placeholder="org_001"
            />
          </label>
          <label className="block">
            <div className="mb-2 text-sm font-medium text-slate-700">documentId</div>
            <input
              value={documentId}
              onChange={(event) => setDocumentId(event.target.value)}
              className="w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
              placeholder="doc_001"
            />
          </label>
          <button
            type="button"
            onClick={fetchPolicies}
            disabled={loading}
            className="h-10 border border-blue-600 bg-blue-600 px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? '取得中...' : '現在の設定を取得'}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          保存前に GET で現在設定を読み込み、その内容を編集して全体送信します。
        </p>
      </section>

      {error ? (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {message ? (
        <div className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      <section className="border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-5">
          <div>
            <div className="mb-3 text-sm font-medium text-slate-900">公開範囲</div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 border border-slate-200 p-4">
                <input
                  type="radio"
                  name="visibilityMode"
                  checked={draftVisibilityMode === 'org'}
                  onChange={() => setDraftVisibilityMode('org')}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-slate-900">組織内公開</div>
                  <div className="mt-1 text-sm text-slate-600">
                    `visibilityMode = org` として保存し、policy は空配列で全削除します。
                  </div>
                </div>
              </label>
              <label className="flex cursor-pointer items-start gap-3 border border-slate-200 p-4">
                <input
                  type="radio"
                  name="visibilityMode"
                  checked={draftVisibilityMode === 'policy'}
                  onChange={() => setDraftVisibilityMode('policy')}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-slate-900">個別制御</div>
                  <div className="mt-1 text-sm text-slate-600">
                    role と user を選択し、指定対象のみ閲覧可能にします。
                  </div>
                </div>
              </label>
            </div>
          </div>

          {draftVisibilityMode === 'policy' ? (
            <>
              <div>
                <div className="mb-3 text-sm font-medium text-slate-900">ロール指定</div>
                <div className="grid gap-3 md:grid-cols-3">
                  {DOCUMENT_ACCESS_ROLES.map((role) => {
                    const checked = rolePolicies.some((policy) => policy.scopeId === role);
                    return (
                      <label
                        key={role}
                        className="flex cursor-pointer items-center gap-3 border border-slate-200 px-4 py-3"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRolePolicy(role)}
                        />
                        <span className="text-sm text-slate-800">{role}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-3 text-sm font-medium text-slate-900">ユーザー指定</div>
                <div className="flex flex-col gap-3 md:flex-row">
                  <input
                    value={userScopeInput}
                    onChange={(event) => setUserScopeInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addUserPolicy();
                      }
                    }}
                    className="w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                    placeholder="uid_123"
                  />
                  <button
                    type="button"
                    onClick={addUserPolicy}
                    className="border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800"
                  >
                    UID を追加
                  </button>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-medium text-slate-900">許可対象</div>
                  <div className="text-xs text-slate-500">{draftPolicies.length} 件</div>
                </div>
                {draftPolicies.length === 0 ? (
                  <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    個別制御で許可対象が未設定です。このまま保存すると誰も閲覧できません。
                  </div>
                ) : (
                  <div className="space-y-2">
                    {draftPolicies.map((policy) => (
                      <div
                        key={buildPolicyKey(policy)}
                        className="flex items-center justify-between border border-slate-200 px-4 py-3"
                      >
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {policy.scopeType === 'role' ? `role:${policy.scopeId}` : `user:${policy.scopeId}`}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">{policy.permission}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePolicy(policy)}
                          className="text-sm font-medium text-red-600"
                        >
                          削除
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}

          <div className="border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 text-xs font-semibold tracking-[0.16em] text-slate-500">PUT PAYLOAD</div>
            <pre className="overflow-x-auto text-sm text-slate-800">
{JSON.stringify(
  {
    visibilityMode: draftVisibilityMode,
    policies: draftVisibilityMode === 'org' ? [] : draftPolicies,
  },
  null,
  2,
)}
            </pre>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-slate-500">
              {loadedDocument
                ? `編集中: ${loadedDocument.orgId} / ${loadedDocument.documentId}`
                : 'orgId と documentId を指定して現在設定を取得してください。'}
            </div>
            <button
              type="button"
              onClick={savePolicies}
              disabled={saving}
              className="border border-blue-600 bg-blue-600 px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </section>

      <section className="border border-slate-200 bg-white p-6">
        <div className="mb-3 text-sm font-medium text-slate-900">運用メモ</div>
        <ul className="space-y-2 text-sm text-slate-600">
          <li>必ず `orgId` と `documentId` をセットで扱います。</li>
          <li>`PUT` は差分更新ではなく全置換です。</li>
          <li>`scopeType=role` の `scopeId` は `owner/admin/member` のみ送信します。</li>
          <li>`permission` は現時点で `view` 固定です。</li>
        </ul>
      </section>
    </div>
  );
}

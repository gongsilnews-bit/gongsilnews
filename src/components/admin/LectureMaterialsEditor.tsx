'use client';
import { useRef, useState, type CSSProperties } from 'react';
import type { LectureMaterial } from '@/types/lectureMaterial';
import { uploadLectureMaterial } from '@/app/actions/lectureMaterials';
import { createClient } from '@/utils/supabase/client';

const button: CSSProperties = { minHeight: 38, padding: '8px 14px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const input: CSSProperties = { width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', color: '#111827', fontSize: 14 };

export default function LectureMaterialsEditor({ title, value = [], onChange, onUploading }: {
  title: string; value?: LectureMaterial[]; onChange: (items: LectureMaterial[]) => void; onUploading: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const current = useRef(value);
  current.current = value;
  const update = (index: number, patch: Partial<LectureMaterial>) => onChange(current.current.map((m, i) => i === index ? { ...m, ...patch } : m));
  const saveName = () => { if (editing !== null && editName.trim()) { update(editing, { label: editName.trim() }); setEditing(null); } };
  const addLink = () => {
    try {
      const url = new URL(linkUrl.trim());
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      onChange([...current.current, { type: 'LINK', label: linkName.trim() || url.hostname, url: url.href, is_preview: false }]);
      setShowLink(false); setLinkUrl(''); setLinkName(''); setError('');
    } catch { setError('https:// 또는 http://로 시작하는 링크 주소를 입력해 주세요.'); }
  };
  return <section aria-label={title} style={{ gridColumn: '1 / -1', padding: 16, border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 8, background: '#f8fafc', minWidth: 0 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
      <strong style={{ fontSize: 14, color: '#1e293b' }}>{title}</strong><span style={{ fontSize: 12, color: '#64748b' }}>{value.length}개</span>
    </div>
    <div style={{ display: 'grid', gap: 10 }}>
      {value.map((item, index) => <div key={index} style={{ padding: 14, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 9, minWidth: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          <span aria-hidden style={{ fontSize: 23 }}>{item.type === 'FILE' ? '📄' : '🔗'}</span>
          <div style={{ flex: '1 1 150px', minWidth: 0 }}>
            {editing === index ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <input aria-label="자료 이름 수정" autoFocus value={editName} onChange={e => setEditName(e.target.value)} style={{ ...input, flex: '1 1 160px' }} onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); saveName(); } if (e.key === 'Escape') setEditing(null); }} />
              <button type="button" style={button} disabled={!editName.trim() || busy} onClick={saveName}>저장</button>
              <button type="button" style={button} onClick={() => setEditing(null)}>취소</button>
            </div> : <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', overflowWrap: 'anywhere' }}>{item.label || (item.type === 'FILE' ? '첨부 파일' : '참고 링크')}</div>}
            <div style={{ marginTop: 4, fontSize: 12, color: item.is_preview ? '#047857' : '#64748b' }}>{item.is_preview ? '누구나 이용 가능' : '수강생 전용'}</div>
          </div>
          {editing !== index && <button type="button" disabled={busy} style={button} onClick={() => { setEditing(index); setEditName(item.label || ''); }}>이름 수정</button>}
          <button type="button" disabled={busy} style={{ ...button, color: '#dc2626', borderColor: '#fecaca' }} onClick={() => { onChange(current.current.filter((_, i) => i !== index)); setEditing(null); }}>삭제</button>
        </div>
        {item.type !== 'FILE' && <div style={{ marginTop: 8, fontSize: 12, color: '#64748b', overflowWrap: 'anywhere' }}>{item.url}</div>}
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#475569', marginTop: 12, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!item.is_preview} disabled={busy} onChange={e => update(index, { is_preview: e.target.checked })} style={{ accentColor: '#059669' }} />수강 전에도 공개
        </label>
      </div>)}
      {showLink && <div style={{ padding: 14, border: '1px solid #a7f3d0', background: '#fff', borderRadius: 9, display: 'grid', gap: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 600 }}>링크 주소<input autoFocus type="url" placeholder="https://..." value={linkUrl} onChange={e => setLinkUrl(e.target.value)} style={{ ...input, marginTop: 6 }} /></label>
        <label style={{ fontSize: 13, fontWeight: 600 }}>자료 이름<input placeholder="예: 1장 참고 자료" value={linkName} onChange={e => setLinkName(e.target.value)} style={{ ...input, marginTop: 6 }} /></label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" disabled={busy || !linkUrl.trim()} style={{ ...button, background: '#059669', color: '#fff', borderColor: '#059669' }} onClick={addLink}>링크 추가</button>
          <button type="button" style={button} onClick={() => { setShowLink(false); setError(''); }}>취소</button>
        </div>
      </div>}
      {busy && <div role="status" style={{ color: '#047857', fontSize: 13 }}>파일 업로드 중…</div>}
      {error && <div role="alert" style={{ color: '#dc2626', fontSize: 13 }}>{error}</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" disabled={busy} style={{ ...button, color: '#047857', borderColor: '#6ee7b7' }} onClick={() => fileInput.current?.click()}>📎 파일 첨부</button>
        <button type="button" disabled={busy || showLink} style={button} onClick={() => { setShowLink(true); setError(''); }}>🔗 링크 추가</button>
      </div>
      <span style={{ fontSize: 12, color: '#64748b' }}>파일당 최대 20MB · 첨부한 자료는 기본적으로 수강생만 이용할 수 있습니다.</span>
    </div>
    <input ref={fileInput} type="file" disabled={busy} style={{ display: 'none' }} onChange={async e => {
      const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
      if (file.size > 20 * 1024 * 1024) { setError('20MB 이하 파일을 선택해 주세요.'); return; }
      setBusy(true); setError(''); onUploading(true);
      try {
        const result = await uploadLectureMaterial({ name: file.name, size: file.size });
        if (!result.success || !result.url || !result.path || !result.token) throw new Error(result.error || '업로드 실패');
        const { error } = await createClient().storage.from('lecture-materials').uploadToSignedUrl(result.path, result.token, file);
        if (error) throw error;
        onChange([...current.current, { type: 'FILE', label: file.name, url: result.url, is_preview: false }]);
      } catch (e) { setError(e instanceof Error ? e.message : '업로드 실패'); }
      finally { setBusy(false); onUploading(false); }
    }} />
  </section>;
}

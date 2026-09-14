'use client';
import { useState } from 'react';
import { materialGroups, type LectureMaterial } from '@/types/lectureMaterial';
import { getLectureMaterialUrl } from '@/app/actions/lectureMaterials';

export default function LectureLearningMaterials({ lecture, lessonId, previewOnly = false }: { lecture: any; lessonId?: string; previewOnly?: boolean }) {
  const [busy, setBusy] = useState<number | null>(null);
  const chapter = lecture.chapters?.find((ch: any) => ch.lessons?.some((l: any) => l.id === lessonId));
  const lesson = chapter?.lessons?.find((l: any) => l.id === lessonId);
  const materials: LectureMaterial[] = lecture.materials || [];
  const groups = previewOnly
    ? [{ title: '공개 학습 자료', items: materials.filter(m => m.is_preview) }]
    : materialGroups(materials, chapter?.chapter_no, lesson?.lesson_no);
  if (previewOnly && !groups[0].items.length) return null;
  if (!groups.some(g => g.items.length)) return <p>등록된 학습 자료가 없습니다.</p>;
  return <div style={{ display: 'grid', gap: 16 }}>
    {groups.filter(g => g.items.length).map(group => <section key={group.title}>
      <h4 style={{ margin: '0 0 8px' }}>{group.title} ({group.items.length})</h4>
      {group.items.map(material => {
        const index = materials.indexOf(material);
        return <div key={index} style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottom: '1px solid #e5e7eb' }}>
          <span style={{ overflowWrap: 'anywhere' }}>{material.label || '학습 자료'}{material.is_preview ? ' · 미리보기 공개' : ' · 수강생 전용'}</span>
          <button disabled={busy !== null} onClick={async () => {
            setBusy(index);
            // Open synchronously so mobile browsers do not block the new window.
            const target = window.open('about:blank', '_blank');
            if (target) target.opener = null;
            try {
              const result = await getLectureMaterialUrl(lecture.id, index);
              if (!result.success || !result.url) throw new Error(result.error || '자료를 열 수 없습니다.');
              if (target) target.location.href = result.url; else window.location.assign(result.url);
            } catch (e) { target?.close(); alert(e instanceof Error ? e.message : '자료를 열 수 없습니다.'); }
            finally { setBusy(null); }
          }} style={{ flexShrink: 0, padding: '8px 12px' }}>{busy === index ? '확인 중…' : material.type === 'FILE' ? '다운로드' : '자료 열기'}</button>
        </div>;
      })}
    </section>)}
  </div>;
}

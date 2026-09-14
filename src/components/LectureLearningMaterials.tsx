'use client';
import { useState } from 'react';
import { materialGroups, type LectureMaterial } from '@/types/lectureMaterial';
import { getLectureMaterialUrl } from '@/app/actions/lectureMaterials';
import styles from './LectureLearningMaterials.module.css';

function MaterialIcon({ file }: { file: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {file ? <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></> : <><path d="M10 13a5 5 0 0 0 7 .1l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7-.1l-3 3a5 5 0 0 0 7 7l2-2" /></>}
  </svg>;
}

export default function LectureLearningMaterials({ lecture, lessonId, previewOnly = false }: { lecture: any; lessonId?: string; previewOnly?: boolean }) {
  const [busy, setBusy] = useState<number | null>(null);
  const chapter = lecture.chapters?.find((ch: any) => ch.lessons?.some((l: any) => l.id === lessonId));
  const lesson = chapter?.lessons?.find((l: any) => l.id === lessonId);
  const materials: LectureMaterial[] = lecture.materials || [];
  const groups = previewOnly
    ? [{ title: '공개 학습 자료', items: materials.filter(m => m.is_preview && m.scope !== 'chapter') }]
    : materialGroups(materials, chapter?.chapter_no, lesson?.lesson_no);
  if (previewOnly && !groups[0].items.length) return null;
  if (!groups.some(g => g.items.length)) return <p className={styles.empty}>등록된 학습 자료가 없습니다.</p>;
  return <div className={styles.materials}>
    {groups.filter(g => g.items.length).map(group => <section key={group.title}>
      <h4 className={styles.heading}>{group.title}<span className={styles.count}>{group.items.length}</span></h4>
      {group.items.map(material => {
        const index = materials.indexOf(material);
        const isFile = material.type === 'FILE';
        return <div key={index} className={styles.card}>
          <span className={styles.icon}><MaterialIcon file={isFile} /></span>
          <div className={styles.text}>
            <div className={styles.name}>{material.label || '학습 자료'}</div>
            <div className={styles.meta}>{isFile ? '첨부파일' : '외부 링크'} · {material.is_preview ? '미리보기 공개' : '수강생 전용'}</div>
          </div>
          <button type="button" className={styles.download} aria-label={`${material.label || '학습 자료'} ${isFile ? '다운로드' : '열기'}`} aria-busy={busy === index} disabled={busy !== null} onClick={async () => {
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
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{isFile ? <path d="M12 3v12m-4-4 4 4 4-4M5 16v5h14v-5" /> : <path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7" />}</svg>
            {busy === index ? '확인 중…' : isFile ? '받기' : '열기'}
          </button>
        </div>;
      })}
    </section>)}
  </div>;
}

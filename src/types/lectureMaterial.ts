export type LectureMaterial = {
  type: string;
  label: string;
  url: string;
  is_preview?: boolean;
  scope?: 'common' | 'chapter' | 'lesson';
  chapter_no?: number;
  lesson_no?: number;
};

export function materialGroups(materials: LectureMaterial[], chapterNo?: number, lessonNo?: number) {
  return [
    { title: '현재 강의 자료', items: materials.filter(m => m.scope === 'lesson' && m.chapter_no === chapterNo && m.lesson_no === lessonNo) },
    { title: '챕터 자료', items: materials.filter(m => m.scope === 'chapter' && m.chapter_no === chapterNo) },
    { title: '특강 공통 자료', items: materials.filter(m => !m.scope || m.scope === 'common') },
  ];
}

import JSZip from 'jszip';
import type { ProjectSpec, RenderedScene } from './types';

function safeFileName(value: string): string {
  const cleaned = value.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-');
  return cleaned || 'lecture-motion-project';
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadSceneHtml(scene: RenderedScene): void {
  const blob = new Blob([scene.html], { type: 'text/html;charset=utf-8' });
  downloadBlob(blob, `${safeFileName(scene.scene.sceneId)}.html`);
}

export async function exportProjectZip(project: ProjectSpec, rendered: RenderedScene[]): Promise<void> {
  const zip = new JSZip();
  const projectName = safeFileName(project.project.title);
  const root = zip.folder(projectName);
  if (!root) throw new Error('ZIP 폴더를 생성하지 못했습니다.');

  const selected = rendered.filter((item) => item.included && item.status !== 'error' && item.html);
  root.file('scene-spec.json', JSON.stringify(project, null, 2));
  root.file('manifest.json', JSON.stringify({
    generatedAt: new Date().toISOString(),
    schemaVersion: project.schemaVersion,
    catalogVersion: project.catalogVersion,
    project: project.project,
    sceneCount: selected.length,
    scenes: selected.map((item, index) => ({
      order: index + 1,
      sceneId: item.scene.sceneId,
      segmentId: item.scene.segmentId,
      fileName: `${safeFileName(item.scene.sceneId)}.html`,
      title: item.scene.title ?? String(item.scene.content.title ?? item.scene.sceneId),
      startTime: item.scene.startTime,
      endTime: item.scene.endTime,
      duration: item.scene.duration,
      visualGrammar: item.scene.visualGrammar,
      renderMode: item.scene.renderMode,
      interactionMode: item.scene.interaction.mode,
      status: item.status,
      warnings: item.warnings,
    })),
  }, null, 2));

  selected.forEach((item) => {
    root.file(`${safeFileName(item.scene.sceneId)}.html`, item.html);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, `${projectName}.zip`);
}

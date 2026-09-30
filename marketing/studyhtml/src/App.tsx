import { useEffect, useMemo, useRef, useState } from 'react';
import { downloadSceneHtml, exportProjectZip } from './exporter';
import { buildDirectorPrompt } from './prompt';
import { renderSceneHtml } from './renderer';
import { SAMPLE_PROJECT, SAMPLE_PROJECT_JSON, SAMPLE_SCRIPT } from './sampleProject';
import type { InteractionMode, ProjectSpec, RenderedScene, SceneSpec, ValidationIssue } from './types';
import { parseProjectSpec, validateScene } from './validation';

const waitForPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

function sceneTitle(scene: SceneSpec): string {
  return scene.title || String(scene.content.title || scene.visualIntent || scene.sceneId);
}

function renderOne(scene: SceneSpec, issueWarnings: string[] = []): RenderedScene {
  try {
    const output = renderSceneHtml(scene);
    const warnings = [...issueWarnings, ...output.warnings];
    return {
      scene,
      html: output.html,
      status: warnings.length ? 'warning' : 'ready',
      warnings,
      included: true,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      scene,
      html: '',
      status: 'error',
      warnings: issueWarnings,
      error: error instanceof Error ? error.message : '알 수 없는 렌더링 오류',
      included: true,
      updatedAt: new Date().toISOString(),
    };
  }
}

const INITIAL_RENDERED = SAMPLE_PROJECT.scenes.map((scene) => renderOne(scene));

function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
  return Promise.resolve();
}

function App() {
  const [script, setScript] = useState(SAMPLE_SCRIPT);
  const [jsonInput, setJsonInput] = useState(SAMPLE_PROJECT_JSON);
  const [project, setProject] = useState<ProjectSpec>(SAMPLE_PROJECT);
  const [renderedScenes, setRenderedScenes] = useState<RenderedScene[]>(INITIAL_RENDERED);
  const [selectedId, setSelectedId] = useState(SAMPLE_PROJECT.scenes[0].sceneId);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [notice, setNotice] = useState('샘플 프로젝트가 준비되었습니다. 장면을 클릭해 테스트하세요.');
  const [sceneEditor, setSceneEditor] = useState(JSON.stringify(SAMPLE_PROJECT.scenes[0], null, 2));
  const [editRequest, setEditRequest] = useState('');
  const [previewMode, setPreviewMode] = useState<InteractionMode>(SAMPLE_PROJECT.scenes[0].interaction.mode);
  const [previewState, setPreviewState] = useState({ currentStep: 0, maxStep: 0 });
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => renderedScenes.find((item) => item.scene.sceneId === selectedId) ?? renderedScenes[0],
    [renderedScenes, selectedId],
  );

  const prompt = useMemo(() => buildDirectorPrompt(script), [script]);
  const readyCount = renderedScenes.filter((scene) => scene.status === 'ready').length;
  const warningCount = renderedScenes.filter((scene) => scene.status === 'warning').length;
  const errorCount = renderedScenes.filter((scene) => scene.status === 'error').length;
  const doneCount = readyCount + warningCount + errorCount;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [noticeVisible, setNoticeVisible] = useState(true);

  const overall = isGenerating
    ? { tone: 'busy', text: `장면 생성 중 · ${doneCount} / ${renderedScenes.length}` }
    : errorCount
      ? { tone: 'err', text: `오류 ${errorCount}개 · 정상 ${readyCount + warningCount}개` }
      : warningCount
        ? { tone: 'warn', text: `${renderedScenes.length}개 장면 · 확인 필요 ${warningCount}개` }
        : { tone: 'ok', text: `${renderedScenes.length}개 장면 준비됨` };

  useEffect(() => {
    setNoticeVisible(true);
    const timer = window.setTimeout(() => setNoticeVisible(false), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (issues.length) setDrawerOpen(true);
  }, [issues]);

  useEffect(() => {
    if (!selected) return;
    setSceneEditor(JSON.stringify(selected.scene, null, 2));
    setPreviewMode(selected.scene.interaction.mode);
    setPreviewState({ currentStep: 0, maxStep: 0 });
  }, [selected?.scene.sceneId]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (!message || message.source !== 'lecture-motion-scene' || message.sceneId !== selectedId) return;
      if (message.type === 'state' || message.type === 'ready') {
        setPreviewState({ currentStep: Number(message.currentStep ?? 0), maxStep: Number(message.maxStep ?? 0) });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [selectedId]);

  const postPreviewCommand = (command: string, extra: Record<string, unknown> = {}) => {
    iframeRef.current?.contentWindow?.postMessage({ source: 'lecture-motion-director', command, ...extra }, '*');
  };

  const handleGenerateAll = async () => {
    const parsed = parseProjectSpec(jsonInput);
    setIssues(parsed.issues);
    if (!parsed.project) {
      setNotice('JSON 오류를 먼저 수정해 주세요.');
      return;
    }

    setProject(parsed.project);
    setIsGenerating(true);
    const queued: RenderedScene[] = parsed.project.scenes.map((scene) => ({
      scene,
      html: '',
      status: 'queued',
      warnings: [],
      included: true,
      updatedAt: new Date().toISOString(),
    }));
    setRenderedScenes(queued);
    setSelectedId(parsed.project.scenes[0].sceneId);

    const completed = [...queued];
    for (let index = 0; index < parsed.project.scenes.length; index += 1) {
      completed[index] = { ...completed[index], status: 'rendering' };
      setRenderedScenes([...completed]);
      await waitForPaint();
      const sceneWarnings = parsed.issues
        .filter((issue) => issue.severity === 'warning' && issue.path.startsWith(`scenes[${index}]`))
        .map((issue) => issue.message);
      completed[index] = renderOne(parsed.project.scenes[index], sceneWarnings);
      setRenderedScenes([...completed]);
    }
    setIsGenerating(false);
    const failed = completed.filter((item) => item.status === 'error').length;
    setNotice(failed ? `${completed.length - failed}개 장면 생성, ${failed}개 오류` : `${completed.length}개 장면을 생성했습니다.`);
  };

  const handleSelect = (scene: RenderedScene) => {
    setSelectedId(scene.scene.sceneId);
  };

  const handleToggleIncluded = (sceneId: string) => {
    setRenderedScenes((current) => current.map((item) =>
      item.scene.sceneId === sceneId ? { ...item, included: !item.included } : item,
    ));
  };

  const handleRerender = () => {
    if (!selected) return;
    const rendered = renderOne(selected.scene, selected.warnings.filter((warning) => warning.includes('타임코드')));
    setRenderedScenes((current) => current.map((item) => item.scene.sceneId === selected.scene.sceneId
      ? { ...rendered, included: item.included }
      : item));
    setNotice(`${selected.scene.sceneId} 장면을 다시 렌더링했습니다.`);
  };

  const handleApplySceneEdit = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(sceneEditor);
    } catch (error) {
      setNotice(`선택 장면 JSON 오류: ${error instanceof Error ? error.message : '문법 오류'}`);
      return;
    }
    const sceneIssues = validateScene(parsed, 0);
    const errors = sceneIssues.filter((issue) => issue.severity === 'error');
    if (errors.length) {
      setNotice(`선택 장면을 적용하지 못했습니다: ${errors[0].path} ${errors[0].message}`);
      return;
    }
    const updatedScene = parsed as SceneSpec;
    const nextProject: ProjectSpec = {
      ...project,
      scenes: project.scenes.map((scene) => scene.sceneId === selected.scene.sceneId ? updatedScene : scene),
    };
    const rendered = renderOne(updatedScene, sceneIssues.filter((issue) => issue.severity === 'warning').map((issue) => issue.message));
    setProject(nextProject);
    setJsonInput(JSON.stringify(nextProject, null, 2));
    setRenderedScenes((current) => current.map((item) => item.scene.sceneId === selected.scene.sceneId
      ? { ...rendered, included: item.included }
      : item));
    setSelectedId(updatedScene.sceneId);
    setNotice(`${updatedScene.sceneId} 수정 내용을 적용했습니다.`);
  };

  const handleCopyPrompt = async () => {
    await copyText(prompt);
    setNotice('ChatGPT 분석 프롬프트를 복사했습니다.');
  };

  const handleCopyEditPrompt = async () => {
    if (!selected) return;
    const request = editRequest.trim() || '현재 장면의 정보 전달력을 높이고 화면 구성을 더 명확하게 수정해 주세요.';
    const value = `아래 Scene Spec 한 장면만 수정해 주세요. sceneId, segmentId, sourceText는 변경하지 마세요. 설명이나 Markdown 없이 수정된 Scene JSON 객체만 반환하세요.\n\n[수정 요청]\n${request}\n\n[현재 Scene Spec]\n${JSON.stringify(selected.scene, null, 2)}`;
    await copyText(value);
    setNotice('선택 장면 수정 프롬프트를 복사했습니다.');
  };

  const handleImportFile = async (file?: File) => {
    if (!file) return;
    const raw = await file.text();
    setJsonInput(raw);
    setNotice(`${file.name}을 불러왔습니다. 전체 장면 생성을 눌러 주세요.`);
  };

  const handleExportAll = async () => {
    if (!renderedScenes.some((item) => item.included && item.status !== 'error')) {
      setNotice('저장할 정상 장면이 없습니다.');
      return;
    }
    setIsExporting(true);
    try {
      await exportProjectZip(project, renderedScenes);
      setNotice('선택된 장면과 Scene Spec을 ZIP으로 저장했습니다.');
    } catch (error) {
      setNotice(`저장 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenPreview = () => {
    if (!selected?.html) return;
    const blob = new Blob([selected.html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const handlePreviewMode = (mode: InteractionMode) => {
    setPreviewMode(mode);
    postPreviewCommand('setMode', { mode });
  };

  const statusLabel = (status: RenderedScene['status']) =>
    status === 'warning' ? '확인 필요' : status === 'rendering' ? '생성 중' : status === 'queued' ? '대기' : status === 'error' ? '실패' : '';
  const stepCount = previewState.maxStep;

  return (
    <div className={`app-shell ${drawerOpen ? 'drawer-open' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><b>GS</b> STUDY</span>
          <span className="brand-divider" />
          <span className="product-name">강의 모션 디렉터</span>
        </div>

        <div className={`status-pill ${overall.tone}`}><i />{overall.text}</div>

        <div className="topbar-actions">
          <button className={`btn ghost ${drawerOpen ? 'on' : ''}`} onClick={() => setDrawerOpen((open) => !open)}>대본 · JSON</button>
          <button className="btn ghost" onClick={() => fileInputRef.current?.click()}>JSON 불러오기</button>
          <input ref={fileInputRef} hidden type="file" accept="application/json,.json" onChange={(event) => handleImportFile(event.target.files?.[0])} />
          <button className="btn secondary" disabled={isExporting || !renderedScenes.length} onClick={handleExportAll}>
            {isExporting ? '저장 중…' : 'ZIP 내보내기'}
          </button>
          <button className="btn primary" disabled={isGenerating} onClick={handleGenerateAll}>
            {isGenerating ? '생성 중…' : '전체 장면 생성'}
          </button>
        </div>
      </header>

      <main className="workspace">
        <aside className="scene-panel">
          <div className="panel-title"><span>장면</span><span className="count">{renderedScenes.length}</span></div>
          <div className="scene-list">
            {renderedScenes.map((item, index) => {
              const label = statusLabel(item.status);
              return (
                <button
                  key={item.scene.sceneId}
                  className={`scene-item ${item.scene.sceneId === selectedId ? 'selected' : ''} ${!item.included ? 'excluded' : ''}`}
                  onClick={() => handleSelect(item)}
                >
                  <span className="scene-num">{String(index + 1).padStart(2, '0')}</span>
                  <span className="scene-body">
                    <strong>{sceneTitle(item.scene)}</strong>
                    <small>
                      {item.scene.startTime ? `${item.scene.startTime} · ` : ''}{item.scene.duration}초 · {item.scene.visualGrammar}
                    </small>
                    {label && <em className={`scene-status ${item.status}`}><i />{label}</em>}
                  </span>
                  <span
                    role="checkbox"
                    aria-checked={item.included}
                    title={item.included ? '내보내기 포함 (클릭하면 제외)' : '내보내기 제외됨 (클릭하면 포함)'}
                    className={`include-check ${item.included ? 'on' : ''}`}
                    onClick={(event) => { event.stopPropagation(); handleToggleIncluded(item.scene.sceneId); }}
                  >✓</span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="preview-panel">
          <div className="preview-head">
            <div className="preview-title">
              <h2>{selected ? sceneTitle(selected.scene) : '프리뷰'}</h2>
              <small>{selected?.scene.sceneId}{selected && !selected.included ? ' · 내보내기 제외됨' : ''}</small>
            </div>
            <div className="preview-tools">
              <div className="segmented">
                <button className={previewMode === 'CLICK' ? 'active' : ''} onClick={() => handlePreviewMode('CLICK')}>클릭</button>
                <button className={previewMode === 'TIMED' ? 'active' : ''} onClick={() => handlePreviewMode('TIMED')}>자동</button>
              </div>
              <button className="btn ghost icon" title="새 창에서 열기" onClick={handleOpenPreview}>↗</button>
            </div>
          </div>

          <div className="stage">
            <div className="stage-frame">
              {selected?.html ? (
                <iframe
                  ref={iframeRef}
                  key={`${selected.scene.sceneId}-${selected.updatedAt}`}
                  title={`${selected.scene.sceneId} preview`}
                  sandbox="allow-scripts"
                  srcDoc={selected.html}
                />
              ) : (
                <div className="preview-empty"><strong>생성된 HTML이 없습니다</strong><p>Scene JSON을 확인한 뒤 다시 생성하세요.</p></div>
              )}
            </div>

            <div className="player">
              <button className="btn ghost icon" title="처음으로" onClick={() => postPreviewCommand('reset')}>↺</button>
              <button className="btn ghost icon" title="다음 단계" onClick={() => postPreviewCommand('next')}>→</button>
              <button className="btn ghost icon" title="시간 재생" onClick={() => postPreviewCommand('play')}>▶</button>
              <span className="player-count">{previewState.currentStep} / {stepCount || '—'}</span>
              {stepCount > 0 && stepCount <= 14 ? (
                <span className="player-dots">
                  {Array.from({ length: stepCount }, (_, i) => <i key={i} className={i < previewState.currentStep ? (i === previewState.currentStep - 1 ? 'now' : 'done') : ''} />)}
                </span>
              ) : (
                <span className="player-bar"><i style={{ width: stepCount ? `${(previewState.currentStep / stepCount) * 100}%` : '0%' }} /></span>
              )}
              <small>{previewMode === 'CLICK' ? '화면 클릭 또는 → 로 진행' : '설정된 시간에 따라 자동 진행'}</small>
            </div>
          </div>

          {selected?.warnings.length ? (
            <div className="callout warn">{selected.warnings.join(' · ')}</div>
          ) : selected?.error ? (
            <div className="callout err">오류: {selected.error}</div>
          ) : null}

          {selected && (
            <div className="scene-actions">
              <button className="btn secondary" onClick={() => handleToggleIncluded(selected.scene.sceneId)}>{selected.included ? '내보내기에서 제외' : '내보내기에 포함'}</button>
              <button className="btn secondary" onClick={handleRerender}>다시 렌더링</button>
              <button className="btn secondary" onClick={() => downloadSceneHtml(selected)}>HTML 저장</button>
            </div>
          )}

          {selected && (
            <details className="fold">
              <summary><strong>선택 장면 수정</strong><span>Scene JSON 직접 편집</span></summary>
              <textarea className="code-input" spellCheck={false} value={sceneEditor} onChange={(event) => setSceneEditor(event.target.value)} />
              <div className="fold-actions">
                <button className="btn secondary" onClick={handleApplySceneEdit}>수정 적용 및 렌더링</button>
              </div>
              <label className="field">
                <span>ChatGPT 수정 요청</span>
                <textarea value={editRequest} onChange={(event) => setEditRequest(event.target.value)} placeholder="예: 카드 간격을 넓히고 마지막 숫자를 더 강하게 강조해 줘." />
              </label>
              <button className="btn ghost wide" onClick={handleCopyEditPrompt}>선택 장면 수정 프롬프트 복사</button>
            </details>
          )}
        </section>

        <aside className="drawer" aria-hidden={!drawerOpen}>
          <div className="panel-title">
            <span>강의 대본</span>
            <button className="text-btn" onClick={() => setScript('')}>비우기</button>
          </div>
          <textarea className="script-input" value={script} onChange={(event) => setScript(event.target.value)} placeholder="강의 대본 전체를 입력하세요." />
          <div className="input-meta"><span>{script.length.toLocaleString()}자</span><span>API 연결 없음</span></div>
          <button className="btn ghost wide" onClick={handleCopyPrompt}>ChatGPT 분석 프롬프트 복사</button>

          <div className="panel-title sub"><span>Scene Spec JSON</span><span className="hint">붙여넣기</span></div>
          <textarea className="code-input json-input" spellCheck={false} value={jsonInput} onChange={(event) => setJsonInput(event.target.value)} />

          {issues.length > 0 && (
            <div className="issue-list">
              {issues.slice(0, 8).map((issue, index) => (
                <div className={`issue ${issue.severity}`} key={`${issue.path}-${index}`}>
                  <i />
                  <span><code>{issue.path}</code>{issue.message}</span>
                </div>
              ))}
              {issues.length > 8 && <div className="more-issues">외 {issues.length - 8}개</div>}
            </div>
          )}
        </aside>
      </main>

      <div className={`toast ${noticeVisible ? 'show' : ''}`} role="status">{notice}</div>
    </div>
  );
}

export default App;

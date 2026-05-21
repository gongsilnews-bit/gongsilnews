import React, { useState, useCallback, ChangeEvent, useMemo, useEffect } from 'react';
import { FormData, Tone, Audience, WritingStyle, GeneratedPrompt, ImageAspectRatio, ImageStyle } from './types';
import { TONE_OPTIONS, AUDIENCE_OPTIONS, WRITING_STYLE_OPTIONS, CONTENT_TYPE_OPTIONS, IMAGE_ASPECT_RATIO_OPTIONS, IMAGE_STYLE_OPTIONS } from './constants';
import { generateNewsContentStream, generateImages } from './services/geminiService';
import { SparklesIcon, FileUploadIcon, DownloadIcon, PhotoIcon, LogoIcon, ClipboardIcon } from './components/icons';
import { MarkdownRenderer } from './components/MarkdownRenderer';

const App: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    sourceText: '',
    userOpinion: '',
    tone: Tone.OFFICIAL,
    audience: Audience.GENERAL,
    file: null,
    contentTypes: {
      shorts: true,
      article: true,
      cardNews: true,
      factCheck: true,
      blog: true,
      prompts: true,
    },
    writingStyle: WritingStyle.FORMAL,
    articleLength: 500,
    blogLength: 1000,
    channelName: '공실뉴스',
    promptCount: 3,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [rawGeneratedContent, setRawGeneratedContent] = useState('');
  const [nonPromptContent, setNonPromptContent] = useState('');
  const [generatedPrompts, setGeneratedPrompts] = useState<GeneratedPrompt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTabId, setActiveTabId] = useState<string>('');

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isNumber = type === 'number';
    setFormData(prev => ({ ...prev, [name]: isNumber ? (parseInt(value, 10) || 0) : value }));
  }, []);

  const handleContentTypeChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
      const { name, checked } = e.target;
      setFormData(prev => ({
          ...prev,
          contentTypes: {
              ...prev.contentTypes,
              [name]: checked,
          }
      }));
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError(null);

      if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (event) => {
              const dataUrl = event.target?.result as string;
              const base64Data = dataUrl.split(',')[1];
              setFormData(prev => ({
                  ...prev,
                  file: {
                      name: file.name,
                      mimeType: file.type,
                      data: base64Data,
                  }
              }));
          };
          reader.onerror = () => setError("이미지 파일을 읽는 중 오류가 발생했습니다.");
          reader.readAsDataURL(file);
      } else if (file.type === 'application/pdf') {
          setError("PDF 파일 처리는 현재 지원되지 않습니다. 이미지 또는 텍스트 파일을 사용해주세요.");
          e.target.value = '';
      } else {
          const reader = new FileReader();
          reader.onload = (event) => {
              const text = event.target?.result as string;
              setFormData(prev => ({
                  ...prev,
                  sourceText: prev.sourceText ? `${prev.sourceText}\n\n--- ${file.name} ---\n${text}` : text,
                  file: null
              }));
          };
           reader.onerror = () => setError("텍스트 파일을 읽는 중 오류가 발생했습니다.");
          reader.readAsText(file);
      }
  };
  
  const handleRemoveFile = useCallback(() => {
    setFormData(prev => ({ ...prev, file: null }));
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if(fileInput) fileInput.value = '';
  }, []);

  const parseAndSetContent = (content: string) => {
      const promptSectionRegex = /(^##\s*프롬프트 생성\s*\n)([\s\S]*)/m;
      const promptMatch = content.match(promptSectionRegex);

      if (promptMatch) {
          const nonPrompt = content.replace(promptSectionRegex, '').trim();
          const promptSection = promptMatch[2];
          
          const prompts = promptSection
              .split('\n')
              .map(line => line.match(/^\d+\.\s*(.*)/))
              .filter(Boolean)
              .map(match => ({
                  text: match![1].trim(),
                  settings: {
                    aspectRatio: ImageAspectRatio.RATIO_16_9,
                    style: ImageStyle.PHOTOGRAPHY,
                    count: 1,
                  },
                  images: [],
                  isLoading: false,
              }));

          setNonPromptContent(nonPrompt);
          setGeneratedPrompts(prompts);
      } else {
          setNonPromptContent(content);
          setGeneratedPrompts([]);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setRawGeneratedContent('');
    setNonPromptContent('');
    setGeneratedPrompts([]);
    setError(null);

    try {
      let tempContent = '';
      const stream = generateNewsContentStream(formData);
      for await (const chunk of stream) {
        tempContent += chunk;
        setRawGeneratedContent(prev => prev + chunk);
      }
      parseAndSetContent(tempContent);
    } catch (err) {
      setError('콘텐츠 생성 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptSettingsChange = useCallback((index: number, field: string, value: any) => {
    setGeneratedPrompts(prev =>
      prev.map((prompt, i) =>
        i === index ? { ...prompt, settings: { ...prompt.settings, [field]: value } } : prompt
      )
    );
  }, []);

  const handleGenerateImages = useCallback(async (index: number) => {
    const targetPrompt = generatedPrompts[index];
    if (!targetPrompt) return;

    setGeneratedPrompts(prev =>
      prev.map((p, i) => (i === index ? { ...p, isLoading: true, images: [] } : p))
    );
    setError(null);

    try {
        const imageUrls = await generateImages(
            targetPrompt.text,
            targetPrompt.settings.style,
            targetPrompt.settings.aspectRatio,
            targetPrompt.settings.count
        );

        const newImages = imageUrls.map(url => ({ url, prompt: targetPrompt.text }));

        setGeneratedPrompts(prev =>
            prev.map((p, i) => (i === index ? { ...p, isLoading: false, images: newImages } : p))
        );
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류 발생';
        setError(`프롬프트 #${index + 1} 이미지 생성 실패: ${errorMessage}`);
        setGeneratedPrompts(prev =>
            prev.map((p, i) => (i === index ? { ...p, isLoading: false } : p))
        );
    }
  }, [generatedPrompts]);

  const handleDownloadAllImages = useCallback(() => {
    const allImages = generatedPrompts.flatMap(p => p.images);
    if (allImages.length === 0) return;

    allImages.forEach((image, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = image.url;
        const safePrompt = image.prompt.substring(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.download = `gongsilnews_img_${safePrompt}_${index + 1}.jpeg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 100);
    });
  }, [generatedPrompts]);

  const handleDownloadText = useCallback(() => {
    if (!nonPromptContent) return;
    const blob = new Blob([nonPromptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gongsilnews_content_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [nonPromptContent]);

  const isFormIncomplete = !formData.sourceText && !formData.file;
  const isContentTypeUnselected = Object.values(formData.contentTypes).every(v => !v);
  const hasGeneratedImages = useMemo(() => generatedPrompts.some(p => p.images.length > 0), [generatedPrompts]);

  // Tab Parsing Logic
  interface TabData {
      id: string;
      title: string;
      type: 'text' | 'image';
      content?: string;
  }

  const tabs = useMemo<TabData[]>(() => {
      const parsedTabs: TabData[] = [];
      
      if (nonPromptContent) {
          // Split content by H2 headers (## Title)
          const sections = nonPromptContent.split(/(?=^##\s)/m).filter(s => s.trim() !== '');
          
          if (sections.length === 0 && nonPromptContent.trim()) {
               parsedTabs.push({ id: 'text-default', title: '전체 결과', type: 'text', content: nonPromptContent });
          } else {
              sections.forEach((section, idx) => {
                  const titleMatch = section.match(/^##\s+(.+?)(\n|$)/);
                  const title = titleMatch ? titleMatch[1].trim() : `섹션 ${idx + 1}`;
                  // Create a stable ID based on title if possible, otherwise index
                  const id = `text-${idx}`; 
                  parsedTabs.push({ id, title, type: 'text', content: section });
              });
          }
      }

      if (generatedPrompts.length > 0) {
          parsedTabs.push({ id: 'tab-images', title: '이미지 생성', type: 'image' });
      }

      return parsedTabs;
  }, [nonPromptContent, generatedPrompts]);

  // Automatically select the first tab when tabs are generated or current tab becomes invalid
  useEffect(() => {
      const currentTabExists = tabs.find(t => t.id === activeTabId);
      if (!currentTabExists && tabs.length > 0) {
          setActiveTabId(tabs[0].id);
      }
  }, [tabs, activeTabId]);


  return (
    <div className="h-screen flex flex-col bg-white text-slate-900 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0 flex items-center justify-between z-20 shadow-sm">
        <div className="flex items-center gap-3">
            <div className="p-1 rounded-lg bg-gray-50">
              <LogoIcon className="w-8 h-8 text-gray-900" />
            </div>
            <div>
                <h1 className="text-xl font-bold tracking-tight text-gray-900 leading-tight">
                    공실뉴스
                </h1>
                <div className="flex items-center gap-2">
                    <span className="text-[#f4a71b] font-semibold text-xs tracking-wide">
                        뉴스/칼럼 기사 AI
                    </span>
                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded border border-gray-200">
                        N1.2
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                        update 20260203
                    </span>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-3">
             <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-gray-500">System Ready</span>
            </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-grow flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: Input Form */}
        <div className="w-full lg:w-[450px] xl:w-[500px] flex flex-col border-r border-gray-200 bg-gray-50/50 flex-shrink-0">
          <div className="flex-grow overflow-y-auto p-5 scrollbar-thin">
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Section 1 */}
              <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1 h-4 bg-[#f4a71b] rounded-full"></span>
                        원문/자료 입력
                    </h2>
                    <div className="flex items-center gap-2">
                        <a 
                          href="https://news.naver.com/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 border border-gray-200 bg-gray-50 px-2 py-1 rounded hover:bg-gray-100 hover:text-gray-700 transition-all"
                        >
                          <span>네이버뉴스 바로가기</span>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                          </svg>
                        </a>
                        <a 
                          href="https://pf.kakao.com/_ckHkG/posts" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[11px] font-bold text-[#f4a71b] border border-[#f4a71b]/30 bg-[#f4a71b]/5 px-2 py-1 rounded hover:bg-[#f4a71b] hover:text-white transition-all"
                        >
                          <span>EX 경제기사 가져오기</span>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                          </svg>
                        </a>
                    </div>
                </div>
                <div>
                  <div className="relative group">
                    <textarea
                      id="sourceText"
                      name="sourceText"
                      rows={6}
                      value={formData.sourceText}
                      onChange={handleInputChange}
                      placeholder="보도자료, 기사 텍스트 등을 붙여넣거나 파일을 업로드하세요."
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#f4a71b]/50 focus:border-[#f4a71b] transition-all placeholder-gray-400 text-gray-900 resize-none shadow-inner"
                    />
                    <label htmlFor="file-upload" className="absolute bottom-3 right-3 cursor-pointer p-1.5 rounded-md bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all text-gray-500 hover:text-[#f4a71b]">
                        <FileUploadIcon className="w-4 h-4" />
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".txt,.md,image/*,.pdf" onChange={handleFileChange} />
                    </label>
                  </div>
                  {formData.file && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3 text-sm overflow-hidden">
                            <img src={`data:${formData.file.mimeType};base64,${formData.file.data}`} alt={formData.file.name} className="w-8 h-8 rounded object-cover flex-shrink-0 border border-blue-200" />
                            <span className="text-blue-900 truncate font-medium text-xs" title={formData.file.name}>{formData.file.name}</span>
                        </div>
                        <button type="button" onClick={handleRemoveFile} className="text-blue-400 hover:text-blue-600 w-6 h-6 flex items-center justify-center rounded-full hover:bg-blue-100 transition-colors flex-shrink-0" aria-label="Remove file">&times;</button>
                    </div>
                  )}
                  
                  <div className="mt-4">
                      <label htmlFor="userOpinion" className="block text-xs font-semibold text-gray-500 mb-1.5">추가 의견 (선택)</label>
                      <textarea
                        id="userOpinion"
                        name="userOpinion"
                        rows={2}
                        value={formData.userOpinion}
                        onChange={handleInputChange}
                        placeholder="반영하고 싶은 핵심 포인트를 입력하세요."
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#f4a71b]/50 focus:border-[#f4a71b] transition-all placeholder-gray-400 text-gray-900 resize-none shadow-inner"
                      />
                  </div>
                </div>
              </section>

              {/* Section 2 */}
              <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-5">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1 h-4 bg-[#f4a71b] rounded-full"></span>
                    생성 조건 설정
                </h2>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2">콘텐츠 유형</label>
                  <div className="grid grid-cols-2 gap-2">
                      {CONTENT_TYPE_OPTIONS.map(opt => (
                          <div key={opt.id}>
                             <input type="checkbox" id={opt.id} name={opt.id} checked={formData.contentTypes[opt.id]} onChange={handleContentTypeChange} className="sr-only peer" />
                             <label htmlFor={opt.id} className="flex items-center justify-center w-full h-10 rounded-lg border border-gray-200 cursor-pointer bg-white text-gray-500 font-medium transition-all peer-checked:bg-[#f4a71b] peer-checked:border-[#f4a71b] peer-checked:text-white hover:bg-gray-50 text-xs shadow-sm peer-checked:shadow-md">
                              {opt.label}
                             </label>
                          </div>
                      ))}
                  </div>
                </div>

                {formData.contentTypes.prompts && (
                  <div className="animate-fade-in bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <label htmlFor="promptCount" className="text-xs font-medium text-gray-700">프롬프트 개수</label>
                        <input
                            type="number"
                            id="promptCount"
                            name="promptCount"
                            value={formData.promptCount}
                            onChange={handleInputChange}
                            min="2"
                            max="10"
                            className="w-16 bg-white border border-gray-300 rounded-md p-1.5 text-center text-sm focus:ring-1 focus:ring-[#f4a71b] focus:border-[#f4a71b] text-gray-900"
                        />
                      </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="writingStyle" className="block text-xs font-semibold text-gray-500 mb-1.5">문체</label>
                        <select id="writingStyle" name="writingStyle" value={formData.writingStyle} onChange={handleInputChange} className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#f4a71b]/50 focus:border-[#f4a71b] transition-all text-gray-900 shadow-sm cursor-pointer hover:bg-gray-50">
                          {WRITING_STYLE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                    <div>
                      <label htmlFor="tone" className="block text-xs font-semibold text-gray-500 mb-1.5">톤 & 채널</label>
                      <select id="tone" name="tone" value={formData.tone} onChange={handleInputChange} className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#f4a71b]/50 focus:border-[#f4a71b] transition-all text-gray-900 shadow-sm cursor-pointer hover:bg-gray-50">
                        {TONE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="articleLength" className="block text-xs font-semibold text-gray-500 mb-1.5">기사 글자 수</label>
                        <input type="number" id="articleLength" name="articleLength" value={formData.articleLength} onChange={handleInputChange} step="50" className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#f4a71b]/50 focus:border-[#f4a71b] transition-all text-gray-900 shadow-sm" />
                    </div>
                     <div>
                        <label htmlFor="blogLength" className="block text-xs font-semibold text-gray-500 mb-1.5">블로그 글자 수</label>
                        <input type="number" id="blogLength" name="blogLength" value={formData.blogLength} onChange={handleInputChange} step="100" className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#f4a71b]/50 focus:border-[#f4a71b] transition-all text-gray-900 shadow-sm" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="audience" className="block text-xs font-semibold text-gray-500 mb-1.5">타깃</label>
                      <select id="audience" name="audience" value={formData.audience} onChange={handleInputChange} className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#f4a71b]/50 focus:border-[#f4a71b] transition-all text-gray-900 shadow-sm cursor-pointer hover:bg-gray-50">
                        {AUDIENCE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                     <div>
                        <label htmlFor="channelName" className="block text-xs font-semibold text-gray-500 mb-1.5">채널명</label>
                        <input
                        type="text"
                        id="channelName"
                        name="channelName"
                        value={formData.channelName}
                        onChange={handleInputChange}
                        placeholder="예: 공실뉴스"
                        className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#f4a71b]/50 focus:border-[#f4a71b] transition-all text-gray-900 shadow-sm"
                        />
                    </div>
                </div>
              </section>
            </form>
          </div>
          
          {/* Form Footer (Action Button) */}
          <div className="p-5 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] z-10">
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 text-base font-bold bg-[#f4a71b] text-white py-3 px-6 rounded-xl hover:bg-[#e09612] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-all duration-300 ease-in-out shadow-lg shadow-[#f4a71b]/30 transform active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>생성 중...</span>
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-5 h-5" />
                    <span>뉴스/칼럼 기사 생성</span>
                  </>
                )}
              </button>
               {isFormIncomplete && <p className="text-[10px] text-red-500 text-center mt-2 font-medium">⚠️ 원문/자료는 필수 입력 항목입니다.</p>}
               {isContentTypeUnselected && <p className="text-[10px] text-red-500 text-center mt-2 font-medium">⚠️ 하나 이상의 콘텐츠 유형을 선택하세요.</p>}
          </div>
        </div>

        {/* Right Column: Output Preview (Document Style) */}
        <div className="flex-grow bg-gray-100 p-4 lg:p-8 flex flex-col h-full overflow-hidden relative">
          
          {/* Preview Toolbar */}
          <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span className="bg-white border border-gray-200 p-1.5 rounded-md shadow-sm">
                    <LogoIcon className="w-5 h-5 text-gray-900" />
                </span>
                생성 결과 미리보기
            </h2>
            <div className="flex items-center gap-2">
              {nonPromptContent && !isLoading && (
                  <>
                    <button 
                        onClick={() => navigator.clipboard.writeText(nonPromptContent)} 
                        className="flex items-center gap-2 text-xs font-semibold py-2 px-3 rounded-lg transition-all duration-200 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 shadow-sm hover:shadow"
                    >
                        <ClipboardIcon className="w-3.5 h-3.5" />
                        <span>전체 복사</span>
                    </button>
                    <button 
                        onClick={handleDownloadText} 
                        className="flex items-center gap-2 text-xs font-semibold py-2 px-3 rounded-lg transition-all duration-200 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 shadow-sm hover:shadow"
                    >
                        <DownloadIcon className="w-3.5 h-3.5" />
                        <span>TXT 저장</span>
                    </button>
                  </>
              )}
              {hasGeneratedImages && activeTabId === 'tab-images' && (
                <button 
                    onClick={handleDownloadAllImages}
                    className="flex items-center gap-2 text-xs bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-3 rounded-lg transition-colors shadow-sm"
                >
                    <DownloadIcon className="w-3.5 h-3.5" />
                    <span>이미지 전체 저장</span>
                </button>
              )}
            </div>
          </div>
          
          {/* Tab Navigation (Visible only when there are tabs) */}
          {tabs.length > 0 && !isLoading && (
            <div className="flex gap-1 overflow-x-auto border-b border-gray-200 mb-0 px-1 scrollbar-hide flex-shrink-0">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTabId(tab.id)}
                        className={`
                            px-4 py-2.5 text-sm font-bold rounded-t-lg transition-all whitespace-nowrap border-t border-l border-r relative top-[1px]
                            ${activeTabId === tab.id 
                                ? 'bg-white border-gray-200 text-[#f4a71b] border-b-white z-10' 
                                : 'bg-gray-100 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 border-b-gray-200'}
                        `}
                    >
                        {tab.title}
                    </button>
                ))}
            </div>
          )}

          {/* Document / Card Container */}
          <div className={`flex-grow overflow-y-auto bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-200/60 p-8 lg:p-12 scrollbar-thin relative min-h-0 ${tabs.length > 0 ? 'rounded-b-xl rounded-tr-xl border-t-0' : 'rounded-xl'}`}>
            
            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                   {!rawGeneratedContent ? (
                        <>
                            <div className="relative">
                                <div className="absolute inset-0 bg-[#f4a71b]/20 rounded-full blur-xl animate-pulse"></div>
                                <SparklesIcon className="w-16 h-16 animate-bounce text-[#f4a71b] relative z-10"/>
                            </div>
                            <p className="mt-6 text-xl font-bold text-gray-800">AI가 문서를 작성하고 있습니다</p>
                            <p className="text-sm text-gray-500 mt-2">잠시만 기다려 주세요...</p>
                        </>
                   ) : (
                       <div className="w-full max-w-2xl">
                           <div className="p-6 rounded-xl bg-orange-50 border border-orange-100 w-full animate-fade-in">
                                <h3 className="font-bold text-[#f4a71b] mb-3 flex items-center gap-2 text-sm">
                                    <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                                    </span>
                                    AI 작성 중...
                                </h3>
                                <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans leading-relaxed opacity-80 h-[300px] overflow-y-auto scrollbar-thin">{rawGeneratedContent}</pre>
                            </div>
                       </div>
                   )}
              </div>
            )}
            
            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 p-6 rounded-xl mb-4 flex flex-col items-center justify-center h-full">
                <div className="bg-red-100 p-3 rounded-full mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-red-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                </div>
                <h3 className="font-bold text-lg mb-2">오류가 발생했습니다</h3>
                <p className="text-center text-sm">{error}</p>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !rawGeneratedContent && !error && !nonPromptContent && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                  <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center mb-6">
                    <span className="text-4xl">📝</span>
                  </div>
                  <h3 className="font-bold text-xl text-gray-700 mb-2">콘텐츠가 생성되지 않았습니다</h3>
                  <p className="text-center text-sm text-gray-500 max-w-md leading-relaxed">
                    왼쪽 패널에서 원문 자료와 생성 조건을 입력한 후<br/>
                    <strong className="text-[#f4a71b]">생성 버튼</strong>을 클릭하면 결과가 이곳에 표시됩니다.
                  </p>
              </div>
            )}
            
            {/* Content Display (Tab Content) */}
            {!isLoading && !error && tabs.length > 0 && (
                <div className="max-w-4xl mx-auto min-h-[400px]">
                    {tabs.map(tab => {
                        if (tab.id !== activeTabId) return null;

                        if (tab.type === 'text' && tab.content) {
                            return (
                                <div key={tab.id} className="animate-fade-in">
                                    <MarkdownRenderer content={tab.content} />
                                </div>
                            );
                        }

                        if (tab.type === 'image') {
                            return (
                                <div key={tab.id} className="animate-fade-in">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                        <span className="w-1.5 h-8 bg-[#f4a71b] rounded-full inline-block"></span>
                                        이미지 생성
                                    </h3>
                                    <div className="space-y-8">
                                        {generatedPrompts.map((prompt, index) => (
                                        <div key={index} className="p-6 bg-gray-50 border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex gap-3 mb-5">
                                                <span className="flex-shrink-0 w-6 h-6 bg-[#f4a71b] text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">{index + 1}</span>
                                                <p className="text-gray-700 font-medium leading-relaxed">{prompt.text}</p>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end mb-6 p-4 bg-white rounded-xl border border-gray-100">
                                                <div className="flex-grow w-full">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">비율 (Ratio)</label>
                                                    <select value={prompt.settings.aspectRatio} onChange={(e) => handlePromptSettingsChange(index, 'aspectRatio', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-[#f4a71b] focus:border-[#f4a71b] text-gray-700 cursor-pointer">
                                                        {IMAGE_ASPECT_RATIO_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                    </select>
                                                </div>
                                                <div className="flex-grow w-full">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">스타일 (Style)</label>
                                                    <select value={prompt.settings.style} onChange={(e) => handlePromptSettingsChange(index, 'style', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-[#f4a71b] focus:border-[#f4a71b] text-gray-700 cursor-pointer">
                                                        {IMAGE_STYLE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                    </select>
                                                </div>
                                                <div className="flex-grow w-full">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">개수 (Qty)</label>
                                                    <input type="number" min="1" max="3" value={prompt.settings.count} onChange={(e) => handlePromptSettingsChange(index, 'count', parseInt(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-[#f4a71b] focus:border-[#f4a71b] text-gray-700 text-center" />
                                                </div>
                                                <button onClick={() => handleGenerateImages(index)} disabled={prompt.isLoading} className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-2 px-3 rounded-lg hover:bg-black disabled:bg-gray-300 transition-colors shadow-sm font-semibold text-sm h-[38px]">
                                                    {prompt.isLoading ? <div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin"></div> : <PhotoIcon className="w-4 h-4" />}
                                                    <span>{prompt.isLoading ? '생성중...' : '생성하기'}</span>
                                                </button>
                                            </div>
                                            
                                            {prompt.isLoading && (
                                                <div className="text-center p-12 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                                    <div className="animate-pulse flex flex-col items-center">
                                                        <div className="w-12 h-12 bg-gray-200 rounded-full mb-3"></div>
                                                        <span className="text-gray-400 text-sm font-medium">이미지를 생성하고 있습니다...</span>
                                                    </div>
                                                </div>
                                            )}
                                            {prompt.images.length > 0 && (
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                    {prompt.images.map((image, imgIndex) => (
                                                        <div key={imgIndex} className="group relative">
                                                            <a href={image.url} download={`gongsilnews_img_${index+1}_${imgIndex+1}.jpeg`} className="aspect-square block overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                                                                <img src={image.url} alt={`Generated image for prompt ${index + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity duration-200 cursor-pointer">
                                                                    <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full mb-2">
                                                                        <DownloadIcon className="w-6 h-6 text-white" />
                                                                    </div>
                                                                    <span className="text-[10px] text-white font-bold bg-black/50 px-2 py-0.5 rounded-full">다운로드</span>
                                                                </div>
                                                            </a>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })}

                     <div className="mt-12 pt-8 border-t border-gray-100 text-center">
                        <p className="text-xs text-gray-300 font-medium">Generated by Gongsil News AI</p>
                     </div>
                </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
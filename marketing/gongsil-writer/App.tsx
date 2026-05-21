
import React, { useState, useCallback, ChangeEvent, useMemo, useEffect, useRef } from 'react';
import { FormData, Tone, Audience, WritingStyle, GeneratedPrompt, ImageAspectRatio, ImageStyle, PropertyType, TransactionType } from './types';
import { TONE_OPTIONS, AUDIENCE_OPTIONS, WRITING_STYLE_OPTIONS, CONTENT_TYPE_OPTIONS, IMAGE_ASPECT_RATIO_OPTIONS, IMAGE_STYLE_OPTIONS, PROPERTY_TYPE_OPTIONS, TRANSACTION_TYPE_OPTIONS, STATIC_PROPERTY_KEYWORDS } from './constants';
import { generateNewsContentStream, generateImages, reviseContent, generateAdditionalContent } from './services/geminiService';
import { SparklesIcon, FileUploadIcon, DownloadIcon, PhotoIcon, ClipboardIcon, PencilSquareIcon, CheckIcon, PlusIcon, XMarkIcon } from './components/icons';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { TagInput } from './components/TagInput';

interface ContentSection {
  title: string;
  body: string;
  isHeader: boolean;
  originalIndex: number;
}

const App: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    sourceText: '',
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
    articleLength: 1500,
    blogLength: 1000,
    channelName: '공실뉴스',
    promptCount: 3,
    propertyKeywords: [...STATIC_PROPERTY_KEYWORDS],
    propertyType: '',
    transactionType: '',
    address: '',
    salePrice: '',
    jeonsePrice: '',
    deposit: '',
    monthlyRent: '',
    shortTermDeposit: '',
    shortTermRent: '',
    area: '',
    features: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [rawGeneratedContent, setRawGeneratedContent] = useState('');
  const [nonPromptContent, setNonPromptContent] = useState('');
  const [generatedPrompts, setGeneratedPrompts] = useState<GeneratedPrompt[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Context Menu & Edit State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editInstruction, setEditInstruction] = useState('');
  const [isRevising, setIsRevising] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addTopic, setAddTopic] = useState('');
  const [targetSectionIndex, setTargetSectionIndex] = useState<number | null>(null);
  const [isGeneratingAdd, setIsGeneratingAdd] = useState(false);
  const [isManualEditing, setIsManualEditing] = useState(false);

  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Parse headers for tabs
  const sections: ContentSection[] = useMemo(() => {
    if (!nonPromptContent) return [];
    // Split by headers while keeping them
    const raw = nonPromptContent.split(/(?=^##\s)/m);
    return raw.map((text, index) => {
      text = text.trim();
      if (text.startsWith('## ')) {
        const lines = text.split('\n');
        return { 
          title: lines[0].replace('## ', '').trim(), 
          body: lines.slice(1).join('\n').trim(), 
          isHeader: true,
          originalIndex: index
        };
      }
      return { title: 'Intro', body: text, isHeader: false, originalIndex: index };
    }).filter(s => s.body);
  }, [nonPromptContent]);

  const tabs = useMemo(() => {
    const headerTabs = sections.filter(s => s.isHeader).map(s => s.title);
    if (generatedPrompts.length > 0) {
      headerTabs.push('이미지 생성');
    }
    return headerTabs;
  }, [sections, generatedPrompts]);

  useEffect(() => {
    if (tabs.length > 0 && (!activeTab || !tabs.includes(activeTab))) {
      setActiveTab(tabs[0]);
    }
  }, [tabs, activeTab]);

  const handleSectionSave = (newBody: string, index: number) => {
    const rawSections = nonPromptContent.split(/(?=^##\s)/m);
    if (rawSections[index].startsWith('## ')) {
        const lines = rawSections[index].split('\n');
        rawSections[index] = `${lines[0]}\n${newBody}`;
    } else {
        rawSections[index] = newBody;
    }
    setNonPromptContent(rawSections.join('\n\n'));
  };

  const handleSectionContextMenu = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const selection = window.getSelection();
    const text = selection?.toString().trim() || '';
    setSelectedText(text);
    setTargetSectionIndex(index);
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleContainerContextMenu = (e: React.MouseEvent) => {
    if (isManualEditing) return;
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if(text) {
        e.preventDefault();
        setSelectedText(text);
        setContextMenu({ x: e.clientX, y: e.clientY });
    }
  };

  const handleOpenEditModal = () => {
    setContextMenu(null);
    setIsEditModalOpen(true);
    setEditInstruction('');
  };

  const handleOpenAddModal = () => {
    setContextMenu(null);
    setIsAddModalOpen(true);
    setAddTopic('');
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedText('');
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setAddTopic('');
  };

  const handleApplyRevision = async () => {
    if (!editInstruction.trim()) return;
    setIsRevising(true);
    try {
        const revisedContent = await reviseContent(nonPromptContent, selectedText, editInstruction);
        setNonPromptContent(revisedContent);
        handleCloseEditModal();
    } catch (err) {
        alert(err instanceof Error ? err.message : '수정 중 오류가 발생했습니다.');
    } finally {
        setIsRevising(false);
    }
  };

  const handleGenerateAddedContent = async () => {
    if (!addTopic.trim()) return;
    setIsGeneratingAdd(true);
    try {
        const newText = await generateAdditionalContent(nonPromptContent, addTopic);
        const rawSections = nonPromptContent.split(/(?=^##\s)/m);
        let formattedNewText = newText.trim();
        if (!formattedNewText.startsWith('##')) {
            formattedNewText = `## ${addTopic}\n${formattedNewText}`;
        }
        if (targetSectionIndex !== null && targetSectionIndex >= 0) {
            rawSections.splice(targetSectionIndex + 1, 0, formattedNewText);
            setNonPromptContent(rawSections.join('\n\n'));
        } else {
             setNonPromptContent(prev => prev + '\n\n' + formattedNewText);
        }
        handleCloseAddModal();
    } catch (e) {
        alert('생성 실패');
    } finally {
        setIsGeneratingAdd(false);
    }
  };

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ 
        ...prev, 
        [name]: type === 'number' ? (parseInt(value, 10) || 0) : value 
    }));
  }, []);

  const handleContentTypeChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
      const { name, checked } = e.target;
      setFormData(prev => ({
          ...prev,
          contentTypes: { ...prev.contentTypes, [name]: checked }
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
              setFormData(prev => ({
                  ...prev,
                  file: { name: file.name, mimeType: file.type, data: dataUrl.split(',')[1] }
              }));
          };
          reader.readAsDataURL(file);
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
          reader.readAsText(file);
      }
  };

  const parseAndSetContent = (content: string) => {
      // Improved parsing to separate Prompt Generation from other markdown sections
      const rawSections = content.split(/(?=^##\s)/m);
      
      let nonPrompt = '';
      let prompts: GeneratedPrompt[] = [];

      rawSections.forEach(section => {
        const trimmed = section.trim();
        if (trimmed.startsWith('## 프롬프트 생성')) {
          const body = trimmed.replace('## 프롬프트 생성', '').trim();
          prompts = body
            .split('\n')
            .map(line => line.match(/^\d+\.\s*(.*)/))
            .filter(Boolean)
            .map(match => ({
                text: match![1].trim(),
                settings: { aspectRatio: ImageAspectRatio.RATIO_16_9, style: ImageStyle.PHOTOGRAPHY, count: 1 },
                images: [],
                isLoading: false,
            }));
        } else {
          if (nonPrompt) nonPrompt += '\n\n';
          nonPrompt += trimmed;
        }
      });

      setNonPromptContent(nonPrompt);
      setGeneratedPrompts(prompts);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setRawGeneratedContent('');
    setNonPromptContent('');
    setGeneratedPrompts([]);
    setActiveTab('');
    setIsManualEditing(false);
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
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptSettingsChange = useCallback((index: number, field: string, value: any) => {
    setGeneratedPrompts(prev =>
      prev.map((p, i) => i === index ? { ...p, settings: { ...p.settings, [field]: value } } : p)
    );
  }, []);

  const handleGenerateImages = useCallback(async (index: number) => {
    const targetPrompt = generatedPrompts[index];
    if (!targetPrompt) return;
    setGeneratedPrompts(prev => prev.map((p, i) => (i === index ? { ...p, isLoading: true, images: [] } : p)));
    try {
        const imageUrls = await generateImages(targetPrompt.text, targetPrompt.settings.style, targetPrompt.settings.aspectRatio, targetPrompt.settings.count);
        setGeneratedPrompts(prev => prev.map((p, i) => (i === index ? { ...p, isLoading: false, images: imageUrls.map(url => ({ url, prompt: targetPrompt.text })) } : p)));
    } catch (err) {
        setError(`이미지 생성 실패: ${err instanceof Error ? err.message : '오류'}`);
        setGeneratedPrompts(prev => prev.map((p, i) => (i === index ? { ...p, isLoading: false } : p)));
    }
  }, [generatedPrompts]);

  const handleDownloadText = () => {
    const blob = new Blob([nonPromptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gongsilnews_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadAllImages = () => {
    generatedPrompts.flatMap(p => p.images).forEach((image, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = image.url;
        link.download = `gongsilnews_img_${index + 1}.jpeg`;
        link.click();
      }, index * 150);
    });
  };

  const customKeywords = useMemo(() => 
    formData.propertyKeywords.filter(k => !STATIC_PROPERTY_KEYWORDS.includes(k)),
    [formData.propertyKeywords]
  );
  
  const setCustomKeywords = useCallback((newCustomKeywords: string[]) => {
    const staticKeywords = formData.propertyKeywords.filter(k => STATIC_PROPERTY_KEYWORDS.includes(k));
    setFormData(prev => ({
      ...prev,
      propertyKeywords: [...staticKeywords, ...newCustomKeywords]
    }));
  }, [formData.propertyKeywords]);

  const commonInputClass = "w-full bg-white border border-gray-300 rounded-md p-3 text-gray-900 focus:ring-2 focus:ring-[#f4a71b] focus:border-[#f4a71b] transition-colors placeholder:text-gray-400 shadow-sm";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4 sticky top-0 z-50 flex-shrink-0">
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-10 h-10 shadow-sm rounded-full">
                         <circle cx="12" cy="12" r="11" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
                         <path d="M9.5 8L16.5 12L9.5 16V8Z" fill="#f4a71b" stroke="#f4a71b" strokeWidth="1" strokeLinejoin="round" />
                    </svg>
                </div>
                <div className="flex flex-col justify-center">
                    <div className="flex items-baseline gap-1 leading-none">
                        <h1 className="text-xl font-black text-gray-900 tracking-tighter">공실뉴스</h1>
                        <span className="text-sm font-bold text-gray-500 tracking-wide">부동산 콘텐츠 AI</span>
                        <span className="bg-[#f4a71b]/10 border border-[#f4a71b]/30 text-[#f4a71b] text-[10px] px-1.5 py-px rounded font-mono font-bold ml-1">R1.2</span>
                    </div>
                </div>
            </div>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-[480px_1fr] gap-8 p-6 lg:pl-6 lg:pr-10 flex-grow min-h-0 w-full">
        <div className="lg:overflow-y-auto pr-2 custom-scrollbar pb-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900 border-l-4 border-[#f4a71b] pl-3">원문/자료 입력</h2>
                <a href="https://new.land.naver.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#03C75A] hover:bg-[#02b351] px-3 py-1.5 rounded-md transition-colors shadow-sm">
                    <span className="font-extrabold">N</span><span>네이버부동산</span>
                </a>
              </div>
              <div className="relative">
                  <textarea id="sourceText" name="sourceText" rows={6} value={formData.sourceText} onChange={handleInputChange} placeholder="매물정보를 등록하시거나, 매물광고 이미지 파일을 첨부하세요." className="w-full bg-white border border-gray-300 rounded-lg p-4 text-gray-900 focus:ring-2 focus:ring-[#f4a71b] transition-colors shadow-sm resize-none" />
                  <label htmlFor="file-upload" className="absolute bottom-3 right-3 cursor-pointer p-2 rounded-md bg-gray-100 hover:bg-gray-200 border border-gray-200">
                      <FileUploadIcon className="w-5 h-5 text-gray-500" />
                      <input id="file-upload" type="file" className="sr-only" accept=".txt,.md,image/*" onChange={handleFileChange} />
                  </label>
              </div>
              {formData.file && (
                <div className="mt-2 p-2 bg-white border border-gray-200 rounded-md flex items-center justify-between shadow-sm animate-in fade-in duration-300">
                    <div className="flex items-center gap-3 text-sm overflow-hidden">
                        <img src={`data:${formData.file.mimeType};base64,${formData.file.data}`} alt="preview" className="w-10 h-10 rounded object-cover border border-gray-100" />
                        <span className="text-gray-700 truncate">{formData.file.name}</span>
                    </div>
                    <button type="button" onClick={() => setFormData(prev=>({...prev, file: null}))} className="text-gray-400 hover:text-gray-700 text-xl px-2">&times;</button>
                </div>
              )}
            </section>
            
            <section className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900 border-l-4 border-[#f4a71b] pl-3">매물 정보 입력</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">물건 구분</label>
                        <select name="propertyType" value={formData.propertyType} onChange={handleInputChange} className={commonInputClass}>
                            <option value="">선택하세요</option>
                            {PROPERTY_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">거래 구분</label>
                        <select name="transactionType" value={formData.transactionType} onChange={handleInputChange} className={commonInputClass}>
                            <option value="">선택하세요</option>
                            {TRANSACTION_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                </div>
                {formData.transactionType === TransactionType.SALE && (
                    <input type="text" name="salePrice" value={formData.salePrice} onChange={handleInputChange} placeholder="매매가 (예: 10억)" className={commonInputClass} />
                )}
                {formData.transactionType === TransactionType.JEONSE && (
                    <input type="text" name="jeonsePrice" value={formData.jeonsePrice} onChange={handleInputChange} placeholder="전세가 (예: 5억)" className={commonInputClass} />
                )}
                {formData.transactionType === TransactionType.MONTHLY_RENT && (
                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" name="deposit" value={formData.deposit} onChange={handleInputChange} placeholder="보증금" className={commonInputClass} />
                        <input type="text" name="monthlyRent" value={formData.monthlyRent} onChange={handleInputChange} placeholder="월세" className={commonInputClass} />
                    </div>
                )}
                <input type="text" name="address" value={formData.address} onChange={handleInputChange} placeholder="주소" className={commonInputClass} />
                <div className="grid grid-cols-2 gap-4">
                    <input type="text" name="area" value={formData.area} onChange={handleInputChange} placeholder="면적" className={commonInputClass} />
                    <input type="text" name="features" value={formData.features} onChange={handleInputChange} placeholder="특징" className={commonInputClass} />
                </div>
                
                <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">물건 관련 키워드</label>
                    <div className="bg-white border border-gray-300 rounded-xl p-4 shadow-sm space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                            {STATIC_PROPERTY_KEYWORDS.map(kw => {
                                const isSelected = formData.propertyKeywords.includes(kw);
                                return (
                                    <button
                                        key={kw}
                                        type="button"
                                        onClick={() => {
                                            setFormData(prev => ({
                                                ...prev,
                                                propertyKeywords: isSelected
                                                    ? prev.propertyKeywords.filter(k => k !== kw)
                                                    : [...prev.propertyKeywords, kw]
                                            }));
                                        }}
                                        className={`py-2 px-1 rounded-lg border text-xs font-bold transition-all shadow-sm ${
                                            isSelected 
                                            ? 'bg-[#f4a71b] border-[#f4a71b] text-white' 
                                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        {kw}
                                    </button>
                                );
                            })}
                        </div>
                        
                        <div className="pt-2 border-t border-gray-100">
                            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-tight">기타 키워드</label>
                            <TagInput label="" tags={customKeywords} setTags={setCustomKeywords} />
                        </div>
                    </div>
                </div>
            </section>

            <section className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-l-4 border-[#f4a71b] pl-3">생성 조건 설정</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-tight">콘텐츠 유형</label>
                  <div className="grid grid-cols-3 gap-2">
                      {CONTENT_TYPE_OPTIONS.map(opt => (
                          <div key={opt.id}>
                            <input type="checkbox" id={opt.id} name={opt.id} checked={formData.contentTypes[opt.id]} onChange={handleContentTypeChange} className="sr-only peer" />
                            <label htmlFor={opt.id} className="block w-full text-center py-2 px-1 rounded-lg border border-gray-200 cursor-pointer bg-white text-gray-600 peer-checked:bg-[#f4a71b] peer-checked:border-[#f4a71b] peer-checked:text-white text-xs font-bold transition-all shadow-sm">{opt.label}</label>
                          </div>
                      ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-tight">프롬프트 개수</label>
                  <input type="number" name="promptCount" value={formData.promptCount} onChange={handleInputChange} min="1" max="10" className={commonInputClass} />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-tight">문체</label>
                  <select name="writingStyle" value={formData.writingStyle} onChange={handleInputChange} className={commonInputClass}>
                    {WRITING_STYLE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-tight">기사 글자 수</label>
                    <input type="number" name="articleLength" value={formData.articleLength} onChange={handleInputChange} step="100" className={commonInputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-tight">블로그 글자 수</label>
                    <input type="number" name="blogLength" value={formData.blogLength} onChange={handleInputChange} step="100" className={commonInputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-tight">톤 & 채널</label>
                    <select name="tone" value={formData.tone} onChange={handleInputChange} className={commonInputClass}>
                      {TONE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-tight">타깃</label>
                    <select name="audience" value={formData.audience} onChange={handleInputChange} className={commonInputClass}>
                      {AUDIENCE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-tight">채널명</label>
                  <input type="text" name="channelName" value={formData.channelName} onChange={handleInputChange} placeholder="채널명 (예: 공실뉴스)" className={commonInputClass} />
                </div>
              </div>
            </section>
            
            <div className="sticky bottom-0 bg-gray-50 py-4 z-10">
              <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 text-lg font-bold bg-[#f4a71b] text-white shadow-lg py-4 px-6 rounded-xl hover:bg-[#d89316] disabled:bg-gray-300 transition-all transform hover:-translate-y-0.5">
                {isLoading ? <div className="w-5 h-5 border-2 border-t-white rounded-full animate-spin"></div> : <SparklesIcon className="w-6 h-6" />}
                <span>{isLoading ? '콘텐츠 생성 중...' : '공실뉴스 기사 생성'}</span>
              </button>
            </div>
          </form>
        </div>

        <section className="flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden relative shadow-sm h-full max-h-[calc(100vh-120px)]">
          <div className="flex-shrink-0 flex justify-between items-center p-5 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center bg-white">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#f4a71b"><path d="M8 5v14l11-7z"/></svg>
                </div>
                생성 결과 미리보기
            </h2>
            <div className="flex items-center gap-2">
              {nonPromptContent && !isLoading && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsManualEditing(!isManualEditing)} className={`p-2 rounded-lg border transition-all ${isManualEditing ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`} title="직접 편집">
                        <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    <button onClick={handleDownloadText} className="p-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg" title="다운로드">
                        <DownloadIcon className="w-4 h-4" />
                    </button>
                  </div>
              )}
            </div>
          </div>

          {/* Combined Tabs Bar */}
          {tabs.length > 0 && !isLoading && (
              <div className="flex-shrink-0 bg-gray-50/50 border-b border-gray-100 flex gap-1 overflow-x-auto no-scrollbar px-4 pt-2">
                  {tabs.map((tab) => (
                      <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`px-4 py-2.5 text-sm font-bold whitespace-nowrap transition-all border-b-2 rounded-t-lg flex items-center gap-1.5 ${
                              activeTab === tab
                                  ? 'border-[#f4a71b] text-[#f4a71b] bg-white'
                                  : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                          }`}
                      >
                          {tab === '이미지 생성' && <PhotoIcon className="w-3.5 h-3.5" />}
                          {tab}
                      </button>
                  ))}
              </div>
          )}

          <div className="flex-grow overflow-y-auto p-8 bg-white" onContextMenu={handleContainerContextMenu}>
            {isLoading && !rawGeneratedContent && (
              <div className="flex flex-col items-center justify-center h-full">
                  <SparklesIcon className="w-12 h-12 animate-pulse text-[#f4a71b]"/>
                  <p className="mt-4 text-lg font-bold text-gray-900">AI가 콘텐츠를 생성하고 있습니다.</p>
              </div>
            )}
            {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 border border-red-100">{error}</div>}
            
            {!isLoading && activeTab === '이미지 생성' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-black text-gray-900 m-0">이미지 생성 프롬프트</h2>
                        <button onClick={handleDownloadAllImages} className="flex items-center gap-2 text-xs bg-[#f4a71b] hover:bg-[#d89316] text-white font-bold py-1.5 px-3 rounded-lg shadow-sm">
                            <DownloadIcon className="w-3.5 h-3.5" />
                            <span>전체 이미지 다운</span>
                        </button>
                    </div>
                    <div className="space-y-6">
                        {generatedPrompts.map((prompt, index) => (
                            <div key={index} className="p-6 bg-gray-50 border border-gray-200 rounded-xl shadow-sm">
                                <p className="text-gray-700 mb-5 font-medium text-sm leading-relaxed"><span className="font-bold text-[#f4a71b] mr-2">#{index + 1}</span> {prompt.text}</p>
                                <div className="grid grid-cols-4 gap-3 items-end mb-4">
                                    <div className="col-span-1">
                                        <label className="text-[10px] text-gray-400 font-bold block mb-1 uppercase">비율</label>
                                        <select value={prompt.settings.aspectRatio} onChange={(e) => handlePromptSettingsChange(index, 'aspectRatio', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs text-gray-700 focus:ring-1 focus:ring-[#f4a71b]">
                                            {IMAGE_ASPECT_RATIO_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-[10px] text-gray-400 font-bold block mb-1 uppercase">스타일</label>
                                        <select value={prompt.settings.style} onChange={(e) => handlePromptSettingsChange(index, 'style', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs text-gray-700 focus:ring-1 focus:ring-[#f4a71b]">
                                            {IMAGE_STYLE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-[10px] text-gray-400 font-bold block mb-1 uppercase">개수</label>
                                        <input type="number" min="1" max="3" value={prompt.settings.count} onChange={(e) => handlePromptSettingsChange(index, 'count', parseInt(e.target.value))} className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs text-gray-700 focus:ring-1 focus:ring-[#f4a71b]" />
                                    </div>
                                    <button onClick={() => handleGenerateImages(index)} disabled={prompt.isLoading} className="col-span-1 flex items-center justify-center gap-2 bg-[#f4a71b] text-white py-2 rounded-lg hover:bg-[#d89316] disabled:bg-gray-300 shadow-sm font-bold text-xs h-[36px]">
                                        {prompt.isLoading ? <div className="w-3 h-3 border-2 border-t-white rounded-full animate-spin"></div> : <PhotoIcon className="w-3.5 h-3.5" />}
                                        <span>{prompt.isLoading ? '생성중' : '이미지 생성'}</span>
                                    </button>
                                </div>
                                {prompt.images.length > 0 && (
                                    <div className="grid grid-cols-3 gap-3 mt-4">
                                        {prompt.images.map((image, imgIdx) => (
                                            <a key={imgIdx} href={image.url} download={`gongsil_img_${index+1}.jpeg`} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200">
                                                <img src={image.url} alt="gen" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center"><DownloadIcon className="w-6 h-6 text-white" /></div>
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!isLoading && activeTab !== '이미지 생성' && nonPromptContent && (
                <div className="animate-in fade-in duration-300">
                    {isManualEditing ? (
                        <textarea value={nonPromptContent} onChange={(e) => setNonPromptContent(e.target.value)} className="w-full min-h-[60vh] bg-gray-50 text-gray-900 p-6 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#f4a71b] outline-none font-mono text-sm leading-relaxed" spellCheck={false} />
                    ) : (
                        sections.map((section) => {
                            if (section.isHeader && section.title !== activeTab) return null;
                            if (!section.isHeader && activeTab !== tabs[0]) return null;
                            return (
                                <MarkdownRenderer 
                                    key={section.originalIndex}
                                    title={section.title} 
                                    body={section.body} 
                                    originalIndex={section.originalIndex}
                                    onSave={handleSectionSave}
                                    onSectionContextMenu={handleSectionContextMenu}
                                    isIntro={!section.isHeader}
                                />
                            );
                        })
                    )}
                </div>
            )}

            {isLoading && rawGeneratedContent && (
              <div className="mt-6 p-5 rounded-xl bg-gray-50 border border-gray-200">
                <h3 className="font-bold text-gray-700 mb-2 text-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#f4a71b] animate-pulse"></div>
                    실시간 생성 중...
                </h3>
                <pre className="text-sm text-gray-600 whitespace-pre-wrap font-mono leading-relaxed">{rawGeneratedContent.slice(-300)}...</pre>
              </div>
            )}
          </div>
          ...
        </section>
      </main>
    </div>
  );
};

export default App;

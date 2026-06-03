
import React, { useState, useRef, useEffect } from 'react';
import { parseScriptToSegments, generateSegmentImage, generateSegmentAudio, regenerateVisualPrompt, generateVideoPrompt, modifyVisualPrompt, transcribeAudioToSegments, createWavBlob, generatePromptsForTexts, setGeminiApiKey } from './services/geminiService';
import { generateElevenLabsAudio } from './services/elevenLabsService';
import { generateTypecastAudio } from './services/typecastService';
import { exportToCapCut, exportImagesOnly, exportAudioOnly, exportVideoPromptsOnly, exportSRTOnly, exportVisualPromptsOnly, exportToMp4 } from './services/exportService';
import { NewsSegment, ImageStyle, TTSProvider, SegmentationMode, AspectRatio, VisualPromptType } from './types';
import { STYLE_OPTIONS, VOICE_OPTIONS, SPEED_OPTIONS } from './constants';
import { 
  Type as IconType, 
  Image as IconImage, 
  ChevronRight, 
  Loader2, 
  Sparkles, 
  History, 
  Layout, 
  Download,
  Trash2,
  Mic2,
  Play,
  Volume2,
  Scissors,
  RefreshCw,
  Clock,
  Zap,
  FolderDown,
  Settings,
  Key,
  Layers,
  AlignJustify,
  Square,
  Wand2,
  MessageSquare,
  Video,
  Copy,
  Check,
  XCircle,
  FileText,
  Music,
  ExternalLink,
  Split,
  ArrowDownToLine,
  Plus,
  Minus,
  Monitor,
  Smartphone,
  Box,
  Building2,
  User,
  BarChart,
  AudioLines,
  BookOpen,
  X,
  MousePointerClick,
  Lightbulb,
  AlertTriangle,
  MonitorPlay,
  Upload,
  Smile,
  UserCheck,
  Captions,
  FileAudio,
  Maximize2,
  FileImage,
  FolderUp
} from 'lucide-react';

const ImagePreviewModal: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => {
  return (
    <div 
      className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors bg-black/20 p-2 rounded-full hover:bg-black/40"
      >
        <X className="w-8 h-8" />
      </button>
      <img 
        src={url} 
        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200" 
        alt="Preview" 
        onClick={(e) => e.stopPropagation()} 
      />
    </div>
  );
};

const ManualModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-indigo-600 p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">공실뉴스AI 스튜디오 사용설명서</h2>
              <p className="text-indigo-100 text-sm font-medium">초보자도 5분 완성! 영상 소스 만들기부터 편집기 활용까지</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 p-2 rounded-full text-white transition-colors"
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-8 space-y-12 custom-scrollbar bg-gray-50/50">
          
          {/* Section 1: Intro */}
          <section className="bg-white p-8 rounded-3xl border border-indigo-100 shadow-sm">
            <h3 className="text-2xl font-black text-indigo-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-indigo-600" />
              복잡한 프롬프트 입력은 이제 그만!
            </h3>
            <div className="text-gray-700 text-lg leading-loose space-y-4">
              <p>
                유튜브, 블로그, 뉴스 기사에 들어갈 이미지가 필요할 때...<br/>
                매번 번역기 돌려가며 <strong>영어로 프롬프트(명령어) 입력하기 귀찮으셨죠?</strong> 😫
              </p>
              
              <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 my-4">
                <p className="font-bold text-indigo-900 text-xl mb-2">
                  "이제 대본(글자)만 넣으세요! 📄 ➡️ 🖼️"
                </p>
                <p className="text-indigo-800">
                  AI가 내용을 스스로 이해하고, 장면에 딱 맞는 <strong>여러 장의 이미지를 자동으로</strong> 그려줍니다.<br/>
                  프롬프트 고민은 끝! 클릭 한 번으로 고퀄리티 삽화가 뚝딱 만들어집니다.
                </p>
              </div>

              <p>
                게다가 <strong>구글 전문 성우(TTS)</strong>가 대신 읽어주니, 내 목소리로 녹음할 필요도 없습니다.<br/>
                이제 <strong>'글'</strong>만 준비하세요. 그림과 목소리는 AI가 알아서 준비해 드립니다. ✨
              </p>
            </div>
          </section>

          {/* Section 0: Critical Notice */}
          <section className="bg-red-50 p-6 rounded-3xl border border-red-200 shadow-sm animate-in slide-in-from-top-2">
            <h3 className="text-xl font-black text-red-700 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              ⚠️ 사용 전 필수 확인 (Must Read)
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm flex gap-4">
                <div className="text-2xl">📥</div>
                <div>
                  <h4 className="font-bold text-red-800 text-lg mb-1">앱 복사 필수</h4>
                  <p className="text-sm text-red-900/80 leading-relaxed">
                    이 앱을 원활하게 사용하려면 <strong>Google AI Studio</strong>에서 이 프로젝트를 본인의 계정으로 <strong>복사(Fork)</strong>하거나 API 키를 설정해야 합니다.
                  </p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm flex gap-4">
                 <div className="text-2xl">⏳</div>
                 <div>
                  <h4 className="font-bold text-red-800 text-lg mb-1">일일 무료 용량 제한</h4>
                  <p className="text-sm text-red-900/80 leading-relaxed">
                    이미지와 음성 생성은 <strong>1일 무료 제공량</strong>이 정해져 있습니다. 무료 용량을 다 쓰면 생성이 안 될 수 있으니, <strong>내일 다시 사용</strong>하시거나 <strong>유료 API</strong>를 등록해주세요.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Step-by-Step */}
          <section>
            <h3 className="text-2xl font-black text-gray-900 mb-8 border-b pb-4 flex items-center gap-2">
              🚀 순서대로 따라해 보세요
            </h3>
            
            <div className="space-y-6">
               <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex gap-4 items-center">
                  <div className="bg-gray-900 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shrink-0">1</div>
                  <p className="text-gray-700 font-medium">왼쪽 입력창에 <strong>뉴스 대본</strong>을 붙여넣고 <strong>[스크립트 분석]</strong> 버튼을 누르세요.</p>
               </div>
               <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex gap-4 items-center">
                  <div className="bg-gray-900 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shrink-0">2</div>
                  <p className="text-gray-700 font-medium">원하는 <strong>성우</strong>와 <strong>이미지 스타일</strong>(실사, 웹툰 등)을 선택하세요.</p>
               </div>
               <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex gap-4 items-center">
                  <div className="bg-gray-900 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shrink-0">3</div>
                  <p className="text-gray-700 font-medium">상단의 <strong>[음성 전체 생성]</strong>과 <strong>[이미지 전체 생성]</strong> 버튼을 눌러 결과물을 만드세요.</p>
               </div>
               <div className="bg-red-50 p-5 rounded-2xl shadow-sm border border-red-100 flex gap-4 items-center">
                  <div className="bg-red-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shrink-0">4</div>
                  <p className="text-red-900 font-bold">작업이 끝나면 <strong>[통합 저장]</strong> 버튼을 눌러 캡컷/프리미어용 파일을 다운로드하세요.</p>
               </div>
            </div>
          </section>

          {/* Section 3: Detailed Features */}
          <section className="bg-indigo-50 p-8 rounded-3xl border border-indigo-100">
            <h3 className="text-2xl font-black text-indigo-900 mb-6 flex items-center gap-2">
              ✨ 전문가처럼 활용하는 디테일 기능
            </h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              
              {/* Feature 1 */}
              <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4 text-purple-600">
                  <Wand2 className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">이미지가 마음에 안 드시나요?</h4>
                <p className="text-gray-600 text-sm leading-relaxed mb-3">
                  AI가 만든 그림이 내용과 다르다면, 프롬프트 입력창을 직접 수정하거나 <strong>[재생성]</strong> 버튼을 누르세요. 새로운 그림을 그려줍니다.
                </p>
                <div className="bg-gray-50 p-3 rounded-lg text-xs font-medium text-gray-500">
                  💡 <strong>Tip:</strong> 프롬프트 창 위의 [인물], [배경], [그래프] 버튼을 누르면 AI에게 "사람 위주로 그려줘" 또는 "배경만 그려줘"라고 시킬 수 있습니다.
                </div>
              </div>

              {/* Feature 2 */}
              <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
                  <Video className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">비디오 프롬프트 생성</h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  정지 이미지뿐만 아니라, 영상 생성 AI(Veo, Runway, Luma 등)에서 사용할 수 있는 <strong>동영상용 프롬프트</strong>도 만들어드립니다. 카드 상단의 [Gen Motion] 버튼을 눌러보세요.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
                  <Scissors className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">클립 나누기 & 합치기</h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  한 문장이 너무 길어서 그림 하나로 부족한가요?
                  <ul className="list-disc list-inside mt-2 space-y-1 text-gray-500">
                    <li><strong>나누기:</strong> 텍스트 중간에 커서를 두고 말풍선 하단의 [나누기] 아이콘 클릭</li>
                    <li><strong>합치기:</strong> 카드 하단의 화살표 아이콘을 눌러 다음 문장과 연결</li>
                  </ul>
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4 text-orange-600">
                  <Volume2 className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">성우 목소리 디테일 설정</h4>
                <p className="text-gray-600 text-sm leading-relaxed mb-2">
                  다양한 성우 리스트의 <strong>[재생] 버튼</strong>을 눌러 미리 들어보세요. 
                  뉴스 속도에 맞춰 <strong>재생 속도</strong>(0.75배 ~ 1.75배)를 조절할 수 있어 긴박하거나 차분한 뉴스를 모두 소화할 수 있습니다.
                </p>
              </div>

            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-white flex justify-center shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button 
            onClick={onClose}
            className="w-full max-w-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl text-xl transition-all active:scale-95 shadow-xl flex items-center justify-center gap-2"
          >
            <span>네, 확인했습니다!</span>
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

type InputMode = 'text' | 'audio' | 'srt';

const segmentationOptions = [
  { mode: 'standard', label: '표준', icon: <AlignJustify className="w-4 h-4" /> },
  { mode: 'balanced', label: '균형', icon: <Layout className="w-4 h-4" /> },
  { mode: 'detailed', label: '상세', icon: <Layers className="w-4 h-4" /> },
  { mode: 'single', label: '한장', icon: <Square className="w-4 h-4" /> },
];

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const App: React.FC = () => {
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [script, setScript] = useState('');
  const [uploadedAudio, setUploadedAudio] = useState<File | null>(null);
  const [uploadedSRT, setUploadedSRT] = useState<File | null>(null);
  
  const [segments, setSegments] = useState<NewsSegment[]>([{
    id: `seg-${Date.now()}`,
    originalText: '',
    narrative: '',
    visualPrompt: '',
    visualType: 'auto'
  }]);
  
  // Cursor tracking for split function
  const [cursorPositions, setCursorPositions] = useState<Record<string, number>>({});
  
  // Segmentation Settings
  const [segmentationMode, setSegmentationMode] = useState<SegmentationMode>('balanced');
  const [targetClipCount, setTargetClipCount] = useState<number>(0);

  // TTS Settings
  const [ttsProvider, setTtsProvider] = useState<TTSProvider>('google');
  
  // Google Settings
  const [geminiApiKey, setGeminiApiKeyLocal] = useState(() => localStorage.getItem('geminiApiKey') || '');
  const [selectedStyle, setSelectedStyle] = useState<ImageStyle>(ImageStyle.REALISTIC);

  useEffect(() => {
    localStorage.setItem('geminiApiKey', geminiApiKey);
    setGeminiApiKey(geminiApiKey);
  }, [geminiApiKey]);

  const [selectedVoice, setSelectedVoice] = useState<string>(VOICE_OPTIONS[0].id);
  const [selectedSpeed, setSelectedSpeed] = useState<number>(1.0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  
  // ElevenLabs Settings
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState(() => localStorage.getItem('elevenLabsApiKey') || '');
  const [elevenLabsVoiceId, setElevenLabsVoiceId] = useState(() => localStorage.getItem('elevenLabsVoiceId') || '');

  useEffect(() => {
    localStorage.setItem('elevenLabsApiKey', elevenLabsApiKey);
    localStorage.setItem('elevenLabsVoiceId', elevenLabsVoiceId);
  }, [elevenLabsApiKey, elevenLabsVoiceId]);

  // Typecast Settings
  const [typecastApiKey, setTypecastApiKey] = useState(() => localStorage.getItem('typecastApiKey') || '');
  const [typecastActorId, setTypecastActorId] = useState(() => localStorage.getItem('typecastActorId') || '');
  const [typecastEmotion, setTypecastEmotion] = useState(() => localStorage.getItem('typecastEmotion') || '');

  useEffect(() => {
    localStorage.setItem('typecastApiKey', typecastApiKey);
    localStorage.setItem('typecastActorId', typecastActorId);
    localStorage.setItem('typecastEmotion', typecastEmotion);
  }, [typecastApiKey, typecastActorId, typecastEmotion]);

  // Full Audio Settings
  const [fullAudioUrl, setFullAudioUrl] = useState<string | null>(null);
  const [isGeneratingFullAudio, setIsGeneratingFullAudio] = useState(false);

  const [isParsing, setIsParsing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingMp4, setIsExportingMp4] = useState(false);
  const [exportMp4Progress, setExportMp4Progress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const batchInputRef = useRef<HTMLInputElement | null>(null); // For batch folder upload
  const [activeGenIndex, setActiveGenIndex] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Batch Control
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const stopProcessingRef = useRef(false);

  // Manual Modal State
  const [showManual, setShowManual] = useState(false);

  // Preview Image State
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const isAnyGenerating = segments.some(s => s.isGenerating || s.isGeneratingAudio || s.isGeneratingPrompt || s.isGeneratingVideoPrompt) || isParsing || isExporting || isExportingMp4 || isGeneratingFullAudio;
  const isReadyToExport = segments.length > 0 && segments.every(s => s.generatedImageUrl && s.generatedAudioUrl);

  const getStyleShortLabel = (style?: ImageStyle) => {
    if (!style) return '';
    const option = STYLE_OPTIONS.find(o => o.id === style);
    return option ? option.label.split('(')[0].trim() : '';
  };

  const getVisualTypeLabel = (type?: VisualPromptType) => {
    switch (type) {
      case 'background': return '배경';
      case 'character': return '인물';
      case 'graph': return '그래프';
      case 'modification': return '수정';
      case 'auto': 
      default: return '자동';
    }
  };

  const getVoiceLabel = (voiceId?: string) => {
    if (!voiceId) return '';
    if (voiceId === 'ElevenLabs') return 'ElevenLabs';
    if (voiceId === 'Typecast') return 'Typecast';
    if (voiceId === 'Uploaded') return '원본 오디오';
    const option = VOICE_OPTIONS.find(v => v.id === voiceId);
    return option ? option.label.split('(')[0].trim() : voiceId;
  };

  const clearAll = () => {
    setSegments([{
      id: `seg-${Date.now()}`,
      originalText: '',
      narrative: '',
      visualPrompt: '',
      visualType: 'auto'
    }]);
    setScript('');
    setUploadedAudio(null);
    setUploadedSRT(null);
    setFullAudioUrl(null);
    setError(null);
    setInputMode('text');
  };

  const handleStopProcessing = () => {
    stopProcessingRef.current = true;
    setIsBatchProcessing(false);
    setActiveGenIndex(null);
  };

  const handleParse = async () => {
    setIsParsing(true);
    setError(null);
    try {
      const newSegments = await parseScriptToSegments(script, segmentationMode, targetClipCount);
      setSegments(newSegments);
    } catch (e: any) {
      setError(e.message || "Script parsing failed.");
    } finally {
      setIsParsing(false);
    }
  };

  const parseSRT = (srtText: string): NewsSegment[] => {
    const regex = /(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n([\s\S]*?)(?=\n\n\d+|\n*$)/g;
    const segments: NewsSegment[] = [];
    let match;
    while ((match = regex.exec(srtText)) !== null) {
      segments.push({
        id: `seg-${Date.now()}-${match[1]}`,
        originalText: match[4].trim(),
        narrative: match[4].trim(),
        visualPrompt: '',
        visualType: 'auto'
      });
    }
    return segments;
  };

  const handleSRTFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedSRT(e.target.files[0]);
    }
  };

  const handleSRTAnalysis = async () => {
    if (!uploadedSRT) return;
    setIsParsing(true);
    setError(null);
    try {
      const text = await uploadedSRT.text();
      const srtSegments = parseSRT(text);
      if (srtSegments.length === 0) throw new Error("No valid segments found in SRT.");
      
      const narratives = srtSegments.map(s => s.narrative);
      const prompts = await generatePromptsForTexts(narratives);
      
      const finalSegments = srtSegments.map((seg, idx) => ({
        ...seg,
        visualPrompt: prompts[idx] || "News studio background"
      }));
      setSegments(finalSegments);
    } catch (e: any) {
      setError(e.message || "SRT Analysis failed.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedAudio(e.target.files[0]);
    }
  };

  const handleAudioAnalysis = async () => {
    if (!uploadedAudio) return;
    setIsParsing(true);
    setError(null);
    try {
      const base64 = await blobToBase64(uploadedAudio);
      // Remove data URL prefix
      const base64Data = base64.split(',')[1];
      const items = await transcribeAudioToSegments(base64Data, uploadedAudio.type);
      
      const newSegments: NewsSegment[] = items.map((item, idx) => ({
        id: `seg-${Date.now()}-${idx}`,
        originalText: item.narrative,
        narrative: item.narrative,
        visualPrompt: item.visualPrompt,
        visualType: 'auto',
        // In a real app we would slice the audio here, for now we just mark it
        generatedVoice: 'Uploaded'
      }));
      setSegments(newSegments);
    } catch (e: any) {
      setError(e.message || "Audio Analysis failed.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleGenerateFullScriptAudio = async () => {
    if (!script.trim()) return;
    setIsGeneratingFullAudio(true);
    try {
      if (ttsProvider === 'google') {
        const audioUrl = await generateSegmentAudio(script, selectedVoice, selectedSpeed);
        setFullAudioUrl(audioUrl);
      } else {
        // Implement others if needed, typically full script generation is mostly used with Google TTS in this demo
        setError("Full script generation is currently optimized for Google TTS.");
      }
    } catch (e: any) {
      setError(e.message || "Failed to generate full audio.");
    } finally {
      setIsGeneratingFullAudio(false);
    }
  };

  const handlePreviewVoice = async (voiceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewingVoiceId === voiceId) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
      }
      setPreviewingVoiceId(null);
      return;
    }

    setPreviewingVoiceId(voiceId);
    try {
      let url = "";
      const sampleText = "This is a preview of the selected voice.";
      if (voiceId === "eleven_test") {
        url = await generateElevenLabsAudio(sampleText, elevenLabsApiKey, elevenLabsVoiceId);
      } else if (voiceId === "typecast_test") {
        url = await generateTypecastAudio(sampleText, typecastApiKey, typecastActorId, typecastEmotion);
      } else {
        url = await generateSegmentAudio(sampleText, voiceId, 1.0);
      }
      
      if (previewAudioRef.current) {
        previewAudioRef.current.src = url;
        previewAudioRef.current.play();
        previewAudioRef.current.onended = () => setPreviewingVoiceId(null);
      }
    } catch (e: any) {
      setError("Preview failed: " + e.message);
      setPreviewingVoiceId(null);
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNarrativeChange = (id: string, text: string) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, narrative: text } : s));
  };

  const handleTextSelect = (id: string, e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    setCursorPositions(prev => ({ ...prev, [id]: target.selectionStart }));
  };

  const handleSplitSegment = (index: number) => {
    const segment = segments[index];
    const cursor = cursorPositions[segment.id] || 0;
    if (cursor <= 0 || cursor >= segment.narrative.length) return;

    const firstPart = segment.narrative.substring(0, cursor).trim();
    const secondPart = segment.narrative.substring(cursor).trim();
    if (!firstPart || !secondPart) return;

    const newSegment1: NewsSegment = { ...segment, narrative: firstPart, id: `seg-${Date.now()}-1`, generatedImageUrl: undefined, generatedAudioUrl: undefined };
    const newSegment2: NewsSegment = { ...segment, narrative: secondPart, id: `seg-${Date.now()}-2`, generatedImageUrl: undefined, generatedAudioUrl: undefined };

    const newSegments = [...segments];
    newSegments.splice(index, 1, newSegment1, newSegment2);
    setSegments(newSegments);
  };

  const handleMergeSegment = (index: number) => {
    if (index >= segments.length - 1) return;
    const current = segments[index];
    const next = segments[index + 1];

    const merged: NewsSegment = {
      ...current,
      narrative: `${current.narrative} ${next.narrative}`,
      generatedImageUrl: undefined,
      generatedAudioUrl: undefined
    };

    const newSegments = [...segments];
    newSegments.splice(index, 2, merged);
    setSegments(newSegments);
  };

  const handleAddSegment = (index: number) => {
    const newSegment: NewsSegment = {
      id: `seg-${Date.now()}`,
      originalText: '',
      narrative: '',
      visualPrompt: '',
      visualType: 'auto'
    };
    const newSegments = [...segments];
    newSegments.splice(index + 1, 0, newSegment);
    setSegments(newSegments);
  };

  const handleDeleteSegment = (index: number) => {
    if (segments.length <= 1) return;
    const newSegments = [...segments];
    newSegments.splice(index, 1);
    setSegments(newSegments);
  };

  const handleGenerateVideoPrompt = async (id: string) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, isGeneratingVideoPrompt: true } : s));
    try {
      const segment = segments.find(s => s.id === id);
      if (segment) {
        const prompt = await generateVideoPrompt(segment.narrative, segment.visualPrompt);
        setSegments(prev => prev.map(s => s.id === id ? { ...s, videoPrompt: prompt } : s));
      }
    } catch (e: any) {
      setError("Failed to generate video prompt.");
    } finally {
      setSegments(prev => prev.map(s => s.id === id ? { ...s, isGeneratingVideoPrompt: false } : s));
    }
  };

  const handleGenerateAllVideoPrompts = async () => {
    setIsBatchProcessing(true);
    stopProcessingRef.current = false;
    for (let i = 0; i < segments.length; i++) {
      if (stopProcessingRef.current) break;
      await handleGenerateVideoPrompt(segments[i].id);
    }
    setIsBatchProcessing(false);
  };

  const handleVisualTypeChange = (id: string, type: VisualPromptType) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, visualType: type } : s));
    // Optionally trigger regeneration of prompt text immediately? 
    // Usually user might want to click regenerate button.
  };

  const handlePromptChange = (id: string, text: string) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, visualPrompt: text } : s));
  };

  const handleRegeneratePrompt = async (id: string) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, isGeneratingPrompt: true } : s));
    try {
      const segment = segments.find(s => s.id === id);
      if (segment) {
        const newPrompt = await regenerateVisualPrompt(segment.narrative, segment.visualType);
        setSegments(prev => prev.map(s => s.id === id ? { ...s, visualPrompt: newPrompt } : s));
      }
    } catch (e) {
      setError("Prompt regeneration failed.");
    } finally {
      setSegments(prev => prev.map(s => s.id === id ? { ...s, isGeneratingPrompt: false } : s));
    }
  };

  const handleCopyVideoPrompt = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSingleVoiceGeneration = async (id: string, text: string) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, isGeneratingAudio: true } : s));
    try {
      let url = "";
      let voiceLabel = "";
      if (ttsProvider === 'google') {
        url = await generateSegmentAudio(text, selectedVoice, selectedSpeed);
        voiceLabel = selectedVoice;
      } else if (ttsProvider === 'elevenlabs') {
        url = await generateElevenLabsAudio(text, elevenLabsApiKey, elevenLabsVoiceId);
        voiceLabel = 'ElevenLabs';
      } else if (ttsProvider === 'typecast') {
        url = await generateTypecastAudio(text, typecastApiKey, typecastActorId, typecastEmotion);
        voiceLabel = 'Typecast';
      }
      setSegments(prev => prev.map(s => s.id === id ? { ...s, generatedAudioUrl: url, generatedVoice: voiceLabel } : s));
    } catch (e: any) {
      setError("Voice generation failed: " + e.message);
    } finally {
      setSegments(prev => prev.map(s => s.id === id ? { ...s, isGeneratingAudio: false } : s));
    }
  };

  const handleGenerateVoices = async () => {
    setIsBatchProcessing(true);
    stopProcessingRef.current = false;
    for (let i = 0; i < segments.length; i++) {
      if (stopProcessingRef.current) break;
      await handleSingleVoiceGeneration(segments[i].id, segments[i].narrative);
    }
    setIsBatchProcessing(false);
  };

  const handleGenerateSingleImage = async (id: string) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, isGenerating: true } : s));
    try {
      const segment = segments.find(s => s.id === id);
      if (segment) {
        let finalPrompt = segment.visualPrompt;
        if (segment.modificationInput) {
             finalPrompt = await modifyVisualPrompt(segment.visualPrompt, segment.modificationInput);
             // Update the prompt text in UI too
             setSegments(prev => prev.map(s => s.id === id ? { ...s, visualPrompt: finalPrompt, modificationInput: '' } : s));
        }
        
        const url = await generateSegmentImage(finalPrompt, selectedStyle, aspectRatio, segment.generatedImageUrl);
        setSegments(prev => prev.map(s => s.id === id ? { 
            ...s, 
            generatedImageUrl: url, 
            generatedStyle: selectedStyle,
            generatedAspectRatio: aspectRatio,
            generatedVisualType: segment.visualType
        } : s));
      }
    } catch (e: any) {
      setError("Image generation failed: " + e.message);
    } finally {
      setSegments(prev => prev.map(s => s.id === id ? { ...s, isGenerating: false } : s));
    }
  };

  const handleGenerateImages = async () => {
    setIsBatchProcessing(true);
    stopProcessingRef.current = false;
    for (let i = 0; i < segments.length; i++) {
      if (stopProcessingRef.current) break;
      setActiveGenIndex(i);
      await handleGenerateSingleImage(segments[i].id);
    }
    setActiveGenIndex(null);
    setIsBatchProcessing(false);
  };

  const handleImageUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const base64 = await blobToBase64(file);
      setSegments(prev => prev.map(s => s.id === id ? { 
          ...s, 
          generatedImageUrl: base64,
          generatedStyle: undefined,
          generatedVisualType: 'modification'
      } : s));
    }
  };
  
  const handleBatchImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: Record<number, string> = {};
    const processingPromises: Promise<void>[] = [];

    Array.from(files).forEach((file: File) => {
        if (!file.type.startsWith('image/')) return;

        // Try to extract the first number from the filename to match with clip index
        // e.g. "1.png" -> 1, "clip01.jpg" -> 1, "image_2.png" -> 2
        const name = file.name;
        const numberMatch = name.match(/(\d+)/);
        
        if (numberMatch) {
            const num = parseInt(numberMatch[1], 10);
            if (num > 0) {
                const index = num - 1; // Convert 1-based clip number to 0-based array index
                
                const promise = new Promise<void>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        if (ev.target?.result) {
                            newImages[index] = ev.target.result as string;
                        }
                        resolve();
                    };
                    reader.readAsDataURL(file);
                });
                processingPromises.push(promise);
            }
        }
    });

    if (processingPromises.length > 0) {
        await Promise.all(processingPromises);
        
        if (Object.keys(newImages).length > 0) {
            setSegments(prev => prev.map((seg, idx) => {
                if (newImages[idx]) {
                    return {
                        ...seg,
                        generatedImageUrl: newImages[idx],
                        isGenerating: false,
                        generatedStyle: undefined, // Reset metadata since it's a manual upload
                        generatedVisualType: 'modification' // Indicate it was modified/uploaded
                    };
                }
                return seg;
            }));
        }
    }
    
    // Reset input value to allow re-uploading same folder/files if needed
    if (batchInputRef.current) {
        batchInputRef.current.value = '';
    }
  };

  const handleModificationInputChange = (id: string, text: string) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, modificationInput: text } : s));
  };

  const handleDownloadImages = () => exportImagesOnly(segments);
  const handleDownloadAudio = () => exportAudioOnly(segments);
  const handleDownloadVideoPrompts = () => exportVideoPromptsOnly(segments);
  const handleDownloadVisualPrompts = () => exportVisualPromptsOnly(segments, selectedStyle);
  const handleDownloadSRT = () => exportSRTOnly(segments);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportToCapCut(segments);
    } catch (e: any) {
      setError("Export failed: " + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportMp4 = async () => {
    setIsExportingMp4(true);
    setExportMp4Progress('MP4 렌더링 시작 준비 중...');
    setError(null);
    try {
      await exportToMp4(segments, (msg) => setExportMp4Progress(msg));
    } catch (e: any) {
      setError("MP4 Export failed: " + e.message);
    } finally {
      setIsExportingMp4(false);
      setExportMp4Progress('');
    }
  };

  return (
    <div className="min-h-screen pb-40">
      <audio ref={previewAudioRef} hidden />
      
      {/* Hidden Batch Upload Input */}
      <input
        type="file"
        ref={batchInputRef}
        className="hidden"
        onChange={handleBatchImageUpload}
        // @ts-ignore - 'webkitdirectory' is non-standard but supported in modern browsers for folder selection
        webkitdirectory=""
        directory=""
        multiple
      />

      {/* Manual Modal */}
      {showManual && <ManualModal onClose={() => setShowManual(false)} />}

      {/* Preview Image Modal */}
      {previewImage && <ImagePreviewModal url={previewImage} onClose={() => setPreviewImage(null)} />}

      {/* ... (Navbar and Main content) ... */}
      <nav className="sticky top-0 z-50 glass-effect border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-red-500 p-2 rounded-lg shadow-sm">
              <Scissors className="text-white w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tight leading-none text-gray-900">
                공실뉴스AI <span className="text-red-500">스튜디오</span>
              </h1>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Studio Edition</span>
            </div>
          </div>
          <div className="flex gap-4 items-center">
            <button onClick={clearAll} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              초기화
            </button>
            
            {isBatchProcessing ? (
               <button 
                onClick={handleStopProcessing}
                className="flex items-center gap-2 px-6 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-full font-bold transition-all shadow-lg active:scale-95 animate-pulse border border-red-200"
              >
                <Square className="w-4 h-4 fill-current" />
                작업 중지
              </button>
            ) : (
              <div className="flex gap-2">
                 <button 
                  onClick={handleGenerateAllVideoPrompts}
                  disabled={segments.length === 0 || isAnyGenerating}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-black disabled:bg-gray-300 text-white rounded-full font-semibold transition-all shadow-sm active:scale-95 text-sm"
                >
                  {segments.some(s => s.isGeneratingVideoPrompt) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                  모션 프롬프트 전체 생성
                </button>
                <div className="w-px h-8 bg-gray-300 mx-2 self-center"></div>
                
                {inputMode === 'text' && (
                  <button 
                    onClick={handleGenerateVoices}
                    disabled={segments.length === 0 || isAnyGenerating}
                    className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-full font-semibold transition-all shadow-lg active:scale-95"
                  >
                    {segments.some(s => s.isGeneratingAudio) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic2 className="w-4 h-4" />}
                    음성 전체 생성
                  </button>
                )}
                
                <button 
                  onClick={handleGenerateImages}
                  disabled={segments.length === 0 || isAnyGenerating}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-full font-semibold transition-all shadow-lg active:scale-95"
                >
                  {segments.some(s => s.isGenerating) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  이미지 전체 생성
                </button>
              </div>
            )}

            {segments.length > 0 && (
              <>
                <div className="w-px h-8 bg-gray-300 mx-2 self-center"></div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <button 
                      onClick={handleDownloadImages} 
                      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                      title="이미지 저장"
                    >
                      <IconImage className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={handleDownloadAudio} 
                      className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-transparent hover:border-purple-100"
                      title="음성 저장"
                    >
                      <Music className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={handleDownloadVideoPrompts} 
                      className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                      title="모션 프롬프트 저장"
                    >
                      <FileText className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={handleDownloadVisualPrompts} 
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                      title="비주얼 이미지 프롬프트 저장 (TXT)"
                    >
                      <FileImage className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={handleDownloadSRT} 
                      className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-100"
                      title="자막(SRT) 저장"
                    >
                      <Captions className="w-5 h-5" />
                    </button>
                  </div>
                  <button 
                    onClick={handleExport} 
                    disabled={!isReadyToExport || isExporting || isExportingMp4}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm shadow-sm transition-all border ${isReadyToExport ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 hover:shadow-md' : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'}`}
                  >
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderDown className="w-4 h-4" />}
                    통합 저장 (Zip)
                  </button>
                  <div className="flex flex-col items-end z-10">
                    <button 
                      onClick={handleExportMp4} 
                      disabled={!isReadyToExport || isExporting || isExportingMp4}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm shadow-sm transition-all border ${isReadyToExport ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 hover:shadow-md' : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'}`}
                    >
                      {isExportingMp4 ? <Loader2 className="w-4 h-4 animate-spin" /> : <MonitorPlay className="w-4 h-4" />}
                      완성본 추출 (MP4)
                    </button>
                    {isExportingMp4 && exportMp4Progress && (
                      <span className="absolute top-20 text-[10px] text-red-600 font-bold mt-1 px-2 py-0.5 bg-red-50 rounded shadow-md border border-red-100 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">{exportMp4Progress}</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4 justify-between">
              <div className="flex items-center gap-2">
                <Layout className="w-5 h-5 text-indigo-600" />
                <h2 className="font-bold text-lg">소스 입력</h2>
              </div>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                 <button 
                    onClick={() => setInputMode('text')} 
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${inputMode === 'text' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}
                 >
                    텍스트 대본
                 </button>
                 <button 
                    onClick={() => setInputMode('srt')} 
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${inputMode === 'srt' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}
                 >
                    SRT 파일
                 </button>
                 <button 
                    onClick={() => setInputMode('audio')} 
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${inputMode === 'audio' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}
                 >
                    오디오 파일
                 </button>
              </div>
            </div>

            {inputMode === 'text' && (
              <>
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="공실 뉴스 대본을 입력해 주세요..."
                  className="w-full h-48 p-4 text-gray-800 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                />
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {segmentationOptions.map((opt) => (
                    <button
                      key={opt.mode}
                      onClick={() => setSegmentationMode(opt.mode as SegmentationMode)}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border transition-all ${
                        segmentationMode === opt.mode 
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700' 
                          : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {opt.icon}
                      <span className="text-[10px] font-bold">{opt.label}</span>
                    </button>
                  ))}
                </div>

                {segmentationMode !== 'single' && (
                  <div className="mt-3 flex items-center gap-3 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center gap-2 text-indigo-600">
                      <Scissors className="w-4 h-4" />
                      <span className="text-xs font-bold">클립 갯수</span>
                    </div>
                    <input 
                      type="number" 
                      min="0"
                      max="50"
                      value={targetClipCount || ''} 
                      onChange={(e) => setTargetClipCount(parseInt(e.target.value) || 0)}
                      placeholder="자동"
                      className="flex-1 bg-white border border-indigo-200 rounded-lg px-3 py-1 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-indigo-900"
                    />
                    <span className="text-[10px] text-indigo-400 font-medium">개 (0=자동)</span>
                  </div>
                )}

                <button
                  onClick={handleParse}
                  disabled={isParsing || !script.trim()}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-semibold disabled:opacity-50 transition-all active:scale-95"
                >
                  {isParsing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                  스크립트 분석
                </button>
              </>
            )}

            {inputMode === 'srt' && (
              <div className="space-y-4">
                 <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-gray-50 hover:bg-gray-100 transition-colors">
                     <Captions className="w-12 h-12 text-gray-300 mb-2"/>
                     <p className="text-sm font-bold text-gray-500 mb-2">SRT 자막 파일 업로드</p>
                     <input 
                        type="file" 
                        accept=".srt" 
                        onChange={handleSRTFileChange}
                        className="text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                     />
                 </div>
                 {uploadedSRT && (
                     <div className="bg-indigo-50 p-3 rounded-lg flex items-center gap-2">
                        <Check className="w-4 h-4 text-indigo-600"/>
                        <span className="text-xs font-bold text-indigo-900 truncate flex-1">{uploadedSRT.name}</span>
                        <span className="text-[10px] text-indigo-500">{(uploadedSRT.size / 1024).toFixed(2)} KB</span>
                     </div>
                 )}
                 <button
                  onClick={handleSRTAnalysis}
                  disabled={isParsing || !uploadedSRT}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-3 bg-indigo-900 hover:bg-black text-white rounded-xl font-semibold disabled:opacity-50 transition-all active:scale-95"
                >
                  {isParsing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Captions className="w-5 h-5" />}
                  SRT 분석 및 프롬프트 생성
                </button>
                <p className="text-[10px] text-gray-400 text-center">SRT 파일 내용을 기반으로 장면을 나누고<br/>AI가 비주얼 프롬프트를 자동 생성합니다.</p>
              </div>
            )}

            {inputMode === 'audio' && (
              <div className="space-y-4">
                 <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-gray-50 hover:bg-gray-100 transition-colors">
                     <FileAudio className="w-12 h-12 text-gray-300 mb-2"/>
                     <p className="text-sm font-bold text-gray-500 mb-2">MP3, WAV, M4A 파일 업로드</p>
                     <input 
                        type="file" 
                        accept="audio/*" 
                        onChange={handleAudioFileChange}
                        className="text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                     />
                 </div>
                 {uploadedAudio && (
                     <div className="bg-indigo-50 p-3 rounded-lg flex items-center gap-2">
                        <Check className="w-4 h-4 text-indigo-600"/>
                        <span className="text-xs font-bold text-indigo-900 truncate flex-1">{uploadedAudio.name}</span>
                        <span className="text-[10px] text-indigo-500">{(uploadedAudio.size / 1024 / 1024).toFixed(2)} MB</span>
                     </div>
                 )}
                 <button
                  onClick={handleAudioAnalysis}
                  disabled={isParsing || !uploadedAudio}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-3 bg-indigo-900 hover:bg-black text-white rounded-xl font-semibold disabled:opacity-50 transition-all active:scale-95"
                >
                  {isParsing ? <Loader2 className="w-5 h-5 animate-spin" /> : <AudioLines className="w-5 h-5" />}
                  오디오 분석 및 컷 편집
                </button>
                <p className="text-[10px] text-gray-400 text-center">AI가 음성을 분석하여 대본을 작성하고<br/>문장 단위로 오디오를 자동 분할합니다.</p>
              </div>
            )}
          </section>

          <section className={`bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 transition-opacity ${inputMode === 'audio' ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Volume2 className="w-5 h-5 text-purple-600" />
              <h2 className="font-bold text-lg">성우 설정</h2>
            </div>
            
            {/* ... (Existing Voice settings code) ... */}
            {inputMode === 'audio' && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-[1px] rounded-2xl">
                    <span className="bg-black/70 text-white px-3 py-1.5 rounded-full text-xs font-bold">오디오 파일 모드에서는 비활성화</span>
                </div>
            )}

            <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
              {(['google', 'elevenlabs', 'typecast'] as TTSProvider[]).map((prov) => (
                <button
                  key={prov}
                  onClick={() => setTtsProvider(prov)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                    ttsProvider === prov ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {prov === 'google' ? 'Google' : prov === 'elevenlabs' ? 'ElevenLabs' : 'Typecast'}
                </button>
              ))}
            </div>
            
            {/* GOOGLE SETTINGS */}
            {ttsProvider === 'google' && (
              <>
                <div className="mb-4">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-2">
                    <Key className="w-3 h-3" />GEMINI API KEY (필수)
                  </label>
                  <input 
                    type="password" 
                    value={geminiApiKey} 
                    onChange={(e) => setGeminiApiKeyLocal(e.target.value)} 
                    placeholder="AI Studio API Key 등록" 
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all" 
                  />
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {VOICE_OPTIONS.map((voice) => (
                    <button
                      key={voice.id}
                      onClick={() => setSelectedVoice(voice.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-4 ${
                        selectedVoice === voice.id ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-600' : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex-1 min-w-0"><p className="font-bold text-sm text-gray-900">{voice.label}</p><p className="text-xs text-gray-500 truncate">{voice.description}</p></div>
                      <div onClick={(e) => handlePreviewVoice(voice.id, e)} className={`p-2 rounded-full transition-all hover:bg-purple-100 flex items-center justify-center ${previewingVoiceId === voice.id ? 'bg-purple-200' : 'bg-gray-100'}`}>
                        {previewingVoiceId === voice.id ? <Loader2 className="w-4 h-4 text-purple-600 animate-spin" /> : <Play className="w-4 h-4 text-purple-600 fill-purple-600" />}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-3"><Zap className="w-4 h-4 text-amber-500" /><h3 className="font-bold text-sm text-gray-700">재생 속도</h3></div>
                  <div className="grid grid-cols-5 gap-1.5 p-1 bg-gray-50 rounded-xl border border-gray-100">
                    {SPEED_OPTIONS.map((option) => (
                      <button key={option.value} onClick={() => setSelectedSpeed(option.value)} className={`py-2 text-[11px] font-bold rounded-lg transition-all ${selectedSpeed === option.value ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100' : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'}`}>{option.label}</button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ELEVENLABS SETTINGS */}
            {ttsProvider === 'elevenlabs' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div><label className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-2"><Key className="w-3 h-3" />API KEY</label><input type="password" value={elevenLabsApiKey} onChange={(e) => setElevenLabsApiKey(e.target.value)} placeholder="xi-..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all" /></div>
                <div><label className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-2"><Mic2 className="w-3 h-3" />VOICE ID</label><input type="text" value={elevenLabsVoiceId} onChange={(e) => setElevenLabsVoiceId(e.target.value)} placeholder="Enter Voice ID" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all" /></div>
                <button onClick={(e) => handlePreviewVoice("eleven_test", e)} disabled={!elevenLabsApiKey || !elevenLabsVoiceId} className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-xl font-bold text-sm transition-all">{previewingVoiceId === "eleven_test" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}설정 테스트</button>
              </div>
            )}

            {/* TYPECAST SETTINGS */}
            {ttsProvider === 'typecast' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div>
                   <label className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-2">
                      <Key className="w-3 h-3" />API KEY
                   </label>
                   <input 
                      type="password" 
                      value={typecastApiKey} 
                      onChange={(e) => setTypecastApiKey(e.target.value)} 
                      placeholder="Typecast Access Token" 
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all" 
                   />
                </div>
                <div>
                   <label className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-2">
                      <UserCheck className="w-3 h-3" />ACTOR ID
                   </label>
                   <input 
                      type="text" 
                      value={typecastActorId} 
                      onChange={(e) => setTypecastActorId(e.target.value)} 
                      placeholder="e.g. 5e1234..." 
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all" 
                   />
                </div>
                <div>
                   <label className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-2">
                      <Smile className="w-3 h-3" />EMOTION (Optional)
                   </label>
                   <input 
                      type="text" 
                      value={typecastEmotion} 
                      onChange={(e) => setTypecastEmotion(e.target.value)} 
                      placeholder="e.g. normal-1, sad-1" 
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all" 
                   />
                   <p className="text-[10px] text-gray-400 mt-1 ml-1">* Leave empty for default 'normal-1'</p>
                </div>
                <button 
                  onClick={(e) => handlePreviewVoice("typecast_test", e)} 
                  disabled={!typecastApiKey || !typecastActorId} 
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-xl font-bold text-sm transition-all"
                >
                  {previewingVoiceId === "typecast_test" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
                  설정 테스트
                </button>
              </div>
            )}
            
            <div className="pt-4 border-t border-gray-100 space-y-3">
                 <button
                    onClick={handleGenerateFullScriptAudio}
                    disabled={isGeneratingFullAudio || !script.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    {isGeneratingFullAudio ? <Loader2 className="w-5 h-5 animate-spin"/> : <Mic2 className="w-5 h-5"/>}
                    전체 대본 오디오 생성
                 </button>

                 {fullAudioUrl && (
                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-indigo-900 flex items-center gap-2">
                                <Volume2 className="w-4 h-4"/> 전체 오디오 미리듣기
                            </span>
                             <button 
                                onClick={() => handleDownload(fullAudioUrl!, `full_script_audio.wav`)}
                                className="text-xs flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 bg-white px-2 py-1 rounded border border-indigo-100 shadow-sm"
                             >
                                <Download className="w-3 h-3"/> 다운로드
                             </button>
                        </div>
                        <audio controls src={fullAudioUrl} className="w-full h-8 accent-indigo-600" />
                    </div>
                 )}
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><IconImage className="w-5 h-5 text-indigo-600" /><h2 className="font-bold text-lg">이미지 스타일</h2></div>
            </div>
            
            <div className="flex bg-gray-100 p-1.5 rounded-xl mb-4">
              <button onClick={() => setAspectRatio("16:9")} className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 rounded-lg transition-all ${aspectRatio === "16:9" ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                <div className="flex items-center gap-1.5">
                  <Monitor className="w-4 h-4" />
                  <span className="font-black text-sm">16:9</span>
                </div>
                <span className="text-[10px] font-bold">롱폼</span>
              </button>
              <button onClick={() => setAspectRatio("1:1")} className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 rounded-lg transition-all ${aspectRatio === "1:1" ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                <div className="flex items-center gap-1.5">
                  <Box className="w-4 h-4" />
                  <span className="font-black text-sm">1:1</span>
                </div>
                <span className="text-[10px] font-bold">인스타</span>
              </button>
              <button onClick={() => setAspectRatio("9:16")} className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 rounded-lg transition-all ${aspectRatio === "9:16" ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  <span className="font-black text-sm">9:16</span>
                </div>
                <span className="text-[10px] font-bold">숏폼</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {STYLE_OPTIONS.map((style) => (
                <button key={style.id} onClick={() => setSelectedStyle(style.id)} className={`relative h-20 rounded-xl overflow-hidden border-2 transition-all ${selectedStyle === style.id ? 'border-indigo-600 scale-[1.02]' : 'border-transparent hover:border-gray-200'}`}><img src={style.thumbnail} className="w-full h-full object-cover opacity-60" alt={style.label} /><div className="absolute inset-0 bg-black/40 flex items-center justify-center p-1"><span className="text-white text-[10px] font-bold text-center">{style.label}</span></div></button>
              ))}
            </div>
          </section>
        </div>

        {/* ... (Right Column content with Segments) ... */}
        <div className="lg:col-span-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="bg-red-500 text-white p-1 rounded-full"><ChevronRight className="w-3 h-3 rotate-90" /></div>
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {segments.length === 0 && !isParsing ? (
            <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-gray-200 rounded-3xl bg-white shadow-inner">
              <div className="bg-gray-50 p-6 rounded-full mb-6"><History className="w-16 h-16 text-gray-200" /></div>
              <h3 className="text-gray-500 font-bold text-xl">대본을 입력하고 콘텐츠 소스를 만드세요</h3>
              <p className="text-gray-400 mt-2">이미지, 음성, 자막(SRT)이 한 번에 준비됩니다.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {segments.map((segment, index) => {
                const isBatchGenerating = activeGenIndex !== null;
                const isCurrentBatchItem = activeGenIndex === index;
                const showPaintingState = isCurrentBatchItem || (segment.isGenerating && !isBatchGenerating && !segment.generatedImageUrl);
                const showQueuedState = isBatchGenerating && segment.isGenerating && !isCurrentBatchItem;
                const showImageState = segment.generatedImageUrl && !showPaintingState && !showQueuedState;

                return (
                  <div key={segment.id} className="group/card">
                    {/* ... (Existing Segment Card UI) ... */}
                    <div className={`bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col transition-all duration-300 ${isCurrentBatchItem ? 'ring-2 ring-red-500 border-red-500 scale-[1.01]' : 'border-gray-100 hover:shadow-md'}`}>
                      <div className="flex flex-col md:flex-row">
                        <div className="md:w-3/5 p-6 flex flex-col justify-between">
                          <div className="space-y-6">
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="bg-red-50 text-red-600 text-[10px] font-black px-2 py-1 rounded">CLIP {index + 1}</span>
                                  {showPaintingState && <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 animate-pulse"><Sparkles className="w-3 h-3" /> 이미지 생성 중...</span>}
                                  {showQueuedState && <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400"><Clock className="w-3 h-3" /> 대기 중</span>}
                                </div>
                              </div>
                              <div className="relative group/textarea">
                                <textarea
                                  value={segment.narrative}
                                  onChange={(e) => handleNarrativeChange(segment.id, e.target.value)}
                                  onSelect={(e) => handleTextSelect(segment.id, e)}
                                  className="w-full bg-transparent border-b border-transparent hover:border-gray-200 focus:border-indigo-500 p-1 text-gray-800 text-lg leading-relaxed font-semibold focus:ring-0 resize-none outline-none transition-colors h-auto min-h-[3rem]"
                                  placeholder="내용을 입력하세요..."
                                  rows={Math.max(2, Math.ceil(segment.narrative.length / 30))}
                                />
                                <button 
                                  onClick={() => handleSplitSegment(index)}
                                  className="absolute right-0 bottom-0 opacity-0 group-hover/textarea:opacity-100 transition-opacity bg-white border border-gray-200 shadow-sm p-1.5 rounded-lg hover:bg-gray-50 text-gray-500"
                                  title="커서 위치에서 나누기"
                                >
                                  <Split className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div className="relative group/prompt">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 text-gray-400">
                                  <Wand2 className="w-3 h-3" />
                                  <span className="text-[10px] font-bold uppercase tracking-widest">Visual Image Prompt</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleGenerateVideoPrompt(segment.id)}
                                    disabled={segment.isGeneratingVideoPrompt || isAnyGenerating}
                                    className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all text-[10px] font-black uppercase tracking-tighter ${segment.videoPrompt ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-indigo-500 hover:bg-indigo-50'}`}
                                    title="비디오 모션 프롬프트 생성"
                                  >
                                    {segment.isGeneratingVideoPrompt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Video className="w-3 h-3" />}
                                    {segment.videoPrompt ? 'Update Motion' : 'Gen Motion'}
                                  </button>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-1 mb-2">
                                {[
                                  { type: 'auto', icon: <Sparkles className="w-3 h-3" />, label: '자동' },
                                  { type: 'background', icon: <Building2 className="w-3 h-3" />, label: '배경' },
                                  { type: 'character', icon: <User className="w-3 h-3" />, label: '인물' },
                                  { type: 'graph', icon: <BarChart className="w-3 h-3" />, label: '그래프' },
                                ].map((btn) => (
                                  <button
                                    key={btn.type}
                                    onClick={() => handleVisualTypeChange(segment.id, btn.type as VisualPromptType)}
                                    disabled={segment.isGeneratingPrompt || isAnyGenerating}
                                    className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-bold transition-all ${
                                      (segment.visualType || 'auto') === btn.type
                                        ? 'bg-blue-50 border-blue-200 text-blue-600'
                                        : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                                    }`}
                                  >
                                    {segment.isGeneratingPrompt && (segment.visualType || 'auto') === btn.type ? <Loader2 className="w-3 h-3 animate-spin" /> : btn.icon}
                                    {btn.label}
                                  </button>
                                ))}
                              </div>

                              <div className="relative">
                                <textarea
                                  value={segment.visualPrompt}
                                  onChange={(e) => handlePromptChange(segment.id, e.target.value)}
                                  className={`w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-500 focus:ring-2 focus:ring-red-500 outline-none transition-all resize-none h-24 ${segment.isGeneratingPrompt ? 'opacity-50' : ''}`}
                                  placeholder="이미지 생성 프롬프트..."
                                />
                                <button
                                  onClick={() => handleRegeneratePrompt(segment.id)}
                                  disabled={segment.isGeneratingPrompt || isAnyGenerating}
                                  className="absolute bottom-3 right-3 p-2 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:bg-red-50 transition-all text-red-500 disabled:opacity-50"
                                  title="현재 설정으로 재생성"
                                >
                                  {segment.isGeneratingPrompt ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>

                            {/* Video Prompt Result Section */}
                            {segment.videoPrompt && (
                              <div className="relative p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl animate-in slide-in-from-top-2">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2 text-indigo-600">
                                    <Video className="w-3 h-3" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Video Motion Prompt</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <button 
                                      onClick={() => handleGenerateVideoPrompt(segment.id)}
                                      disabled={segment.isGeneratingVideoPrompt || isAnyGenerating}
                                      className="flex items-center gap-1 text-[10px] font-bold text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                                      title="비디오 프롬프트 재생성"
                                    >
                                      {segment.isGeneratingVideoPrompt ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                    </button>
                                    <button 
                                      onClick={() => handleCopyVideoPrompt(segment.id, segment.videoPrompt!)}
                                      className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors"
                                    >
                                      {copiedId === segment.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                      {copiedId === segment.id ? 'Copied' : 'Copy'}
                                    </button>
                                  </div>
                                </div>
                                <p className="text-[11px] text-gray-600 leading-relaxed italic mb-3">"{segment.videoPrompt}"</p>
                                
                                <div className="flex gap-2 border-t border-indigo-100 pt-3">
                                  {[
                                    { name: 'Grok', url: 'https://grok.com/imagine' },
                                    { name: 'FX', url: 'https://labs.google/fx/ko' },
                                    { name: 'Gemini', url: 'http://gemini.google.com' },
                                    { name: 'ChatGPT', url: 'https://www.chatgpt.com' }
                                  ].map((link) => (
                                    <a 
                                      key={link.name} 
                                      href={link.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-indigo-50 border border-indigo-100 hover:border-indigo-300 rounded text-[10px] font-bold text-gray-500 hover:text-indigo-600 transition-all"
                                    >
                                      {link.name} <ExternalLink className="w-2 h-2" />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-8 pt-6 border-t border-gray-50">
                            {segment.generatedAudioUrl ? (
                              <div className="relative flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                {segment.generatedVoice && (
                                  <div className="absolute -top-2.5 left-3 bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200 z-10">
                                    {getVoiceLabel(segment.generatedVoice)}
                                  </div>
                                )}
                                <div className="bg-white p-3 rounded-full shadow-sm"><Play className="w-4 h-4 text-red-600 fill-red-600" /></div>
                                <audio controls src={segment.generatedAudioUrl} className="h-8 flex-1" />
                                
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleSingleVoiceGeneration(segment.id, segment.narrative)}
                                    disabled={segment.isGeneratingAudio || isAnyGenerating}
                                    className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-red-500 disabled:opacity-50"
                                    title="음성 다시 생성"
                                  >
                                    {segment.isGeneratingAudio ? <Loader2 className="w-5 h-5 animate-spin text-red-500" /> : <RefreshCw className="w-5 h-5" />}
                                  </button>

                                  <button
                                    onClick={() => handleDownload(segment.generatedAudioUrl!, `clip_${index + 1}_audio.wav`)}
                                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                                    title="오디오 다운로드"
                                  >
                                    <Download className="w-5 h-5 text-gray-600" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between px-2">
                                <span className="text-xs text-gray-400 italic">음성 준비 중...</span>
                                <button 
                                  onClick={() => handleSingleVoiceGeneration(segment.id, segment.narrative)}
                                  disabled={segment.isGeneratingAudio || isAnyGenerating || inputMode === 'audio'}
                                  className={`text-xs font-bold px-4 py-2 rounded-xl transition-all border flex items-center gap-2 active:scale-95 disabled:opacity-50 ${inputMode === 'audio' ? 'text-gray-400 border-gray-200 bg-gray-100 cursor-not-allowed' : 'text-red-600 hover:bg-red-50 border-red-100'}`}
                                >
                                  {segment.isGeneratingAudio ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mic2 className="w-3 h-3" />}
                                  음성 생성
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="md:w-2/5 flex flex-col border-l border-gray-100 bg-gray-50">
                          <div className={`relative flex-1 flex items-center justify-center overflow-hidden min-h-[300px] transition-colors duration-500 ${showPaintingState ? 'bg-red-50/50' : ''}`}>
                            {showImageState ? (
                              <div 
                                className="relative w-full h-full group cursor-zoom-in" 
                                onClick={() => setPreviewImage(segment.generatedImageUrl!)}
                              >
                                <img src={segment.generatedImageUrl} className="w-full h-full object-cover animate-in fade-in duration-700" alt={`Clip ${index + 1}`} />
                                
                                {/* INFO BADGE */}
                                {segment.generatedStyle && (
                                  <div className="absolute top-3 left-3 flex items-center gap-1.5 pointer-events-none z-10">
                                    <div className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm border border-white/10 flex items-center gap-1.5">
                                      <span>{getStyleShortLabel(segment.generatedStyle)}</span>
                                      <span className="w-0.5 h-2 bg-white/20 rounded-full"></span>
                                      <span>{getVisualTypeLabel(segment.generatedVisualType)}</span>
                                      <span className="w-0.5 h-2 bg-white/20 rounded-full"></span>
                                      <span>{segment.generatedAspectRatio}</span>
                                    </div>
                                  </div>
                                )}

                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-row items-center justify-center gap-4 backdrop-blur-[2px]">
                                  <button onClick={(e) => { e.stopPropagation(); handleGenerateSingleImage(segment.id); }} className="flex flex-col items-center gap-2 group/btn">
                                    <div className="p-4 bg-white/20 hover:bg-white/40 rounded-full text-white transition-transform group-hover/btn:scale-110"><RefreshCw className={`w-6 h-6 ${segment.isGenerating ? 'animate-spin' : ''}`} /></div>
                                    <span className="text-[10px] font-bold text-white tracking-widest uppercase text-center">장면<br/>재생성</span>
                                  </button>
                                  
                                  {/* Upload Button in Overlay */}
                                  <input
                                    type="file"
                                    id={`upload-replace-${segment.id}`}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(segment.id, e)}
                                  />
                                  <label
                                      htmlFor={`upload-replace-${segment.id}`}
                                      className="flex flex-col items-center gap-2 group/btn cursor-pointer"
                                      onClick={(e) => e.stopPropagation()}
                                  >
                                      <div className="p-4 bg-white/20 hover:bg-white/40 rounded-full text-white transition-transform group-hover/btn:scale-110">
                                          <Upload className="w-6 h-6" />
                                      </div>
                                      <span className="text-[10px] font-bold text-white tracking-widest uppercase text-center">이미지<br/>변경</span>
                                  </label>

                                  <button onClick={(e) => { e.stopPropagation(); handleDownload(segment.generatedImageUrl!, `clip_${index + 1}_image.png`); }} className="flex flex-col items-center gap-2 group/btn">
                                    <div className="p-4 bg-white/20 hover:bg-white/40 rounded-full text-white transition-transform group-hover/btn:scale-110"><Download className="w-6 h-6" /></div>
                                    <span className="text-[10px] font-bold text-white tracking-widest uppercase text-center">이미지<br/>저장</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-4 text-center p-8 w-full">
                                {showPaintingState ? (
                                  <div className="flex flex-col items-center w-full max-w-[200px]">
                                    <div className="relative mb-6"><div className="w-20 h-20 border-4 border-red-100 rounded-full animate-spin border-t-red-500" /><Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-red-500 animate-pulse" /></div>
                                    <span className="text-xs uppercase font-black tracking-widest text-red-600 mb-4 animate-bounce">AI 페인팅 중...</span>
                                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-gradient-to-r from-red-500 to-pink-500 animate-[loading_1.5s_infinite]" style={{ width: '40%' }} /></div>
                                  </div>
                                ) : showQueuedState ? (
                                  <div className="flex flex-col items-center opacity-60"><div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3"><Clock className="w-6 h-6 text-gray-300 animate-pulse" /></div><span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">대기 중</span></div>
                                ) : (
                                  <div className="flex flex-col items-center gap-3">
                                      <div className="bg-white p-5 rounded-full shadow-sm border border-gray-100"><IconImage className="w-10 h-10 text-gray-200" /></div>
                                      
                                      <div className="flex items-center gap-2">
                                          <button onClick={() => handleGenerateSingleImage(segment.id)} disabled={isAnyGenerating} className="text-xs font-black text-red-600 hover:bg-red-600 hover:text-white px-6 py-2.5 rounded-full border-2 border-red-100 hover:border-red-600 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50">
                                              <Sparkles className="w-3 h-3" />장면 생성
                                          </button>
                                          
                                          {/* Upload Button when Empty */}
                                          <input
                                            type="file"
                                            id={`upload-${segment.id}`}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => handleImageUpload(segment.id, e)}
                                          />
                                          <label
                                            htmlFor={`upload-${segment.id}`}
                                            className="text-xs font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-900 px-4 py-2.5 rounded-full border border-gray-200 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                                          >
                                            <Upload className="w-3 h-3" /> 업로드
                                          </label>
                                      </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {(showImageState || segment.generatedImageUrl) && (
                              <div className="p-3 bg-white border-t border-gray-100 animate-in slide-in-from-bottom-2 fade-in">
                                <div className="relative flex items-center">
                                  <input 
                                    type="text" 
                                    value={segment.modificationInput || ''}
                                    onChange={(e) => handleModificationInputChange(segment.id, e.target.value)}
                                    placeholder="이미지 수정 요청 (예: 글자 지워줘)"
                                    className="w-full pl-3 pr-10 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleGenerateSingleImage(segment.id);
                                    }}
                                  />
                                  <button 
                                    onClick={() => handleGenerateSingleImage(segment.id)}
                                    disabled={!segment.modificationInput?.trim() || isAnyGenerating}
                                    className="absolute right-1 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:bg-gray-300"
                                    title="수정 사항 반영하여 재생성"
                                  >
                                    <Wand2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-center items-center gap-2 -my-3 relative z-10 opacity-0 group-hover/card:opacity-100 transition-opacity py-1">
                       <button
                         onClick={() => handleAddSegment(index)}
                         className="bg-white border border-gray-200 text-gray-400 hover:text-green-600 hover:border-green-200 p-1.5 rounded-full shadow-sm transition-all hover:scale-110 active:scale-95 z-20"
                         title="새 클립 추가"
                       >
                         <Plus className="w-4 h-4" />
                       </button>

                       <button
                         onClick={() => handleDeleteSegment(index)}
                         className="bg-white border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 p-1.5 rounded-full shadow-sm transition-all hover:scale-110 active:scale-95 z-20"
                         title="클립 삭제"
                       >
                         <Minus className="w-4 h-4" />
                       </button>

                       {index < segments.length - 1 && (
                         <button
                           onClick={() => handleMergeSegment(index)}
                           className="bg-white border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 p-1.5 rounded-full shadow-sm transition-all hover:scale-110 active:scale-95 z-20"
                           title="아래 클립과 합치기"
                         >
                           <ArrowDownToLine className="w-4 h-4" />
                         </button>
                       )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Floating Manual Button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3">
        <button 
          onClick={() => batchInputRef.current?.click()}
          className="flex items-center gap-2 bg-white hover:bg-gray-50 text-indigo-900 border-2 border-indigo-900 px-5 py-3 rounded-full shadow-xl hover:scale-105 transition-all active:scale-95"
        >
          <FolderUp className="w-5 h-5" />
          <span className="font-bold">전체 이미지 컷 업로드</span>
        </button>
        <button 
          onClick={() => setShowManual(true)}
          className="flex items-center gap-2 bg-indigo-900 hover:bg-black text-white px-6 py-3 rounded-full shadow-2xl hover:scale-105 transition-all active:scale-95 border-2 border-indigo-400/30"
        >
          <BookOpen className="w-5 h-5 text-yellow-300" />
          <span className="font-bold">처음이신가요? 사용 설명서 보기</span>
        </button>
      </div>

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e5e7eb; border-radius: 20px; }`}</style>
    </div>
  );
};

export default App;

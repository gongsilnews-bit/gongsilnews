import React, { useState, useEffect, useRef } from 'react';
import { NewsSegment, AspectRatio } from '../types';
import {
  prepareTimeline,
  drawVideoFrame,
  renderAndExportVideo,
  SegmentTimeline,
  VideoRenderOptions,
} from '../services/videoService';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Film,
  Sparkles,
  Volume2,
  Type as TypeIcon,
  X,
  Smartphone,
  Monitor,
  CheckCircle,
} from 'lucide-react';

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  segments: NewsSegment[];
  initialAspectRatio?: AspectRatio;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  isOpen,
  onClose,
  segments,
  initialAspectRatio = '16:9',
}) => {
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(initialAspectRatio);
  const [showSubtitles, setShowSubtitles] = useState<boolean>(true);
  const [subtitleStyle, setSubtitleStyle] = useState<'shorts_yellow' | 'clean_white' | 'box_dark'>('shorts_yellow');
  const [enableMotion, setEnableMotion] = useState<boolean>(true);
  const [bgmType, setBgmType] = useState<'news_fast' | 'luxury_lounge' | 'none'>('news_fast');

  // Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [isLoadingAssets, setIsLoadingAssets] = useState<boolean>(true);
  const [loadingText, setLoadingText] = useState<string>('동영상 타임라인 로딩 중...');

  // Export State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportStatusText, setExportStatusText] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timelineRef = useRef<SegmentTimeline[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const animFrameIdRef = useRef<number | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const pauseOffsetRef = useRef<number>(0);

  // Initialize Timeline on Open or Segment change
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingAssets(true);
    setLoadingText('클립 이미지 및 음성 동기화 중...');
    setIsPlaying(false);
    pauseOffsetRef.current = 0;
    setCurrentTime(0);

    const init = async () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioCtxRef.current = audioCtx;

        const { timeline, totalDuration: duration } = await prepareTimeline(
          segments,
          audioCtx,
          (p, text) => {
            if (isMounted) setLoadingText(text);
          }
        );

        if (!isMounted) return;
        timelineRef.current = timeline;
        setTotalDuration(duration);
        setIsLoadingAssets(false);

        // Render First Frame
        requestAnimationFrame(() => renderCurrentFrame(0));
      } catch (err: any) {
        console.error(err);
        if (isMounted) {
          setLoadingText(err.message || '에셋을 로드할 수 없습니다.');
          setIsLoadingAssets(false);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
      stopAudio();
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isOpen, segments]);

  // Stop active audio nodes
  const stopAudio = () => {
    activeSourcesRef.current.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {}
    });
    activeSourcesRef.current = [];
  };

  // Play audio from current time
  const playAudioFrom = (time: number) => {
    stopAudio();
    const audioCtx = audioCtxRef.current;
    if (!audioCtx) return;

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const timeline = timelineRef.current;
    timeline.forEach(item => {
      if (item.audioBuffer) {
        // If segment is still in the future or currently playing
        if (time < item.endTime) {
          const source = audioCtx.createBufferSource();
          source.buffer = item.audioBuffer;
          source.connect(audioCtx.destination);

          const delay = Math.max(item.startTime - time, 0);
          const offset = Math.max(time - item.startTime, 0);
          const duration = item.duration - offset;

          if (duration > 0) {
            source.start(audioCtx.currentTime + delay, offset, duration);
            activeSourcesRef.current.push(source);
          }
        }
      }
    });
  };

  // Render Frame on Canvas
  const renderCurrentFrame = (time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isVertical = aspectRatio === '9:16';
    const width = isVertical ? 720 : 1280;
    const height = isVertical ? 1280 : 720;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const options: VideoRenderOptions = {
      aspectRatio,
      showSubtitles,
      subtitleStyle,
      enableMotion,
      bgmType,
    };

    drawVideoFrame(ctx, width, height, timelineRef.current, time, options);
  };

  // Animation Loop
  const startPlayback = () => {
    if (totalDuration === 0) return;

    setIsPlaying(true);
    const startTimestamp = performance.now();
    playbackStartTimeRef.current = startTimestamp - pauseOffsetRef.current * 1000;

    playAudioFrom(pauseOffsetRef.current);

    const loop = () => {
      const elapsed = (performance.now() - playbackStartTimeRef.current) / 1000;

      if (elapsed >= totalDuration) {
        pausePlayback(true);
        setCurrentTime(totalDuration);
        renderCurrentFrame(totalDuration);
        return;
      }

      setCurrentTime(elapsed);
      pauseOffsetRef.current = elapsed;
      renderCurrentFrame(elapsed);

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);
  };

  const pausePlayback = (resetToZero = false) => {
    setIsPlaying(false);
    stopAudio();
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (resetToZero) {
      pauseOffsetRef.current = 0;
      setCurrentTime(0);
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      pausePlayback();
    } else {
      if (currentTime >= totalDuration) {
        pauseOffsetRef.current = 0;
        setCurrentTime(0);
      }
      startPlayback();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    pausePlayback();
    pauseOffsetRef.current = newTime;
    setCurrentTime(newTime);
    renderCurrentFrame(newTime);
  };

  const handleExport = async () => {
    pausePlayback();
    setIsExporting(true);
    setExportProgress(0.05);
    setExportStatusText('비디오 렌더링 엔진 시작 중...');

    try {
      const blob = await renderAndExportVideo(segments, {
        aspectRatio,
        showSubtitles,
        subtitleStyle,
        enableMotion,
        bgmType,
        onProgress: (p, text) => {
          setExportProgress(p);
          setExportStatusText(text);
        },
      });

      // Trigger Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      a.download = `공실뉴스_동영상_${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert('비디오 렌더링 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  const isVertical = aspectRatio === '9:16';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#f4a71b]/20 text-[#f4a71b] rounded-lg">
              <Film className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                공실뉴스 완제품 동영상 렌더링 & 미리보기
                <span className="text-xs bg-[#f4a71b] text-black font-extrabold px-2 py-0.5 rounded-full">
                  AUTO VIDEO
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                AI 이미지 + 성우 음성 + Ken Burns 줌 모션 + 자막 자동 결합
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Video Canvas Preview */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-black/60 rounded-xl p-4 border border-gray-800 relative min-h-[380px]">
            {isLoadingAssets ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-10 h-10 border-4 border-[#f4a71b] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-semibold text-gray-300">{loadingText}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center w-full">
                {/* Canvas Screen */}
                <div
                  className={`relative rounded-lg overflow-hidden shadow-2xl border border-gray-700 bg-black flex items-center justify-center ${
                    isVertical ? 'w-[260px] h-[460px]' : 'w-full max-w-[540px] aspect-video'
                  }`}
                >
                  <canvas ref={canvasRef} className="w-full h-full object-contain" />
                </div>

                {/* Player Controls Bar */}
                <div className="w-full max-w-[540px] mt-4 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleTogglePlay}
                      className="p-2.5 bg-[#f4a71b] hover:bg-[#d9900d] text-black font-bold rounded-full transition shadow-md"
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                    </button>
                    <button
                      onClick={() => {
                        pausePlayback(true);
                        renderCurrentFrame(0);
                      }}
                      className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
                      title="처음으로"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <input
                      type="range"
                      min="0"
                      max={totalDuration || 1}
                      step="0.1"
                      value={currentTime}
                      onChange={handleSeek}
                      className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#f4a71b]"
                    />
                    <span className="text-xs font-mono text-gray-400 min-w-[70px] text-right">
                      {currentTime.toFixed(1)}s / {totalDuration.toFixed(1)}s
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Video Styling & Option Settings */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-5 bg-gray-800/40 p-5 rounded-xl border border-gray-700/60">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#f4a71b]" />
                영상 연출 & 스타일 설정
              </h3>

              {/* 1. Aspect Ratio */}
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-1.5 block">화면 비율 (플랫폼)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setAspectRatio('16:9');
                      requestAnimationFrame(() => renderCurrentFrame(currentTime));
                    }}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      aspectRatio === '16:9'
                        ? 'bg-[#f4a71b]/20 border-[#f4a71b] text-[#f4a71b]'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <Monitor className="w-4 h-4" />
                    16:9 유튜브 (가로)
                  </button>
                  <button
                    onClick={() => {
                      setAspectRatio('9:16');
                      requestAnimationFrame(() => renderCurrentFrame(currentTime));
                    }}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      aspectRatio === '9:16'
                        ? 'bg-[#f4a71b]/20 border-[#f4a71b] text-[#f4a71b]'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    9:16 쇼츠/릴스 (세로)
                  </button>
                </div>
              </div>

              {/* 2. Subtitle Options */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                    <TypeIcon className="w-3.5 h-3.5" />
                    쇼츠 자막 스타일
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showSubtitles}
                      onChange={(e) => {
                        setShowSubtitles(e.target.checked);
                        requestAnimationFrame(() => renderCurrentFrame(currentTime));
                      }}
                      className="rounded bg-gray-700 border-gray-600 text-[#f4a71b] focus:ring-0"
                    />
                    자막 표시
                  </label>
                </div>
                {showSubtitles && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'shorts_yellow', label: '쇼츠 옐로우 (추천)' },
                      { id: 'clean_white', label: '클린 화이트' },
                      { id: 'box_dark', label: '블랙 박스' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSubtitleStyle(item.id as any);
                          requestAnimationFrame(() => renderCurrentFrame(currentTime));
                        }}
                        className={`py-1.5 px-2 rounded border text-[11px] font-semibold transition ${
                          subtitleStyle === item.id
                            ? 'bg-[#f4a71b]/20 border-[#f4a71b] text-[#f4a71b]'
                            : 'bg-gray-800 border-gray-700 text-gray-400'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Motion Effect */}
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-1.5 block">카메라 연출 (모션)</label>
                <button
                  onClick={() => {
                    setEnableMotion(!enableMotion);
                    requestAnimationFrame(() => renderCurrentFrame(currentTime));
                  }}
                  className={`w-full py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition ${
                    enableMotion
                      ? 'bg-[#f4a71b]/20 border-[#f4a71b] text-[#f4a71b]'
                      : 'bg-gray-800 border-gray-700 text-gray-400'
                  }`}
                >
                  <span>Ken Burns 시네마틱 줌인/패닝</span>
                  <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded font-mono">
                    {enableMotion ? '활성화 (ON)' : '정지 (OFF)'}
                  </span>
                </button>
              </div>

              {/* 4. Background Music */}
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5" />
                  배경음악 (BGM)
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'news_fast', label: '⚡ 긴장감 뉴스' },
                    { id: 'luxury_lounge', label: '🏙️ 세련된 투자' },
                    { id: 'none', label: '음악 없음' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setBgmType(item.id as any)}
                      className={`py-1.5 px-2 rounded border text-[11px] font-semibold transition ${
                        bgmType === item.id
                          ? 'bg-[#f4a71b]/20 border-[#f4a71b] text-[#f4a71b]'
                          : 'bg-gray-800 border-gray-700 text-gray-400'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Export Section */}
            <div className="pt-4 border-t border-gray-700/80">
              {isExporting ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-300 font-semibold">
                    <span>{exportStatusText}</span>
                    <span>{Math.round(exportProgress * 100)}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#f4a71b] transition-all duration-200"
                      style={{ width: `${exportProgress * 100}%` }}
                    ></div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleExport}
                  disabled={isLoadingAssets || timelineRef.current.length === 0}
                  className="w-full py-3.5 px-4 bg-[#f4a71b] hover:bg-[#d9900d] text-black font-extrabold text-sm rounded-xl transition shadow-lg flex items-center justify-center gap-2 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5" />
                  완제품 동영상 렌더링 & 다운로드 (MP4)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerModal;

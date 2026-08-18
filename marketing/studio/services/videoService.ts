import { NewsSegment, AspectRatio } from '../types';

export interface VideoRenderOptions {
  aspectRatio: AspectRatio;
  showSubtitles?: boolean;
  subtitleStyle?: 'shorts_yellow' | 'clean_white' | 'box_dark';
  enableMotion?: boolean;
  bgmType?: 'news_fast' | 'luxury_lounge' | 'peaceful' | 'none';
  bgmVolume?: number;
  onProgress?: (progress: number, statusText: string) => void;
}

export interface SegmentTimeline {
  segment: NewsSegment;
  image: HTMLImageElement;
  audioBuffer?: AudioBuffer;
  duration: number;
  startTime: number;
  endTime: number;
}

/**
 * Loads an image from URL/Base64 into an HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Decodes audio from URL/Blob into an AudioBuffer using AudioContext
 */
async function loadAudioBuffer(audioUrl: string, audioCtx: AudioContext | OfflineAudioContext): Promise<AudioBuffer> {
  const response = await fetch(audioUrl);
  const arrayBuffer = await response.arrayBuffer();
  return await audioCtx.decodeAudioData(arrayBuffer);
}

/**
 * Generates a simple royalty-free ambient synth BGM beat via Web Audio API if needed
 */
function generateSynthBgm(ctx: AudioContext | OfflineAudioContext, duration: number, style: string): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.ceil(sampleRate * duration);
  const buffer = ctx.createBuffer(2, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const chords = style === 'news_fast' 
    ? [220, 261.63, 329.63, 392] // Am7
    : [261.63, 329.63, 392, 523.25]; // Cmaj7

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const chordIndex = Math.floor(t / 2.0) % chords.length;
    const freq = chords[chordIndex];
    
    // Smooth ambient drone + subtle rhythm pulse
    const beatPulse = Math.sin(2 * Math.PI * 2 * t);
    const wave = Math.sin(2 * Math.PI * freq * t) * 0.05 * (0.8 + 0.2 * beatPulse);
    const subWave = Math.sin(2 * Math.PI * (freq / 2) * t) * 0.04;
    
    left[i] = (wave + subWave) * 0.6;
    right[i] = (wave + subWave) * 0.6;
  }

  return buffer;
}

/**
 * Prepares all assets and calculates durations for each segment
 */
export async function prepareTimeline(
  segments: NewsSegment[],
  audioCtx: AudioContext,
  onProgress?: (progress: number, text: string) => void
): Promise<{ timeline: SegmentTimeline[]; totalDuration: number }> {
  const validSegments = segments.filter(s => s.generatedImageUrl);
  if (validSegments.length === 0) {
    throw new Error("동영상을 생성하려면 최소 1개 이상의 클립에 이미지가 있어야 합니다.");
  }

  const timeline: SegmentTimeline[] = [];
  let currentTime = 0;

  for (let i = 0; i < validSegments.length; i++) {
    const seg = validSegments[i];
    onProgress?.((i / validSegments.length) * 0.3, `클립 ${i + 1}/${validSegments.length} 리소스 로딩 중...`);

    // 1. Load Image
    let img: HTMLImageElement;
    try {
      img = await loadImage(seg.generatedImageUrl!);
    } catch (e) {
      console.warn(`클립 ${i + 1} 이미지 로드 실패, 대체 이미지 사용`, e);
      img = new Image();
    }

    // 2. Load Audio & Measure Duration
    let audioBuffer: AudioBuffer | undefined;
    let segDuration = 4.0; // fallback duration in seconds

    if (seg.generatedAudioUrl) {
      try {
        audioBuffer = await loadAudioBuffer(seg.generatedAudioUrl, audioCtx);
        segDuration = Math.max(audioBuffer.duration, 2.5);
      } catch (e) {
        console.warn(`클립 ${i + 1} 오디오 로드 실패, 기본 4초 설정`, e);
      }
    }

    timeline.push({
      segment: seg,
      image: img,
      audioBuffer,
      duration: segDuration,
      startTime: currentTime,
      endTime: currentTime + segDuration,
    });

    currentTime += segDuration;
  }

  return { timeline, totalDuration: currentTime };
}

/**
 * Draws a single video frame onto the 2D canvas with Ken Burns Motion and Subtitles
 */
export function drawVideoFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeline: SegmentTimeline[],
  currentTime: number,
  options: VideoRenderOptions
) {
  // Find current active segment
  let activeIndex = timeline.findIndex(
    item => currentTime >= item.startTime && currentTime < item.endTime
  );
  if (activeIndex === -1) {
    activeIndex = timeline.length - 1;
  }

  const active = timeline[activeIndex];
  if (!active) return;

  const segProgress = Math.min(
    Math.max((currentTime - active.startTime) / active.duration, 0),
    1
  );

  // === 1. Background Clear ===
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // === 2. Image Rendering with Ken Burns Motion ===
  const img = active.image;
  if (img && img.complete && img.naturalWidth > 0) {
    let scale = 1.0;
    let panX = 0;
    let panY = 0;

    if (options.enableMotion !== false) {
      // Alternate between Zoom In, Zoom Out, and Pan
      const motionMode = activeIndex % 3;
      if (motionMode === 0) {
        // Smooth Zoom In: 1.0 -> 1.15
        scale = 1.0 + segProgress * 0.15;
      } else if (motionMode === 1) {
        // Smooth Zoom Out: 1.15 -> 1.0
        scale = 1.15 - segProgress * 0.15;
      } else {
        // Slow Pan: 1.10 zoom with horizontal shift
        scale = 1.10;
        panX = (segProgress - 0.5) * 40;
      }
    }

    const imgAspect = img.naturalWidth / img.naturalHeight;
    const canvasAspect = width / height;

    let drawW = width * scale;
    let drawH = height * scale;

    if (imgAspect > canvasAspect) {
      drawH = height * scale;
      drawW = drawH * imgAspect;
    } else {
      drawW = width * scale;
      drawH = drawW / imgAspect;
    }

    const drawX = (width - drawW) / 2 + panX;
    const drawY = (height - drawH) / 2 + panY;

    ctx.save();
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();
  }

  // === 3. Top & Bottom Cinematic Vignette Gradient ===
  const gradH = height * 0.25;
  const topGrad = ctx.createLinearGradient(0, 0, 0, gradH);
  topGrad.addColorStop(0, 'rgba(0,0,0,0.6)');
  topGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, width, gradH);

  const bottomGrad = ctx.createLinearGradient(0, height - gradH, 0, height);
  bottomGrad.addColorStop(0, 'rgba(0,0,0,0)');
  bottomGrad.addColorStop(1, 'rgba(0,0,0,0.75)');
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, height - gradH, width, gradH);

  // === 4. Brand Watermark Badge ===
  ctx.save();
  ctx.fillStyle = '#f4a71b';
  ctx.font = `bold ${Math.max(width * 0.024, 18)}px 'Inter', sans-serif`;
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 6;
  ctx.fillText('공실뉴스 AI 스튜디오', width * 0.05, height * 0.06);
  ctx.restore();

  // === 5. Subtitle Rendering ===
  if (options.showSubtitles !== false && active.segment.narrative) {
    const text = active.segment.narrative.trim();
    const isVertical = height > width; // 9:16 Shorts
    const fontSize = isVertical ? Math.max(width * 0.052, 28) : Math.max(height * 0.048, 26);
    
    ctx.save();
    ctx.font = `bold ${fontSize}px 'Inter', 'Noto Sans KR', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Word wrap text into max 2 lines
    const maxTextWidth = width * 0.88;
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > maxTextWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    // Subtitle Position
    const lineHeight = fontSize * 1.35;
    const totalTextH = lines.length * lineHeight;
    const baseY = height * (isVertical ? 0.78 : 0.85) - totalTextH / 2;

    // Draw Subtitle Background Box or Glow
    lines.forEach((line, idx) => {
      const lineY = baseY + idx * lineHeight;
      const lineMetrics = ctx.measureText(line);
      const boxW = lineMetrics.width + 36;
      const boxH = fontSize * 1.4;

      if (options.subtitleStyle === 'box_dark') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.beginPath();
        ctx.roundRect((width - boxW) / 2, lineY - boxH / 2, boxW, boxH, 8);
        ctx.fill();
      }

      // Stroke Outline (High contrast black outline)
      ctx.lineWidth = Math.max(fontSize * 0.2, 5);
      ctx.strokeStyle = '#000000';
      ctx.strokeText(line, width / 2, lineY);

      // Fill Color
      if (options.subtitleStyle === 'shorts_yellow' || !options.subtitleStyle) {
        ctx.fillStyle = '#FFE600'; // Eye-catching shorts yellow
      } else {
        ctx.fillStyle = '#FFFFFF';
      }
      ctx.fillText(line, width / 2, lineY);
    });

    ctx.restore();
  }
}

/**
 * Merges all audio clips and background music into a single AudioBuffer / MediaStream
 */
export async function createMasterAudioTrack(
  timeline: SegmentTimeline[],
  totalDuration: number,
  options: VideoRenderOptions
): Promise<AudioNode> {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const dest = audioCtx.createMediaStreamDestination();

  // 1. Schedule Voice Audio Clips
  for (const item of timeline) {
    if (item.audioBuffer) {
      const source = audioCtx.createBufferSource();
      source.buffer = item.audioBuffer;
      source.connect(dest);
      source.start(audioCtx.currentTime + item.startTime);
    }
  }

  // 2. Schedule BGM
  if (options.bgmType && options.bgmType !== 'none') {
    try {
      const bgmBuffer = generateSynthBgm(audioCtx, totalDuration, options.bgmType);
      const bgmSource = audioCtx.createBufferSource();
      bgmSource.buffer = bgmBuffer;

      const bgmGain = audioCtx.createGain();
      bgmGain.gain.value = options.bgmVolume ?? 0.15;

      bgmSource.connect(bgmGain);
      bgmGain.connect(dest);
      bgmSource.start(audioCtx.currentTime);
    } catch (e) {
      console.warn("BGM 생성 건너뜀", e);
    }
  }

  return dest;
}

/**
 * Complete Video Rendering & Export to MP4 / WebM Blob
 */
export async function renderAndExportVideo(
  segments: NewsSegment[],
  options: VideoRenderOptions
): Promise<Blob> {
  const isVertical = options.aspectRatio === '9:16';
  const width = isVertical ? 1080 : 1920;
  const height = isVertical ? 1920 : 1080;

  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  options.onProgress?.(0.05, "비디오 에셋 및 타임라인 계산 중...");
  const { timeline, totalDuration } = await prepareTimeline(segments, audioCtx, options.onProgress);

  // Setup Hidden Offscreen Canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error("Canvas context를 생성할 수 없습니다.");

  // Audio Destination Setup
  const dest = audioCtx.createMediaStreamDestination();
  
  for (const item of timeline) {
    if (item.audioBuffer) {
      const source = audioCtx.createBufferSource();
      source.buffer = item.audioBuffer;
      source.connect(dest);
      source.start(audioCtx.currentTime + item.startTime);
    }
  }

  if (options.bgmType && options.bgmType !== 'none') {
    const bgmBuffer = generateSynthBgm(audioCtx, totalDuration, options.bgmType);
    const bgmSource = audioCtx.createBufferSource();
    bgmSource.buffer = bgmBuffer;
    const bgmGain = audioCtx.createGain();
    bgmGain.gain.value = options.bgmVolume ?? 0.15;
    bgmSource.connect(bgmGain);
    bgmGain.connect(dest);
    bgmSource.start(audioCtx.currentTime);
  }

  // Combine Canvas Video Stream + Audio Track
  const videoStream = canvas.captureStream(30);
  const combinedStream = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...dest.stream.getAudioTracks()
  ]);

  // Determine Supported MIME Type
  let mimeType = 'video/mp4;codecs=avc1,mp4a.40.2';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }
  }

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 6000000 // 6 Mbps high quality
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      resolve(blob);
    };
    recorder.onerror = (e) => reject(e);
  });

  recorder.start(100);

  // Playback Loop for Recording
  const startTime = performance.now();
  const fps = 30;
  const frameInterval = 1000 / fps;

  await new Promise<void>((resolve) => {
    const renderLoop = () => {
      const elapsed = (performance.now() - startTime) / 1000;

      if (elapsed >= totalDuration) {
        drawVideoFrame(ctx, width, height, timeline, totalDuration - 0.01, options);
        recorder.stop();
        resolve();
        return;
      }

      drawVideoFrame(ctx, width, height, timeline, elapsed, options);

      const progress = 0.3 + (elapsed / totalDuration) * 0.68;
      options.onProgress?.(
        progress,
        `비디오 프레임 인코딩 중... (${elapsed.toFixed(1)}s / ${totalDuration.toFixed(1)}s)`
      );

      setTimeout(renderLoop, frameInterval);
    };

    renderLoop();
  });

  const finalBlob = await recordingPromise;
  options.onProgress?.(1.0, "동영상 렌더링 완료!");
  return finalBlob;
}

import JSZip from 'jszip';
import { NewsSegment, ImageStyle } from '../types';
import { constructFullPrompt, getStyleDescription } from './geminiService';

interface ExportAsset {
  id: string;
  imageFileName: string;
  audioFileName: string;
  imageBlob: Blob;
  audioBlob: Blob;
  duration: number; // in seconds
  narrative: string;
  videoPrompt?: string;
  visualPrompt?: string;
  styleDescription?: string;
}

// === Utility Functions ===
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  }).toUpperCase();
};

const formatSRTTime = (seconds: number): string => {
  const pad = (num: number, size: number) => num.toString().padStart(size, '0');
  
  const totalMs = Math.floor(seconds * 1000);
  const ms = totalMs % 1000;
  const totalSeconds = Math.floor(seconds);
  const ss = totalSeconds % 60;
  const mm = Math.floor(totalSeconds / 60) % 60;
  const hh = Math.floor(totalSeconds / 3600);

  return `${pad(hh, 2)}:${pad(mm, 2)}:${pad(ss, 2)},${pad(ms, 3)}`;
};

const generateSRT = (assets: ExportAsset[]): string => {
  const FPS = 30;
  let srt = '';
  let currentFrame = 0;

  assets.forEach((asset, index) => {
    // Quantize duration to frames to match NLE behavior (like generatePremiereXML)
    // Audio duration is typically treated as the minimum constraint. 
    // Images are extended to the nearest frame boundary (Math.ceil).
    const durationFrames = Math.ceil(asset.duration * FPS);
    
    // Calculate precise start and end times derived from frame count
    const startSeconds = currentFrame / FPS;
    const endSeconds = (currentFrame + durationFrames) / FPS;

    const startTime = formatSRTTime(startSeconds);
    const endTime = formatSRTTime(endSeconds);
    
    srt += `${index + 1}\n${startTime} --> ${endTime}\n${asset.narrative}\n\n`;
    
    currentFrame += durationFrames;
  });
  return srt;
};

const generateVideoPromptsTxt = (assets: ExportAsset[]): string => {
  return assets.map((asset, index) => {
    return `[Clip ${index + 1}]\r\nScene: ${asset.narrative}\r\nStyle: ${asset.styleDescription || "N/A"}\r\nMotion Prompt: ${asset.videoPrompt || "N/A"}\r\n----------------------------------------\r\n`;
  }).join('\r\n');
};

const generateVisualPromptsTxt = (assets: ExportAsset[]): string => {
  return assets.map((asset, index) => {
    return `[Clip ${index + 1}]\r\nNarrative: ${asset.narrative}\r\nStyle: ${asset.styleDescription || "N/A"}\r\nVisual Prompt: ${asset.visualPrompt || "N/A"}\r\n-----------------------------------\r\n`;
  }).join('\r\n');
};

// === Premiere Pro XML (FCP XML) Generator ===
const generatePremiereXML = (assets: ExportAsset[]): string => {
  const frameRate = 30;
  let currentTimeFrames = 0;

  const clipsXML = assets.map((asset, index) => {
    const durationFrames = Math.ceil(asset.duration * frameRate);
    const start = currentTimeFrames;
    const end = currentTimeFrames + durationFrames;
    
    const xml = `
        <clipitem id="clipitem-${index}">
          <name>${asset.imageFileName}</name>
          <duration>${durationFrames}</duration>
          <rate>
            <timebase>${frameRate}</timebase>
            <ntsc>FALSE</ntsc>
          </rate>
          <start>${start}</start>
          <end>${end}</end>
          <in>0</in>
          <out>${durationFrames}</out>
          <file id="file-${index}-v">
            <name>${asset.imageFileName}</name>
            <pathurl>file://localhost/${asset.imageFileName}</pathurl>
            <media>
              <video>
                <samplecharacteristics>
                  <width>1920</width>
                  <height>1080</height>
                </samplecharacteristics>
              </video>
            </media>
          </file>
        </clipitem>`;
    
    currentTimeFrames = end;
    return xml;
  }).join('');

  currentTimeFrames = 0;
  const audioClipsXML = assets.map((asset, index) => {
    const durationFrames = Math.ceil(asset.duration * frameRate);
    const start = currentTimeFrames;
    const end = currentTimeFrames + durationFrames;

    const xml = `
        <clipitem id="clipitem-audio-${index}">
          <name>${asset.audioFileName}</name>
          <duration>${durationFrames}</duration>
          <rate>
            <timebase>${frameRate}</timebase>
            <ntsc>FALSE</ntsc>
          </rate>
          <start>${start}</start>
          <end>${end}</end>
          <in>0</in>
          <out>${durationFrames}</out>
          <file id="file-${index}-a">
            <name>${asset.audioFileName}</name>
            <pathurl>file://localhost/${asset.audioFileName}</pathurl>
            <media>
              <audio>
                <samplecharacteristics>
                  <samplerate>24000</samplerate>
                  <depth>16</depth>
                </samplecharacteristics>
                <channelcount>1</channelcount>
              </audio>
            </media>
          </file>
        </clipitem>`;
    
    currentTimeFrames = end;
    return xml;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<xmeml version="5">
  <sequence id="sequence-1">
    <name>Gongsil News Sequence</name>
    <duration>${currentTimeFrames}</duration>
    <rate>
      <timebase>${frameRate}</timebase>
      <ntsc>FALSE</ntsc>
    </rate>
    <media>
      <video>
        <format>
          <samplecharacteristics>
            <width>1920</width>
            <height>1080</height>
            <pixelaspectratio>square</pixelaspectratio>
            <rate>
              <timebase>${frameRate}</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
          </samplecharacteristics>
        </format>
        <track>
          ${clipsXML}
        </track>
      </video>
      <audio>
        <track>
          ${audioClipsXML}
        </track>
      </audio>
    </media>
  </sequence>
</xmeml>`;
};

// === CapCut Draft Generators ===
const generateDraftContent = (assets: ExportAsset[]) => {
  const currentTimeUs = Date.now() * 1000;
  const content: any = {
    "canvas_config": { "background": null, "height": 1080, "ratio": "original", "width": 1920 },
    "color_space": -1,
    "config": {
      "adjust_max_index": 1, "attachment_info": [], "combination_max_index": 1, "export_range": null, "extract_audio_last_index": 1,
      "lyrics_recognition_id": "", "lyrics_sync": true, "lyrics_taskinfo": [], "maintrack_adsorb": true, "material_save_mode": 0,
      "multi_language_current": "none", "multi_language_list": [], "multi_language_main": "none", "multi_language_mode": "none",
      "original_sound_last_index": 1, "record_audio_last_index": 1, "sticker_max_index": 1, "subtitle_keywords_config": null,
      "subtitle_recognition_id": "", "subtitle_sync": true, "subtitle_taskinfo": [], "system_font_list": [], "use_float_render": false, "video_mute": false, "zoom_info_params": null
    },
    "cover": null, "create_time": currentTimeUs, "draft_type": "video", "duration": 0, "extra_info": null, "fps": 30.0, "free_render_index_mode_on": false, "group_container": null, "id": generateUUID(), "is_drop_frame_timecode": false, "keyframe_graph_list": [],
    "keyframes": { "adjusts": [], "audios": [], "effects": [], "filters": [], "handwrites": [], "stickers": [], "texts": [], "videos": [] },
    "last_modified_platform": { "app_id": 359289, "app_source": "cc", "app_version": "7.8.0", "device_id": "web_exporter", "hard_disk_id": "", "mac_address": "", "os": "windows", "os_version": "10.0" },
    "lyrics_effects": [],
    "materials": {
      "ai_translates": [], "audio_balances": [], "audio_effects": [], "audio_fades": [], "audio_pannings": [], "audio_pitch_shifts": [], "audio_track_indexes": [], "audios": [], "beats": [], "canvases": [], "chromas": [], "color_curves": [], "common_mask": [], "digital_human_model_dressing": [], "digital_humans": [], "drafts": [], "effects": [], "flowers": [], "green_screens": [], "handwrites": [], "hsl": [], "hsl_curves": [], "images": [], "log_color_wheels": [], "loudnesses": [], "manual_beautys": [], "manual_deformations": [], "material_animations": [], "material_colors": [], "multi_language_refs": [], "placeholder_infos": [], "placeholders": [], "plugin_effects": [], "primary_color_wheels": [], "realtime_denoises": [], "shapes": [], "smart_crops": [], "smart_relights": [], "sound_channel_mappings": [], "speeds": [], "stickers": [], "tail_leaders": [], "text_templates": [], "texts": [], "time_marks": [], "transitions": [], "video_effects": [], "video_radius": [], "video_shadows": [], "video_strokes": [], "video_trackings": [], "videos": [], "vocal_beautifys": [], "vocal_separations": []
    },
    "mutable_config": null, "name": "", "new_version": "153.0.0", "path": "", "platform": { "app_id": 359289, "app_source": "cc", "app_version": "7.8.0", "device_id": "web_exporter", "hard_disk_id": "", "mac_address": "", "os": "windows", "os_version": "10.0" },
    "relationships": [], "render_index_track_mode_on": true, "retouch_cover": null, "smart_ads_info": { "draft_url": "", "page_from": "", "routine": "" }, "source": "default", "static_cover_image_path": "", "time_marks": null, "tracks": [], "uneven_animation_template_info": { "composition": "", "content": "", "order": "", "sub_template_info_list": [] }, "update_time": currentTimeUs, "version": 360000
  };

  const videoTrack = { "attribute": 0, "flag": 0, "id": generateUUID(), "is_default_name": true, "name": "", "segments": [] as any[], "type": "video" };
  const audioTrack = { "attribute": 0, "flag": 0, "id": generateUUID(), "is_default_name": true, "name": "", "segments": [] as any[], "type": "audio" };

  let timelineCursor = 0;
  assets.forEach((asset) => {
    const durationUs = Math.floor(asset.duration * 1000000);
    const videoMaterialId = generateUUID();
    const audioMaterialId = generateUUID();

    content.materials.videos.push({
      "aigc_type": "none", "audio_fade": null, "cartoon_path": "", "category_id": "", "category_name": "local", "check_flag": 1, "crop": { "lower_left_x": 0.0, "lower_left_y": 1.0, "lower_right_x": 1.0, "lower_right_y": 1.0, "upper_left_x": 0.0, "upper_left_y": 0.0, "upper_right_x": 1.0, "upper_right_y": 0.0 }, "crop_ratio": "free", "crop_scale": 1.0, "duration": 10800000000, "extra_info": null, "file_Path": asset.imageFileName, "height": 1080, "id": videoMaterialId, "import_time": Date.now(), "import_time_ms": Date.now(), "md5": "", "material_name": asset.imageFileName, "name": asset.imageFileName, "path": asset.imageFileName, "type": "photo", "width": 1920
    });

    content.materials.audios.push({
      "app_extra": "", "category_id": "", "category_name": "local", "check_flag": 1, "copyright_check_info": null, "create_time": Date.now(), "duration": durationUs, "extra_info": null, "file_Path": asset.audioFileName, "height": 0, "id": audioMaterialId, "import_time": Date.now(), "import_time_ms": Date.now(), "md5": "", "name": asset.audioFileName, "path": asset.audioFileName, "type": "extract_music", "width": 0
    });

    videoTrack.segments.push({
      "cartoon": false, "clip": { "alpha": 1.0, "flip": { "horizontal": false, "vertical": false }, "rotation": 0.0, "scale": { "x": 1.0, "y": 1.0 }, "transform": { "x": 0.0, "y": 0.0 } }, "common_keyframes": [], "enable_adjust": true, "enable_color_curves": true, "enable_color_wheels": true, "enable_lut": true, "enable_smart_color_adjust": false, "extra_material_refs": [], "group_id": "", "hdr_settings": null, "id": generateUUID(), "intensifies_audio": false, "is_placeholder": false, "is_tone_modify": false, "keyframe_refs": [], "last_nonzero_volume": 1.0, "material_id": videoMaterialId, "render_index": 0, "reverse": false, "source_timerange": { "duration": durationUs, "start": 0 }, "speed": 1.0, "target_timerange": { "duration": durationUs, "start": timelineCursor }, "template_id": "", "template_scene": "default", "track_attribute": 0, "track_render_index": 0, "visible": true, "volume": 1.0
    });

    audioTrack.segments.push({
      "cartoon": false, "clip": { "alpha": 1.0, "flip": { "horizontal": false, "vertical": false }, "rotation": 0.0, "scale": { "x": 1.0, "y": 1.0 }, "transform": { "x": 0.0, "y": 0.0 } }, "common_keyframes": [], "enable_adjust": true, "enable_color_curves": true, "enable_color_wheels": true, "enable_lut": true, "enable_smart_color_adjust": false, "extra_material_refs": [], "group_id": "", "hdr_settings": null, "id": generateUUID(), "intensifies_audio": false, "is_placeholder": false, "is_tone_modify": false, "keyframe_refs": [], "last_nonzero_volume": 1.0, "material_id": audioMaterialId, "render_index": 0, "reverse": false, "source_timerange": { "duration": durationUs, "start": 0 }, "speed": 1.0, "target_timerange": { "duration": durationUs, "start": timelineCursor }, "template_id": "", "template_scene": "default", "track_attribute": 0, "track_render_index": 0, "visible": true, "volume": 1.0
    });
    
    timelineCursor += durationUs;
  });

  content.tracks.push(videoTrack);
  content.tracks.push(audioTrack);
  content.duration = timelineCursor;

  return JSON.stringify(content, null, 2);
};

const getAudioDuration = (blob: Blob): Promise<number> => {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      resolve(audio.duration);
      URL.revokeObjectURL(url);
    };
    audio.onerror = () => {
      console.warn("Failed to get audio duration, defaulting to 5s");
      resolve(5); 
    }
  });
};

const getBlobFromUrl = async (url: string): Promise<Blob> => {
  const res = await fetch(url);
  return await res.blob();
};

const downloadZip = async (zip: JSZip, filename: string) => {
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const exportImagesOnly = async (segments: NewsSegment[]) => {
    const zip = new JSZip();
    for (let i = 0; i < segments.length; i++) {
        const s = segments[i];
        if (!s.generatedImageUrl) continue;
        const blob = await getBlobFromUrl(s.generatedImageUrl);
        // Detect extension from MIME type or default to png
        const ext = blob.type === 'image/jpeg' ? 'jpg' : 'png';
        zip.file(`clip_${i+1}_image.${ext}`, blob);
    }
    await downloadZip(zip, 'Gongsil_News_Images.zip');
};

export const exportAudioOnly = async (segments: NewsSegment[]) => {
    const zip = new JSZip();
    for (let i = 0; i < segments.length; i++) {
        const s = segments[i];
        if (!s.generatedAudioUrl) continue;
        const blob = await getBlobFromUrl(s.generatedAudioUrl);
        zip.file(`clip_${i+1}_audio.wav`, blob);
    }
    await downloadZip(zip, 'Gongsil_News_Audio.zip');
};

export const exportVideoPromptsOnly = async (segments: NewsSegment[], selectedStyle?: ImageStyle) => {
    const assets: ExportAsset[] = segments.map((s, i) => ({
        id: s.id,
        imageFileName: '',
        audioFileName: '',
        imageBlob: new Blob(),
        audioBlob: new Blob(),
        duration: 0,
        narrative: s.narrative,
        videoPrompt: s.videoPrompt,
        styleDescription: getStyleDescription(s.generatedStyle || selectedStyle || ImageStyle.REALISTIC)
    }));
    
    const txt = generateVideoPromptsTxt(assets);
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'video_prompts.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportVisualPromptsOnly = async (segments: NewsSegment[], style: ImageStyle) => {
    const content = segments.map((s, i) => {
        const styleDesc = getStyleDescription(s.generatedStyle || style);
        return `[Clip ${i+1}]\r\nNarrative: ${s.narrative}\r\nStyle: ${styleDesc}\r\nVisual Prompt: ${s.visualPrompt}\r\n-----------------------------------\r\n`;
    }).join('\r\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'visual_prompts.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportSRTOnly = async (segments: NewsSegment[]) => {
    // Need durations. We can estimate or try to fetch if audio exists
    // If audio exists, better to use it. If not, estimate based on text length.
    const assets: ExportAsset[] = [];
    for (let i = 0; i < segments.length; i++) {
        const s = segments[i];
        let duration = 3; // default
        if (s.generatedAudioUrl) {
            try {
                const blob = await getBlobFromUrl(s.generatedAudioUrl);
                duration = await getAudioDuration(blob);
            } catch (e) { console.error(e); }
        } else {
             duration = Math.max(2, s.narrative.length * 0.2);
        }
        
        assets.push({
            id: s.id,
            imageFileName: '',
            audioFileName: '',
            imageBlob: new Blob(),
            audioBlob: new Blob(),
            duration: duration,
            narrative: s.narrative
        });
    }
    
    const srt = generateSRT(assets);
    const blob = new Blob([srt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'subtitles.srt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportToCapCut = async (segments: NewsSegment[]) => {
  const zip = new JSZip();
  const assets: ExportAsset[] = [];

  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    if (!s.generatedImageUrl || !s.generatedAudioUrl) continue;

    const imageBlob = await getBlobFromUrl(s.generatedImageUrl);
    const audioBlob = await getBlobFromUrl(s.generatedAudioUrl);
    const duration = await getAudioDuration(audioBlob);
    
    // Determine extension for image (usually png from base64 or blob)
    const imageExt = imageBlob.type.includes('jpeg') ? 'jpg' : 'png';
    const audioExt = 'wav'; 

    const imageFileName = `clip_${i+1}_image.${imageExt}`;
    const audioFileName = `clip_${i+1}_audio.${audioExt}`;

    zip.file(imageFileName, imageBlob);
    zip.file(audioFileName, audioBlob);

    assets.push({
        id: s.id,
        imageFileName,
        audioFileName,
        imageBlob,
        audioBlob,
        duration,
        narrative: s.narrative,
        videoPrompt: s.videoPrompt,
        visualPrompt: s.visualPrompt,
        styleDescription: s.generatedStyle ? getStyleDescription(s.generatedStyle) : undefined
    });
  }

  const draftContent = generateDraftContent(assets);
  zip.file('draft_content.json', draftContent);

  const premiereXML = generatePremiereXML(assets);
  zip.file('project.xml', premiereXML);

  const srt = generateSRT(assets);
  zip.file('subtitles.srt', srt);
  
  const videoPrompts = generateVideoPromptsTxt(assets);
  zip.file('video_prompts.txt', videoPrompts);

  const visualPrompts = generateVisualPromptsTxt(assets);
  zip.file('visual_prompts.txt', visualPrompts);

  await downloadZip(zip, 'Gongsil_News_CapCut_Project.zip');
};

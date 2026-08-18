
export interface NewsSegment {
  id: string;
  originalText: string;
  narrative: string;
  visualPrompt: string;
  videoPrompt?: string;
  generatedImageUrl?: string;
  generatedAudioUrl?: string;
  isGenerating?: boolean;
  isGeneratingAudio?: boolean;
  isGeneratingPrompt?: boolean;
  isGeneratingVideoPrompt?: boolean;
  visualType?: VisualPromptType;
  modificationInput?: string;
  generatedStyle?: ImageStyle;
  generatedAspectRatio?: AspectRatio;
  generatedVisualType?: VisualPromptType;
  generatedVoice?: string;
}

export type VisualPromptType = 'auto' | 'background' | 'character' | 'graph' | 'modification';

export enum ImageStyle {
  REALISTIC = 'Realistic Photography',
  CARTOON = 'Vibrant Cartoon',
  ANIME = 'Modern Anime',
  OIL_PAINTING = 'Classic Oil Painting',
  CYBERPUNK = 'Cyberpunk Digital Art',
  WATERCOLOR = 'Soft Watercolor',
  // New Korean YouTube Trends
  FLAT_ILLUSTRATION = 'Flat Vector Illustration',
  ISO_3D = '3D Isometric Clay',
  RETRO_FILM = 'Vintage Film Photography',
  LINE_ART = 'Minimal Line Art',
  // New Requested Styles
  PIXAR = '3D Pixar Style',
  DISNEY = 'Disney Animation',
  JAPANESE_ANIME = 'Japanese Anime',
  GHIBLI = 'Studio Ghibli',
  // Custom Character Style
  GONGSILI = 'Gongsili Cartoon',
  PSYCHOLOGY = 'Psychology Style'
}

export interface StyleOption {
  id: ImageStyle;
  label: string;
  description: string;
  thumbnail: string;
}

export interface VoiceOption {
  id: string;
  label: string;
  description: string;
  gender: 'Male' | 'Female' | 'Neutral';
}

export type TTSProvider = 'google' | 'elevenlabs' | 'typecast';

export type SegmentationMode = 'standard' | 'balanced' | 'detailed' | 'single';

export type AspectRatio = '16:9' | '1:1' | '9:16';

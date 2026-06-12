// =============================================================================
// Frontend TypeScript Types
// =============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  userId: string;
  youtubeUrl: string;
  youtubeId?: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  duration?: number;
  status: ProjectStatus;
  metadata?: Record<string, unknown>;
  videoPath?: string;
  audioPath?: string;
  createdAt: string;
  updatedAt: string;
  analysis?: Analysis;
  clips?: Clip[];
  exports?: Export[];
  _count?: { clips: number; exports: number };
}

export type ProjectStatus =
  | 'PENDING' | 'DOWNLOADING' | 'DOWNLOADED' | 'ANALYZING'
  | 'ANALYZED' | 'GENERATING_CLIPS' | 'CLIPS_READY'
  | 'EXPORTING' | 'COMPLETED' | 'FAILED';

export interface Analysis {
  id: string;
  projectId: string;
  status: AnalysisStatus;
  progress: number;
  transcript?: { text: string; segments: TranscriptSegment[] };
  scenes?: Scene[];
  audioData?: AudioData;
  error?: string;
  moments?: Moment[];
  createdAt: string;
}

export type AnalysisStatus =
  | 'PENDING' | 'EXTRACTING_FRAMES' | 'DETECTING_SCENES'
  | 'TRANSCRIBING' | 'DETECTING_ACTIONS' | 'SCORING_MOMENTS'
  | 'COMPLETED' | 'FAILED';

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  confidence: number;
}

export interface Scene {
  start: number;
  end: number;
  duration: number;
}

export interface AudioData {
  beats: number[];
  energy: Array<{ time: number; level: number }>;
  tempo: number;
}

export interface Moment {
  id: string;
  analysisId: string;
  type: MomentType;
  startTime: number;
  endTime: number;
  score: number;
  confidence: number;
  description?: string;
  thumbnailPath?: string;
  metadata?: Record<string, unknown>;
}

export type MomentType =
  | 'GOAL' | 'SKILL' | 'CELEBRATION' | 'CROWD_REACTION'
  | 'FUNNY_MOMENT' | 'LAST_MINUTE_ACTION' | 'SAVE'
  | 'FOUL' | 'PENALTY' | 'FREE_KICK' | 'HIGHLIGHT' | 'OTHER';

export interface Clip {
  id: string;
  projectId: string;
  presetType: ClipPreset;
  title?: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: ClipStatus;
  filePath?: string;
  effects?: ClipEffects;
  captions?: TranscriptSegment[];
  hashtags?: string[];
  aiTitle?: string;
  aiDescription?: string;
  order: number;
  createdAt: string;
}

export type ClipPreset = 'SHORT_15' | 'SHORT_30' | 'HIGHLIGHT_60' | 'CUSTOM';
export type ClipStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';

export interface ClipEffects {
  autoZoom: boolean;
  dynamicCrop: boolean;
  slowMotion: boolean;
  slowMotionFactor: number;
  transitions: 'none' | 'fade' | 'dissolve' | 'wipe';
  captions: boolean;
  scoreboard: boolean;
  musicTrack?: string;
}

export interface Export {
  id: string;
  projectId: string;
  clipId: string;
  format: 'MP4' | 'WEBM' | 'MOV';
  resolution: string;
  quality: string;
  status: ExportStatus;
  progress: number;
  filePath?: string;
  fileSize?: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
  project?: { title: string; thumbnail: string };
  clip?: { presetType: string; duration: number };
}

export type ExportStatus =
  | 'PENDING' | 'RENDERING' | 'ENCODING' | 'UPLOADING' | 'COMPLETED' | 'FAILED';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

// =============================================================================
// Editor Store - Zustand State Management
// =============================================================================
// Manages the state of the timeline editor: clips, playback, effects.
// =============================================================================

import { create } from 'zustand';
import type { Clip, ClipEffects } from '@/types/project';

interface EditorState {
  // Timeline state
  clips: Clip[];
  selectedClipId: string | null;
  playheadPosition: number; // In seconds
  isPlaying: boolean;
  zoom: number; // Timeline zoom level 1-5

  // Actions
  setClips: (clips: Clip[]) => void;
  selectClip: (clipId: string | null) => void;
  setPlayheadPosition: (position: number) => void;
  togglePlayback: () => void;
  setZoom: (zoom: number) => void;
  reorderClips: (fromIndex: number, toIndex: number) => void;
  updateClipEffects: (clipId: string, effects: Partial<ClipEffects>) => void;
  removeClip: (clipId: string) => void;
}

/**
 * Zustand store for the video timeline editor.
 * Manages clip ordering, selection, playback state, and effects.
 */
export const useEditorStore = create<EditorState>((set, get) => ({
  clips: [],
  selectedClipId: null,
  playheadPosition: 0,
  isPlaying: false,
  zoom: 2,

  setClips: (clips) => set({ clips }),

  selectClip: (clipId) => set({ selectedClipId: clipId }),

  setPlayheadPosition: (position) => set({ playheadPosition: position }),

  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setZoom: (zoom) => set({ zoom: Math.max(1, Math.min(5, zoom)) }),

  reorderClips: (fromIndex, toIndex) => {
    set((state) => {
      const newClips = [...state.clips];
      const [moved] = newClips.splice(fromIndex, 1);
      newClips.splice(toIndex, 0, moved);
      // Update order values
      return {
        clips: newClips.map((clip, i) => ({ ...clip, order: i })),
      };
    });
  },

  updateClipEffects: (clipId, effects) => {
    set((state) => ({
      clips: state.clips.map((clip) =>
        clip.id === clipId
          ? { ...clip, effects: { ...(clip.effects || {}), ...effects } as ClipEffects }
          : clip,
      ),
    }));
  },

  removeClip: (clipId) => {
    set((state) => ({
      clips: state.clips.filter((c) => c.id !== clipId),
      selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId,
    }));
  },
}));

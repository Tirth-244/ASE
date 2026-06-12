'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Play,
  Pause,
  Download,
  Loader2,
  Settings,
  Scissors,
  Wand2,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { formatDuration } from '@/lib/utils';
import type { Project, Clip } from '@/types/project';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any;

export default function PreviewEditorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const projectId = params.id as string;
  const clipId = searchParams.get('clipId');
  
  const [project, setProject] = useState<Project | null>(null);
  const [clip, setClip] = useState<Clip | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [playing, setPlaying] = useState(false);
  
  // Settings state
  const [template, setTemplate] = useState('Default');
  const [resolution, setResolution] = useState('1080x1920');
  const [quality, setQuality] = useState('high');

  const playerRef = useRef<any>(null);

  useEffect(() => {
    fetchData();
  }, [projectId, clipId]);

  const fetchData = async () => {
    try {
      const { data } = await api.get(`/projects/${projectId}`);
      setProject(data.data);
      
      if (clipId) {
        const foundClip = data.data.clips?.find((c: Clip) => c.id === clipId);
        if (foundClip) {
          setClip(foundClip);
          if ((foundClip as any).template) {
            setTemplate((foundClip as any).template);
          }
        }
      }
    } catch (error: any) {
      console.error(error);
      const message = error?.response?.data?.message || error?.message || 'Failed to load project';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!clip) return;
    
    setExporting(true);
    try {
      // First update the clip template if changed
      if ((clip as any).template !== template) {
        await api.put(`/clips/${clip.id}`, { template });
      }
      
      // Then start the export job
      await api.post(`/clips/${clip.id}/export`, {
        format: 'MP4',
        resolution,
        quality,
      });
      
      toast.success('Export started successfully!');
      router.push(`/dashboard/projects/${projectId}/export`);
    } catch (error: any) {
      console.error(error);
      const message = error?.response?.data?.message || error?.message || 'Export failed';
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };

  if (loading || !project) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent-purple" />
      </div>
    );
  }

  if (!clip) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold mb-4">Clip not found</h2>
        <Link href={`/dashboard/projects/${projectId}`} className="btn-primary">
          Back to Project
        </Link>
      </div>
    );
  }

  // Use the original project video for preview if clip path is not accessible directly from frontend, 
  // and seek to the clip start time. Wait, if the video is local file path from backend, we can't play it directly.
  // Ideally, the backend should serve the video file via a static route or stream endpoint.
  // For now, we will assume we have a stream URL.
  const streamUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/projects/${projectId}/stream${clipId ? `?clipId=${clipId}` : ''}`;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/projects/${projectId}`}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Export Preview</h1>
          <p className="text-gray-400 text-sm mt-1">{clip.presetType.replace('_', ' ')} Clip Preview</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor & Preview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card overflow-hidden">
            <div className="relative aspect-[9/16] max-h-[600px] mx-auto bg-black flex items-center justify-center">
              <ReactPlayer
                ref={playerRef}
                url={streamUrl}
                playing={playing}
                controls={false}
                width="100%"
                height="100%"
                style={{ objectFit: 'contain' }}
                onReady={() => {
                  if (playerRef.current) {
                    playerRef.current.seekTo(clip.startTime);
                  }
                }}
                onProgress={(state: any) => {
                  if (state.playedSeconds >= clip.endTime) {
                    setPlaying(false);
                    playerRef.current?.seekTo(clip.startTime);
                  }
                }}
              />
              
              {/* Overlay UI when paused */}
              {!playing && (
                <div 
                  className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer"
                  onClick={() => setPlaying(true)}
                >
                  <div className="w-16 h-16 rounded-full bg-accent-purple/90 flex items-center justify-center backdrop-blur-md hover:bg-accent-purple transition-colors">
                    <Play className="w-8 h-8 text-white ml-1" />
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-white/5 bg-dark-800">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setPlaying(!playing)}
                  className="p-2 rounded-full hover:bg-white/10 text-white"
                >
                  {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Scissors className="w-4 h-4" />
                  {formatDuration(clip.startTime)} - {formatDuration(clip.endTime)} 
                  <span className="text-accent-purple font-mono ml-2">({clip.duration.toFixed(1)}s)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Sidebar */}
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-accent-cyan" />
              Export Settings
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Style Template</label>
                <div className="relative">
                  <Wand2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <select
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                    className="input-field pl-10 w-full"
                  >
                    <option value="Default">Default Style</option>
                    <option value="TikTok Viral">TikTok Viral</option>
                    <option value="Instagram Reels">Instagram Reels</option>
                    <option value="Phonk Edit">Phonk Edit</option>
                    <option value="Sports Hype">Sports Hype</option>
                    <option value="Cinematic">Cinematic</option>
                    <option value="Fast Cut">Fast Cut</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Resolution</label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="1080x1920">1080x1920 (Vertical HD)</option>
                  <option value="720x1280">720x1280 (Vertical SD)</option>
                  <option value="1920x1080">1920x1080 (Horizontal HD)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Quality</label>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="high">High (Recommended)</option>
                  <option value="ultra">Ultra (Max Quality, Larger File)</option>
                  <option value="medium">Medium (Faster Render)</option>
                </select>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/5">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Starting Export...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Render Final Video
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

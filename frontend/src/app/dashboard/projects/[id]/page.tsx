'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Wand2,
  Scissors,
  Play,
  Download,
  Sparkles,
  Clock,
  TrendingUp,
  Film,
  Loader2,
  AlertCircle,
  Zap,
  Hash,
  Type,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { formatDuration, getStatusConfig, cn } from '@/lib/utils';
import type { Project, Moment, Clip } from '@/types/project';

/** Moment type display config */
const momentTypeConfig: Record<string, { color: string; emoji: string }> = {
  GOAL: { color: 'text-green-400', emoji: '⚽' },
  SKILL: { color: 'text-purple-400', emoji: '✨' },
  CELEBRATION: { color: 'text-yellow-400', emoji: '🎉' },
  CROWD_REACTION: { color: 'text-blue-400', emoji: '👏' },
  FUNNY_MOMENT: { color: 'text-pink-400', emoji: '😂' },
  LAST_MINUTE_ACTION: { color: 'text-red-400', emoji: '⏰' },
  SAVE: { color: 'text-cyan-400', emoji: '🧤' },
  HIGHLIGHT: { color: 'text-orange-400', emoji: '🔥' },
  OTHER: { color: 'text-gray-400', emoji: '📌' },
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'moments' | 'clips' | 'editor'>('overview');
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingClips, setGeneratingClips] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('SHORT_30');
  const [selectedTemplate, setSelectedTemplate] = useState('Default');
  const [exporting, setExporting] = useState<string | null>(null);

  // Fetch project data
  useEffect(() => {
    fetchProject();
    // Poll for updates while processing
    const interval = setInterval(() => {
      if (project && ['DOWNLOADING', 'ANALYZING', 'GENERATING_CLIPS', 'EXPORTING'].includes(project.status)) {
        fetchProject();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const { data } = await api.get(`/projects/${projectId}`);
      setProject(data.data);
    } catch (error: any) {
      console.error(error);
      const message = error?.response?.data?.message || error?.message || JSON.stringify(error, null, 2);
      toast.error(message);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await api.post(`/projects/${projectId}/analyze`);
      toast.success('Analysis started! This may take a few minutes.');
      fetchProject();
    } catch (error: any) {
      console.error(error);
      const message = error?.response?.data?.message || error?.message || JSON.stringify(error, null, 2);
      toast.error(message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateClips = async () => {
    setGeneratingClips(true);
    try {
      await api.post(`/projects/${projectId}/clips`, {
        preset: selectedPreset,
        template: selectedTemplate,
        effects: {
          autoZoom: true,
          dynamicCrop: true,
          captions: true,
          transitions: 'fade',
        },
      });
      toast.success('Clips are being generated!');
      fetchProject();
    } catch (error: any) {
      console.error(error);
      const message = error?.response?.data?.message || error?.message || JSON.stringify(error, null, 2);
      toast.error(message);
    } finally {
      setGeneratingClips(false);
    }
  };

  const handleExport = async (clipId: string) => {
    setExporting(clipId);
    try {
      await api.post(`/clips/${clipId}/export`, {
        format: 'MP4',
        resolution: '1080x1920',
        quality: 'high',
      });
      toast.success('Export started!');
      fetchProject();
    } catch (error: any) {
      console.error(error);
      const message = error?.response?.data?.message || error?.message || JSON.stringify(error, null, 2);
      toast.error(message);
    } finally {
      setExporting(null);
    }
  };

  if (loading || !project) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent-purple" />
      </div>
    );
  }

  const statusConfig = getStatusConfig(project.status);
  const moments = project.analysis?.moments || [];
  const clips = project.clips || [];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Film },
    { id: 'moments', label: `Moments (${moments.length})`, icon: Zap },
    { id: 'clips', label: `Clips (${clips.length})`, icon: Scissors },
    { id: 'editor', label: 'Timeline', icon: Play },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Back + Header ───────────────────────────── */}
      <div className="flex items-start gap-4">
        <Link
          href="/dashboard"
          className="mt-1 p-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{project.title || 'Untitled Project'}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={statusConfig.className}>{statusConfig.label}</span>
            {project.duration && (
              <span className="text-sm text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(project.duration)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Video Preview Card ──────────────────────── */}
      <div className="glass-card overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Thumbnail */}
          <div className="relative w-full md:w-80 aspect-video md:aspect-auto shrink-0">
            {project.thumbnail ? (
              <img
                src={project.thumbnail}
                alt={project.title || 'Video'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-48 bg-dark-800 flex items-center justify-center">
                <Film className="w-12 h-12 text-gray-600" />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-6 flex-1 flex flex-col justify-between">
            {/* Analysis progress */}
            {project.analysis && project.analysis.status !== 'COMPLETED' && project.analysis.status !== 'FAILED' && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-accent-purple">
                    {project.analysis.status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm text-gray-400">{project.analysis.progress}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${project.analysis.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action buttons based on current status */}
            <div className="flex flex-wrap gap-3">
              {project.status === 'PENDING' && (
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="btn-primary flex items-center gap-2"
                  id="analyze-btn"
                >
                  {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  Start AI Analysis
                </button>
              )}

              {project.status === 'ANALYZED' && (
                <>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedPreset}
                      onChange={(e) => setSelectedPreset(e.target.value)}
                      className="input-field !w-auto text-sm"
                      id="preset-select"
                    >
                      <option value="SHORT_15">15s Short</option>
                      <option value="SHORT_30">30s Short</option>
                      <option value="HIGHLIGHT_60">60s Highlight</option>
                    </select>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="input-field !w-auto text-sm"
                      id="template-select"
                    >
                      <option value="Default">Default Style</option>
                      <option value="TikTok Viral">TikTok Viral</option>
                      <option value="Instagram Reels">Instagram Reels</option>
                      <option value="Phonk Edit">Phonk Edit</option>
                      <option value="Sports Hype">Sports Hype</option>
                      <option value="Cinematic">Cinematic</option>
                      <option value="Fast Cut">Fast Cut</option>
                      <option value="Minimal">Minimal</option>
                      <option value="Neon Glow">Neon Glow</option>
                      <option value="Velocity Edit">Velocity Edit</option>
                    </select>
                    <button
                      onClick={handleGenerateClips}
                      disabled={generatingClips}
                      className="btn-primary flex items-center gap-2"
                      id="generate-clips-btn"
                    >
                      {generatingClips ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
                      Generate Clips
                    </button>
                  </div>
                </>
              )}

              {['ANALYZING', 'DOWNLOADING', 'GENERATING_CLIPS'].includes(project.status) && (
                <div className="flex items-center gap-2 text-accent-purple">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">Processing...</span>
                </div>
              )}

              {project.status === 'FAILED' && (
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Processing failed. Try again.</span>
                  <button onClick={handleAnalyze} className="btn-secondary text-sm !px-4 !py-1.5">
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5',
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab Content ─────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-card p-6 space-y-4"
          >
            <h3 className="text-lg font-semibold">Video Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-400">URL:</span> <a href={project.youtubeUrl} target="_blank" className="text-accent-cyan hover:underline ml-2 break-all">{project.youtubeUrl}</a></div>
              <div><span className="text-gray-400">Duration:</span> <span className="ml-2">{project.duration ? formatDuration(project.duration) : 'N/A'}</span></div>
              <div><span className="text-gray-400">Status:</span> <span className={`ml-2 ${statusConfig.className}`}>{statusConfig.label}</span></div>
              <div><span className="text-gray-400">Created:</span> <span className="ml-2">{new Date(project.createdAt).toLocaleDateString()}</span></div>
            </div>

            {/* Transcript preview */}
            {project.analysis?.transcript && (
              <div className="mt-6">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-accent-cyan" /> Transcript
                </h4>
                <div className="bg-dark-800/50 rounded-xl p-4 max-h-40 overflow-y-auto text-sm text-gray-300 leading-relaxed">
                  {(project.analysis.transcript as any).text || 'No transcript available'}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'moments' && (
          <motion.div
            key="moments"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {moments.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Sparkles className="w-10 h-10 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No moments detected yet. Run AI analysis first.</p>
              </div>
            ) : (
              moments.map((moment, i) => {
                const config = momentTypeConfig[moment.type] || momentTypeConfig.OTHER;
                return (
                  <motion.div
                    key={moment.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card p-4 flex items-center gap-4"
                  >
                    <span className="text-2xl">{config.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-semibold ${config.color}`}>
                          {moment.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDuration(moment.startTime)} - {formatDuration(moment.endTime)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 truncate">
                        {moment.description || 'Exciting moment detected'}
                      </p>
                    </div>
                    {/* Score bar */}
                    <div className="w-20 shrink-0">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <TrendingUp className="w-3 h-3 text-accent-cyan" />
                        <span className="font-mono">{(moment.score * 100).toFixed(0)}%</span>
                      </div>
                      <div className="progress-bar !h-1.5">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${moment.score * 100}%` }}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}

        {activeTab === 'clips' && (
          <motion.div
            key="clips"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {clips.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Scissors className="w-10 h-10 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No clips generated yet. Analyze the video and generate clips.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {clips.map((clip) => (
                  <div key={clip.id} className="glass-card p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-sm">
                          {clip.presetType.replace('_', ' ')} Clip
                        </h4>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDuration(clip.startTime)} → {formatDuration(clip.endTime)}
                          <span className="ml-2">({clip.duration.toFixed(1)}s)</span>
                        </p>
                      </div>
                      <span className={getStatusConfig(clip.status).className}>
                        {getStatusConfig(clip.status).label}
                      </span>
                    </div>

                    {/* Effects tags */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {clip.effects && Object.entries(clip.effects as unknown as Record<string, unknown>)
                        .filter(([_, v]) => v === true)
                        .map(([key]) => (
                          <span key={key} className="px-2 py-0.5 rounded bg-white/5 text-xs text-gray-400 border border-white/5">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        ))}
                    </div>

                    {/* Export button */}
                    {clip.status === 'READY' && (
                      <Link
                        href={`/dashboard/projects/${projectId}/export/preview?clipId=${clip.id}`}
                        className="btn-primary w-full text-sm flex items-center justify-center gap-2"
                        id={`export-clip-${clip.id}`}
                      >
                        <Play className="w-4 h-4" />
                        Preview & Export
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'editor' && (
          <motion.div
            key="editor"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Preview area */}
            <div className="glass-card overflow-hidden">
              <div className="aspect-[9/16] max-h-[500px] mx-auto bg-dark-800 flex items-center justify-center">
                <div className="text-center">
                  <Play className="w-16 h-16 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Preview Player</p>
                  <p className="text-gray-500 text-xs mt-1">Select a clip to preview</p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Film className="w-4 h-4 text-accent-purple" />
                  Timeline
                </h3>
                <span className="text-xs text-gray-500">
                  {clips.length} clips · {formatDuration(clips.reduce((sum, c) => sum + c.duration, 0))} total
                </span>
              </div>

              {/* Timeline tracks */}
              <div className="space-y-2">
                {clips.length === 0 ? (
                  <div className="timeline-track flex items-center justify-center text-sm text-gray-500">
                    No clips on timeline — generate clips first
                  </div>
                ) : (
                  <div className="relative">
                    {/* Time ruler */}
                    <div className="h-6 flex items-end border-b border-white/5 mb-2">
                      {[...Array(10)].map((_, i) => (
                        <div key={i} className="flex-1 text-center">
                          <span className="text-[10px] text-gray-600">{i * 3}s</span>
                        </div>
                      ))}
                    </div>

                    {/* Video track */}
                    <div className="timeline-track p-1 flex gap-1">
                      {clips.map((clip, i) => (
                        <div
                          key={clip.id}
                          className="timeline-clip"
                          style={{
                            width: `${Math.max((clip.duration / 60) * 100, 10)}%`,
                            position: 'relative',
                          }}
                          title={`${clip.presetType} · ${clip.duration.toFixed(1)}s`}
                        >
                          <span className="truncate px-2">
                            {clip.presetType.replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Audio track */}
                    <div className="timeline-track mt-2 flex items-center justify-center text-xs text-gray-500">
                      🎵 Audio Track
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Wand2,
  FolderOpen,
  Download,
  TrendingUp,
  Clock,
  AlertCircle,
  ChevronRight,
  Loader2,
  Film,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDuration, timeAgo, getStatusConfig, isValidYouTubeUrl } from '@/lib/utils';
import type { Project } from '@/types/project';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [creating, setCreating] = useState(false);

  // Fetch recent projects
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data } = await api.get('/projects?limit=6&sortBy=createdAt&sortOrder=desc');
      setProjects(data.data || []);
    } catch (error: any) {
      console.error(error);
      const message = error?.response?.data?.message || error?.message || JSON.stringify(error, null, 2);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidYouTubeUrl(url)) {
      toast.error('Please enter a valid YouTube URL');
      return;
    }

    setCreating(true);
    try {
      const { data } = await api.post('/projects', { youtubeUrl: url });
      toast.success('Project created!');
      router.push(`/dashboard/projects/${data.data.id}`);
    } catch (error: any) {
      console.error(error);
      const message = error?.response?.data?.message || error?.message || JSON.stringify(error, null, 2);
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  // Dashboard stats
  const totalProjects = projects.length;
  const processing = projects.filter((p) =>
    ['DOWNLOADING', 'ANALYZING', 'GENERATING_CLIPS', 'EXPORTING'].includes(p.status),
  ).length;
  const completed = projects.filter((p) => p.status === 'COMPLETED').length;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* ── Header ──────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-400">Create and manage your sports video projects</p>
      </div>

      {/* ── URL Input Card ──────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-accent-purple" />
          New Project
        </h2>
        <form onSubmit={handleCreateProject} className="flex gap-3">
          <div className="relative flex-1">
            <Play className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              id="dashboard-url-input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="input-field !pl-11"
              placeholder="Paste YouTube URL here..."
            />
          </div>
          <button
            id="dashboard-create-btn"
            type="submit"
            disabled={creating}
            className="btn-primary flex items-center gap-2 shrink-0"
          >
            {creating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
            Create Project
          </button>
        </form>
      </motion.div>

      {/* ── Stats Grid ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: FolderOpen,
            label: 'Total Projects',
            value: totalProjects,
            gradient: 'from-accent-cyan to-accent-blue',
          },
          {
            icon: Clock,
            label: 'Processing',
            value: processing,
            gradient: 'from-accent-purple to-accent-pink',
          },
          {
            icon: Download,
            label: 'Completed',
            value: completed,
            gradient: 'from-accent-pink to-accent-orange',
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="glass-card p-5 flex items-center gap-4"
          >
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shrink-0`}
            >
              <stat.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-gray-400">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Recent Projects ─────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Projects</h2>
          <Link
            href="/dashboard/projects"
            className="text-sm text-accent-purple hover:text-accent-pink transition-colors flex items-center gap-1"
          >
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-card p-4">
                <div className="skeleton h-40 mb-4" />
                <div className="skeleton h-5 w-3/4 mb-2" />
                <div className="skeleton h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Film className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-gray-400 text-sm mb-6">
              Paste a YouTube URL above to create your first project
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <Link href={`/dashboard/projects/${project.id}`}>
                  <div className="glass-card overflow-hidden group hover:scale-[1.02] transition-transform duration-300 cursor-pointer">
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-dark-800">
                      {project.thumbnail ? (
                        <img
                          src={project.thumbnail}
                          alt={project.title || 'Video thumbnail'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Film className="w-8 h-8 text-gray-600" />
                        </div>
                      )}
                      {/* Duration badge */}
                      {project.duration && (
                        <span className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-xs font-mono">
                          {formatDuration(project.duration)}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-sm truncate mb-2 group-hover:text-accent-cyan transition-colors">
                        {project.title || 'Untitled Project'}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className={getStatusConfig(project.status).className}>
                          {getStatusConfig(project.status).label}
                        </span>
                        <span className="text-xs text-gray-500">
                          {timeAgo(project.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

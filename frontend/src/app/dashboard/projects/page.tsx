'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, Film, Clock, ChevronRight, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDuration, timeAgo, getStatusConfig } from '@/lib/utils';
import type { Project } from '@/types/project';
import toast from 'react-hot-toast';

export default function ProjectsListPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchProjects();
  }, [page]);

  const fetchProjects = async () => {
    try {
      const { data } = await api.get(`/projects?page=${page}&limit=12&sortBy=createdAt&sortOrder=desc`);
      setProjects(data.data || []);
      setTotalPages(data.meta?.totalPages || 1);
    } catch (error: any) {
      console.error(error);
      const message = error?.response?.data?.message || error?.message || JSON.stringify(error, null, 2);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await api.delete(`/projects/${projectId}`);
      toast.success('Project deleted');
      fetchProjects();
    } catch (error: any) {
      console.error(error);
      const message = error?.response?.data?.message || error?.message || JSON.stringify(error, null, 2);
      toast.error(message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">All Projects</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your video editing projects</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-accent-purple" />
        </div>
      ) : projects.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <FolderOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
          <p className="text-gray-400 mb-6">Create your first project from the dashboard</p>
          <Link href="/dashboard" className="btn-primary">
            Go to Dashboard
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link href={`/dashboard/projects/${project.id}`}>
                  <div className="glass-card overflow-hidden group hover:scale-[1.01] transition-transform duration-200 cursor-pointer">
                    <div className="relative aspect-video bg-dark-800">
                      {project.thumbnail ? (
                        <img src={project.thumbnail} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Film className="w-8 h-8 text-gray-600" />
                        </div>
                      )}
                      {project.duration && (
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-xs font-mono">
                          {formatDuration(project.duration)}
                        </span>
                      )}
                      {/* Delete button */}
                      <button
                        onClick={(e) => handleDelete(project.id, e)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/30"
                        title="Delete project"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-sm truncate mb-2 group-hover:text-accent-cyan transition-colors">
                        {project.title || 'Untitled'}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className={getStatusConfig(project.status).className}>
                          {getStatusConfig(project.status).label}
                        </span>
                        <span className="text-xs text-gray-500">{timeAgo(project.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    page === i + 1
                      ? 'bg-accent-purple text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

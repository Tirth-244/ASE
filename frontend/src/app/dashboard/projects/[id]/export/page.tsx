'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
  Film,
  HardDrive,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { formatDuration, formatFileSize, getStatusConfig, timeAgo } from '@/lib/utils';
import type { Export } from '@/types/project';
import toast from 'react-hot-toast';

export default function ExportPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [exports, setExports] = useState<Export[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingZip, setDownloadingZip] = useState(false);

  useEffect(() => {
    fetchExports();
    const interval = setInterval(fetchExports, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchExports = async () => {
    try {
      const { data } = await api.get('/exports');
      // Filter exports for this project
      const projectExports = (data.data || []).filter(
        (e: Export) => e.projectId === projectId,
      );
      setExports(projectExports);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (exportId: string) => {
    try {
      const response = await api.get(`/exports/${exportId}/download`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data]);
      // Use File System Access API if available
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: `sports_highlight_${exportId}.mp4`,
            types: [{
              description: 'Video File',
              accept: { 'video/mp4': ['.mp4'] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          toast.success('File saved successfully!');
          return;
        } catch (err: any) {
          // If user cancelled, just return
          if (err.name === 'AbortError') return;
          console.error('File System API failed, falling back to traditional download:', err);
        }
      }

      // Fallback
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sports_highlight_${exportId}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Download started!');
    } catch (error: any) {
      console.error(error);
      const message = error?.response?.data?.message || error?.message || JSON.stringify(error, null, 2);
      toast.error(message);
    }
  };

  const handleDownloadAllZip = async () => {
    const completedExports = exports.filter((e) => e.status === 'COMPLETED');
    if (completedExports.length === 0) {
      toast.error('No completed exports to download.');
      return;
    }

    setDownloadingZip(true);
    toast.success('Preparing ZIP file. This may take a moment...');
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Download each file and add to ZIP
      for (const exp of completedExports) {
        const response = await api.get(`/exports/${exp.id}/download`, {
          responseType: 'blob',
        });
        zip.file(`highlight_${exp.id}.mp4`, response.data);
      }

      // Generate ZIP blob
      const content = await zip.generateAsync({ type: 'blob' });

      // Use File System Access API if available
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: `project_${projectId}_clips.zip`,
            types: [{
              description: 'ZIP Archive',
              accept: { 'application/zip': ['.zip'] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(content);
          await writable.close();
          toast.success('ZIP saved successfully!');
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') return;
          console.error('File System API failed:', err);
        }
      }

      // Fallback download
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project_${projectId}_clips.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('ZIP Download started!');
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to create ZIP file.');
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Export History</h1>
            <p className="text-gray-400 text-sm mt-1">Download your rendered videos</p>
          </div>
        </div>

        {exports.some((e) => e.status === 'COMPLETED') && (
          <button
            onClick={handleDownloadAllZip}
            disabled={downloadingZip}
            className="btn-secondary flex items-center gap-2"
          >
            {downloadingZip ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download All (ZIP)
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-accent-purple" />
        </div>
      ) : exports.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Download className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No exports yet</h2>
          <p className="text-gray-400 mb-6">
            Generate and export clips from your project to see them here
          </p>
          <Link href={`/dashboard/projects/${projectId}`} className="btn-primary">
            Back to Project
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {exports.map((exp, i) => (
            <motion.div
              key={exp.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center">
                    <Film className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">
                      {exp.clip?.presetType?.replace('_', ' ') || 'Export'} — {exp.format}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3" />
                        {exp.resolution}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(exp.createdAt)}
                      </span>
                      {exp.fileSize && (
                        <span>{formatFileSize(Number(exp.fileSize))}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Progress bar for active exports */}
                  {['PENDING', 'RENDERING', 'ENCODING'].includes(exp.status) && (
                    <div className="w-32">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-accent-purple">{exp.status}</span>
                        <span>{exp.progress}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-bar-fill" style={{ width: `${exp.progress}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Status / Download */}
                  {exp.status === 'COMPLETED' ? (
                    <button
                      onClick={() => handleDownload(exp.id)}
                      className="btn-primary text-sm flex items-center gap-2 !px-4 !py-2"
                      id={`download-${exp.id}`}
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  ) : exp.status === 'FAILED' ? (
                    <span className="badge-error flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Failed
                    </span>
                  ) : (
                    <Loader2 className="w-5 h-5 animate-spin text-accent-purple" />
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

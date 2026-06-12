'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Zap,
  Film,
  Wand2,
  ArrowRight,
  Play,
  TrendingUp,
  Scissors,
  Music,
  Download,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

/** Feature cards data for the landing page grid */
const features = [
  {
    icon: Zap,
    title: 'AI Moment Detection',
    description: 'Automatically detects goals, skills, celebrations, and crowd reactions using YOLO + LLM analysis.',
    gradient: 'from-accent-cyan to-accent-blue',
  },
  {
    icon: Scissors,
    title: 'Smart Clip Generator',
    description: 'Creates 15s, 30s, and 60s clips with auto-crop, zoom, slow motion, and smooth transitions.',
    gradient: 'from-accent-purple to-accent-pink',
  },
  {
    icon: Film,
    title: 'Timeline Editor',
    description: 'Drag-and-drop timeline with real-time preview. Adjust clips, effects, and captions with precision.',
    gradient: 'from-accent-pink to-accent-orange',
  },
  {
    icon: Music,
    title: 'Audio Intelligence',
    description: 'Removes copyrighted music, syncs beat drops with highlights, and adds royalty-free tracks.',
    gradient: 'from-accent-orange to-accent-cyan',
  },
  {
    icon: Wand2,
    title: 'AI Content Suite',
    description: 'Auto-generates viral titles, hashtags, descriptions, and thumbnail suggestions for maximum reach.',
    gradient: 'from-accent-blue to-accent-purple',
  },
  {
    icon: Download,
    title: '1080x1920 Export',
    description: 'Export YouTube Shorts-ready vertical videos in MP4 with animated captions and scoreboard overlays.',
    gradient: 'from-accent-cyan to-accent-purple',
  },
];

/** Animated stat counter */
const stats = [
  { value: '10x', label: 'Faster Editing' },
  { value: '95%', label: 'Detection Accuracy' },
  { value: '4K', label: 'Quality Output' },
  { value: '50+', label: 'Effect Presets' },
];

export default function LandingPage() {
  const [url, setUrl] = useState('');

  return (
    <div className="min-h-screen">
      {/* ── Navigation ──────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 backdrop-blur-xl bg-dark-900/70">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold">AI Sports Editor</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors">How It Works</a>
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Login</Link>
            <Link href="/register" className="btn-primary text-sm !px-5 !py-2">
              Get Started <ArrowRight className="w-4 h-4 inline ml-1" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Animated grid background */}
        <div className="absolute inset-0 -z-10" style={{
          backgroundImage: 'linear-gradient(rgba(123,47,247,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(123,47,247,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-purple/10 border border-accent-purple/20 mb-8"
          >
            <Sparkles className="w-4 h-4 text-accent-purple" />
            <span className="text-sm text-accent-purple font-medium">Powered by AI</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-black leading-tight mb-6"
          >
            Transform Sports Videos
            <br />
            <span className="gradient-text">Into Viral Shorts</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12"
          >
            Paste a YouTube URL. Our AI detects exciting moments, generates highlight clips,
            and exports ready-to-upload YouTube Shorts — in minutes, not hours.
          </motion.p>

          {/* URL Input */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="max-w-2xl mx-auto"
          >
            <div className="relative flex items-center gap-3 p-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-2 pl-4 text-gray-500">
                <Play className="w-5 h-5" />
              </div>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste YouTube URL here..."
                className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-lg py-3"
                id="hero-url-input"
              />
              <Link
                href={url ? `/register?url=${encodeURIComponent(url)}` : '/register'}
                className="btn-primary flex items-center gap-2 !rounded-xl text-base"
                id="hero-start-btn"
              >
                <Wand2 className="w-5 h-5" />
                <span className="hidden sm:inline">Start Editing</span>
              </Link>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Supports youtube.com/watch, youtu.be, and youtube.com/shorts links
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────── */}
      <section className="py-16 px-6 border-y border-white/5">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl font-black gradient-text mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features Grid ───────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Everything You Need to
              <span className="gradient-text"> Go Viral</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              From AI-powered analysis to one-click export — the complete toolkit for sports content creators.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6 group hover:scale-[1.02] transition-transform duration-300"
                id={`feature-card-${i}`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 bg-white/[0.01]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Three Steps to
              <span className="gradient-text"> Amazing Shorts</span>
            </h2>
          </motion.div>

          <div className="space-y-12">
            {[
              {
                step: '01',
                title: 'Paste a YouTube URL',
                desc: 'Drop any sports video link. We fetch metadata, validate the video, and display a preview instantly.',
                color: 'text-accent-cyan',
              },
              {
                step: '02',
                title: 'AI Analyzes Everything',
                desc: 'Scene detection, speech transcription, action recognition, and moment scoring happen automatically.',
                color: 'text-accent-purple',
              },
              {
                step: '03',
                title: 'Export Viral Shorts',
                desc: 'Review AI-generated clips, customize in the editor, and export 1080x1920 videos ready for upload.',
                color: 'text-accent-pink',
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex items-start gap-8"
              >
                <div className={`text-6xl font-black ${item.color} opacity-30 shrink-0 w-20`}>
                  {item.step}
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-lg">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto glass-card p-12 text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Create Viral Sports Content?
          </h2>
          <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
            Join thousands of sports content creators using AI to 10x their editing speed.
          </p>
          <Link href="/register" className="btn-primary text-lg !px-8 !py-4 inline-flex items-center gap-2" id="cta-start-btn">
            Start Free <ChevronRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-semibold">AI Sports Editor</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <span>© 2025 AI Sports Editor</span>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

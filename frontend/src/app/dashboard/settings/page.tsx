'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, User, Key, Bell, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [user, setUser] = useState({ name: '', email: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // Simulated save
    await new Promise((r) => setTimeout(r, 1000));
    localStorage.setItem('user', JSON.stringify(user));
    toast.success('Settings saved');
    setSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Manage your account preferences</p>
      </div>

      {/* Profile Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <User className="w-5 h-5 text-accent-cyan" /> Profile
        </h2>

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
            <input
              type="text"
              value={user.name}
              onChange={(e) => setUser({ ...user, name: e.target.value })}
              className="input-field"
              id="settings-name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={user.email}
              onChange={(e) => setUser({ ...user, email: e.target.value })}
              className="input-field"
              disabled
              id="settings-email"
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2"
            id="settings-save"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </form>
      </motion.div>

      {/* Export Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6"
      >
        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Settings className="w-5 h-5 text-accent-purple" /> Export Defaults
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Default Format</label>
            <select className="input-field" defaultValue="MP4" id="settings-format">
              <option value="MP4">MP4 (Recommended)</option>
              <option value="WEBM">WebM</option>
              <option value="MOV">MOV</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Default Quality</label>
            <select className="input-field" defaultValue="high" id="settings-quality">
              <option value="low">Low (faster export)</option>
              <option value="medium">Medium</option>
              <option value="high">High (recommended)</option>
              <option value="ultra">Ultra (slower export)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Default Resolution</label>
            <select className="input-field" defaultValue="1080x1920" id="settings-resolution">
              <option value="720x1280">720x1280 (HD)</option>
              <option value="1080x1920">1080x1920 (Full HD)</option>
            </select>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

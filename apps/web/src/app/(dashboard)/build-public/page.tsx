'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Plus, Heart, MessageSquare, TrendingUp, Calendar, Rocket, CheckCircle, AlertCircle, Target } from 'lucide-react';
import Link from 'next/link';

interface BuildUpdate {
  id: string;
  type: 'MILESTONE' | 'PROGRESS' | 'LAUNCH' | 'LEARNING' | 'CHALLENGE' | 'WIN';
  projectName: string;
  projectSlug: string;
  title: string;
  content: string;
  metrics: {
    users?: number;
    revenue?: number;
    commits?: number;
    [key: string]: number | undefined;
  };
  tags: string[];
  isPublic: boolean;
  likes: number;
  likedBy: string[];
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
}

const updateTypeConfig = {
  MILESTONE: { icon: Target, color: 'purple', label: 'Milestone' },
  PROGRESS: { icon: TrendingUp, color: 'blue', label: 'Progress' },
  LAUNCH: { icon: Rocket, color: 'green', label: 'Launch' },
  LEARNING: { icon: CheckCircle, color: 'teal', label: 'Learning' },
  CHALLENGE: { icon: AlertCircle, color: 'orange', label: 'Challenge' },
  WIN: { icon: Heart, color: 'pink', label: 'Win' },
};

const fetchUpdates = async (): Promise<BuildUpdate[]> => {
  const res = await fetch('/api/v1/build-public');
  const data = await res.json();
  return data.data || [];
};

export default function BuildPublicPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  const { data: updates = [], isLoading } = useQuery({
    queryKey: ['build-public'],
    queryFn: fetchUpdates,
  });

  const likeMutation = useMutation({
    mutationFn: async (updateId: string) => {
      const res = await fetch(`/api/v1/build-public/${updateId}/like`, { method: 'POST' });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['build-public'] }),
  });

  const filteredUpdates = updates.filter((u) => {
    if (typeFilter !== 'all' && u.type !== typeFilter) return false;
    return true;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Megaphone className="w-8 h-8 text-orange-500" />
              Build in Public
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Share your journey, inspire others, and grow together
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Share Update
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-orange-500">{updates.length}</p>
            <p className="text-sm text-gray-500">Updates</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-green-500">
              {updates.filter((u) => u.type === 'LAUNCH').length}
            </p>
            <p className="text-sm text-gray-500">Launches</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-purple-500">
              {updates.filter((u) => u.type === 'MILESTONE').length}
            </p>
            <p className="text-sm text-gray-500">Milestones</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-pink-500">
              {updates.reduce((sum, u) => sum + u.likes, 0)}
            </p>
            <p className="text-sm text-gray-500">Total Likes</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              typeFilter === 'all'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          {Object.entries(updateTypeConfig).map(([type, config]) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                typeFilter === type
                  ? `bg-${config.color}-500 text-white`
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
              }`}
            >
              <config.icon className="w-4 h-4" />
              {config.label}
            </button>
          ))}
        </div>

        {/* Updates Feed */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/6"></div>
                  </div>
                </div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredUpdates.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl">
            <Megaphone className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No updates yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Be the first to share your journey!</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
            >
              Share Your First Update
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUpdates.map((update) => {
              const typeConfig = updateTypeConfig[update.type];
              const TypeIcon = typeConfig.icon;

              return (
                <div key={update.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={update.user.avatar || '/default-avatar.png'}
                        alt={update.user.displayName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {update.user.displayName}
                          </span>
                          <span className="text-gray-500">@{update.user.username}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(update.createdAt)}
                        </div>
                      </div>
                    </div>
                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-${typeConfig.color}-100 dark:bg-${typeConfig.color}-900/30 text-${typeConfig.color}-700 dark:text-${typeConfig.color}-300`}>
                      <TypeIcon className="w-3.5 h-3.5" />
                      {typeConfig.label}
                    </span>
                  </div>

                  {/* Project */}
                  <Link
                    href={`/projects/${update.projectSlug}`}
                    className="inline-flex items-center gap-1.5 text-sm text-orange-600 dark:text-orange-400 hover:underline mb-2"
                  >
                    <Rocket className="w-4 h-4" />
                    {update.projectName}
                  </Link>

                  {/* Content */}
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{update.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap mb-4">{update.content}</p>

                  {/* Metrics */}
                  {Object.keys(update.metrics).length > 0 && (
                    <div className="flex flex-wrap gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg mb-4">
                      {update.metrics.users !== undefined && (
                        <div>
                          <p className="text-xl font-bold text-gray-900 dark:text-white">{update.metrics.users}</p>
                          <p className="text-xs text-gray-500">Users</p>
                        </div>
                      )}
                      {update.metrics.revenue !== undefined && (
                        <div>
                          <p className="text-xl font-bold text-green-500">${update.metrics.revenue}</p>
                          <p className="text-xs text-gray-500">Revenue</p>
                        </div>
                      )}
                      {update.metrics.commits !== undefined && (
                        <div>
                          <p className="text-xl font-bold text-blue-500">{update.metrics.commits}</p>
                          <p className="text-xs text-gray-500">Commits</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tags */}
                  {update.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {update.tags.map((tag) => (
                        <span key={tag} className="text-sm text-orange-600 dark:text-orange-400">#{tag}</span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => likeMutation.mutate(update.id)}
                      className="flex items-center gap-1.5 text-gray-500 hover:text-pink-500 transition-colors"
                    >
                      <Heart className={`w-5 h-5 ${update.likedBy.length > 0 ? 'fill-pink-500 text-pink-500' : ''}`} />
                      <span>{update.likes}</span>
                    </button>
                    <button className="flex items-center gap-1.5 text-gray-500 hover:text-blue-500 transition-colors">
                      <MessageSquare className="w-5 h-5" />
                      <span>Comment</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && <CreateUpdateModal onClose={() => setShowCreateModal(false)} />}
      </div>
    </div>
  );
}

function CreateUpdateModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    type: 'PROGRESS' as const,
    projectName: '',
    projectSlug: '',
    title: '',
    content: '',
    tags: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch('/api/v1/build-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          tags: data.tags.split(',').map((t) => t.trim()).filter(Boolean),
          projectSlug: data.projectSlug || data.projectName.toLowerCase().replace(/\s+/g, '-'),
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['build-public'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Share an Update</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Update Type</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(updateTypeConfig).map(([type, config]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: type as any })}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.type === type
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <config.icon className="w-4 h-4" />
                  {config.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Name</label>
            <input
              type="text"
              value={formData.projectName}
              onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
              placeholder="My Awesome Project"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Reached 1000 users!"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Share details about your progress..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="buildinpublic, saas, nextjs"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-lg"
            >
              {createMutation.isPending ? 'Posting...' : 'Post Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

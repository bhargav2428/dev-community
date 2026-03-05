'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Video, Clock, Star, Target, Plus, Calendar, User } from 'lucide-react';
import Link from 'next/link';

interface MockInterview {
  id: string;
  title: string;
  description: string;
  type: string;
  difficulty: string;
  duration: number;
  topics: string[];
  skills: string[];
  scheduledAt: string | null;
  meetingUrl: string;
  status: string;
  interviewer: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    headline: string;
  };
  interviewee?: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
}

const fetchInterviews = async (): Promise<MockInterview[]> => {
  const res = await fetch('/api/v1/interviews');
  const data = await res.json();
  return data.data || [];
};

const interviewTypes: Record<string, { label: string; color: string }> = {
  BEHAVIORAL: { label: 'Behavioral', color: 'bg-blue-100 text-blue-700' },
  TECHNICAL: { label: 'Technical', color: 'bg-purple-100 text-purple-700' },
  SYSTEM_DESIGN: { label: 'System Design', color: 'bg-orange-100 text-orange-700' },
  CODING: { label: 'Coding', color: 'bg-green-100 text-green-700' },
  FRONTEND: { label: 'Frontend', color: 'bg-pink-100 text-pink-700' },
  BACKEND: { label: 'Backend', color: 'bg-cyan-100 text-cyan-700' },
  FULLSTACK: { label: 'Full Stack', color: 'bg-indigo-100 text-indigo-700' },
  DATA_STRUCTURES: { label: 'DSA', color: 'bg-red-100 text-red-700' },
};

const difficultyColors: Record<string, string> = {
  EASY: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HARD: 'bg-orange-100 text-orange-700',
  EXPERT: 'bg-red-100 text-red-700',
};

export default function InterviewsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: interviews = [], isLoading } = useQuery({
    queryKey: ['interviews'],
    queryFn: fetchInterviews,
  });

  const requestMutation = useMutation({
    mutationFn: async (interviewId: string) => {
      const res = await fetch(`/api/v1/interviews/${interviewId}/request`, { method: 'POST' });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['interviews'] }),
  });

  const filteredInterviews = interviews.filter((i) => {
    if (typeFilter === 'all') return true;
    return i.type === typeFilter;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-emerald-500" />
              Mock Interviews
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Practice interviews with peers and get real feedback
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Offer to Interview
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
                <Briefcase className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{interviews.length}</p>
                <p className="text-sm text-gray-500">Available Interviews</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Video className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {interviews.filter((i) => i.status === 'CONFIRMED').length}
                </p>
                <p className="text-sm text-gray-500">Scheduled</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">8</p>
                <p className="text-sm text-gray-500">Interview Types</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <Star className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">4.8</p>
                <p className="text-sm text-gray-500">Avg Rating</p>
              </div>
            </div>
          </div>
        </div>

        {/* Type Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              typeFilter === 'all'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            All Types
          </button>
          {Object.entries(interviewTypes).map(([type, { label }]) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                typeFilter === type
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Interviews List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredInterviews.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No interviews available</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Be the first to offer mock interviews!</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg"
            >
              Offer to Interview
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInterviews.map((interview) => {
              const typeInfo = interviewTypes[interview.type] || interviewTypes.TECHNICAL;
              
              return (
                <div key={interview.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={interview.interviewer.avatar || '/default-avatar.png'}
                        alt={interview.interviewer.displayName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{interview.interviewer.displayName}</h4>
                        <p className="text-sm text-gray-500">Interviewer</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeInfo.color} dark:bg-opacity-20`}>
                      {typeInfo.label}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{interview.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {interview.description || interview.interviewer.headline}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyColors[interview.difficulty]}`}>
                      {interview.difficulty}
                    </span>
                    {interview.topics.slice(0, 2).map((topic) => (
                      <span key={topic} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                        {topic}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      {interview.duration} min
                    </div>
                    {interview.status === 'AVAILABLE' && (
                      <button
                        onClick={() => requestMutation.mutate(interview.id)}
                        disabled={requestMutation.isPending}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-sm rounded-lg"
                      >
                        {requestMutation.isPending ? 'Requesting...' : 'Request Interview'}
                      </button>
                    )}
                    {interview.status === 'REQUESTED' && (
                      <span className="text-yellow-600 dark:text-yellow-400 text-sm">Pending</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <CreateInterviewModal onClose={() => setShowCreateModal(false)} />
        )}
      </div>
    </div>
  );
}

function CreateInterviewModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'TECHNICAL',
    difficulty: 'MEDIUM',
    duration: 45,
    topics: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch('/api/v1/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          topics: data.topics.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Offer Mock Interview</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Frontend React Interview"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What will you cover in this interview?"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {Object.entries(interviewTypes).map(([type, { label }]) => (
                  <option key={type} value={type}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Difficulty</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
                <option value="EXPERT">Expert</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration</label>
            <select
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
              <option value={90}>90 minutes</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Topics (comma-separated)</label>
            <input
              type="text"
              value={formData.topics}
              onChange={(e) => setFormData({ ...formData, topics: e.target.value })}
              placeholder="React, Hooks, State Management"
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
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white rounded-lg"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Interview'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

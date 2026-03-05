'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trophy, DollarSign, Clock, Code, Filter, Plus, Star, Zap, Target } from 'lucide-react';
import Link from 'next/link';

interface Bounty {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  rewardType: string;
  rewardAmount: number;
  rewardCurrency: string;
  difficulty: string;
  skills: string[];
  languages: string[];
  estimatedHours: number;
  deadline: string | null;
  status: string;
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
  _count: {
    submissions: number;
  };
}

const fetchBounties = async (status?: string): Promise<Bounty[]> => {
  const url = status ? `/api/v1/bounties?status=${status}` : '/api/v1/bounties';
  const res = await fetch(url);
  const data = await res.json();
  return data.data || [];
};

const difficultyColors: Record<string, string> = {
  BEGINNER: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  EASY: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  HARD: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  EXPERT: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export default function BountiesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: bounties = [], isLoading } = useQuery({
    queryKey: ['bounties', statusFilter],
    queryFn: () => fetchBounties(statusFilter),
  });

  const filteredBounties = bounties.filter((b) => {
    if (difficultyFilter === 'all') return true;
    return b.difficulty === difficultyFilter;
  });

  const totalRewards = bounties.reduce((sum, b) => sum + b.rewardAmount, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              Code Bounties
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Solve coding challenges and earn rewards
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Post a Bounty
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{bounties.length}</p>
                <p className="text-sm text-gray-500">Open Bounties</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">${totalRewards.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Total Rewards</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {bounties.reduce((sum, b) => sum + b._count.submissions, 0)}
                </p>
                <p className="text-sm text-gray-500">Submissions</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">24h</p>
                <p className="text-sm text-gray-500">Avg Completion</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex gap-2">
            {['OPEN', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-yellow-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {['all', 'BEGINNER', 'EASY', 'MEDIUM', 'HARD', 'EXPERT'].map((diff) => (
              <button
                key={diff}
                onClick={() => setDifficultyFilter(diff)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  difficultyFilter === diff
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                {diff === 'all' ? 'All Levels' : diff}
              </button>
            ))}
          </div>
        </div>

        {/* Bounties List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredBounties.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No bounties found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Be the first to post a bounty!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBounties.map((bounty) => (
              <Link
                key={bounty.id}
                href={`/bounties/${bounty.id}`}
                className="block bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{bounty.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyColors[bounty.difficulty]}`}>
                        {bounty.difficulty}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{bounty.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {bounty.skills.slice(0, 5).map((skill) => (
                        <span key={skill} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <img
                          src={bounty.creator.avatar || '/default-avatar.png'}
                          alt={bounty.creator.displayName}
                          className="w-6 h-6 rounded-full"
                        />
                        <span>{bounty.creator.displayName}</span>
                      </div>
                      {bounty.estimatedHours && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          ~{bounty.estimatedHours}h
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Code className="w-4 h-4" />
                        {bounty._count.submissions} submissions
                      </div>
                    </div>
                  </div>

                  <div className="text-right ml-6">
                    <div className="flex items-center gap-1 text-2xl font-bold text-green-600 dark:text-green-400">
                      <DollarSign className="w-6 h-6" />
                      {bounty.rewardAmount}
                    </div>
                    <p className="text-sm text-gray-500">{bounty.rewardType}</p>
                    {bounty.deadline && (
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                        Due: {new Date(bounty.deadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <CreateBountyModal onClose={() => setShowCreateModal(false)} />
        )}
      </div>
    </div>
  );
}

function CreateBountyModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    rewardAmount: 100,
    rewardType: 'POINTS',
    difficulty: 'MEDIUM',
    skills: '',
    estimatedHours: 4,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch('/api/v1/bounties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          skills: data.skills.split(',').map((s) => s.trim()).filter(Boolean),
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bounties'] });
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
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Post a Bounty</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Fix pagination bug in React component"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the challenge in detail..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reward Amount</label>
              <input
                type="number"
                value={formData.rewardAmount}
                onChange={(e) => setFormData({ ...formData, rewardAmount: parseInt(e.target.value) })}
                min={1}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reward Type</label>
              <select
                value={formData.rewardType}
                onChange={(e) => setFormData({ ...formData, rewardType: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="POINTS">Points</option>
                <option value="CASH">Cash ($)</option>
                <option value="SWAG">Swag</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Difficulty</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="BEGINNER">Beginner</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
                <option value="EXPERT">Expert</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Est. Hours</label>
              <input
                type="number"
                value={formData.estimatedHours}
                onChange={(e) => setFormData({ ...formData, estimatedHours: parseInt(e.target.value) })}
                min={1}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Skills (comma-separated)</label>
            <input
              type="text"
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              placeholder="React, TypeScript, Node.js"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white rounded-lg transition-colors"
            >
              {createMutation.isPending ? 'Creating...' : 'Post Bounty'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

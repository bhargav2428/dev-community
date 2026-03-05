'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Trophy, Target, Lock, Unlock, ChevronRight, Star } from 'lucide-react';
import Link from 'next/link';

interface SkillTree {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  totalNodes: number;
  totalXp: number;
  _count: {
    nodes: number;
    userProgress: number;
  };
}

interface UserProgress {
  id: string;
  treeId: string;
  currentXp: number;
  level: number;
  nodesUnlocked: number;
  isComplete: boolean;
  tree: SkillTree;
}

const fetchSkillTrees = async (): Promise<SkillTree[]> => {
  const res = await fetch('/api/v1/skill-trees');
  const data = await res.json();
  return data.data || [];
};

const fetchMyProgress = async (): Promise<UserProgress[]> => {
  const res = await fetch('/api/v1/skill-trees/my/progress');
  const data = await res.json();
  return data.data || [];
};

const categoryColors: Record<string, { bg: string; text: string; icon: string }> = {
  FRONTEND: { bg: 'bg-blue-500', text: 'text-blue-500', icon: '🎨' },
  BACKEND: { bg: 'bg-green-500', text: 'text-green-500', icon: '⚙️' },
  FULLSTACK: { bg: 'bg-purple-500', text: 'text-purple-500', icon: '🚀' },
  DEVOPS: { bg: 'bg-orange-500', text: 'text-orange-500', icon: '🔧' },
  MOBILE: { bg: 'bg-pink-500', text: 'text-pink-500', icon: '📱' },
  AI_ML: { bg: 'bg-yellow-500', text: 'text-yellow-500', icon: '🤖' },
  DATA: { bg: 'bg-cyan-500', text: 'text-cyan-500', icon: '📊' },
  SECURITY: { bg: 'bg-red-500', text: 'text-red-500', icon: '🔒' },
  BLOCKCHAIN: { bg: 'bg-indigo-500', text: 'text-indigo-500', icon: '⛓️' },
  GAME_DEV: { bg: 'bg-emerald-500', text: 'text-emerald-500', icon: '🎮' },
};

export default function SkillsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: skillTrees = [], isLoading: treesLoading } = useQuery({
    queryKey: ['skillTrees'],
    queryFn: fetchSkillTrees,
  });

  const { data: myProgress = [], isLoading: progressLoading } = useQuery({
    queryKey: ['mySkillProgress'],
    queryFn: fetchMyProgress,
  });

  const progressMap = new Map(myProgress.map((p) => [p.treeId, p]));

  const filteredTrees = selectedCategory
    ? skillTrees.filter((t) => t.category === selectedCategory)
    : skillTrees;

  const totalXpEarned = myProgress.reduce((sum, p) => sum + p.currentXp, 0);
  const totalNodesUnlocked = myProgress.reduce((sum, p) => sum + p.nodesUnlocked, 0);
  const completedTrees = myProgress.filter((p) => p.isComplete).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-purple-500" />
            Skill Trees
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Unlock new skills and track your developer journey with RPG-style progression
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Star className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalXpEarned.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Total XP Earned</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <Unlock className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalNodesUnlocked}</p>
                <p className="text-sm text-gray-500">Nodes Unlocked</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{completedTrees}</p>
                <p className="text-sm text-gray-500">Trees Completed</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{myProgress.length}</p>
                <p className="text-sm text-gray-500">Trees Started</p>
              </div>
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !selectedCategory
                ? 'bg-purple-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            All Categories
          </button>
          {Object.entries(categoryColors).map(([category, colors]) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                selectedCategory === category
                  ? `${colors.bg} text-white`
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <span>{colors.icon}</span>
              {category.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Skill Trees Grid */}
        {treesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm animate-pulse">
                <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : filteredTrees.length === 0 ? (
          <div className="text-center py-16">
            <Sparkles className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No skill trees found</h3>
            <p className="text-gray-500 dark:text-gray-400">Check back soon for new skill trees!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrees.map((tree) => {
              const progress = progressMap.get(tree.id);
              const progressPercent = progress
                ? Math.round((progress.nodesUnlocked / tree.totalNodes) * 100)
                : 0;
              const colors = categoryColors[tree.category] || categoryColors.FULLSTACK;

              return (
                <Link
                  key={tree.id}
                  href={`/skills/${tree.id}`}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl ${colors.bg} bg-opacity-20`}>
                      <span className="text-3xl">{colors.icon}</span>
                    </div>
                    {progress?.isComplete && (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                        Completed
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    {tree.displayName}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                    {tree.description}
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Progress</span>
                      <span className={`font-medium ${colors.text}`}>
                        {progress ? `${progress.nodesUnlocked}/${tree.totalNodes} nodes` : 'Not started'}
                      </span>
                    </div>
                    
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors.bg} transition-all duration-500`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <Star className="w-4 h-4" />
                        {tree.totalXp} XP Total
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        {tree._count.userProgress} learners
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-purple-600 dark:text-purple-400 group-hover:text-purple-700">
                        {progress ? 'Continue Learning' : 'Start Learning'}
                      </span>
                      <ChevronRight className="w-5 h-5 text-purple-500 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Default Skill Trees if none exist */}
        {!treesLoading && skillTrees.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'React Mastery', category: 'FRONTEND', desc: 'Master React from basics to advanced patterns' },
              { name: 'Node.js Expert', category: 'BACKEND', desc: 'Build scalable backend applications with Node.js' },
              { name: 'TypeScript Pro', category: 'FULLSTACK', desc: 'Type-safe JavaScript development' },
              { name: 'DevOps Pipeline', category: 'DEVOPS', desc: 'CI/CD, containers, and cloud deployment' },
              { name: 'AI/ML Fundamentals', category: 'AI_ML', desc: 'Machine learning and AI basics' },
              { name: 'System Design', category: 'FULLSTACK', desc: 'Design scalable distributed systems' },
            ].map((tree, i) => {
              const colors = categoryColors[tree.category];
              return (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm opacity-70 cursor-not-allowed"
                >
                  <div className={`p-3 rounded-xl ${colors.bg} bg-opacity-20 w-fit mb-4`}>
                    <span className="text-3xl">{colors.icon}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{tree.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{tree.desc}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Lock className="w-4 h-4" />
                    Coming Soon
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

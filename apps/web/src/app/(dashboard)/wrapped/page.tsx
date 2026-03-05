'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Calendar, Code, GitCommit, Star, Users, Trophy, Share2, Eye, EyeOff, Download } from 'lucide-react';

interface DeveloperWrapped {
  id: string;
  year: number;
  totalCommits: number;
  totalPullRequests: number;
  totalIssues: number;
  totalReviews: number;
  topLanguages: { name: string; percentage: number }[];
  topRepositories: { name: string; commits: number }[];
  longestStreak: number;
  totalContributions: number;
  peakMonth: string;
  peakDay: string;
  collaborators: number;
  linesAdded: number;
  linesRemoved: number;
  avgCommitsPerDay: number;
  mostActiveHour: number;
  achievements: {
    name: string;
    description: string;
    icon: string;
  }[];
  isPublic: boolean;
  shareSlug: string;
  generatedAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
}

const currentYear = new Date().getFullYear();

const fetchWrapped = async (year: number): Promise<DeveloperWrapped | null> => {
  const res = await fetch(`/api/v1/wrapped/${year}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.data || null;
};

export default function WrappedPage() {
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const queryClient = useQueryClient();

  const { data: wrapped, isLoading, error } = useQuery({
    queryKey: ['wrapped', selectedYear],
    queryFn: () => fetchWrapped(selectedYear),
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/wrapped/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: selectedYear }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wrapped', selectedYear] }),
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/wrapped/${selectedYear}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !wrapped?.isPublic }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wrapped', selectedYear] }),
  });

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur rounded-full text-white/80 mb-4">
            <Sparkles className="w-4 h-4" />
            Developer Year in Review
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            Developer Wrapped
          </h1>
          <p className="text-white/60">Your coding journey visualized</p>
        </div>

        {/* Year Selector */}
        <div className="flex justify-center gap-2 mb-8">
          {years.map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                selectedYear === year
                  ? 'bg-white text-purple-900 shadow-lg scale-105'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {year}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-12 h-12 border-4 border-white/20 border-t-white rounded-full"></div>
          </div>
        ) : !wrapped ? (
          <div className="text-center py-16 bg-white/5 backdrop-blur rounded-2xl">
            <Calendar className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No Wrapped for {selectedYear}</h3>
            <p className="text-white/60 mb-6">Generate your personalized year review!</p>
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full font-medium disabled:opacity-50"
            >
              {generateMutation.isPending ? 'Generating...' : `Generate ${selectedYear} Wrapped`}
            </button>
          </div>
        ) : (
          <>
            {/* Controls */}
            <div className="flex justify-end gap-3 mb-6">
              <button
                onClick={() => toggleVisibilityMutation.mutate()}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                {wrapped.isPublic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {wrapped.isPublic ? 'Public' : 'Private'}
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={<GitCommit className="w-6 h-6" />}
                value={wrapped.totalCommits.toLocaleString()}
                label="Commits"
                gradient="from-green-400 to-emerald-500"
              />
              <StatCard
                icon={<Code className="w-6 h-6" />}
                value={wrapped.totalContributions.toLocaleString()}
                label="Contributions"
                gradient="from-blue-400 to-cyan-500"
              />
              <StatCard
                icon={<Trophy className="w-6 h-6" />}
                value={`${wrapped.longestStreak} days`}
                label="Longest Streak"
                gradient="from-yellow-400 to-orange-500"
              />
              <StatCard
                icon={<Users className="w-6 h-6" />}
                value={wrapped.collaborators.toLocaleString()}
                label="Collaborators"
                gradient="from-pink-400 to-rose-500"
              />
            </div>

            {/* Detailed Stats */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Top Languages */}
              <div className="bg-white/5 backdrop-blur rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Code className="w-5 h-5 text-blue-400" />
                  Top Languages
                </h3>
                <div className="space-y-3">
                  {wrapped.topLanguages.map((lang, i) => (
                    <div key={lang.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-white/80">{lang.name}</span>
                        <span className="text-white/60">{lang.percentage}%</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            i === 0 ? 'bg-gradient-to-r from-blue-400 to-purple-500' :
                            i === 1 ? 'bg-gradient-to-r from-green-400 to-teal-500' :
                            'bg-gradient-to-r from-orange-400 to-pink-500'
                          }`}
                          style={{ width: `${lang.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Repositories */}
              <div className="bg-white/5 backdrop-blur rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  Top Repositories
                </h3>
                <div className="space-y-3">
                  {wrapped.topRepositories.map((repo, i) => (
                    <div key={repo.name} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-gradient-to-r from-purple-400 to-pink-500 rounded flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </span>
                        <span className="text-white/90">{repo.name}</span>
                      </div>
                      <span className="text-white/60 text-sm">{repo.commits} commits</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Activity Insights */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white/5 backdrop-blur rounded-2xl p-6 text-center">
                <p className="text-white/60 text-sm mb-2">Peak Month</p>
                <p className="text-2xl font-bold text-white">{wrapped.peakMonth}</p>
              </div>
              <div className="bg-white/5 backdrop-blur rounded-2xl p-6 text-center">
                <p className="text-white/60 text-sm mb-2">Most Productive Day</p>
                <p className="text-2xl font-bold text-white">{wrapped.peakDay}</p>
              </div>
              <div className="bg-white/5 backdrop-blur rounded-2xl p-6 text-center">
                <p className="text-white/60 text-sm mb-2">Favorite Coding Time</p>
                <p className="text-2xl font-bold text-white">
                  {wrapped.mostActiveHour}:00
                </p>
              </div>
            </div>

            {/* Code Stats */}
            <div className="bg-white/5 backdrop-blur rounded-2xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">Code Impact</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-3xl font-bold text-green-400">+{wrapped.linesAdded.toLocaleString()}</p>
                  <p className="text-white/60 text-sm">Lines Added</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-red-400">-{wrapped.linesRemoved.toLocaleString()}</p>
                  <p className="text-white/60 text-sm">Lines Removed</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-blue-400">{wrapped.avgCommitsPerDay.toFixed(1)}</p>
                  <p className="text-white/60 text-sm">Avg Commits/Day</p>
                </div>
              </div>
            </div>

            {/* Achievements */}
            {wrapped.achievements.length > 0 && (
              <div className="bg-white/5 backdrop-blur rounded-2xl p-6 mb-8">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  Achievements Unlocked
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {wrapped.achievements.map((achievement) => (
                    <div key={achievement.name} className="text-center p-4 bg-white/5 rounded-xl">
                      <div className="text-3xl mb-2">{achievement.icon}</div>
                      <p className="font-medium text-white text-sm">{achievement.name}</p>
                      <p className="text-white/50 text-xs mt-1">{achievement.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PR & Review Stats */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur rounded-2xl p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                    <GitCommit className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{wrapped.totalPullRequests}</p>
                    <p className="text-white/60">Pull Requests</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur rounded-2xl p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{wrapped.totalReviews}</p>
                    <p className="text-white/60">Code Reviews</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  gradient,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  gradient: string;
}) {
  return (
    <div className="bg-white/5 backdrop-blur rounded-2xl p-6 text-center">
      <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${gradient} mb-3`}>
        {icon}
      </div>
      <p className="text-2xl md:text-3xl font-bold text-white">{value}</p>
      <p className="text-white/60 text-sm">{label}</p>
    </div>
  );
}

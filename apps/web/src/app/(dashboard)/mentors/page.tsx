'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Star, Clock, Users, DollarSign, Plus, Calendar, MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface MentorProfile {
  id: string;
  title: string;
  bio: string;
  expertise: string[];
  skills: string[];
  yearsExperience: number;
  hoursPerWeek: number;
  timezone: string;
  isPaid: boolean;
  hourlyRate: number | null;
  currency: string;
  totalMentees: number;
  totalSessions: number;
  rating: number;
  reviewCount: number;
  isAvailable: boolean;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    headline: string;
    location: string;
  };
}

const fetchMentors = async (): Promise<MentorProfile[]> => {
  const res = await fetch('/api/v1/mentors');
  const data = await res.json();
  return data.data || [];
};

export default function MentorsPage() {
  const [showBecomeModal, setShowBecomeModal] = useState(false);
  const [expertiseFilter, setExpertiseFilter] = useState('all');
  const [paidFilter, setPaidFilter] = useState<'all' | 'free' | 'paid'>('all');
  const queryClient = useQueryClient();

  const { data: mentors = [], isLoading } = useQuery({
    queryKey: ['mentors'],
    queryFn: fetchMentors,
  });

  const requestMutation = useMutation({
    mutationFn: async ({ mentorId, goals }: { mentorId: string; goals: string[] }) => {
      const res = await fetch(`/api/v1/mentors/${mentorId}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goals }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mentors'] }),
  });

  const filteredMentors = mentors.filter((m) => {
    if (expertiseFilter !== 'all' && !m.expertise.includes(expertiseFilter)) return false;
    if (paidFilter === 'free' && m.isPaid) return false;
    if (paidFilter === 'paid' && !m.isPaid) return false;
    return true;
  });

  const expertiseOptions = Array.from(new Set(mentors.flatMap((m) => m.expertise)));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-teal-500" />
              Mentor Marketplace
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Find experienced developers to guide your career
            </p>
          </div>
          <button
            onClick={() => setShowBecomeModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Become a Mentor
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-teal-100 dark:bg-teal-900 rounded-lg">
                <GraduationCap className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{mentors.length}</p>
                <p className="text-sm text-gray-500">Active Mentors</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <Star className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {mentors.length > 0 
                    ? (mentors.reduce((sum, m) => sum + m.rating, 0) / mentors.length).toFixed(1)
                    : '0.0'
                  }
                </p>
                <p className="text-sm text-gray-500">Avg Rating</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {mentors.reduce((sum, m) => sum + m.totalMentees, 0)}
                </p>
                <p className="text-sm text-gray-500">Mentees Helped</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {mentors.reduce((sum, m) => sum + m.totalSessions, 0)}
                </p>
                <p className="text-sm text-gray-500">Sessions Completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="flex gap-2">
            <button
              onClick={() => setPaidFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                paidFilter === 'all'
                  ? 'bg-teal-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setPaidFilter('free')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                paidFilter === 'free'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Free
            </button>
            <button
              onClick={() => setPaidFilter('paid')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                paidFilter === 'paid'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Paid
            </button>
          </div>
          
          {expertiseOptions.length > 0 && (
            <select
              value={expertiseFilter}
              onChange={(e) => setExpertiseFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Expertise</option>
              {expertiseOptions.map((exp) => (
                <option key={exp} value={exp}>{exp}</option>
              ))}
            </select>
          )}
        </div>

        {/* Mentors List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm animate-pulse">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredMentors.length === 0 ? (
          <div className="text-center py-16">
            <GraduationCap className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No mentors found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Be the first to become a mentor!</p>
            <button
              onClick={() => setShowBecomeModal(true)}
              className="px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
            >
              Become a Mentor
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMentors.map((mentor) => (
              <div key={mentor.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4 mb-4">
                  <img
                    src={mentor.user.avatar || '/default-avatar.png'}
                    alt={mentor.user.displayName}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{mentor.user.displayName}</h3>
                    <p className="text-sm text-gray-500">@{mentor.user.username}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm font-medium">{mentor.rating.toFixed(1)}</span>
                      <span className="text-sm text-gray-500">({mentor.reviewCount} reviews)</span>
                    </div>
                  </div>
                  {mentor.isPaid ? (
                    <div className="text-right">
                      <span className="text-lg font-bold text-teal-600 dark:text-teal-400">
                        ${mentor.hourlyRate}
                      </span>
                      <p className="text-xs text-gray-500">/hour</p>
                    </div>
                  ) : (
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                      Free
                    </span>
                  )}
                </div>

                <h4 className="font-medium text-gray-900 dark:text-white mb-2">{mentor.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{mentor.bio}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {mentor.expertise.slice(0, 3).map((exp) => (
                    <span key={exp} className="px-2 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-xs rounded-full">
                      {exp}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {mentor.yearsExperience} yrs exp
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {mentor.totalMentees} mentees
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {mentor.hoursPerWeek}h/week
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                  <Link
                    href={`/mentors/${mentor.id}`}
                    className="block w-full text-center px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors"
                  >
                    View Profile
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Become Mentor Modal */}
        {showBecomeModal && (
          <BecomeMentorModal onClose={() => setShowBecomeModal(false)} />
        )}
      </div>
    </div>
  );
}

function BecomeMentorModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    bio: '',
    expertise: '',
    yearsExperience: 3,
    hoursPerWeek: 5,
    isPaid: false,
    hourlyRate: 50,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch('/api/v1/mentors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          expertise: data.expertise.split(',').map((e) => e.trim()).filter(Boolean),
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentors'] });
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
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Become a Mentor</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Senior Frontend Developer & Career Coach"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell potential mentees about yourself..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Expertise (comma-separated)
            </label>
            <input
              type="text"
              value={formData.expertise}
              onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
              placeholder="React, Career Growth, System Design"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Years Experience</label>
              <input
                type="number"
                value={formData.yearsExperience}
                onChange={(e) => setFormData({ ...formData, yearsExperience: parseInt(e.target.value) })}
                min={1}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hours/Week</label>
              <input
                type="number"
                value={formData.hoursPerWeek}
                onChange={(e) => setFormData({ ...formData, hoursPerWeek: parseInt(e.target.value) })}
                min={1}
                max={40}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isPaid}
                onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                className="w-4 h-4 rounded text-teal-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Paid mentorship</span>
            </label>
            {formData.isPaid && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">$</span>
                <input
                  type="number"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: parseInt(e.target.value) })}
                  min={1}
                  className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <span className="text-gray-500">/hour</span>
              </div>
            )}
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
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white rounded-lg"
            >
              {createMutation.isPending ? 'Creating...' : 'Become a Mentor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

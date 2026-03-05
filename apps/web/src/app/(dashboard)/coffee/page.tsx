'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Coffee, Clock, Users, Calendar, Video, MessageSquare, Plus, Filter } from 'lucide-react';
import Link from 'next/link';

interface CoffeeChat {
  id: string;
  title: string;
  topic: string;
  description: string;
  topics: string[];
  languages: string[];
  duration: number;
  scheduledAt: string | null;
  status: string;
  host: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    headline: string;
  };
  guest?: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
}

const fetchCoffeeChats = async (): Promise<CoffeeChat[]> => {
  const res = await fetch('/api/v1/coffee');
  const data = await res.json();
  return data.data || [];
};

export default function CoffeePage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: coffeeChats = [], isLoading } = useQuery({
    queryKey: ['coffeeChats'],
    queryFn: fetchCoffeeChats,
  });

  const joinMutation = useMutation({
    mutationFn: async (chatId: string) => {
      const res = await fetch(`/api/v1/coffee/${chatId}/join`, { method: 'POST' });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coffeeChats'] }),
  });

  const filteredChats = coffeeChats.filter((chat) => {
    if (filter === 'all') return true;
    return chat.topics.includes(filter);
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Coffee className="w-8 h-8 text-amber-500" />
              Virtual Coffee
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Connect with fellow developers over quick 15-minute chats
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Host a Coffee Chat
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 dark:bg-amber-900 rounded-lg">
                <Coffee className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{coffeeChats.length}</p>
                <p className="text-sm text-gray-500">Available Chats</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {coffeeChats.filter((c) => c.status === 'CONFIRMED').length}
                </p>
                <p className="text-sm text-gray-500">Active Sessions</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">15</p>
                <p className="text-sm text-gray-500">Min Avg Duration</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <MessageSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">50+</p>
                <p className="text-sm text-gray-500">Topics Covered</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['all', 'React', 'Node.js', 'Python', 'Career', 'Startups', 'DevOps'].map((topic) => (
            <button
              key={topic}
              onClick={() => setFilter(topic)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === topic
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {topic === 'all' ? 'All Topics' : topic}
            </button>
          ))}
        </div>

        {/* Coffee Chat List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-16">
            <Coffee className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No coffee chats available</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Be the first to host a coffee chat!</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
            >
              Host a Coffee Chat
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChats.map((chat) => (
              <div key={chat.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={chat.host.avatar || '/default-avatar.png'}
                      alt={chat.host.displayName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{chat.host.displayName}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">@{chat.host.username}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    chat.status === 'AVAILABLE' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {chat.status}
                  </span>
                </div>

                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{chat.title || 'Coffee Chat'}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{chat.description || chat.host.headline}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {chat.topics.slice(0, 3).map((topic) => (
                    <span key={topic} className="px-2 py-1 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-xs rounded-full">
                      {topic}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    {chat.duration} min
                  </div>
                  {chat.status === 'AVAILABLE' && (
                    <button
                      onClick={() => joinMutation.mutate(chat.id)}
                      disabled={joinMutation.isPending}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-sm rounded-lg transition-colors"
                    >
                      {joinMutation.isPending ? 'Joining...' : 'Join Chat'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <CreateCoffeeChatModal onClose={() => setShowCreateModal(false)} />
        )}
      </div>
    </div>
  );
}

function CreateCoffeeChatModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    topics: [] as string[],
    duration: 15,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch('/api/v1/coffee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coffeeChats'] });
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
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Host a Coffee Chat</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Let's talk about React!"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What would you like to chat about?"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration (minutes)</label>
            <select
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
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
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg transition-colors"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Coffee Chat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

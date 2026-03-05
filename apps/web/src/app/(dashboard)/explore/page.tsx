'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Search,
  TrendingUp,
  Users,
  FolderKanban,
  Lightbulb,
  Hash,
  Filter,
} from 'lucide-react';

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'projects' | 'posts'>('all');

  const { data: trendingTopics } = useQuery({
    queryKey: ['trending-topics'],
    queryFn: () => apiClient.get('/posts/trending/topics'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['search', searchQuery, activeTab],
    queryFn: () => apiClient.get(`/search?q=${searchQuery}&type=${activeTab}`),
    enabled: searchQuery.length > 2,
  });

  const tabs = [
    { id: 'all', label: 'All', icon: Search },
    { id: 'users', label: 'People', icon: Users },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'posts', label: 'Posts', icon: Lightbulb },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Explore</h1>
        <p className="text-muted-foreground">
          Discover developers, projects, and ideas
        </p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search developers, projects, posts..."
          className="pl-10 h-12 text-lg"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab.id as any)}
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Trending Topics */}
      {!searchQuery && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Trending Topics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {['React', 'TypeScript', 'Next.js', 'AI', 'Web3', 'Open Source', 'DevOps', 'Rust'].map((topic) => (
                <Link key={topic} href={`/explore?tag=${topic}`}>
                  <Button variant="outline" size="sm">
                    <Hash className="h-3 w-3 mr-1" />
                    {topic}
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {searchQuery && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="mt-4 text-muted-foreground">Searching...</p>
            </div>
          ) : searchResults?.data?.length > 0 ? (
            searchResults.data.map((result: any) => (
              <Card key={result.id}>
                <CardContent className="p-4">
                  <Link href={result.type === 'user' ? `/profile/${result.username}` : `/${result.type}s/${result.id}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        {result.type === 'user' ? (
                          <Users className="h-6 w-6 text-primary" />
                        ) : result.type === 'project' ? (
                          <FolderKanban className="h-6 w-6 text-primary" />
                        ) : (
                          <Lightbulb className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium">{result.title || result.displayName || result.username}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {result.description || result.headline || result.bio}
                        </p>
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
            </div>
          )}
        </div>
      )}

      {/* Featured Sections */}
      {!searchQuery && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Popular Developers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50" />
                    <div>
                      <p className="font-medium">Developer {i}</p>
                      <p className="text-sm text-muted-foreground">@dev{i}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Follow</Button>
                </div>
              ))}
              <Link href="/teammates">
                <Button variant="ghost" className="w-full mt-2">View All</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-primary" />
                Trending Projects
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <FolderKanban className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">Project {i}</p>
                    <p className="text-sm text-muted-foreground">⭐ {100 - i * 10} stars</p>
                  </div>
                </div>
              ))}
              <Link href="/projects">
                <Button variant="ghost" className="w-full mt-2">View All</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

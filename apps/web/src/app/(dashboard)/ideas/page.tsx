'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import {
  Lightbulb,
  Plus,
  Search,
  ThumbsUp,
  MessageSquare,
  TrendingUp,
  Sparkles,
  Filter,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

export default function IdeasPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'trending' | 'new' | 'my'>('trending');

  const { data: ideas, isLoading } = useQuery({
    queryKey: ['ideas', filter, searchQuery],
    queryFn: () => {
      let url = '/ideas?';
      if (filter === 'my') url += 'author=me&';
      if (filter === 'trending') url += 'sort=votes&';
      if (filter === 'new') url += 'sort=newest&';
      if (searchQuery) url += `search=${searchQuery}&`;
      return apiClient.getPaginated(url);
    },
  });

  const voteMutation = useMutation({
    mutationFn: (ideaId: string) => apiClient.post(`/ideas/${ideaId}/vote`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
    },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">Startup Ideas</h1>
          <p className="text-muted-foreground">
            Share and vote on startup ideas from the community
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/ai/generate-idea">
            <Button variant="outline">
              <Sparkles className="h-4 w-4 mr-2" />
              AI Generate
            </Button>
          </Link>
          <Link href="/ideas/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Share Idea
            </Button>
          </Link>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ideas..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(['trending', 'new', 'my'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === 'trending' && <TrendingUp className="h-4 w-4 mr-1" />}
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Ideas List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded w-3/4 mb-4" />
                <div className="h-4 bg-muted rounded w-full mb-2" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (ideas?.data?.length ?? 0) > 0 ? (
        <div className="space-y-4">
          {ideas?.data?.map((idea: any) => (
            <Card key={idea.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex gap-4">
                  {/* Vote button */}
                  <div className="flex flex-col items-center">
                    <Button
                      variant={idea.hasVoted ? 'default' : 'outline'}
                      size="icon"
                      className="rounded-full"
                      onClick={() => voteMutation.mutate(idea.id)}
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium mt-1">{idea.votes || 0}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <Link href={`/ideas/${idea.id}`}>
                      <h3 className="text-lg font-semibold hover:text-primary transition-colors">
                        {idea.title}
                      </h3>
                    </Link>
                    <p className="text-muted-foreground mt-2 line-clamp-2">
                      {idea.problem || idea.description}
                    </p>

                    {/* Tags */}
                    {idea.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {idea.tags.slice(0, 4).map((tag: string) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        {idea.comments || 0} comments
                      </span>
                      <span>by @{idea.author?.username || 'anonymous'}</span>
                      <span>{formatRelativeTime(idea.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No ideas found</h3>
            <p className="text-muted-foreground mb-4">
              Be the first to share a startup idea!
            </p>
            <Link href="/ideas/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Share Your Idea
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

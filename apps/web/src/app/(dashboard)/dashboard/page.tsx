'use client';

import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp,
  Users,
  FolderKanban,
  Lightbulb,
  ArrowRight,
  Heart,
  MessageSquare,
  Bookmark,
  Share2,
  MoreHorizontal,
  Code2,
  Sparkles,
} from 'lucide-react';
import { formatRelativeTime, formatNumber } from '@/lib/utils';

export default function DashboardPage() {
  const { data: session } = useSession();

  // Fetch feed
  const { data: feedData, isLoading: feedLoading } = useQuery({
    queryKey: ['feed'],
    queryFn: () => apiClient.getPaginated('/posts/feed'),
    staleTime: 60 * 1000,
  });

  // Fetch trending projects
  const { data: trendingProjects } = useQuery({
    queryKey: ['trending-projects'],
    queryFn: () => apiClient.get('/projects/trending?limit=5'),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch suggested users
  const { data: suggestedUsers } = useQuery({
    queryKey: ['suggested-users'],
    queryFn: () => apiClient.get('/users/suggested?limit=5'),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="max-w-7xl mx-auto">
      {/* Welcome section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {session?.user?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening in your community
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick actions */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Link href="/posts/create">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">
                        {session?.user?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <span className="text-muted-foreground">
                        Share something with the community...
                      </span>
                    </div>
                  </Link>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Link href="/projects/create">
                  <Button variant="outline" size="sm">
                    <FolderKanban className="h-4 w-4 mr-1" />
                    New Project
                  </Button>
                </Link>
                <Link href="/ideas/create">
                  <Button variant="outline" size="sm">
                    <Lightbulb className="h-4 w-4 mr-1" />
                    Share Idea
                  </Button>
                </Link>
                <Link href="/ai/generate-idea">
                  <Button variant="outline" size="sm">
                    <Sparkles className="h-4 w-4 mr-1" />
                    AI Idea
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Feed posts */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your Feed</h2>
              <Link href="/explore" className="text-sm text-primary hover:underline">
                Explore more
              </Link>
            </div>

            {feedLoading ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-muted" />
                      <div className="flex-1 space-y-3">
                        <div className="h-4 w-1/4 bg-muted rounded" />
                        <div className="h-4 w-full bg-muted rounded" />
                        <div className="h-4 w-3/4 bg-muted rounded" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : feedData?.data?.length ? (
              feedData.data.map((post: any) => (
                <PostCard key={post.id} post={post} />
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">
                    Your feed is empty. Start following developers to see their posts!
                  </p>
                  <Link href="/explore">
                    <Button>Explore Community</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Trending projects */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Trending Projects
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {trendingProjects?.slice(0, 5).map((project: any) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.slug}`}
                  className="block group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Code2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate group-hover:text-primary transition-colors">
                        {project.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(project._count?.stars || 0)} stars
                      </p>
                    </div>
                  </div>
                </Link>
              )) || (
                <p className="text-sm text-muted-foreground">No trending projects yet</p>
              )}
              <Link
                href="/projects"
                className="flex items-center justify-center gap-1 text-sm text-primary hover:underline pt-2"
              >
                View all projects
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>

          {/* Suggested users */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Suggested Developers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {suggestedUsers?.slice(0, 5).map((user: any) => (
                <div key={user.id} className="flex items-center gap-3">
                  <Link href={`/profile/${user.username}`}>
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-medium">
                      {user.profile?.displayName?.[0]?.toUpperCase() || user.username[0].toUpperCase()}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profile/${user.username}`} className="hover:underline">
                      <p className="font-medium truncate">
                        {user.profile?.displayName || user.username}
                      </p>
                    </Link>
                    <p className="text-xs text-muted-foreground truncate">
                      @{user.username}
                    </p>
                  </div>
                  <Button size="sm" variant="outline">
                    Follow
                  </Button>
                </div>
              )) || (
                <p className="text-sm text-muted-foreground">No suggestions yet</p>
              )}
              <Link
                href="/explore/developers"
                className="flex items-center justify-center gap-1 text-sm text-primary hover:underline pt-2"
              >
                Find more developers
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Post card component
function PostCard({ post }: { post: any }) {
  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-6">
        {/* Author info */}
        <div className="flex items-start justify-between mb-4">
          <Link href={`/profile/${post.author?.username}`} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-medium">
              {post.author?.profile?.displayName?.[0]?.toUpperCase() || post.author?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-medium hover:underline">
                {post.author?.profile?.displayName || post.author?.username}
              </p>
              <p className="text-xs text-muted-foreground">
                @{post.author?.username} · {formatRelativeTime(post.createdAt)}
              </p>
            </div>
          </Link>
          <button className="p-1 hover:bg-muted rounded">
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Post content */}
        <Link href={`/posts/${post.id}`}>
          {post.title && (
            <h3 className="text-lg font-semibold mb-2 hover:text-primary transition-colors">
              {post.title}
            </h3>
          )}
          <p className="text-muted-foreground line-clamp-3">{post.content}</p>
        </Link>

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {post.tags.slice(0, 4).map((tag: any) => (
              <Link
                key={tag.id}
                href={`/explore?tag=${tag.name}`}
                className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t">
          <button className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
            <Heart className="h-4 w-4" />
            <span className="text-sm">{formatNumber(post._count?.likes || 0)}</span>
          </button>
          <button className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
            <MessageSquare className="h-4 w-4" />
            <span className="text-sm">{formatNumber(post._count?.comments || 0)}</span>
          </button>
          <button className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
            <Bookmark className="h-4 w-4" />
          </button>
          <button className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors ml-auto">
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

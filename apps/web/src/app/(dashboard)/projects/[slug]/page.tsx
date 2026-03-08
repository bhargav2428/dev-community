'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Star,
  GitFork,
  Eye,
  ExternalLink,
  Github,
  Globe,
  ArrowLeft,
  MessageSquare,
  Users,
  Send,
  MoreHorizontal,
  Share2,
  Code,
  Calendar,
} from 'lucide-react';
import { formatRelativeTime, cn } from '@/lib/utils';

export default function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', slug],
    queryFn: () => apiClient.get(`/projects/${slug}`),
    enabled: !!slug,
  });

  const { data: comments } = useQuery({
    queryKey: ['project-comments', slug],
    queryFn: () => apiClient.get(`/projects/${slug}/comments`),
    enabled: !!slug,
  });

  const starMutation = useMutation({
    mutationFn: () => apiClient.post(`/projects/${slug}/star`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', slug] });
    },
  });

  const unstarMutation = useMutation({
    mutationFn: () => apiClient.post(`/projects/${slug}/unstar`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', slug] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => apiClient.post(`/projects/${slug}/comments`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-comments', slug] });
      queryClient.invalidateQueries({ queryKey: ['project', slug] });
      setComment('');
    },
  });

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim()) {
      commentMutation.mutate(comment.trim());
    }
  };

  const projectData = project?.data;
  // Determine if user has starred (from projectStars relation)
  const isStarred = projectData?.projectStars?.some((star: any) => star.userId === session?.user?.id);
  const isOwner = session?.user?.id === projectData?.ownerId;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-32 mb-6" />
          <Card>
            <CardContent className="p-6">
              <div className="h-8 bg-muted rounded w-64 mb-4" />
              <div className="h-4 bg-muted rounded w-full mb-2" />
              <div className="h-4 bg-muted rounded w-3/4" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!projectData) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-16 text-center">
            <h2 className="text-xl font-semibold mb-2">Project not found</h2>
            <p className="text-muted-foreground mb-4">
              This project may have been deleted or doesn't exist.
            </p>
            <Button onClick={() => router.push('/projects')}>Browse Projects</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Back Button */}
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Projects
      </Button>

      {/* Project Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Code className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{projectData.name}</h1>
                <Link
                  href={`/profile/${projectData.owner?.username}`}
                  className="text-muted-foreground hover:text-primary"
                >
                  by @{projectData.owner?.username}
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={isStarred ? 'default' : 'outline'}
                onClick={() => isStarred ? unstarMutation.mutate() : starMutation.mutate()}
                disabled={starMutation.isPending || unstarMutation.isPending}
              >
                <Star className={cn(
                  "h-4 w-4 mr-2",
                  isStarred && "fill-current"
                )} />
                {isStarred ? 'Starred' : 'Star'}
              </Button>
              {isOwner && (
                <Button variant="outline" asChild>
                  <Link href={`/projects/${slug}/edit`}>Edit</Link>
                </Button>
              )}
            </div>
          </div>

          <p className="text-muted-foreground mb-6">{projectData.description}</p>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-6 mb-6 text-sm">
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4" />
              {projectData._count?.stars || 0} stars
            </span>
            <span className="flex items-center gap-1">
              <GitFork className="h-4 w-4" />
              {projectData._count?.forks || 0} forks
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {projectData.views || 0} views
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {projectData._count?.contributors || 0} contributors
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatRelativeTime(projectData.createdAt)}
            </span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-3">
            {projectData.repoUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={projectData.repoUrl} target="_blank" rel="noopener noreferrer">
                  <Github className="h-4 w-4 mr-2" />
                  Repository
                </a>
              </Button>
            )}
            {projectData.liveUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={projectData.liveUrl} target="_blank" rel="noopener noreferrer">
                  <Globe className="h-4 w-4 mr-2" />
                  Live Demo
                </a>
              </Button>
            )}
            <Button variant="ghost" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tech Stack */}
      {projectData.techStack?.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Tech Stack</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {projectData.techStack.map((tech: any) => (
                <span
                  key={tech.id || tech}
                  className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
                >
                  {typeof tech === 'string' ? tech : tech.name}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* README / Description */}
      {projectData.readme && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">README</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {projectData.readme}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contributors */}
      {projectData.contributors?.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Contributors</span>
              <span className="text-sm font-normal text-muted-foreground">
                {projectData._count?.contributors || 0} total
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {projectData.contributors.slice(0, 10).map((contributor: any) => (
                <Link
                  key={contributor.id}
                  href={`/profile/${contributor.user?.username}`}
                  className="flex items-center gap-2 hover:text-primary"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {contributor.user?.displayName?.[0] || contributor.user?.username?.[0]}
                    </span>
                  </div>
                  <span className="text-sm">{contributor.user?.username}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Discussion / Comments */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">Discussion</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleComment}>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Leave a comment or ask a question..."
              rows={3}
              className="mb-3"
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={!comment.trim() || commentMutation.isPending}>
                <Send className="h-4 w-4 mr-2" />
                {commentMutation.isPending ? 'Posting...' : 'Comment'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Comments List */}
      <div className="space-y-4">
        {comments?.data?.length > 0 ? (
          comments.data.map((comment: any) => (
            <Card key={comment.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Link href={`/profile/${comment.author?.username}`}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <span className="font-medium text-primary">
                        {comment.author?.displayName?.[0] || comment.author?.username?.[0] || '?'}
                      </span>
                    </div>
                  </Link>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/profile/${comment.author?.username}`}
                        className="font-medium hover:underline"
                      >
                        {comment.author?.displayName || comment.author?.username}
                      </Link>
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1">{comment.content}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No comments yet. Start the discussion!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

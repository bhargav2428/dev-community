'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  MoreHorizontal,
  ArrowLeft,
  Send,
  Flag,
  Trash2,
  Edit,
  Code,
  Link as LinkIcon,
} from 'lucide-react';
import { formatRelativeTime, cn } from '@/lib/utils';

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: () => apiClient.get(`/posts/${id}`),
    enabled: !!id,
  });

  const { data: comments } = useQuery({
    queryKey: ['post-comments', id],
    queryFn: () => apiClient.get(`/posts/${id}/comments`),
    enabled: !!id,
  });

  const likeMutation = useMutation({
    mutationFn: () => apiClient.post(`/posts/${id}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', id] });
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: () => apiClient.delete(`/posts/${id}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', id] });
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: () => apiClient.post(`/posts/${id}/bookmark`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', id] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => apiClient.post(`/posts/${id}/comments`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', id] });
      queryClient.invalidateQueries({ queryKey: ['post', id] });
      setComment('');
    },
  });

  const replyMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      apiClient.post(`/posts/${id}/comments/${commentId}/replies`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', id] });
      setReplyTo(null);
      setReplyContent('');
    },
  });

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim()) {
      commentMutation.mutate(comment.trim());
    }
  };

  const handleReply = (commentId: string) => {
    if (replyContent.trim()) {
      replyMutation.mutate({ commentId, content: replyContent.trim() });
    }
  };

  const postData = post?.data;
  const isLiked = postData?.isLiked;
  const isBookmarked = postData?.isBookmarked;
  const isOwner = session?.user?.id === postData?.authorId;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-32 mb-6" />
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-muted" />
                <div>
                  <div className="h-4 bg-muted rounded w-32 mb-2" />
                  <div className="h-3 bg-muted rounded w-24" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!postData) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-16 text-center">
            <h2 className="text-xl font-semibold mb-2">Post not found</h2>
            <p className="text-muted-foreground mb-4">
              This post may have been deleted or doesn't exist.
            </p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Back Button */}
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* Post */}
      <Card>
        <CardContent className="p-6">
          {/* Author Info */}
          <div className="flex items-start justify-between mb-4">
            <Link
              href={`/profile/${postData.author?.username}`}
              className="flex items-center gap-3 hover:opacity-80"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <span className="text-lg font-medium text-primary">
                  {postData.author?.displayName?.[0] || postData.author?.username?.[0] || '?'}
                </span>
              </div>
              <div>
                <p className="font-medium">{postData.author?.displayName || postData.author?.username}</p>
                <p className="text-sm text-muted-foreground">
                  @{postData.author?.username} · {formatRelativeTime(postData.createdAt)}
                </p>
              </div>
            </Link>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="mb-4">
            <p className="whitespace-pre-wrap">{postData.content}</p>
          </div>

          {/* Code Snippet */}
          {postData.codeSnippet && (
            <div className="mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Code className="h-4 w-4" />
                Code Snippet
              </div>
              <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
                <code>{postData.codeSnippet}</code>
              </pre>
            </div>
          )}

          {/* Links */}
          {postData.links?.length > 0 && (
            <div className="mb-4 space-y-2">
              {postData.links.map((link: string, index: number) => (
                <a
                  key={index}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50"
                >
                  <LinkIcon className="h-4 w-4 text-primary" />
                  <span className="text-sm text-primary truncate">{link}</span>
                </a>
              ))}
            </div>
          )}

          {/* Tags */}
          {postData.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {postData.tags.map((tag: any) => (
                <Link
                  key={tag.id || tag}
                  href={`/explore?tag=${typeof tag === 'string' ? tag : tag.name}`}
                  className="text-sm text-primary hover:underline"
                >
                  #{typeof tag === 'string' ? tag : tag.name}
                </Link>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-6 py-4 border-y text-sm text-muted-foreground">
            <span>{postData._count?.likes || 0} likes</span>
            <span>{postData._count?.comments || 0} comments</span>
            <span>{postData._count?.shares || 0} shares</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => isLiked ? unlikeMutation.mutate() : likeMutation.mutate()}
                disabled={likeMutation.isPending || unlikeMutation.isPending}
              >
                <Heart className={cn(
                  "h-5 w-5 mr-1",
                  isLiked && "fill-red-500 text-red-500"
                )} />
                Like
              </Button>
              <Button variant="ghost" size="sm">
                <MessageSquare className="h-5 w-5 mr-1" />
                Comment
              </Button>
              <Button variant="ghost" size="sm">
                <Share2 className="h-5 w-5 mr-1" />
                Share
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => bookmarkMutation.mutate()}
            >
              <Bookmark className={cn(
                "h-5 w-5",
                isBookmarked && "fill-current"
              )} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comment Form */}
      <Card className="mt-4">
        <CardContent className="p-4">
          <form onSubmit={handleComment}>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write a comment..."
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

      {/* Comments */}
      <div className="mt-4 space-y-4">
        <h3 className="text-lg font-semibold">
          Comments ({postData._count?.comments || 0})
        </h3>
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
                    <div className="flex items-center gap-4 mt-2">
                      <button className="text-sm text-muted-foreground hover:text-foreground">
                        Like ({comment._count?.likes || 0})
                      </button>
                      <button
                        className="text-sm text-muted-foreground hover:text-foreground"
                        onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                      >
                        Reply
                      </button>
                    </div>

                    {/* Reply Form */}
                    {replyTo === comment.id && (
                      <div className="mt-3 flex gap-2">
                        <Textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Write a reply..."
                          rows={2}
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleReply(comment.id)}
                          disabled={!replyContent.trim() || replyMutation.isPending}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {/* Replies */}
                    {comment.replies?.length > 0 && (
                      <div className="mt-4 pl-4 border-l-2 space-y-4">
                        {comment.replies.map((reply: any) => (
                          <div key={reply.id} className="flex items-start gap-3">
                            <Link href={`/profile/${reply.author?.username}`}>
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                <span className="text-sm font-medium text-primary">
                                  {reply.author?.displayName?.[0] || reply.author?.username?.[0] || '?'}
                                </span>
                              </div>
                            </Link>
                            <div>
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/profile/${reply.author?.username}`}
                                  className="text-sm font-medium hover:underline"
                                >
                                  {reply.author?.displayName || reply.author?.username}
                                </Link>
                                <span className="text-xs text-muted-foreground">
                                  {formatRelativeTime(reply.createdAt)}
                                </span>
                              </div>
                              <p className="text-sm mt-1">{reply.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Search,
  MoreHorizontal,
  Star,
  Trash2,
  Eye,
  RefreshCw,
  FileText,
  MessageSquare,
  Heart,
  Flag,
  RotateCcw,
  Pin,
  StarOff,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';

interface Post {
  id: string;
  title?: string;
  content: string;
  type: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
  };
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  isFeatured: boolean;
  isPinned: boolean;
  _count: {
    likes: number;
    comments: number;
    reports: number;
  };
}

type FilterType =
  | 'ALL'
  | 'TEXT'
  | 'IMAGE'
  | 'VIDEO'
  | 'LINK'
  | 'PROJECT_LAUNCH'
  | 'ACHIEVEMENT'
  | 'HIRING'
  | 'IDEA'
  | 'BLOG';
type FilterStatus = 'ALL' | 'ACTIVE' | 'DELETED' | 'FEATURED' | 'REPORTED';

export default function AdminPostsPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('ALL');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [page, setPage] = useState(1);

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  // Fetch posts
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-posts', search, typeFilter, statusFilter, page],
    queryFn: async () => {
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      if (typeFilter !== 'ALL') params.type = typeFilter;
      if (statusFilter === 'ACTIVE') params.active = true;
      if (statusFilter === 'DELETED') params.deleted = true;
      if (statusFilter === 'FEATURED') params.featured = true;
      if (statusFilter === 'REPORTED') params.reported = true;
      return apiClient.getPaginated<Post>('/admin/posts', { params });
    },
  });

  const posts = data?.data || [];
  const totalPages = data?.pagination?.totalPages || 1;
  const totalPosts = data?.pagination?.total || 0;
  const featuredCount = posts.filter((p) => p.isFeatured).length;
  const reportedCount = posts.filter((p) => (p._count?.reports || 0) > 0).length;
  const deletedCount = posts.filter((p) => !!p.deletedAt).length;

  // Delete post mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ postId, reason }: { postId: string; reason: string }) => {
      return apiClient.delete(`/admin/posts/${postId}`, { data: { reason } });
    },
    onSuccess: () => {
      toast.success('Post deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      setDeleteDialogOpen(false);
      setDeleteReason('');
      setSelectedPost(null);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete post');
    },
  });

  // Restore post mutation
  const restoreMutation = useMutation({
    mutationFn: async (postId: string) => {
      return apiClient.post(`/admin/posts/${postId}/restore`);
    },
    onSuccess: () => {
      toast.success('Post restored successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to restore post');
    },
  });

  // Feature post mutation
  const featureMutation = useMutation({
    mutationFn: async ({ postId, featured }: { postId: string; featured: boolean }) => {
      return apiClient.post(`/admin/posts/${postId}/feature`, { featured });
    },
    onSuccess: () => {
      toast.success('Post updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update post');
    },
  });

  // Pin post mutation
  const pinMutation = useMutation({
    mutationFn: async ({ postId, pinned }: { postId: string; pinned: boolean }) => {
      return apiClient.patch(`/admin/posts/${postId}`, { pinned });
    },
    onSuccess: () => {
      toast.success('Post updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update post');
    },
  });

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'IMAGE':
        return 'default';
      case 'VIDEO':
        return 'secondary';
      case 'LINK':
        return 'outline';
      case 'HIRING':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Posts Management</h1>
          <p className="text-muted-foreground">
            Manage {totalPosts.toLocaleString()} posts across the platform
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-500/10 rounded-full">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Posts</p>
                <p className="text-2xl font-bold">{totalPosts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-yellow-500/10 rounded-full">
                <Star className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Featured</p>
                <p className="text-2xl font-bold">{featuredCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-red-500/10 rounded-full">
                <Flag className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reported</p>
                <p className="text-2xl font-bold">{reportedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-gray-500/10 rounded-full">
                <Trash2 className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Deleted</p>
                <p className="text-2xl font-bold">{deletedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search posts by title or content..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as FilterType)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="TEXT">Text</SelectItem>
                <SelectItem value="IMAGE">Image</SelectItem>
                <SelectItem value="VIDEO">Video</SelectItem>
                <SelectItem value="LINK">Link</SelectItem>
                <SelectItem value="PROJECT_LAUNCH">Project Launch</SelectItem>
                <SelectItem value="ACHIEVEMENT">Achievement</SelectItem>
                <SelectItem value="HIRING">Hiring</SelectItem>
                <SelectItem value="IDEA">Idea</SelectItem>
                <SelectItem value="BLOG">Blog</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatus)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="FEATURED">Featured</SelectItem>
                <SelectItem value="REPORTED">Reported</SelectItem>
                <SelectItem value="DELETED">Deleted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Posts Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Post</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Engagement</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading posts...
                  </TableCell>
                </TableRow>
              ) : posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No posts found
                  </TableCell>
                </TableRow>
              ) : (
                posts.map((post: Post) => (
                  <TableRow key={post.id} className={cn(post.deletedAt && "opacity-50")}>
                    <TableCell>
                      <div className="max-w-[300px]">
                        <div className="flex items-center gap-2">
                          {post.isFeatured && (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          )}
                          {post.isPinned && (
                            <Pin className="h-4 w-4 text-blue-500" />
                          )}
                          <Link
                            href={`/posts/${post.id}`}
                            className="font-medium hover:underline truncate"
                          >
                            {post.title || post.content?.slice(0, 80) || 'Untitled Post'}
                          </Link>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {post.content.substring(0, 100)}...
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={post.author?.avatar || undefined} />
                          <AvatarFallback>
                            {post.author?.displayName?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <Link
                          href={`/profile/${post.author?.username}`}
                          className="text-sm hover:underline"
                        >
                          {post.author?.displayName || post.author?.username}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTypeBadgeVariant(post.type)}>
                        {post.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {post.deletedAt ? (
                          <Badge variant="destructive">Deleted</Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-500 border-green-500">
                            Active
                          </Badge>
                        )}
                        {(post._count?.reports || 0) > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            <Flag className="h-3 w-3 mr-1" />
                            {post._count.reports} reports
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          {post._count?.likes || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          {post._count?.comments || 0}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/posts/${post.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Post
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {!post.isFeatured ? (
                            <DropdownMenuItem
                              onClick={() => featureMutation.mutate({ postId: post.id, featured: true })}
                            >
                              <Star className="h-4 w-4 mr-2" />
                              Feature Post
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => featureMutation.mutate({ postId: post.id, featured: false })}
                            >
                              <StarOff className="h-4 w-4 mr-2" />
                              Unfeature Post
                            </DropdownMenuItem>
                          )}
                          {!post.isPinned ? (
                            <DropdownMenuItem
                              onClick={() => pinMutation.mutate({ postId: post.id, pinned: true })}
                            >
                              <Pin className="h-4 w-4 mr-2" />
                              Pin Post
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => pinMutation.mutate({ postId: post.id, pinned: false })}
                            >
                              <Pin className="h-4 w-4 mr-2" />
                              Unpin Post
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {post.deletedAt ? (
                            <DropdownMenuItem
                              onClick={() => restoreMutation.mutate(post.id)}
                              className="text-green-600"
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Restore Post
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedPost(post);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Post
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedPost?.title}"?
              The author will be notified about this action.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason for deletion</label>
              <Textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Enter the reason for deleting this post..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedPost) {
                  deleteMutation.mutate({ postId: selectedPost.id, reason: deleteReason });
                }
              }}
              disabled={!deleteReason || deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

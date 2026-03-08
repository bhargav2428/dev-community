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
  Trash2,
  Eye,
  RefreshCw,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Users,
  RotateCcw,
  Star,
  CheckCircle,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';

interface Idea {
  id: string;
  slug?: string;
  title: string;
  description?: string | null;
  problem?: string;
  status: string;
  stage: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
  };
  createdAt: string;
  deletedAt: string | null;
  _count: {
    upvotes: number;
    downvotes: number;
    comments: number;
    collaborators: number;
  };
}

type FilterStatus = 'ALL' | 'OPEN' | 'BUILDING' | 'CLOSED' | 'ARCHIVED';
type FilterStage = 'ALL' | 'CONCEPT' | 'VALIDATING' | 'BUILDING' | 'LAUNCHED';

export default function AdminIdeasPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [stageFilter, setStageFilter] = useState<FilterStage>('ALL');
  const [page, setPage] = useState(1);

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  // Fetch ideas
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-ideas', search, statusFilter, stageFilter, page],
    queryFn: async () => {
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (stageFilter !== 'ALL') params.stage = stageFilter;
      return apiClient.getPaginated<Idea>('/admin/ideas', { params });
    },
  });

  const ideas = data?.data || [];
  const totalPages = data?.pagination?.totalPages || 1;
  const totalIdeas = data?.pagination?.total || 0;
  const openCount = ideas.filter((i) => i.status === 'OPEN').length;
  const inProgressCount = ideas.filter((i) => i.status === 'BUILDING').length;
  const implementedCount = ideas.filter((i) => i.status === 'CLOSED').length;

  // Delete idea mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ ideaId, reason }: { ideaId: string; reason: string }) => {
      return apiClient.delete(`/admin/ideas/${ideaId}`, { data: { reason } });
    },
    onSuccess: () => {
      toast.success('Idea deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-ideas'] });
      setDeleteDialogOpen(false);
      setDeleteReason('');
      setSelectedIdea(null);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete idea');
    },
  });

  // Restore idea mutation
  const restoreMutation = useMutation({
    mutationFn: async (ideaId: string) => {
      return apiClient.post(`/admin/ideas/${ideaId}/restore`);
    },
    onSuccess: () => {
      toast.success('Idea restored successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-ideas'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to restore idea');
    },
  });

  // Update status mutation
  const statusMutation = useMutation({
    mutationFn: async ({ ideaId, status }: { ideaId: string; status: string }) => {
      return apiClient.patch(`/admin/ideas/${ideaId}`, { status });
    },
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-ideas'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update status');
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" /> Open</Badge>;
      case 'BUILDING':
        return <Badge variant="secondary"><Star className="h-3 w-3 mr-1" /> In Progress</Badge>;
      case 'CLOSED':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" /> Implemented</Badge>;
      case 'ARCHIVED':
        return <Badge variant="destructive">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ideas Management</h1>
          <p className="text-muted-foreground">
            Manage {totalIdeas.toLocaleString()} community ideas
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
              <div className="p-2 bg-yellow-500/10 rounded-full">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Ideas</p>
                <p className="text-2xl font-bold">{totalIdeas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-500/10 rounded-full">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Open</p>
                <p className="text-2xl font-bold">{openCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-500/10 rounded-full">
                <Star className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{inProgressCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-500/10 rounded-full">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Implemented</p>
                <p className="text-2xl font-bold">{implementedCount}</p>
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
                placeholder="Search ideas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatus)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="BUILDING">In Progress</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stageFilter} onValueChange={(v) => setStageFilter(v as FilterStage)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Stages</SelectItem>
                <SelectItem value="CONCEPT">Concept</SelectItem>
                <SelectItem value="VALIDATING">Validating</SelectItem>
                <SelectItem value="BUILDING">Building</SelectItem>
                <SelectItem value="LAUNCHED">Launched</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Ideas Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Idea</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Votes</TableHead>
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
                    Loading ideas...
                  </TableCell>
                </TableRow>
              ) : ideas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No ideas found
                  </TableCell>
                </TableRow>
              ) : (
                ideas.map((idea: Idea) => (
                  <TableRow key={idea.id} className={cn(idea.deletedAt && "opacity-50")}>
                    <TableCell>
                      <div className="max-w-[300px]">
                        <Link
                          href={`/ideas/${idea.slug || idea.id}`}
                          className="font-medium hover:underline"
                        >
                          {idea.title}
                        </Link>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {(idea.description || idea.problem || '').substring(0, 100)}...
                        </p>
                        <Badge variant="outline" className="mt-2 text-xs">
                          {idea.stage}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={idea.author?.avatar || undefined} />
                          <AvatarFallback>
                            {idea.author?.displayName?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <Link
                          href={`/profile/${idea.author?.username}`}
                          className="text-sm hover:underline"
                        >
                          {idea.author?.displayName}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(idea.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="flex items-center gap-1 text-green-600">
                          <ThumbsUp className="h-4 w-4" />
                          {idea._count?.upvotes || 0}
                        </span>
                        <span className="flex items-center gap-1 text-red-500">
                          <ThumbsDown className="h-4 w-4" />
                          {idea._count?.downvotes || 0}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          {idea._count?.comments || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {idea._count?.collaborators || 0}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(idea.createdAt), { addSuffix: true })}
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
                            <Link href={`/ideas/${idea.slug || idea.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Idea
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-xs text-muted-foreground">
                            Change Status
                          </DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => statusMutation.mutate({ ideaId: idea.id, status: 'OPEN' })}>
                            Open
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => statusMutation.mutate({ ideaId: idea.id, status: 'BUILDING' })}>
                            In Progress
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => statusMutation.mutate({ ideaId: idea.id, status: 'CLOSED' })}>
                            Closed
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => statusMutation.mutate({ ideaId: idea.id, status: 'ARCHIVED' })}>
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {idea.deletedAt ? (
                            <DropdownMenuItem
                              onClick={() => restoreMutation.mutate(idea.id)}
                              className="text-green-600"
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Restore
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedIdea(idea);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
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
            <DialogTitle>Delete Idea</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedIdea?.title}"?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason for deletion</label>
              <Textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Enter the reason..."
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
                if (selectedIdea) {
                  deleteMutation.mutate({ ideaId: selectedIdea.id, reason: deleteReason });
                }
              }}
              disabled={!deleteReason || deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
  FolderKanban,
  Users,
  GitFork,
  Flag,
  RotateCcw,
  ExternalLink,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';

interface Project {
  id: string;
  slug?: string;
  name: string;
  description: string;
  status: string;
  visibility: string;
  githubUrl: string | null;
  demoUrl: string | null;
  owner: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string | null;
  };
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  isFeatured: boolean;
  _count: {
    members: number;
  };
}

type FilterStatus = 'ALL' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
type FilterVisibility = 'ALL' | 'PUBLIC' | 'PRIVATE' | 'TEAM_ONLY';

export default function AdminProjectsPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [visibilityFilter, setVisibilityFilter] = useState<FilterVisibility>('ALL');
  const [page, setPage] = useState(1);

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  // Fetch projects
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-projects', search, statusFilter, visibilityFilter, page],
    queryFn: async () => {
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (visibilityFilter !== 'ALL') params.visibility = visibilityFilter;
      return apiClient.getPaginated<Project>('/admin/projects', { params });
    },
  });

  const projects = data?.data || [];
  const totalPages = data?.pagination?.totalPages || 1;
  const totalProjects = data?.pagination?.total || 0;
  const completedCount = projects.filter((p) => p.status === 'COMPLETED').length;
  const inProgressCount = projects.filter((p) => p.status === 'ACTIVE').length;
  const featuredCount = projects.filter((p) => p.isFeatured).length;

  // Delete project mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ projectId, reason }: { projectId: string; reason: string }) => {
      return apiClient.delete(`/admin/projects/${projectId}`, { data: { reason } });
    },
    onSuccess: () => {
      toast.success('Project deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      setDeleteDialogOpen(false);
      setDeleteReason('');
      setSelectedProject(null);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete project');
    },
  });

  // Restore project mutation
  const restoreMutation = useMutation({
    mutationFn: async (projectId: string) => {
      return apiClient.put(`/admin/projects/${projectId}/restore`);
    },
    onSuccess: () => {
      toast.success('Project restored successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to restore project');
    },
  });

  // Feature project mutation
  const featureMutation = useMutation({
    mutationFn: async ({ projectId, featured }: { projectId: string; featured: boolean }) => {
      return apiClient.put(`/admin/projects/${projectId}/feature`, { featured });
    },
    onSuccess: () => {
      toast.success('Project updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update project');
    },
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'default';
      case 'ACTIVE':
        return 'secondary';
      case 'PAUSED':
        return 'destructive';
      case 'ARCHIVED':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-3 w-3 mr-1" />;
      case 'ACTIVE':
        return <Clock className="h-3 w-3 mr-1" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects Management</h1>
          <p className="text-muted-foreground">
            Manage {totalProjects.toLocaleString()} projects across the platform
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
              <div className="p-2 bg-purple-500/10 rounded-full">
                <FolderKanban className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Projects</p>
                <p className="text-2xl font-bold">{totalProjects}</p>
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
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedCount}</p>
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
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{inProgressCount}</p>
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
      </div>

      {/* Filters & Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects by title or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatus)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PAUSED">Paused</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={visibilityFilter} onValueChange={(v) => setVisibilityFilter(v as FilterVisibility)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="PUBLIC">Public</SelectItem>
                <SelectItem value="PRIVATE">Private</SelectItem>
                <SelectItem value="TEAM_ONLY">Team Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Projects Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading projects...
                  </TableCell>
                </TableRow>
              ) : projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No projects found
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project: Project) => (
                  <TableRow key={project.id} className={cn(project.deletedAt && "opacity-50")}>
                    <TableCell>
                      <div className="max-w-[300px]">
                        <div className="flex items-center gap-2">
                          {project.isFeatured && (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          )}
                          <Link
                            href={`/projects/${project.slug || project.id}`}
                            className="font-medium hover:underline truncate"
                          >
                            {project.name}
                          </Link>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {project.description?.substring(0, 80)}...
                        </p>
                        <div className="flex gap-2 mt-2">
                          {project.githubUrl && (
                            <a
                              href={project.githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                            >
                              <GitFork className="h-3 w-3" /> Repo
                            </a>
                          )}
                          {project.demoUrl && (
                            <a
                              href={project.demoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" /> Live
                            </a>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={project.owner?.avatar || undefined} />
                          <AvatarFallback>
                            {project.owner?.displayName?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <Link
                          href={`/profile/${project.owner?.username}`}
                          className="text-sm hover:underline"
                        >
                          {project.owner?.displayName || project.owner?.username}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(project.status)} className="flex items-center w-fit">
                        {getStatusIcon(project.status)}
                          {project.status?.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={project.visibility === 'PUBLIC' ? 'outline' : 'secondary'}>
                        {project.visibility}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {project._count?.members || 1}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
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
                            <Link href={`/projects/${project.slug || project.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Project
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {!project.isFeatured ? (
                            <DropdownMenuItem
                              onClick={() => featureMutation.mutate({ projectId: project.id, featured: true })}
                            >
                              <Star className="h-4 w-4 mr-2" />
                              Feature Project
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => featureMutation.mutate({ projectId: project.id, featured: false })}
                            >
                              <Star className="h-4 w-4 mr-2" />
                              Unfeature Project
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {project.deletedAt ? (
                            <DropdownMenuItem
                              onClick={() => restoreMutation.mutate(project.id)}
                              className="text-green-600"
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Restore Project
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedProject(project);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Project
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
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedProject?.name}"?
              The owner will be notified about this action.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason for deletion</label>
              <Textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Enter the reason for deleting this project..."
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
                if (selectedProject) {
                  deleteMutation.mutate({ projectId: selectedProject.id, reason: deleteReason });
                }
              }}
              disabled={!deleteReason || deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  Flag,
  MessageSquare,
  FileText,
  FolderKanban,
  User,
  Clock,
  Ban,
  Trash2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';

interface Report {
  id: string;
  entityType: 'POST' | 'COMMENT' | 'USER' | 'PROJECT' | 'MESSAGE';
  entityId: string;
  reason: string;
  description: string | null;
  status: 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  reporter: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string | null;
  };
  reportedUser?: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string | null;
  };
  resolvedAt?: string;
  resolution?: string;
}

type FilterType = 'ALL' | 'POST' | 'COMMENT' | 'USER' | 'PROJECT' | 'MESSAGE';
type FilterStatus = 'ALL' | 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';

export default function AdminReportsPage() {
  const queryClient = useQueryClient();

  const [typeFilter, setTypeFilter] = useState<FilterType>('ALL');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('PENDING');
  const [page, setPage] = useState(1);

  // Dialog states
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [resolution, setResolution] = useState('');
  const [action, setAction] = useState<'resolve' | 'dismiss'>('resolve');

  // Fetch reports
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-reports', typeFilter, statusFilter, page],
    queryFn: async () => {
      const params: any = { page, limit: 20 };
      if (typeFilter !== 'ALL') params.type = typeFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      return apiClient.getPaginated<Report>('/admin/reports', { params });
    },
  });

  const reports = data?.data || [];
  const totalPages = data?.pagination?.totalPages || 1;
  const totalReports = data?.pagination?.total || 0;
  const pendingCount = reports.filter((r) => r.status === 'PENDING').length;
  const reviewedCount = reports.filter((r) => r.status === 'REVIEWING').length;
  const resolvedCount = reports.filter((r) => r.status === 'RESOLVED').length;
  const dismissedCount = reports.filter((r) => r.status === 'DISMISSED').length;

  // Resolve report mutation
  const resolveMutation = useMutation({
    mutationFn: async ({
      reportId,
      action,
      resolution,
    }: {
      reportId: string;
      action: 'resolve' | 'dismiss';
      resolution: string;
    }) => {
      return apiClient.post(`/admin/reports/${reportId}/resolve`, {
        action,
        reason: resolution,
      });
    },
    onSuccess: () => {
      toast.success(action === 'resolve' ? 'Report resolved' : 'Report dismissed');
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      setResolveDialogOpen(false);
      setResolution('');
      setSelectedReport(null);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to process report');
    },
  });

  // Quick actions
  const banUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiClient.post(`/admin/users/${userId}/ban`, { reason: 'Reported content violation' });
    },
    onSuccess: () => {
      toast.success('User banned');
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to ban user');
    },
  });

  const deleteContentMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: string }) => {
      const endpoint = type === 'POST' ? `/admin/posts/${id}` : `/admin/comments/${id}`;
      return apiClient.delete(endpoint, { data: { reason: 'Content violation' } });
    },
    onSuccess: () => {
      toast.success('Content deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete content');
    },
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'POST':
        return <FileText className="h-4 w-4" />;
      case 'COMMENT':
        return <MessageSquare className="h-4 w-4" />;
      case 'USER':
        return <User className="h-4 w-4" />;
      case 'PROJECT':
        return <FolderKanban className="h-4 w-4" />;
      default:
        return <Flag className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="destructive"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'REVIEWING':
        return <Badge variant="secondary"><Eye className="h-3 w-3 mr-1" /> Reviewed</Badge>;
      case 'RESOLVED':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" /> Resolved</Badge>;
      case 'DISMISSED':
        return <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" /> Dismissed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Review and manage user reports
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
              <div className="p-2 bg-red-500/10 rounded-full">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-yellow-500/10 rounded-full">
                <Eye className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Under Review</p>
                <p className="text-2xl font-bold">{reviewedCount}</p>
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
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold">{resolvedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-gray-500/10 rounded-full">
                <XCircle className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dismissed</p>
                <p className="text-2xl font-bold">{dismissedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as FilterType)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="POST">Posts</SelectItem>
                <SelectItem value="COMMENT">Comments</SelectItem>
                <SelectItem value="USER">Users</SelectItem>
                <SelectItem value="PROJECT">Projects</SelectItem>
                <SelectItem value="MESSAGE">Messages</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatus)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="REVIEWING">Under Review</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="DISMISSED">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading reports...
            </CardContent>
          </Card>
        ) : reports.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No reports found
            </CardContent>
          </Card>
        ) : (
          reports.map((report: Report) => (
            <Card key={report.id} className={cn(
              report.status === 'PENDING' && 'border-red-500/50',
              report.status === 'RESOLVED' && 'border-green-500/50'
            )}>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  {/* Report Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(report.status)}
                      <Badge variant="outline" className="flex items-center gap-1">
                        {getTypeIcon(report.entityType)}
                        {report.entityType}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                      </span>
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <p className="font-medium text-sm mb-1">Reason: {report.reason}</p>
                      {report.description && (
                        <p className="text-sm text-muted-foreground">{report.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Reporter:</span>
                        <div className="flex items-center gap-1">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={report.reporter?.avatar || undefined} />
                            <AvatarFallback>{report.reporter?.displayName?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <Link href={`/profile/${report.reporter?.username}`} className="hover:underline">
                            {report.reporter?.displayName}
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Reported Content Preview */}
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">Reported Content:</p>
                      {report.entityType === 'USER' && report.reportedUser ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={report.reportedUser.avatar || undefined} />
                            <AvatarFallback>
                              {report.reportedUser.displayName?.charAt(0) || report.reportedUser.username?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <Link href={`/profile/${report.reportedUser.username}`} className="font-medium hover:underline">
                            @{report.reportedUser.username}
                          </Link>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium">Entity Type: {report.entityType}</p>
                          <p className="text-sm text-muted-foreground">Entity ID: {report.entityId}</p>
                        </div>
                      )}
                    </div>

                    {report.resolution && (
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Resolution:</p>
                        <p className="text-sm">{report.resolution}</p>
                        {report.resolvedAt && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Resolved {formatDistanceToNow(new Date(report.resolvedAt), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {report.status === 'PENDING' && (
                    <div className="flex flex-row md:flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedReport(report);
                          setAction('resolve');
                          setResolveDialogOpen(true);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedReport(report);
                          setAction('dismiss');
                          setResolveDialogOpen(true);
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Dismiss
                      </Button>
                      {report.entityType === 'USER' && report.reportedUser && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => banUserMutation.mutate(report.reportedUser!.id)}
                          disabled={banUserMutation.isPending}
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          Ban User
                        </Button>
                      )}
                      {(report.entityType === 'POST' || report.entityType === 'COMMENT') && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteContentMutation.mutate({ type: report.entityType, id: report.entityId })}
                          disabled={deleteContentMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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

      {/* Resolve/Dismiss Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'resolve' ? 'Resolve Report' : 'Dismiss Report'}
            </DialogTitle>
            <DialogDescription>
              {action === 'resolve'
                ? 'Describe the action taken to resolve this report.'
                : 'Explain why this report is being dismissed.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                {action === 'resolve' ? 'Resolution details' : 'Dismiss reason'}
              </label>
              <Textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder={
                  action === 'resolve'
                    ? 'Describe how this report was resolved...'
                    : 'Explain why this report is being dismissed...'
                }
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={action === 'resolve' ? 'default' : 'secondary'}
              onClick={() => {
                if (selectedReport) {
                  resolveMutation.mutate({
                    reportId: selectedReport.id,
                    action: action === 'resolve' ? 'resolve' : 'dismiss',
                    resolution,
                  });
                }
              }}
              disabled={!resolution || resolveMutation.isPending}
            >
              {resolveMutation.isPending
                ? 'Processing...'
                : action === 'resolve'
                ? 'Resolve Report'
                : 'Dismiss Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}



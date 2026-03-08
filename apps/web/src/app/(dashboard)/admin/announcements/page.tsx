'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Megaphone,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  MoreHorizontal,
  RefreshCw,
  AlertTriangle,
  Info,
  CheckCircle,
  Bell,
  Calendar,
  Users,
  Send,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'URGENT';
  targetAudience: 'ALL' | 'USERS' | 'ADMINS' | 'MODERATORS';
  isActive: boolean;
  isPinned: boolean;
  showBanner: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    username: string;
    displayName: string;
  };
  _count?: {
    views: number;
    dismissals: number;
  };
}

type AnnouncementType = 'INFO' | 'WARNING' | 'SUCCESS' | 'URGENT';
type TargetAudience = 'ALL' | 'USERS' | 'ADMINS' | 'MODERATORS';

interface AnnouncementForm {
  title: string;
  content: string;
  type: AnnouncementType;
  targetAudience: TargetAudience;
  isActive: boolean;
  isPinned: boolean;
  showBanner: boolean;
  startDate: string;
  endDate: string;
}

const defaultForm: AnnouncementForm = {
  title: '',
  content: '',
  type: 'INFO',
  targetAudience: 'ALL',
  isActive: true,
  isPinned: false,
  showBanner: false,
  startDate: '',
  endDate: '',
};

export default function AdminAnnouncementsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userRole = (session?.user as any)?.role;

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [form, setForm] = useState<AnnouncementForm>(defaultForm);

  // Check super admin access
  useEffect(() => {
    if (status === 'authenticated' && userRole !== 'SUPER_ADMIN') {
      router.push('/admin');
    }
  }, [session, status, userRole, router]);

  // Fetch announcements
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: async () => {
      const response = await apiClient.getPaginated<any>('/admin/announcements');
      return response.data.map((item: any) => ({
        id: item.id,
        title: item.title || 'Announcement',
        content: item.message || '',
        type: ['INFO', 'WARNING', 'SUCCESS', 'URGENT'].includes((item.entityType || '').toUpperCase())
          ? (item.entityType || '').toUpperCase()
          : 'INFO',
        targetAudience: ['ALL', 'USERS', 'ADMINS', 'MODERATORS'].includes((item.entityId || '').toUpperCase())
          ? (item.entityId || '').toUpperCase()
          : 'ALL',
        isActive: !item.readAt,
        isPinned: false,
        showBanner: false,
        startDate: null,
        endDate: null,
        createdAt: item.createdAt,
        updatedAt: item.createdAt,
        author: {
          id: 'system',
          username: 'system',
          displayName: 'System',
        },
        _count: {
          views: 0,
          dismissals: 0,
        },
      })) as Announcement[];
    },
    enabled: userRole === 'SUPER_ADMIN',
  });

  const announcements = data || [];

  // Create announcement mutation
  const createMutation = useMutation({
    mutationFn: async (announcement: AnnouncementForm) => {
      return apiClient.post('/admin/announcements', {
        title: announcement.title,
        content: announcement.content,
        type: announcement.type,
      });
    },
    onSuccess: () => {
      toast.success('Announcement created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      setCreateDialogOpen(false);
      setForm(defaultForm);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create announcement');
    },
  });

  // Update announcement mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AnnouncementForm> }) => {
      return apiClient.patch(`/admin/announcements/${id}`, {
        title: data.title,
        content: data.content,
        type: data.type,
        targetAudience: data.targetAudience,
        isActive: data.isActive,
      });
    },
    onSuccess: () => {
      toast.success('Announcement updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      setEditDialogOpen(false);
      setSelectedAnnouncement(null);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update announcement');
    },
  });

  // Delete announcement mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/admin/announcements/${id}`);
    },
    onSuccess: () => {
      toast.success('Announcement deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete announcement');
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiClient.patch(`/admin/announcements/${id}`, { isActive });
    },
    onSuccess: () => {
      toast.success('Announcement updated');
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
    },
  });

  const openEditDialog = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setForm({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      targetAudience: announcement.targetAudience,
      isActive: announcement.isActive,
      isPinned: announcement.isPinned,
      showBanner: announcement.showBanner,
      startDate: announcement.startDate ? format(new Date(announcement.startDate), "yyyy-MM-dd'T'HH:mm") : '',
      endDate: announcement.endDate ? format(new Date(announcement.endDate), "yyyy-MM-dd'T'HH:mm") : '',
    });
    setEditDialogOpen(true);
  };

  const getTypeStyles = (type: AnnouncementType) => {
    switch (type) {
      case 'INFO':
        return { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/50' };
      case 'WARNING':
        return { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/50' };
      case 'SUCCESS':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/50' };
      case 'URGENT':
        return { icon: Bell, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/50' };
    }
  };

  if (userRole !== 'SUPER_ADMIN') {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-muted-foreground">Access denied. Super Admin only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Announcements</h1>
          <p className="text-muted-foreground">
            Create and manage platform announcements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Announcement
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-500/10 rounded-full">
                <Megaphone className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">
                  {announcements.filter((a: Announcement) => a.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-orange-500/10 rounded-full">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-bold">
                  {announcements.filter((a: Announcement) => a.startDate && new Date(a.startDate) > new Date()).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-500/10 rounded-full">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Views</p>
                <p className="text-2xl font-bold">
                  {announcements.reduce((sum: number, a: Announcement) => sum + (a._count?.views || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading announcements...
            </CardContent>
          </Card>
        ) : announcements.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Megaphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium">No announcements yet</p>
              <p className="text-muted-foreground mb-4">Create your first announcement to notify users</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Announcement
              </Button>
            </CardContent>
          </Card>
        ) : (
          announcements.map((announcement: Announcement) => {
            const styles = getTypeStyles(announcement.type);
            const Icon = styles.icon;

            return (
              <Card
                key={announcement.id}
                className={cn(
                  "transition-all",
                  !announcement.isActive && "opacity-60",
                  announcement.showBanner && styles.border
                )}
              >
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className={cn("p-2 rounded-full", styles.bg)}>
                          <Icon className={cn("h-4 w-4", styles.color)} />
                        </div>
                        <h3 className="text-lg font-semibold">{announcement.title}</h3>
                        <div className="flex gap-2">
                          <Badge variant={announcement.isActive ? 'default' : 'secondary'}>
                            {announcement.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          {announcement.isPinned && (
                            <Badge variant="outline">Pinned</Badge>
                          )}
                          {announcement.showBanner && (
                            <Badge variant="outline" className="text-orange-500 border-orange-500">
                              Banner
                            </Badge>
                          )}
                          <Badge variant="outline">{announcement.targetAudience}</Badge>
                        </div>
                      </div>

                      <p className="text-muted-foreground">{announcement.content}</p>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>By {announcement.author?.displayName || 'System'}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true })}</span>
                        {announcement._count && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" /> {announcement._count.views} views
                            </span>
                          </>
                        )}
                        {announcement.startDate && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(announcement.startDate), 'MMM d, yyyy')}
                              {announcement.endDate && ` - ${format(new Date(announcement.endDate), 'MMM d, yyyy')}`}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={announcement.isActive}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({ id: announcement.id, isActive: checked })
                        }
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openEditDialog(announcement)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => deleteMutation.mutate(announcement.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) setForm(defaultForm);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Announcement</DialogTitle>
            <DialogDescription>
              Create a new announcement to notify your users
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Announcement title"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Announcement content..."
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as AnnouncementType })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INFO">Info</SelectItem>
                    <SelectItem value="WARNING">Warning</SelectItem>
                    <SelectItem value="SUCCESS">Success</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target Audience</Label>
                <Select
                  value={form.targetAudience}
                  onValueChange={(v) => setForm({ ...form, targetAudience: v as TargetAudience })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Users</SelectItem>
                    <SelectItem value="USERS">Regular Users</SelectItem>
                    <SelectItem value="MODERATORS">Moderators</SelectItem>
                    <SelectItem value="ADMINS">Admins Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date (optional)</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date (optional)</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show as Banner</Label>
                  <p className="text-sm text-muted-foreground">Display at the top of all pages</p>
                </div>
                <Switch
                  checked={form.showBanner}
                  onCheckedChange={(v) => setForm({ ...form, showBanner: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Pin Announcement</Label>
                  <p className="text-sm text-muted-foreground">Keep at the top of the list</p>
                </div>
                <Switch
                  checked={form.isPinned}
                  onCheckedChange={(v) => setForm({ ...form, isPinned: v })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.title || !form.content || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Announcement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) {
          setForm(defaultForm);
          setSelectedAnnouncement(null);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
            <DialogDescription>
              Update the announcement details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as AnnouncementType })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INFO">Info</SelectItem>
                    <SelectItem value="WARNING">Warning</SelectItem>
                    <SelectItem value="SUCCESS">Success</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target Audience</Label>
                <Select
                  value={form.targetAudience}
                  onValueChange={(v) => setForm({ ...form, targetAudience: v as TargetAudience })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Users</SelectItem>
                    <SelectItem value="USERS">Regular Users</SelectItem>
                    <SelectItem value="MODERATORS">Moderators</SelectItem>
                    <SelectItem value="ADMINS">Admins Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-startDate">Start Date</Label>
                <Input
                  id="edit-startDate"
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-endDate">End Date</Label>
                <Input
                  id="edit-endDate"
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Show as Banner</Label>
                <Switch
                  checked={form.showBanner}
                  onCheckedChange={(v) => setForm({ ...form, showBanner: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Pin Announcement</Label>
                <Switch
                  checked={form.isPinned}
                  onCheckedChange={(v) => setForm({ ...form, isPinned: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedAnnouncement) {
                  updateMutation.mutate({ id: selectedAnnouncement.id, data: form });
                }
              }}
              disabled={!form.title || !form.content || updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

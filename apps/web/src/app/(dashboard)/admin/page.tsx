'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  FileText,
  FolderKanban,
  Lightbulb,
  Trophy,
  Briefcase,
  MessageSquare,
  AlertTriangle,
  Shield,
  TrendingUp,
  Activity,
  Ban,
  CheckCircle,
  Search,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminStats {
  totalUsers: number;
  totalPosts: number;
  totalProjects: number;
  totalIdeas: number;
  totalHackathons: number;
  totalJobs: number;
  activeUsers: number;
  reportedContent: number;
  bannedUsers: number;
  newUsersToday: number;
  newPostsToday: number;
}

interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
  deletedAt: string | null;
  _count?: {
    posts: number;
    projects: number;
  };
}

interface ReportedItem {
  id: string;
  entityType: 'POST' | 'COMMENT' | 'USER' | 'PROJECT' | 'MESSAGE';
  entityId: string;
  reason: string;
  description?: string | null;
  createdAt: string;
  status: 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';
  reportedUserId?: string | null;
  reporter: { username: string };
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'content' | 'reports'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  // Check if user is admin
  useEffect(() => {
    if (status === 'authenticated') {
      const userRole = (session?.user as any)?.role;
      if (!['ADMIN', 'SUPER_ADMIN', 'MODERATOR'].includes(userRole)) {
        router.push('/dashboard');
      }
    }
  }, [session, status, router]);

  // Fetch admin stats
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: () => apiClient.get('/admin/stats'),
    enabled: status === 'authenticated',
  });

  // Fetch users list
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', searchQuery],
    queryFn: () =>
      apiClient.getPaginated<User>('/admin/users', {
        params: { search: searchQuery, limit: 50 }
      }),
    enabled: status === 'authenticated' && activeTab === 'users',
  });

  // Fetch reported content
  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => apiClient.getPaginated<ReportedItem>('/admin/reports'),
    enabled: status === 'authenticated' && activeTab === 'reports',
  });

  // Ban user mutation
  const banUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiClient.post(`/admin/users/${userId}/ban`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  // Unban user mutation
  const unbanUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiClient.post(`/admin/users/${userId}/unban`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  // Change user role mutation
  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return apiClient.patch(`/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  // Resolve report mutation
  const resolveReportMutation = useMutation({
    mutationFn: async ({ reportId, action }: { reportId: string; action: 'dismiss' | 'remove' | 'ban' }) => {
      return apiClient.post(`/admin/reports/${reportId}/resolve`, { action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const userRole = (session?.user as any)?.role;
  if (!['ADMIN', 'SUPER_ADMIN', 'MODERATOR'].includes(userRole)) {
    return null;
  }

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'text-blue-500' },
    { label: 'Total Posts', value: stats?.totalPosts || 0, icon: FileText, color: 'text-green-500' },
    { label: 'Total Projects', value: stats?.totalProjects || 0, icon: FolderKanban, color: 'text-purple-500' },
    { label: 'Total Ideas', value: stats?.totalIdeas || 0, icon: Lightbulb, color: 'text-yellow-500' },
    { label: 'Hackathons', value: stats?.totalHackathons || 0, icon: Trophy, color: 'text-orange-500' },
    { label: 'Job Listings', value: stats?.totalJobs || 0, icon: Briefcase, color: 'text-pink-500' },
    { label: 'Active Users (24h)', value: stats?.activeUsers || 0, icon: Activity, color: 'text-cyan-500' },
    { label: 'Reported Content', value: stats?.reportedContent || 0, icon: AlertTriangle, color: 'text-red-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage users, content, and platform settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "px-3 py-1 rounded-full text-sm font-medium",
            userRole === 'SUPER_ADMIN' ? 'bg-red-500/20 text-red-500' :
            userRole === 'ADMIN' ? 'bg-orange-500/20 text-orange-500' :
            'bg-blue-500/20 text-blue-500'
          )}>
            {userRole}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b pb-4">
        {(['overview', 'users', 'content', 'reports'] as const).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'ghost'}
            onClick={() => setActiveTab(tab)}
            className="capitalize"
          >
            {tab}
          </Button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold mt-1">
                        {statsLoading ? '...' : stat.value.toLocaleString()}
                      </p>
                    </div>
                    <stat.icon className={cn("h-8 w-8", stat.color)} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  New Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">New Users</span>
                    <span className="font-medium">{stats?.newUsersToday || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">New Posts</span>
                    <span className="font-medium">{stats?.newPostsToday || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Ban className="h-5 w-5 text-red-500" />
                  Moderation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Banned Users</span>
                    <span className="font-medium">{stats?.bannedUsers || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pending Reports</span>
                    <span className="font-medium text-orange-500">{stats?.reportedContent || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  Platform Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Users</span>
                    <span className="font-medium text-green-500">{stats?.activeUsers || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium text-green-500">Healthy</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by username, email, or name..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Users List */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium">User</th>
                      <th className="text-left p-4 font-medium">Email</th>
                      <th className="text-left p-4 font-medium">Role</th>
                      <th className="text-left p-4 font-medium">Joined</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {usersLoading ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-muted-foreground">
                          Loading users...
                        </td>
                      </tr>
                    ) : usersData?.data?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-muted-foreground">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      usersData?.data?.map((user: User) => (
                        <tr key={user.id} className="hover:bg-muted/50">
                          <td className="p-4">
                            <div>
                              <p className="font-medium">{user.displayName || user.username}</p>
                              <p className="text-sm text-muted-foreground">@{user.username}</p>
                            </div>
                          </td>
                          <td className="p-4 text-sm">{user.email}</td>
                          <td className="p-4">
                            <select
                              className="text-sm bg-transparent border rounded px-2 py-1"
                              value={user.role}
                              onChange={(e) => changeRoleMutation.mutate({ userId: user.id, role: e.target.value })}
                              disabled={userRole !== 'SUPER_ADMIN' && user.role === 'ADMIN'}
                            >
                              <option value="USER">USER</option>
                              <option value="MODERATOR">MODERATOR</option>
                              {userRole === 'SUPER_ADMIN' && (
                                <>
                                  <option value="ADMIN">ADMIN</option>
                                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                                </>
                              )}
                            </select>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            {user.deletedAt ? (
                              <span className="text-red-500 text-sm flex items-center gap-1">
                                <Ban className="h-3 w-3" /> Banned
                              </span>
                            ) : (
                              <span className="text-green-500 text-sm flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" /> Active
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            {user.deletedAt ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => unbanUserMutation.mutate(user.id)}
                                disabled={unbanUserMutation.isPending}
                              >
                                Unban
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => banUserMutation.mutate(user.id)}
                                disabled={banUserMutation.isPending || user.role === 'SUPER_ADMIN'}
                              >
                                Ban
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reported Content</CardTitle>
              <CardDescription>Review and moderate reported content</CardDescription>
            </CardHeader>
            <CardContent>
              {reportsLoading ? (
                <p className="text-center text-muted-foreground py-8">Loading reports...</p>
              ) : reports?.data?.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending reports!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports?.data?.map((report: ReportedItem) => (
                    <div key={report.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-sm px-2 py-1 bg-muted rounded capitalize">
                            {report.entityType}
                          </span>
                          <p className="text-sm text-muted-foreground mt-1">
                            Reported by @{report.reporter.username}
                          </p>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm mb-4">
                        <strong>Reason:</strong> {report.reason}
                        {report.description ? ` - ${report.description}` : ''}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolveReportMutation.mutate({ reportId: report.id, action: 'dismiss' })}
                        >
                          Dismiss
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => resolveReportMutation.mutate({ reportId: report.id, action: 'remove' })}
                        >
                          Remove Content
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => resolveReportMutation.mutate({ reportId: report.id, action: 'ban' })}
                          disabled={!report.reportedUserId}
                        >
                          Ban User
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Management</CardTitle>
              <CardDescription>Manage posts, projects, and ideas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/admin/posts')}>
                <FileText className="h-4 w-4 mr-2" />
                Manage Posts
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/admin/projects')}>
                <FolderKanban className="h-4 w-4 mr-2" />
                Manage Projects
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/admin/ideas')}>
                <Lightbulb className="h-4 w-4 mr-2" />
                Manage Ideas
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/admin/hackathons')}>
                <Trophy className="h-4 w-4 mr-2" />
                Manage Hackathons
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/admin/jobs')}>
                <Briefcase className="h-4 w-4 mr-2" />
                Manage Jobs
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Platform Settings</CardTitle>
              <CardDescription>Configure platform-wide settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Registration</h4>
                <p className="text-sm text-muted-foreground">Open registration is enabled</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Content Moderation</h4>
                <p className="text-sm text-muted-foreground">Auto-moderation: Disabled</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Email Notifications</h4>
                <p className="text-sm text-muted-foreground">Status: Disabled</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

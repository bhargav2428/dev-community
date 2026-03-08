'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
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
  Users,
  FileText,
  FolderKanban,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Globe,
  Clock,
  Eye,
  Heart,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

type TimeRange = '7d' | '30d' | '90d' | '1y';

export default function AdminAnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const userRole = (session?.user as any)?.role;

  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  // Check super admin access
  useEffect(() => {
    if (status === 'authenticated' && userRole !== 'SUPER_ADMIN') {
      router.push('/admin');
    }
  }, [session, status, userRole, router]);

  // Fetch analytics
  const { data: analytics, isLoading, refetch } = useQuery<any>({
    queryKey: ['admin-analytics', timeRange],
    queryFn: () => apiClient.get('/admin/analytics', { params: { period: timeRange } }),
    enabled: userRole === 'SUPER_ADMIN',
  });

  const { data: stats } = useQuery<any>({
    queryKey: ['admin-stats-lite'],
    queryFn: () => apiClient.get('/admin/stats'),
    enabled: userRole === 'SUPER_ADMIN',
  });

  if (userRole !== 'SUPER_ADMIN') {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-muted-foreground">Access denied. Super Admin only.</p>
      </div>
    );
  }

  const overview = {
    totalUsers: stats?.totalUsers || 0,
    userGrowth: analytics?.userGrowth || 0,
    totalPosts: stats?.totalPosts || 0,
    postGrowth: analytics?.postGrowth || 0,
    totalProjects: stats?.totalProjects || 0,
    projectGrowth: 0,
    totalComments: analytics?.engagement?.comments || 0,
    commentGrowth: 0,
    activeUsers: stats?.activeUsers || 0,
    avgSessionDuration: 0,
    bounceRate: 0,
    pageViews: (analytics?.topPosts || []).reduce((sum: number, p: any) => sum + (p.viewsCount || 0), 0),
  };

  const GrowthIndicator = ({ value }: { value: number }) => (
    <span className={cn(
      "flex items-center text-sm font-medium",
      value >= 0 ? "text-green-500" : "text-red-500"
    )}>
      {value >= 0 ? (
        <ArrowUpRight className="h-4 w-4" />
      ) : (
        <ArrowDownRight className="h-4 w-4" />
      )}
      {Math.abs(value).toFixed(1)}%
    </span>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Platform performance and user insights
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-3xl font-bold mt-1">
                  {isLoading ? '...' : overview.totalUsers.toLocaleString()}
                </p>
                <GrowthIndicator value={overview.userGrowth} />
              </div>
              <div className="p-3 bg-blue-500/10 rounded-full">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Total Posts</p>
                <p className="text-3xl font-bold mt-1">
                  {isLoading ? '...' : overview.totalPosts.toLocaleString()}
                </p>
                <GrowthIndicator value={overview.postGrowth} />
              </div>
              <div className="p-3 bg-green-500/10 rounded-full">
                <FileText className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Total Projects</p>
                <p className="text-3xl font-bold mt-1">
                  {isLoading ? '...' : overview.totalProjects.toLocaleString()}
                </p>
                <GrowthIndicator value={overview.projectGrowth} />
              </div>
              <div className="p-3 bg-purple-500/10 rounded-full">
                <FolderKanban className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Comments</p>
                <p className="text-3xl font-bold mt-1">
                  {isLoading ? '...' : overview.totalComments.toLocaleString()}
                </p>
                <GrowthIndicator value={overview.commentGrowth} />
              </div>
              <div className="p-3 bg-orange-500/10 rounded-full">
                <MessageSquare className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-full">
                <Activity className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Users (24h)</p>
                <p className="text-xl font-bold">{overview.activeUsers.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-500/10 rounded-full">
                <Clock className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Session</p>
                <p className="text-xl font-bold">{Math.round(overview.avgSessionDuration / 60)}m</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-full">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bounce Rate</p>
                <p className="text-xl font-bold">{overview.bounceRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-full">
                <Eye className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Page Views</p>
                <p className="text-xl font-bold">{overview.pageViews.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Activity Chart Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              User Activity
            </CardTitle>
            <CardDescription>Daily active users over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center border rounded-lg bg-muted/30">
              <div className="text-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Chart visualization</p>
                <p className="text-sm">Integrate with chart library (recharts, chart.js)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Content Distribution
            </CardTitle>
            <CardDescription>Breakdown of content types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span>Discussions</span>
                </div>
                <span className="font-medium">45%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span>Questions</span>
                </div>
                <span className="font-medium">30%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full" />
                  <span>Showcases</span>
                </div>
                <span className="font-medium">15%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full" />
                  <span>Tutorials</span>
                </div>
                <span className="font-medium">10%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Content & Demographics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Posts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Performing Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(analytics?.topPosts || []).slice(0, 5).map((post: any, index: number) => (
                <div key={post.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground w-6">
                      #{index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{post.content?.slice(0, 70) || 'Post'}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {post.viewsCount || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" /> {post._count?.likes || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {(!analytics?.topPosts || analytics.topPosts.length === 0) && (
                <p className="text-muted-foreground text-center py-4">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Retention */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              User Retention
            </CardTitle>
            <CardDescription>Percentage of users returning</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Week 1</span>
                  <span className="font-medium">{analytics?.retention?.week1 || 0}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${analytics?.retention?.week1 || 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Week 2</span>
                  <span className="font-medium">{analytics?.retention?.week2 || 0}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${analytics?.retention?.week2 || 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Week 4</span>
                  <span className="font-medium">{analytics?.retention?.week4 || 0}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${analytics?.retention?.week4 || 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Week 8</span>
                  <span className="font-medium">{analytics?.retention?.week8 || 0}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full"
                    style={{ width: `${analytics?.retention?.week8 || 0}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Geographic Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Geographic Distribution
          </CardTitle>
          <CardDescription>Top countries by user count</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(analytics?.demographics?.countries || []).slice(0, 4).map((country: any) => (
              <div key={country.country} className="p-4 border rounded-lg">
                <p className="font-medium">{country.country}</p>
                <p className="text-2xl font-bold">{country.users.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">{country.percentage.toFixed(1)}% of users</p>
              </div>
            ))}
            {(!analytics?.demographics?.countries || analytics.demographics.countries.length === 0) && (
              <p className="text-muted-foreground col-span-4 text-center py-4">
                Geographic data not available
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

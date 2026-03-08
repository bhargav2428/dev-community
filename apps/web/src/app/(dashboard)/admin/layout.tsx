'use client';

import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import {
  Shield,
  Users,
  FileText,
  FolderKanban,
  Lightbulb,
  Briefcase,
  Trophy,
  BarChart3,
  Settings,
  Bell,
  ScrollText,
  Home,
  ChevronRight,
  LogOut,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { signOut } from 'next-auth/react';

const sidebarItems = [
  { label: 'Dashboard', href: '/admin', icon: Home },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Posts', href: '/admin/posts', icon: FileText },
  { label: 'Projects', href: '/admin/projects', icon: FolderKanban },
  { label: 'Ideas', href: '/admin/ideas', icon: Lightbulb },
  { label: 'Jobs', href: '/admin/jobs', icon: Briefcase },
  { label: 'Hackathons', href: '/admin/hackathons', icon: Trophy },
  { label: 'Reports', href: '/admin/reports', icon: AlertTriangle },
  { divider: true },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3, superAdminOnly: true },
  { label: 'Announcements', href: '/admin/announcements', icon: Bell, superAdminOnly: true },
  { label: 'Audit Logs', href: '/admin/logs', icon: ScrollText, superAdminOnly: true },
  { label: 'Settings', href: '/admin/settings', icon: Settings, superAdminOnly: true },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const userRole = (session?.user as any)?.role;
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);
  const isModerator = ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'].includes(userRole);

  useEffect(() => {
    if (status === 'authenticated' && !isModerator) {
      router.push('/dashboard');
    }
  }, [status, isModerator, router]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isModerator) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="font-bold text-lg">Admin Panel</h1>
              <p className="text-xs text-muted-foreground">DevConnect</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {sidebarItems.map((item, index) => {
            if ('divider' in item && item.divider) {
              return <div key={index} className="h-px bg-border my-3" />;
            }

            // Check permissions
            if (item.superAdminOnly && !isSuperAdmin) {
              return null;
            }

            const isActive = pathname === item.href;
            const Icon = item.icon ?? Shield;

            return (
              <Link
                key={item.href}
                href={item.href!}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="font-semibold text-primary">
                {session?.user?.name?.[0] || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {(session?.user as any)?.displayName || session?.user?.name}
              </p>
              <p className={cn(
                'text-xs font-medium',
                isSuperAdmin ? 'text-red-500' : isAdmin ? 'text-orange-500' : 'text-blue-500'
              )}>
                {userRole}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => router.push('/dashboard')}
            >
              Main Site
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

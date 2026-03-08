'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Bell,
  MessageSquare,
  Heart,
  UserPlus,
  Star,
  AtSign,
  Check,
  CheckCheck,
  Settings,
} from 'lucide-react';
import { formatRelativeTime, cn } from '@/lib/utils';

type NotificationType = 'all' | 'mentions' | 'likes' | 'follows' | 'messages' | 'projects';

const notificationTypes: { id: NotificationType; label: string; icon: any }[] = [
  { id: 'all', label: 'All', icon: Bell },
  { id: 'mentions', label: 'Mentions', icon: AtSign },
  { id: 'likes', label: 'Likes', icon: Heart },
  { id: 'follows', label: 'Follows', icon: UserPlus },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'projects', label: 'Projects', icon: Star },
];

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<NotificationType>('all');

  const apiTypeMap: Record<Exclude<NotificationType, 'all'>, string> = {
    mentions: 'MENTION',
    likes: 'LIKE',
    follows: 'FOLLOW',
    messages: 'MESSAGE',
    projects: 'PROJECT_INVITE',
  };

  const apiType = filter === 'all' ? '' : `?type=${apiTypeMap[filter]}`;

  const { data: notifications, isLoading, isError } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () => apiClient.get(`/notifications${apiType}`),
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => apiClient.post('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'LIKE':
        return Heart;
      case 'COMMENT':
      case 'REPLY':
        return MessageSquare;
      case 'FOLLOW':
        return UserPlus;
      case 'MENTION':
        return AtSign;
      case 'PROJECT_INVITE':
        return Star;
      case 'MESSAGE':
        return MessageSquare;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'LIKE':
        return 'text-red-500 bg-red-500/10';
      case 'COMMENT':
      case 'REPLY':
        return 'text-blue-500 bg-blue-500/10';
      case 'FOLLOW':
        return 'text-purple-500 bg-purple-500/10';
      case 'MENTION':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'PROJECT_INVITE':
        return 'text-amber-500 bg-amber-500/10';
      default:
        return 'text-primary bg-primary/10';
    }
  };

  const displayNotifications = Array.isArray(notifications) ? notifications : [];
  const unreadCount = displayNotifications.filter((n: any) => !n.isRead).length;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-muted-foreground mt-1">
              You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
          <Button variant="outline" size="icon" asChild>
            <Link href="/settings?tab=notifications">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {notificationTypes.map((type) => {
          const Icon = type.icon;
          return (
            <Button
              key={type.id}
              variant={filter === type.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(type.id)}
            >
              <Icon className="h-4 w-4 mr-2" />
              {type.label}
            </Button>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-4 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="p-10 text-center text-red-500">
              Failed to load notifications.
            </div>
          ) : displayNotifications.length > 0 ? (
            <div className="divide-y">
              {displayNotifications.map((notification: any) => {
                const Icon = getNotificationIcon(notification.type);
                const colorClass = getNotificationColor(notification.type);
                const isRead = Boolean(notification.isRead);

                return (
                  <Link
                    key={notification.id}
                    href={notification.actionUrl || '#'}
                    className={cn(
                      'flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors',
                      !isRead && 'bg-primary/5'
                    )}
                    onClick={() => {
                      if (!isRead) {
                        markAsReadMutation.mutate(notification.id);
                      }
                    }}
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                        colorClass
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm', !isRead && 'font-medium')}>
                        {notification.title ? `${notification.title}: ` : ''}
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                    {isRead ? (
                      <Check className="h-4 w-4 text-muted-foreground mt-2" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                    )}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-16 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No notifications yet</h3>
              <p className="text-muted-foreground">
                When you get notifications, they&apos;ll show up here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

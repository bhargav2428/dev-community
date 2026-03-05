'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  MapPin,
  Link as LinkIcon,
  Calendar,
  Github,
  Linkedin,
  Twitter,
  Mail,
  MessageSquare,
  UserPlus,
  UserMinus,
  Edit,
  Star,
  GitFork,
  Users,
  Briefcase,
  Trophy,
  Code,
  ExternalLink,
} from 'lucide-react';
import { formatRelativeTime, cn } from '@/lib/utils';

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => apiClient.get(`/users/${username}`),
  });

  const { data: userPosts } = useQuery({
    queryKey: ['user-posts', username],
    queryFn: () => apiClient.get(`/users/${username}/posts`),
    enabled: !!username,
  });

  const { data: userProjects } = useQuery({
    queryKey: ['user-projects', username],
    queryFn: () => apiClient.get(`/users/${username}/projects`),
    enabled: !!username,
  });

  const followMutation = useMutation({
    mutationFn: () => apiClient.post(`/users/${username}/follow`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => apiClient.delete(`/users/${username}/follow`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
    },
  });

  const startConversationMutation = useMutation({
    mutationFn: (userId: string) => apiClient.post(`/messages/conversations/direct/${userId}`),
    onSuccess: (data) => {
      const conversationId = data?.data?.id || data?.id;
      router.push(`/messages?conversation=${conversationId}`);
    },
  });

  const handleMessageClick = () => {
    if (user?.id) {
      startConversationMutation.mutate(user.id);
    }
  };

  const isOwnProfile = session?.user?.name === username || session?.user?.email?.split('@')[0] === username;
  const user = profile?.data;
  const isFollowing = user?.isFollowing;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="animate-pulse">
          <div className="h-32 bg-muted rounded-t-xl" />
          <div className="bg-card rounded-b-xl p-6">
            <div className="flex items-end gap-4 -mt-16">
              <div className="w-32 h-32 rounded-full bg-muted border-4 border-background" />
              <div className="flex-1 pt-16">
                <div className="h-8 bg-muted rounded w-48 mb-2" />
                <div className="h-4 bg-muted rounded w-32" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-16 text-center">
            <h2 className="text-xl font-semibold mb-2">User not found</h2>
            <p className="text-muted-foreground mb-4">
              The user @{username} doesn't exist or has been deleted.
            </p>
            <Button asChild>
              <Link href="/explore">Explore Users</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <Card className="overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5" />
        <CardContent className="relative pb-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-16">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/30 to-primary/5 border-4 border-background flex items-center justify-center flex-shrink-0">
              <span className="text-4xl font-bold text-primary">
                {user.displayName?.[0] || user.username?.[0] || '?'}
              </span>
            </div>
            <div className="flex-1 pt-4 md:pt-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">{user.displayName || user.username}</h1>
                  <p className="text-muted-foreground">@{user.username}</p>
                </div>
                <div className="flex gap-2">
                  {isOwnProfile ? (
                    <Button asChild variant="outline">
                      <Link href="/settings">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Link>
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant={isFollowing ? 'outline' : 'default'}
                        onClick={() => isFollowing 
                          ? unfollowMutation.mutate() 
                          : followMutation.mutate()
                        }
                        disabled={followMutation.isPending || unfollowMutation.isPending}
                      >
                        {isFollowing ? (
                          <>
                            <UserMinus className="h-4 w-4 mr-2" />
                            Unfollow
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Follow
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={handleMessageClick}
                        disabled={startConversationMutation.isPending}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {startConversationMutation.isPending ? 'Opening...' : 'Message'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {user.bio && (
            <p className="mt-4 text-muted-foreground">{user.bio}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
            {user.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {user.location}
              </span>
            )}
            {user.website && (
              <a
                href={user.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-primary"
              >
                <LinkIcon className="h-4 w-4" />
                {user.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Joined {formatRelativeTime(user.createdAt)}
            </span>
          </div>

          <div className="flex items-center gap-6 mt-4">
            <button className="flex items-center gap-1 hover:text-primary">
              <span className="font-bold">{user._count?.followers || 0}</span>
              <span className="text-muted-foreground">Followers</span>
            </button>
            <button className="flex items-center gap-1 hover:text-primary">
              <span className="font-bold">{user._count?.following || 0}</span>
              <span className="text-muted-foreground">Following</span>
            </button>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-4 mt-4">
            {user.githubUrl && (
              <a
                href={user.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <Github className="h-5 w-5" />
              </a>
            )}
            {user.linkedinUrl && (
              <a
                href={user.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <Linkedin className="h-5 w-5" />
              </a>
            )}
            {user.twitterUrl && (
              <a
                href={user.twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <Twitter className="h-5 w-5" />
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Skills */}
      {user.skills?.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Code className="h-5 w-5" />
              Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {user.skills.map((skill: any) => (
                <span
                  key={skill.id}
                  className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
                >
                  {skill.name}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{user._count?.posts || 0}</div>
            <div className="text-sm text-muted-foreground">Posts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{user._count?.projects || 0}</div>
            <div className="text-sm text-muted-foreground">Projects</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{user.reputation || 0}</div>
            <div className="text-sm text-muted-foreground">Reputation</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{user._count?.hackathonParticipations || 0}</div>
            <div className="text-sm text-muted-foreground">Hackathons</div>
          </CardContent>
        </Card>
      </div>

      {/* Projects */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Projects
            </span>
            {userProjects?.data?.length > 3 && (
              <Link href={`/profile/${username}/projects`} className="text-sm text-primary font-normal">
                View all
              </Link>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userProjects?.data?.length > 0 ? (
            <div className="space-y-4">
              {userProjects.data.slice(0, 3).map((project: any) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.slug}`}
                  className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium hover:text-primary">{project.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {project.description}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4" />
                      {project._count?.stars || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="h-4 w-4" />
                      {project._count?.forks || 0}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No projects yet</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Recent Posts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userPosts?.data?.length > 0 ? (
            <div className="space-y-4">
              {userPosts.data.slice(0, 5).map((post: any) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <p className="line-clamp-2">{post.content}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span>{post._count?.likes || 0} likes</span>
                    <span>{post._count?.comments || 0} comments</span>
                    <span>{formatRelativeTime(post.createdAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No posts yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  FolderKanban,
  Plus,
  Search,
  Star,
  GitFork,
  Users,
  Filter,
  SortAsc,
  ExternalLink,
  Github,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

export default function ProjectsPage() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'my' | 'starred'>('all');

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', filter, searchQuery],
    queryFn: () => {
      let url = '/projects?';
      if (filter === 'my') url += 'owner=me&';
      if (filter === 'starred') url += 'starred=true&';
      if (searchQuery) url += `search=${searchQuery}&`;
      return apiClient.getPaginated(url);
    },
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">Projects</h1>
          <p className="text-muted-foreground">
            Discover and collaborate on open source projects
          </p>
        </div>
        <Link href="/projects/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'my', 'starred'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'my' ? 'My Projects' : 'Starred'}
            </Button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded w-3/4 mb-4" />
                <div className="h-4 bg-muted rounded w-full mb-2" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (projects?.data?.length ?? 0) > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects?.data?.map((project: any) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <FolderKanban className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <Link href={`/projects/${project.id}`}>
                        <h3 className="font-semibold hover:text-primary transition-colors">
                          {project.name}
                        </h3>
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        by @{project.owner?.username || 'unknown'}
                      </p>
                    </div>
                  </div>
                  {project.githubUrl && (
                    <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon">
                        <Github className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                </div>

                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                  {project.description || 'No description provided'}
                </p>

                {/* Tags */}
                {project.techStack?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {project.techStack.slice(0, 4).map((tech: string) => (
                      <span
                        key={tech}
                        className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                      >
                        {tech}
                      </span>
                    ))}
                    {project.techStack.length > 4 && (
                      <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">
                        +{project.techStack.length - 4}
                      </span>
                    )}
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4" />
                    {project.stars || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitFork className="h-4 w-4" />
                    {project.forks || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {project.members?.length || 1}
                  </span>
                  <span className="ml-auto">
                    {formatRelativeTime(project.updatedAt)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No projects found</h3>
            <p className="text-muted-foreground mb-4">
              {filter === 'my'
                ? "You haven't created any projects yet"
                : filter === 'starred'
                ? "You haven't starred any projects yet"
                : 'No projects match your search'}
            </p>
            <Link href="/projects/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Project
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

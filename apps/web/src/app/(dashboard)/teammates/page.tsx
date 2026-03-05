'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Users,
  Search,
  MapPin,
  Briefcase,
  Github,
  Linkedin,
  Globe,
  UserPlus,
  Filter,
  Sparkles,
} from 'lucide-react';

const SKILL_FILTERS = [
  'All', 'React', 'Node.js', 'Python', 'TypeScript', 'Go', 'Rust', 'AI/ML'
];

export default function TeammatesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('All');

  const { data: users, isLoading } = useQuery({
    queryKey: ['teammates', skillFilter, searchQuery],
    queryFn: () => {
      let url = '/users/discover?isOpenToCollab=true&';
      if (skillFilter !== 'All') url += `skill=${skillFilter}&`;
      if (searchQuery) url += `search=${searchQuery}&`;
      return apiClient.getPaginated(url);
    },
  });

  const { data: aiMatches } = useQuery({
    queryKey: ['ai-matches'],
    queryFn: () => apiClient.get('/ai/team-match'),
    staleTime: 10 * 60 * 1000,
  });

  const followMutation = useMutation({
    mutationFn: (userId: string) => apiClient.post(`/users/${userId}/follow`),
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">Find Teammates</h1>
          <p className="text-muted-foreground">
            Connect with developers looking to collaborate
          </p>
        </div>
        <Link href="/ai/team-match">
          <Button variant="outline">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Match
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, skills, or location..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Skill Filters */}
      <div className="flex flex-wrap gap-2">
        {SKILL_FILTERS.map((skill) => (
          <Button
            key={skill}
            variant={skillFilter === skill ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSkillFilter(skill)}
          >
            {skill}
          </Button>
        ))}
      </div>

      {/* AI Matches Section */}
      {aiMatches?.data?.length > 0 && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">AI-Suggested Matches</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {aiMatches.data.slice(0, 3).map((match: any) => (
                <div key={match.userId} className="flex items-center gap-3 p-3 bg-background rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{match.displayName}</p>
                    <p className="text-xs text-muted-foreground">{match.matchScore}% match</p>
                  </div>
                  <Button size="sm" variant="outline">View</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-muted" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-24 mb-2" />
                    <div className="h-3 bg-muted rounded w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (users?.data?.length ?? 0) > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users?.data?.map((user: any) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Link href={`/profile/${user.username}`}>
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl font-bold text-primary">
                      {user.displayName?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || '?'}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profile/${user.username}`}>
                      <h3 className="font-semibold hover:text-primary transition-colors truncate">
                        {user.displayName || user.username}
                      </h3>
                    </Link>
                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                    {user.headline && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {user.headline}
                      </p>
                    )}
                  </div>
                </div>

                {/* Location */}
                {user.location && (
                  <div className="flex items-center gap-1 mt-3 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {user.location}
                  </div>
                )}

                {/* Skills */}
                {user.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {user.skills.slice(0, 4).map((skill: any) => (
                      <span
                        key={skill.skillId || skill.name}
                        className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                      >
                        {skill.skill?.name || skill.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4">
                  <Link href={`/profile/${user.username}`} className="flex-1">
                    <Button variant="outline" className="w-full" size="sm">
                      View Profile
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    onClick={() => followMutation.mutate(user.id)}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Social Links */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                  {user.githubUrl && (
                    <a href={user.githubUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Github className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                  {user.linkedinUrl && (
                    <a href={user.linkedinUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Linkedin className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                  {user.website && (
                    <a href={user.website} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Globe className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No teammates found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filters
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

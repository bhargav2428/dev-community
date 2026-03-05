'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Trophy,
  Search,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Clock,
  ExternalLink,
  Filter,
  Plus,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

export default function HackathonsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'upcoming' | 'ongoing' | 'past'>('upcoming');

  const { data: hackathons, isLoading } = useQuery({
    queryKey: ['hackathons', filter, searchQuery],
    queryFn: () => {
      let url = '/hackathons?';
      url += `status=${filter}&`;
      if (searchQuery) url += `search=${searchQuery}&`;
      return apiClient.getPaginated(url);
    },
  });

  // Sample hackathons for demo
  const sampleHackathons = [
    {
      id: '1',
      name: 'AI Innovation Challenge 2026',
      description: 'Build the next generation of AI-powered applications. Compete with developers worldwide for prizes worth $50,000.',
      startDate: '2026-04-15',
      endDate: '2026-04-17',
      location: 'Virtual',
      prizePool: 50000,
      participants: 1250,
      maxTeamSize: 4,
      tags: ['AI', 'Machine Learning', 'LLM'],
      status: 'upcoming',
      organizer: 'TechCorp',
    },
    {
      id: '2',
      name: 'Web3 Builders Hackathon',
      description: 'Create decentralized applications on blockchain. Focus on DeFi, NFTs, and Web3 infrastructure.',
      startDate: '2026-03-20',
      endDate: '2026-03-22',
      location: 'San Francisco, CA',
      prizePool: 75000,
      participants: 800,
      maxTeamSize: 5,
      tags: ['Web3', 'Blockchain', 'DeFi'],
      status: 'upcoming',
      organizer: 'CryptoLabs',
    },
    {
      id: '3',
      name: 'Climate Tech Hack',
      description: 'Build solutions to fight climate change. Focus on sustainability, clean energy, and environmental monitoring.',
      startDate: '2026-05-01',
      endDate: '2026-05-03',
      location: 'Virtual',
      prizePool: 30000,
      participants: 600,
      maxTeamSize: 4,
      tags: ['CleanTech', 'Sustainability', 'IoT'],
      status: 'upcoming',
      organizer: 'GreenTech Foundation',
    },
  ];

  const displayHackathons = (hackathons?.data?.length ?? 0) > 0 ? hackathons?.data ?? sampleHackathons : sampleHackathons;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">Hackathons</h1>
          <p className="text-muted-foreground">
            Find and participate in hackathons to build, learn, and win prizes
          </p>
        </div>
        <Link href="/hackathons/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Hackathon
          </Button>
        </Link>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search hackathons..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(['upcoming', 'ongoing', 'past'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">25+</p>
            <p className="text-sm text-muted-foreground">Active Hackathons</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">$500K+</p>
            <p className="text-sm text-muted-foreground">Total Prizes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">10K+</p>
            <p className="text-sm text-muted-foreground">Participants</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">100+</p>
            <p className="text-sm text-muted-foreground">Events This Year</p>
          </CardContent>
        </Card>
      </div>

      {/* Hackathons List */}
      <div className="space-y-4">
        {displayHackathons.map((hackathon: any) => (
          <Card key={hackathon.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                  <Trophy className="h-8 w-8 text-primary" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">{hackathon.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        by {hackathon.organizer}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      hackathon.status === 'ongoing' 
                        ? 'bg-green-500/10 text-green-500'
                        : hackathon.status === 'upcoming'
                        ? 'bg-blue-500/10 text-blue-500'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {hackathon.status.charAt(0).toUpperCase() + hackathon.status.slice(1)}
                    </span>
                  </div>

                  <p className="text-muted-foreground mt-2 line-clamp-2">
                    {hackathon.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mt-3">
                    {hackathon.tags?.map((tag: string) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Details */}
                  <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(hackathon.startDate).toLocaleDateString()} - {new Date(hackathon.endDate).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {hackathon.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      ${hackathon.prizePool?.toLocaleString()} prizes
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {hackathon.participants} participants
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    <Link href={`/hackathons/${hackathon.id}`}>
                      <Button>View Details</Button>
                    </Link>
                    <Button variant="outline">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Register
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

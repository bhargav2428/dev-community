'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Trophy,
  Calendar,
  Users,
  DollarSign,
  ArrowLeft,
  MapPin,
  Globe,
  Clock,
  Award,
  ExternalLink,
  Share2,
  CheckCircle,
} from 'lucide-react';
import { formatRelativeTime, cn } from '@/lib/utils';

export default function HackathonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const { data: hackathon, isLoading } = useQuery({
    queryKey: ['hackathon', id],
    queryFn: () => apiClient.get(`/hackathons/${id}`),
    enabled: !!id,
  });

  const registerMutation = useMutation({
    mutationFn: () => apiClient.post(`/hackathons/${id}/register`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hackathon', id] });
    },
  });

  const unregisterMutation = useMutation({
    mutationFn: () => apiClient.delete(`/hackathons/${id}/register`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hackathon', id] });
    },
  });

  // Sample data for demo
  const sampleHackathon = {
    id: '1',
    title: 'Global AI Hackathon 2024',
    description: 'Build innovative AI solutions that tackle real-world problems. This global hackathon brings together developers, designers, and AI enthusiasts from around the world to create impactful projects using the latest AI technologies.',
    organizer: 'DevConnect',
    startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 9).toISOString(),
    registrationDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
    location: 'Virtual',
    prizePool: 50000,
    maxParticipants: 500,
    registeredCount: 234,
    tags: ['AI', 'Machine Learning', 'LLM', 'Innovation'],
    isRegistered: false,
    website: 'https://hackathon.devconnect.com',
    prizes: [
      { place: '1st Place', amount: 25000, description: 'Cash prize + mentorship' },
      { place: '2nd Place', amount: 15000, description: 'Cash prize + cloud credits' },
      { place: '3rd Place', amount: 10000, description: 'Cash prize + swag' },
    ],
    sponsors: ['OpenAI', 'Google Cloud', 'AWS', 'Microsoft'],
    tracks: [
      { name: 'Healthcare', description: 'AI solutions for healthcare challenges' },
      { name: 'Education', description: 'AI-powered learning tools' },
      { name: 'Sustainability', description: 'AI for environmental impact' },
      { name: 'Open Track', description: 'Any innovative AI application' },
    ],
    schedule: [
      { time: 'Day 1 - 9:00 AM', event: 'Opening Ceremony & Team Formation' },
      { time: 'Day 1 - 10:00 AM', event: 'Hacking Begins' },
      { time: 'Day 1 - 2:00 PM', event: 'Workshop: Building with LLMs' },
      { time: 'Day 2 - 12:00 PM', event: 'Midpoint Check-in' },
      { time: 'Day 2 - 6:00 PM', event: 'Hacking Ends & Submissions Due' },
      { time: 'Day 3 - 10:00 AM', event: 'Demo Day & Judging' },
      { time: 'Day 3 - 3:00 PM', event: 'Awards Ceremony' },
    ],
    rules: [
      'Teams can have 1-4 members',
      'All code must be written during the hackathon',
      'Use of AI tools is allowed and encouraged',
      'Submissions must include a demo video',
      'Projects must be open-sourced',
    ],
  };

  const hackathonData = hackathon?.data || sampleHackathon;
  const isRegistered = hackathonData?.isRegistered;

  const getStatus = () => {
    const now = new Date();
    const start = new Date(hackathonData.startDate);
    const end = new Date(hackathonData.endDate);
    
    if (now < start) return { label: 'Upcoming', color: 'bg-blue-500' };
    if (now >= start && now <= end) return { label: 'In Progress', color: 'bg-green-500' };
    return { label: 'Ended', color: 'bg-gray-500' };
  };

  const status = getStatus();

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-32 mb-6" />
          <Card>
            <CardContent className="p-6">
              <div className="h-8 bg-muted rounded w-64 mb-4" />
              <div className="h-4 bg-muted rounded w-full mb-2" />
              <div className="h-4 bg-muted rounded w-3/4" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Back Button */}
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Hackathons
      </Button>

      {/* Header */}
      <Card className="mb-6 overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20" />
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={cn(
                  "px-2 py-1 text-xs font-medium text-white rounded",
                  status.color
                )}>
                  {status.label}
                </span>
                {hackathonData.location === 'Virtual' ? (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    Virtual
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {hackathonData.location}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold mb-2">{hackathonData.title}</h1>
              <p className="text-muted-foreground">by {hackathonData.organizer}</p>
            </div>
            <div className="flex gap-2">
              {status.label !== 'Ended' && (
                <Button
                  variant={isRegistered ? 'outline' : 'default'}
                  onClick={() => isRegistered 
                    ? unregisterMutation.mutate() 
                    : registerMutation.mutate()
                  }
                  disabled={registerMutation.isPending || unregisterMutation.isPending}
                >
                  {isRegistered ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Registered
                    </>
                  ) : (
                    <>
                      <Trophy className="h-4 w-4 mr-2" />
                      Register
                    </>
                  )}
                </Button>
              )}
              {hackathonData.website && (
                <Button variant="outline" asChild>
                  <a href={hackathonData.website} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Website
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-6 mt-6 text-sm">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(hackathonData.startDate).toLocaleDateString()} - {new Date(hackathonData.endDate).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {hackathonData.registeredCount}/{hackathonData.maxParticipants} registered
            </span>
            <span className="flex items-center gap-1 text-amber-500">
              <DollarSign className="h-4 w-4" />
              ${hackathonData.prizePool?.toLocaleString()} in prizes
            </span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-4">
            {hackathonData.tags?.map((tag: string) => (
              <span
                key={tag}
                className="px-2 py-1 bg-muted text-sm rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{hackathonData.description}</p>
            </CardContent>
          </Card>

          {/* Tracks */}
          {hackathonData.tracks?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tracks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {hackathonData.tracks.map((track: any, index: number) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <h3 className="font-medium">{track.name}</h3>
                      <p className="text-sm text-muted-foreground">{track.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Schedule */}
          {hackathonData.schedule?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {hackathonData.schedule.map((item: any, index: number) => (
                    <div key={index} className="flex gap-4">
                      <div className="w-32 flex-shrink-0 text-sm text-muted-foreground">
                        {item.time}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.event}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rules */}
          {hackathonData.rules?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  {hackathonData.rules.map((rule: string, index: number) => (
                    <li key={index}>{rule}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {/* Prizes */}
          {hackathonData.prizes?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Prizes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {hackathonData.prizes.map((prize: any, index: number) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold",
                        index === 0 ? "bg-amber-500" :
                        index === 1 ? "bg-gray-400" :
                        "bg-amber-700"
                      )}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{prize.place}</p>
                        <p className="text-sm text-amber-500">${prize.amount?.toLocaleString()}</p>
                        {prize.description && (
                          <p className="text-xs text-muted-foreground">{prize.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sponsors */}
          {hackathonData.sponsors?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Sponsors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {hackathonData.sponsors.map((sponsor: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-muted rounded-lg text-sm"
                    >
                      {sponsor}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Important Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Important Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Registration Deadline</span>
                <span className="font-medium">
                  {new Date(hackathonData.registrationDeadline).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Start Date</span>
                <span className="font-medium">
                  {new Date(hackathonData.startDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">End Date</span>
                <span className="font-medium">
                  {new Date(hackathonData.endDate).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

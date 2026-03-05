'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  Building,
  ArrowLeft,
  ExternalLink,
  Bookmark,
  Share2,
  Globe,
  Users,
  Calendar,
} from 'lucide-react';
import { formatRelativeTime, cn } from '@/lib/utils';

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => apiClient.get(`/jobs/${id}`),
    enabled: !!id,
  });

  const bookmarkMutation = useMutation({
    mutationFn: () => apiClient.post(`/jobs/${id}/bookmark`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', id] });
    },
  });

  // Sample data for demo
  const sampleJob = {
    id: '1',
    title: 'Senior Full Stack Developer',
    company: {
      name: 'TechCorp Inc.',
      logo: null,
      website: 'https://techcorp.example.com',
      description: 'A leading technology company building the future of developer tools.',
      size: '50-200 employees',
    },
    type: 'Full-time',
    location: 'San Francisco, CA',
    remote: 'Hybrid',
    salary: {
      min: 150000,
      max: 200000,
      currency: 'USD',
    },
    description: `We're looking for a Senior Full Stack Developer to join our growing team. You'll be working on our core platform, building features that millions of developers use daily.

This is an exciting opportunity to work with cutting-edge technologies and make a real impact on the developer community.`,
    responsibilities: [
      'Design and implement new features for our platform',
      'Write clean, maintainable, and well-tested code',
      'Collaborate with product and design teams',
      'Mentor junior developers',
      'Participate in code reviews and architectural decisions',
    ],
    requirements: [
      '5+ years of experience in full stack development',
      'Strong proficiency in TypeScript and React',
      'Experience with Node.js and PostgreSQL',
      'Familiarity with cloud services (AWS/GCP)',
      'Excellent communication skills',
    ],
    benefits: [
      'Competitive salary and equity',
      'Health, dental, and vision insurance',
      'Unlimited PTO',
      'Remote-friendly culture',
      'Learning and development budget',
      '$1000 home office setup',
    ],
    techStack: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker', 'Kubernetes'],
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    isBookmarked: false,
    applicants: 45,
  };

  const jobData = job?.data || sampleJob;
  const isBookmarked = jobData?.isBookmarked;

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
        Back to Jobs
      </Button>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">{jobData.title}</h1>
                    <p className="text-lg text-muted-foreground">{jobData.company?.name}</p>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {jobData.location}
                      </span>
                      {jobData.remote && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-4 w-4" />
                          {jobData.remote}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {jobData.type}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-6">
                <Button>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Apply Now
                </Button>
                <Button
                  variant="outline"
                  onClick={() => bookmarkMutation.mutate()}
                >
                  <Bookmark className={cn(
                    "h-4 w-4 mr-2",
                    isBookmarked && "fill-current"
                  )} />
                  {isBookmarked ? 'Saved' : 'Save'}
                </Button>
                <Button variant="outline">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>About This Role</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{jobData.description}</p>
            </CardContent>
          </Card>

          {/* Responsibilities */}
          {jobData.responsibilities?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Responsibilities</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  {jobData.responsibilities.map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Requirements */}
          {jobData.requirements?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  {jobData.requirements.map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Benefits */}
          {jobData.benefits?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  {jobData.benefits.map((benefit: string, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg"
                    >
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {/* Salary */}
          {jobData.salary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Salary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  ${jobData.salary.min?.toLocaleString()} - ${jobData.salary.max?.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">{jobData.salary.currency} / year</p>
              </CardContent>
            </Card>
          )}

          {/* Tech Stack */}
          {jobData.techStack?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tech Stack</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {jobData.techStack.map((tech: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle>About {jobData.company?.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {jobData.company?.description}
              </p>
              {jobData.company?.size && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{jobData.company.size}</span>
                </div>
              )}
              {jobData.company?.website && (
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a href={jobData.company.website} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-4 w-4 mr-2" />
                    Company Website
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Job Stats */}
          <Card>
            <CardContent className="p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Posted</span>
                <span className="font-medium">{formatRelativeTime(jobData.postedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Applicants</span>
                <span className="font-medium">{jobData.applicants || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

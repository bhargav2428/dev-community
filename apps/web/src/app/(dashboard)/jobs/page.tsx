'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Briefcase,
  Search,
  MapPin,
  DollarSign,
  Clock,
  Building2,
  Bookmark,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

const JOB_TYPES = ['All', 'Full-time', 'Part-time', 'Contract', 'Remote'];

export default function JobsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [jobType, setJobType] = useState('All');

  const { data: jobs, isLoading, isError } = useQuery({
    queryKey: ['jobs', jobType, searchQuery],
    queryFn: () => {
      let url = '/jobs?';
      if (jobType !== 'All') url += `type=${jobType}&`;
      if (searchQuery) url += `search=${searchQuery}&`;
      return apiClient.getPaginated(url);
    },
  });

  const displayJobs = jobs?.data ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">Developer Jobs</h1>
          <p className="text-muted-foreground">
            Find your next opportunity at top tech companies
          </p>
        </div>
        <Link href="/jobs/post">
          <Button>Post a Job</Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search jobs by title, company, or skills..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {JOB_TYPES.map((type) => (
          <Button
            key={type}
            variant={jobType === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => setJobType(type)}
          >
            {type}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Loading jobs...
          </CardContent>
        </Card>
      ) : isError ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-red-500">Failed to load jobs. Please try again.</p>
          </CardContent>
        </Card>
      ) : displayJobs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No jobs found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filters
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {displayJobs.map((job: any) => {
            const company = job.companyName || job.company || 'Unknown Company';
            const remote = Boolean(job.isRemote ?? job.remote);
            const minSalary = job.salaryMin ?? job.salary?.min;
            const maxSalary = job.salaryMax ?? job.salary?.max;
            const salaryLabel =
              typeof minSalary === 'number' && typeof maxSalary === 'number'
                ? `$${(minSalary / 1000).toFixed(0)}K-$${(maxSalary / 1000).toFixed(0)}K`
                : 'Salary not specified';

            return (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Link href={`/jobs/${job.id}`}>
                            <h3 className="text-lg font-semibold hover:text-primary transition-colors">
                              {job.title}
                            </h3>
                          </Link>
                          <p className="text-muted-foreground">{company}</p>
                        </div>
                        <Button variant="ghost" size="icon">
                          <Bookmark className="h-5 w-5" />
                        </Button>
                      </div>

                      <p className="text-muted-foreground mt-2 line-clamp-2">
                        {job.description}
                      </p>

                      <div className="flex flex-wrap gap-1 mt-3">
                        {job.skills?.slice(0, 5).map((skill: string) => (
                          <span
                            key={skill}
                            className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {job.location || 'Remote'}
                          {remote && <span className="text-green-500 ml-1">(Remote OK)</span>}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          {job.type || 'N/A'}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {salaryLabel}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {job.createdAt ? formatRelativeTime(job.createdAt) : 'Recently'}
                        </span>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Link href={`/jobs/${job.id}`}>
                          <Button>View & Apply</Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

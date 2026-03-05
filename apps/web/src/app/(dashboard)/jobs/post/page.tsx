'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import {
  Briefcase,
  ArrowLeft,
  Building2,
  MapPin,
  DollarSign,
  X,
  Globe,
} from 'lucide-react';

const jobSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  company: z.string().min(2, 'Company name is required').max(100),
  description: z.string().min(100, 'Description must be at least 100 characters').max(10000),
  location: z.string().min(1, 'Location is required'),
  type: z.enum(['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship']),
  remote: z.boolean().default(false),
  salaryMin: z.number().min(0).optional(),
  salaryMax: z.number().min(0).optional(),
  experienceLevel: z.enum(['Entry', 'Junior', 'Mid', 'Senior', 'Lead', 'Principal']).optional(),
  applyUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  companyWebsite: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
});

type JobFormData = z.infer<typeof jobSchema>;

const SKILL_OPTIONS = [
  'JavaScript', 'TypeScript', 'React', 'Next.js', 'Vue.js', 'Angular',
  'Node.js', 'Python', 'Go', 'Rust', 'Java', 'C++', 'C#',
  'PostgreSQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure',
];

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship'] as const;
const EXPERIENCE_LEVELS = ['Entry', 'Junior', 'Mid', 'Senior', 'Lead', 'Principal'] as const;

export default function PostJobPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      type: 'Full-time',
      remote: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: JobFormData & { skills: string[] }) =>
      apiClient.post('/jobs', data),
    onSuccess: (data) => {
      toast({
        title: 'Job posted!',
        description: 'Your job listing has been published successfully.',
      });
      router.push(`/jobs/${data.data?.id || data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to post job',
        variant: 'destructive',
      });
    },
  });

  const addSkill = (skill: string) => {
    const cleanSkill = skill.trim();
    if (cleanSkill && !skills.includes(cleanSkill) && skills.length < 10) {
      setSkills([...skills, cleanSkill]);
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const onSubmit = (data: JobFormData) => {
    createMutation.mutate({ ...data, skills });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/jobs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Post a Job</h1>
          <p className="text-muted-foreground">
            Find talented developers for your team
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Job Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                placeholder="Senior Full Stack Developer"
                {...register('title')}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Job Type *</Label>
                <select
                  id="type"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  {...register('type')}
                >
                  {JOB_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="experienceLevel">Experience Level</Label>
                <select
                  id="experienceLevel"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  {...register('experienceLevel')}
                >
                  <option value="">Select level</option>
                  {EXPERIENCE_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Job Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe the role, responsibilities, requirements, and what makes this opportunity unique..."
                rows={8}
                {...register('description')}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company Name *</Label>
              <Input
                id="company"
                placeholder="Acme Inc."
                {...register('company')}
              />
              {errors.company && (
                <p className="text-sm text-destructive">{errors.company.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyWebsite">Company Website</Label>
              <Input
                id="companyWebsite"
                type="url"
                placeholder="https://company.com"
                {...register('companyWebsite')}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location & Salary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                placeholder="San Francisco, CA or Remote"
                {...register('location')}
              />
              {errors.location && (
                <p className="text-sm text-destructive">{errors.location.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remote"
                className="rounded border-input"
                {...register('remote')}
              />
              <Label htmlFor="remote" className="font-normal">
                This is a remote position
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salaryMin">Salary Min ($)</Label>
                <Input
                  id="salaryMin"
                  type="number"
                  placeholder="80000"
                  {...register('salaryMin', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salaryMax">Salary Max ($)</Label>
                <Input
                  id="salaryMax"
                  type="number"
                  placeholder="150000"
                  {...register('salaryMax', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="applyUrl">Application URL</Label>
              <Input
                id="applyUrl"
                type="url"
                placeholder="https://company.com/careers/apply"
                {...register('applyUrl')}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Required Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map((skill) => (
                <Button
                  key={skill}
                  type="button"
                  variant={skills.includes(skill) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => skills.includes(skill) ? removeSkill(skill) : addSkill(skill)}
                >
                  {skill}
                  {skills.includes(skill) && <X className="h-3 w-3 ml-1" />}
                </Button>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Add custom skill..."
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkill(skillInput);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => addSkill(skillInput)}
              >
                Add
              </Button>
            </div>

            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <span className="text-sm text-muted-foreground">Selected:</span>
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-1 bg-primary/10 text-primary text-sm rounded-full flex items-center gap-1"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Posting...' : 'Post Job'}
          </Button>
        </div>
      </form>
    </div>
  );
}

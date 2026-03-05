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
  FolderKanban,
  ArrowLeft,
  Github,
  Globe,
  Users,
  X,
} from 'lucide-react';

const projectSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  shortDescription: z.string().max(160).optional(),
  githubUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  websiteUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  visibility: z.enum(['PUBLIC', 'PRIVATE']),
});

type ProjectFormData = z.infer<typeof projectSchema>;

const TECH_OPTIONS = [
  'JavaScript', 'TypeScript', 'React', 'Next.js', 'Vue.js', 'Angular',
  'Node.js', 'Python', 'Go', 'Rust', 'Java', 'C++',
  'PostgreSQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'AWS',
];

export default function CreateProjectPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [techStack, setTechStack] = useState<string[]>([]);
  const [techInput, setTechInput] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      visibility: 'PUBLIC',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ProjectFormData & { techStack: string[] }) =>
      apiClient.post('/projects', data),
    onSuccess: (data) => {
      toast.success({
        title: 'Project created!',
        description: 'Your project has been created successfully.',
      });
      router.push(`/projects/${data.data.id}`);
    },
    onError: (error: any) => {
      toast.error({
        title: 'Error',
        description: error.message || 'Failed to create project',
      });
    },
  });

  const addTech = (tech: string) => {
    if (tech && !techStack.includes(tech)) {
      setTechStack([...techStack, tech]);
      setTechInput('');
    }
  };

  const removeTech = (tech: string) => {
    setTechStack(techStack.filter((t) => t !== tech));
  };

  const onSubmit = (data: ProjectFormData) => {
    createMutation.mutate({ ...data, techStack });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create New Project</h1>
          <p className="text-muted-foreground">
            Share your project with the community
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              Project Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                placeholder="My Awesome Project"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortDescription">Short Description</Label>
              <Input
                id="shortDescription"
                placeholder="A brief tagline for your project"
                {...register('shortDescription')}
              />
              <p className="text-xs text-muted-foreground">
                {watch('shortDescription')?.length || 0}/160 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Full Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your project in detail..."
                rows={5}
                {...register('description')}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Visibility</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="PUBLIC"
                    {...register('visibility')}
                    className="w-4 h-4"
                  />
                  <span>Public</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="PRIVATE"
                    {...register('visibility')}
                    className="w-4 h-4"
                  />
                  <span>Private</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tech Stack</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add technology..."
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTech(techInput);
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={() => addTech(techInput)}>
                Add
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {TECH_OPTIONS.filter((t) => !techStack.includes(t)).slice(0, 8).map((tech) => (
                <Button
                  key={tech}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addTech(tech)}
                >
                  {tech}
                </Button>
              ))}
            </div>

            {techStack.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                {techStack.map((tech) => (
                  <span
                    key={tech}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm"
                  >
                    {tech}
                    <button type="button" onClick={() => removeTech(tech)}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="githubUrl">
                <Github className="h-4 w-4 inline mr-2" />
                GitHub Repository
              </Label>
              <Input
                id="githubUrl"
                placeholder="https://github.com/username/repo"
                {...register('githubUrl')}
              />
              {errors.githubUrl && (
                <p className="text-sm text-destructive">{errors.githubUrl.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="websiteUrl">
                <Globe className="h-4 w-4 inline mr-2" />
                Website / Demo
              </Label>
              <Input
                id="websiteUrl"
                placeholder="https://myproject.com"
                {...register('websiteUrl')}
              />
              {errors.websiteUrl && (
                <p className="text-sm text-destructive">{errors.websiteUrl.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/projects">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" isLoading={createMutation.isPending}>
            Create Project
          </Button>
        </div>
      </form>
    </div>
  );
}

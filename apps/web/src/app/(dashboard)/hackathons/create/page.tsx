'use client';

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
  Trophy,
  ArrowLeft,
  Calendar,
  Users,
} from 'lucide-react';

const hackathonSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  description: z.string().min(50, 'Description must be at least 50 characters').max(5000),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  location: z.string().optional(),
  isOnline: z.boolean().default(true),
  maxTeamSize: z.number().min(1).max(10).default(4),
  maxParticipants: z.number().min(1).optional(),
  registrationDeadline: z.string().optional(),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  theme: z.string().optional(),
});

type HackathonFormData = z.infer<typeof hackathonSchema>;

const TAG_OPTIONS = [
  'AI', 'Web3', 'Mobile', 'Cloud', 'IoT', 'Security', 'FinTech', 'HealthTech',
  'EdTech', 'CleanTech', 'Gaming', 'AR/VR', 'Blockchain', 'ML/Data',
];

export default function CreateHackathonPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<HackathonFormData>({
    resolver: zodResolver(hackathonSchema),
    defaultValues: {
      maxTeamSize: 4,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: HackathonFormData) =>
      apiClient.post('/hackathons', data),
    onSuccess: (data) => {
      toast({
        title: 'Hackathon created!',
        description: 'Your hackathon has been created successfully.',
      });
      router.push(`/hackathons/${data.data?.id || data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create hackathon',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: HackathonFormData) => {
    createMutation.mutate(data);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/hackathons">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create Hackathon</h1>
          <p className="text-muted-foreground">
            Organize a hackathon for the developer community
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Hackathon Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Hackathon Name *</Label>
              <Input
                id="name"
                placeholder="AI Innovation Challenge 2026"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe your hackathon, what participants will build, and what makes it special..."
                rows={5}
                {...register('description')}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  {...register('startDate')}
                />
                {errors.startDate && (
                  <p className="text-sm text-destructive">{errors.startDate.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  {...register('endDate')}
                />
                {errors.endDate && (
                  <p className="text-sm text-destructive">{errors.endDate.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="Virtual or City, Country"
                {...register('location')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="registrationDeadline">Registration Deadline</Label>
              <Input
                id="registrationDeadline"
                type="datetime-local"
                {...register('registrationDeadline')}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Settings & Limits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isOnline"
                className="rounded border-input"
                {...register('isOnline')}
                defaultChecked={true}
              />
              <Label htmlFor="isOnline" className="font-normal">
                This is an online/virtual hackathon
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxTeamSize">Max Team Size</Label>
                <Input
                  id="maxTeamSize"
                  type="number"
                  min={1}
                  max={10}
                  {...register('maxTeamSize', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxParticipants">Max Total Participants</Label>
              <Input
                id="maxParticipants"
                type="number"
                placeholder="500"
                {...register('maxParticipants', { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website URL</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://yourhackathon.com"
                {...register('website')}
              />
            </div>
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
            {createMutation.isPending ? 'Creating...' : 'Create Hackathon'}
          </Button>
        </div>
      </form>
    </div>
  );
}

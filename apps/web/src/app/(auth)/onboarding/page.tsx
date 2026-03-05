'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { 
  User, 
  MapPin, 
  Briefcase, 
  Github, 
  Linkedin, 
  Globe,
  ChevronRight,
  ChevronLeft,
  Sparkles
} from 'lucide-react';

const onboardingSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  headline: z.string().max(120, 'Headline must be under 120 characters').optional(),
  bio: z.string().max(500, 'Bio must be under 500 characters').optional(),
  location: z.string().optional(),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  githubUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  linkedinUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  skills: z.array(z.string()).optional(),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

const POPULAR_SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python',
  'Go', 'Rust', 'Java', 'C++', 'Docker', 'Kubernetes',
  'AWS', 'PostgreSQL', 'MongoDB', 'GraphQL', 'Next.js',
  'Vue.js', 'Angular', 'TailwindCSS', 'Machine Learning'
];

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      displayName: session?.user?.name || '',
    },
  });

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const onSubmit = async (data: OnboardingFormData) => {
    setIsLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      
      const response = await fetch(`${API_URL}/users/me/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          ...data,
          skills: selectedSkills,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      toast.success({
        title: 'Profile updated!',
        description: 'Welcome to DevConnect!',
      });

      // Update session and redirect
      await update();
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      toast.error({
        title: 'Error',
        description: 'Failed to save profile. You can update it later.',
      });
      // Still redirect to dashboard
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const skipOnboarding = () => {
    router.push('/dashboard');
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-2 w-16 rounded-full transition-colors ${
              s <= step ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      <div className="space-y-2 text-center">
        <div className="flex items-center justify-center gap-2 text-primary">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold">Complete Your Profile</h1>
        <p className="text-muted-foreground">
          {step === 1 && "Let's start with the basics"}
          {step === 2 && "Add your links and location"}
          {step === 3 && "Select your skills"}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">
                <User className="h-4 w-4 inline mr-2" />
                Display Name *
              </Label>
              <Input
                id="displayName"
                placeholder="John Doe"
                {...register('displayName')}
              />
              {errors.displayName && (
                <p className="text-sm text-destructive">{errors.displayName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="headline">
                <Briefcase className="h-4 w-4 inline mr-2" />
                Headline
              </Label>
              <Input
                id="headline"
                placeholder="Full Stack Developer | Open Source Enthusiast"
                {...register('headline')}
              />
              {errors.headline && (
                <p className="text-sm text-destructive">{errors.headline.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {watch('headline')?.length || 0}/120 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself..."
                rows={4}
                {...register('bio')}
              />
              {errors.bio && (
                <p className="text-sm text-destructive">{errors.bio.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {watch('bio')?.length || 0}/500 characters
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Links & Location */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location">
                <MapPin className="h-4 w-4 inline mr-2" />
                Location
              </Label>
              <Input
                id="location"
                placeholder="San Francisco, CA"
                {...register('location')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">
                <Globe className="h-4 w-4 inline mr-2" />
                Website
              </Label>
              <Input
                id="website"
                placeholder="https://yourwebsite.com"
                {...register('website')}
              />
              {errors.website && (
                <p className="text-sm text-destructive">{errors.website.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="githubUrl">
                <Github className="h-4 w-4 inline mr-2" />
                GitHub Profile
              </Label>
              <Input
                id="githubUrl"
                placeholder="https://github.com/username"
                {...register('githubUrl')}
              />
              {errors.githubUrl && (
                <p className="text-sm text-destructive">{errors.githubUrl.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedinUrl">
                <Linkedin className="h-4 w-4 inline mr-2" />
                LinkedIn Profile
              </Label>
              <Input
                id="linkedinUrl"
                placeholder="https://linkedin.com/in/username"
                {...register('linkedinUrl')}
              />
              {errors.linkedinUrl && (
                <p className="text-sm text-destructive">{errors.linkedinUrl.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Skills */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select skills that best describe your expertise (click to toggle)
            </p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SKILLS.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedSkills.includes(skill)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
            {selectedSkills.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedSkills.length} skills
              </p>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4">
          <div>
            {step > 1 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(step - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={skipOnboarding}
              >
                Skip for now
              </Button>
            )}
          </div>

          <div>
            {step < 3 ? (
              <Button
                type="button"
                onClick={() => setStep(step + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                isLoading={isLoading}
              >
                Complete Setup
                <Sparkles className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

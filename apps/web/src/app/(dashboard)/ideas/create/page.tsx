'use client';

// Create idea form - aligned with API schema
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  Lightbulb,
  ArrowLeft,
  Send,
  Target,
  Users,
  DollarSign,
  AlertCircle,
  Crosshair,
} from 'lucide-react';

export default function CreateIdeaPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState('');
  const [solution, setSolution] = useState('');
  const [description, setDescription] = useState('');
  const [targetMarket, setTargetMarket] = useState('');
  const [businessModel, setBusinessModel] = useState('');
  const [competitors, setCompetitors] = useState('');
  const [isLookingForCofounder, setIsLookingForCofounder] = useState(true);

  const createIdeaMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/ideas', data),
    onSuccess: () => {
      toast.success({
        title: 'Idea posted!',
        description: 'Your startup idea has been shared with the community.',
      });
      router.push('/ideas');
    },
    onError: (error: any) => {
      toast.error({
        title: 'Failed to post idea',
        description: error.response?.data?.message || 'Something went wrong',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !problem.trim() || !solution.trim()) return;

    createIdeaMutation.mutate({
      title,
      problem,
      solution,
      description: description || undefined,
      targetMarket: targetMarket || undefined,
      businessModel: businessModel || undefined,
      competitors: competitors || undefined,
      isLookingForCofounder,
    });
  };

  const isValid = title.trim().length >= 3 && problem.trim().length >= 10 && solution.trim().length >= 10;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Back Button */}
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lightbulb className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Share Your Startup Idea</CardTitle>
              <CardDescription>
                Get feedback from the developer community and find potential co-founders
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Idea Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your idea a catchy name"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                Min 3 characters
              </p>
            </div>

            {/* Problem */}
            <div className="space-y-2">
              <Label htmlFor="problem" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                What problem does it solve? *
              </Label>
              <Textarea
                id="problem"
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="Describe the pain point or problem your idea addresses..."
                rows={3}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">
                {problem.length}/2000 (min 10 characters)
              </p>
            </div>

            {/* Solution */}
            <div className="space-y-2">
              <Label htmlFor="solution" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Your Proposed Solution *
              </Label>
              <Textarea
                id="solution"
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
                placeholder="How would your idea solve this problem?"
                rows={3}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">
                {solution.length}/2000 (min 10 characters)
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Brief Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add any additional context about your idea..."
                rows={2}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {description.length}/1000
              </p>
            </div>

            {/* Target Market */}
            <div className="space-y-2">
              <Label htmlFor="targetMarket" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Target Market (optional)
              </Label>
              <Textarea
                id="targetMarket"
                value={targetMarket}
                onChange={(e) => setTargetMarket(e.target.value)}
                placeholder="Who would use this? Be specific about your target users..."
                rows={2}
                maxLength={1000}
              />
            </div>

            {/* Business Model */}
            <div className="space-y-2">
              <Label htmlFor="businessModel" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Business Model (optional)
              </Label>
              <Textarea
                id="businessModel"
                value={businessModel}
                onChange={(e) => setBusinessModel(e.target.value)}
                placeholder="How could this idea make money? (freemium, subscription, ads, etc.)"
                rows={2}
                maxLength={1000}
              />
            </div>

            {/* Competitors */}
            <div className="space-y-2">
              <Label htmlFor="competitors" className="flex items-center gap-2">
                <Crosshair className="h-4 w-4" />
                Competitors (optional)
              </Label>
              <Textarea
                id="competitors"
                value={competitors}
                onChange={(e) => setCompetitors(e.target.value)}
                placeholder="Who are the existing players in this space? How is your idea different?"
                rows={2}
                maxLength={1000}
              />
            </div>

            {/* Looking for Co-founder */}
            <div className="border rounded-lg p-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Looking for co-founders?</p>
                    <p className="text-sm text-muted-foreground">
                      Enable this if you want others to join you in building this
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isLookingForCofounder}
                  onChange={(e) => setIsLookingForCofounder(e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300"
                />
              </label>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isValid || createIdeaMutation.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                {createIdeaMutation.isPending ? 'Posting...' : 'Post Idea'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
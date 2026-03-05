'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Lightbulb,
  ArrowLeft,
  Send,
  X,
  Target,
  Users,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const categories = [
  'SaaS',
  'Developer Tools',
  'AI/ML',
  'Web3/Crypto',
  'Mobile Apps',
  'E-commerce',
  'Education',
  'Health & Fitness',
  'Productivity',
  'Social Media',
  'Gaming',
  'Finance',
  'Other',
];

export default function CreateIdeaPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [problem, setProblem] = useState('');
  const [solution, setSolution] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [monetization, setMonetization] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [lookingForTeam, setLookingForTeam] = useState(false);

  const createIdeaMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/ideas', data),
    onSuccess: (data) => {
      router.push(`/ideas`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    createIdeaMutation.mutate({
      title,
      description,
      problem,
      solution,
      targetAudience,
      monetization,
      category,
      tags,
      lookingForTeam,
    });
  };

  const addTag = (tag: string) => {
    const cleanTag = tag.trim().toLowerCase().replace(/^#/, '');
    if (cleanTag && !tags.includes(cleanTag) && tags.length < 5) {
      setTags([...tags, cleanTag]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

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
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category *</Label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm border transition-colors",
                      category === cat
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-muted border-border"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Brief Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your idea in 2-3 sentences (this will be shown in the idea card)"
                rows={3}
                maxLength={300}
              />
              <p className="text-xs text-muted-foreground text-right">
                {description.length}/300
              </p>
            </div>

            {/* Problem */}
            <div className="space-y-2">
              <Label htmlFor="problem" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                What problem does it solve?
              </Label>
              <Textarea
                id="problem"
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="Describe the pain point or problem your idea addresses..."
                rows={3}
              />
            </div>

            {/* Solution */}
            <div className="space-y-2">
              <Label htmlFor="solution" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Your Proposed Solution
              </Label>
              <Textarea
                id="solution"
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
                placeholder="How would your idea solve this problem?"
                rows={3}
              />
            </div>

            {/* Target Audience */}
            <div className="space-y-2">
              <Label htmlFor="audience" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Target Audience
              </Label>
              <Textarea
                id="audience"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Who would use this? Be specific about your target users..."
                rows={2}
              />
            </div>

            {/* Monetization */}
            <div className="space-y-2">
              <Label htmlFor="monetization" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Monetization Strategy (optional)
              </Label>
              <Textarea
                id="monetization"
                value={monetization}
                onChange={(e) => setMonetization(e.target.value)}
                placeholder="How could this idea make money? (freemium, subscription, ads, etc.)"
                rows={2}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags (up to 5)</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-primary/70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              {tags.length < 5 && (
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add relevant tags..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(tagInput);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addTag(tagInput)}
                    disabled={!tagInput.trim()}
                  >
                    Add
                  </Button>
                </div>
              )}
            </div>

            {/* Looking for Team */}
            <div className="border rounded-lg p-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Looking for co-founders/team?</p>
                    <p className="text-sm text-muted-foreground">
                      Enable this if you want others to join you in building this
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={lookingForTeam}
                  onChange={(e) => setLookingForTeam(e.target.checked)}
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
                disabled={!title.trim() || !description.trim() || !category || createIdeaMutation.isPending}
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

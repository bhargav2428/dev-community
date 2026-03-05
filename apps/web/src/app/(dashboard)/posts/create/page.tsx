'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Image,
  Link,
  Code,
  Hash,
  AtSign,
  Smile,
  X,
  Send,
  Globe,
  Users,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CreatePostPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [links, setLinks] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const createPostMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/posts', data),
    onSuccess: (data) => {
      router.push(`/posts/${data.data.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    createPostMutation.mutate({
      content,
      visibility,
      tags,
      codeSnippet: codeSnippet || undefined,
      links: links.length > 0 ? links : undefined,
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

  const addLink = () => {
    if (linkInput.trim() && links.length < 3) {
      setLinks([...links, linkInput.trim()]);
      setLinkInput('');
    }
  };

  const removeLink = (link: string) => {
    setLinks(links.filter((l) => l !== link));
  };

  const insertMention = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.substring(0, start) + '@' + content.substring(end);
      setContent(newContent);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 1, start + 1);
      }, 0);
    }
  };

  const visibilityOptions = [
    { value: 'public' as const, label: 'Public', icon: Globe, description: 'Anyone can see' },
    { value: 'followers' as const, label: 'Followers', icon: Users, description: 'Only followers' },
    { value: 'private' as const, label: 'Private', icon: Lock, description: 'Only you' },
  ];

  const charLimit = 2000;
  const remainingChars = charLimit - content.length;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Create Post</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Post Content */}
            <div className="space-y-2">
              <Label htmlFor="content">What's on your mind?</Label>
              <Textarea
                ref={textareaRef}
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your thoughts, code, or discoveries with the developer community..."
                rows={6}
                maxLength={charLimit}
                className="resize-none"
              />
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Add image"
                  >
                    <Image className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowCodeEditor(!showCodeEditor)}
                    title="Add code"
                  >
                    <Code className={cn("h-4 w-4", showCodeEditor && "text-primary")} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={insertMention}
                    title="Mention user"
                  >
                    <AtSign className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Add emoji"
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                </div>
                <span className={cn(
                  "text-muted-foreground",
                  remainingChars < 100 && "text-yellow-500",
                  remainingChars < 0 && "text-red-500"
                )}>
                  {remainingChars}
                </span>
              </div>
            </div>

            {/* Code Snippet */}
            {showCodeEditor && (
              <div className="space-y-2">
                <Label htmlFor="code">Code Snippet (optional)</Label>
                <Textarea
                  id="code"
                  value={codeSnippet}
                  onChange={(e) => setCodeSnippet(e.target.value)}
                  placeholder="// Paste your code here..."
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>
            )}

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
                    placeholder="Add a tag..."
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
                    <Hash className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Links */}
            <div className="space-y-2">
              <Label>Links (up to 3)</Label>
              {links.length > 0 && (
                <div className="space-y-2 mb-2">
                  {links.map((link) => (
                    <div
                      key={link}
                      className="flex items-center justify-between p-2 bg-muted rounded-md text-sm"
                    >
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate"
                      >
                        {link}
                      </a>
                      <button
                        type="button"
                        onClick={() => removeLink(link)}
                        className="text-muted-foreground hover:text-foreground ml-2"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {links.length < 3 && (
                <div className="flex gap-2">
                  <Input
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    placeholder="https://..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addLink();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addLink}
                    disabled={!linkInput.trim()}
                  >
                    <Link className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Visibility */}
            <div className="space-y-2">
              <Label>Who can see this?</Label>
              <div className="grid grid-cols-3 gap-2">
                {visibilityOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setVisibility(option.value)}
                      className={cn(
                        "p-3 rounded-lg border text-center transition-colors",
                        visibility === option.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted"
                      )}
                    >
                      <Icon className="h-5 w-5 mx-auto mb-1" />
                      <div className="text-sm font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!content.trim() || createPostMutation.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                {createPostMutation.isPending ? 'Posting...' : 'Post'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

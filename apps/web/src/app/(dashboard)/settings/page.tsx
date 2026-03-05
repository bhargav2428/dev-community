'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Key,
  Mail,
  Smartphone,
  Trash2,
  Save,
  Github,
  Linkedin,
  Twitter,
  Link,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SettingsTab = 'profile' | 'notifications' | 'privacy' | 'appearance' | 'connections' | 'account';

export default function SettingsPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [isSaving, setIsSaving] = useState(false);

  // Profile state
  const [profile, setProfile] = useState({
    displayName: session?.user?.name || '',
    username: '',
    bio: '',
    location: '',
    website: '',
    githubUrl: '',
    linkedinUrl: '',
    twitterUrl: '',
  });

  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    messageNotifications: true,
    mentionNotifications: true,
    followNotifications: true,
    projectUpdates: true,
    weeklyDigest: false,
    marketingEmails: false,
  });

  // Privacy settings
  const [privacy, setPrivacy] = useState({
    profileVisibility: 'public',
    showEmail: false,
    showActivity: true,
    allowMessages: 'everyone',
    showOnlineStatus: true,
  });

  // Appearance
  const [appearance, setAppearance] = useState({
    theme: 'system',
    fontSize: 'medium',
    compactMode: false,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => apiClient.patch('/users/me', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfileMutation.mutateAsync(profile);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'privacy' as const, label: 'Privacy', icon: Shield },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'connections' as const, label: 'Connections', icon: Globe },
    { id: 'account' as const, label: 'Account', icon: Key },
  ];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <nav className="w-full md:w-64 flex-shrink-0">
          <Card>
            <CardContent className="p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </nav>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>
                  Update your profile information visible to other developers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={profile.displayName}
                      onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={profile.username}
                      onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                      placeholder="@username"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    placeholder="Tell other developers about yourself..."
                    rows={4}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={profile.location}
                      onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                      placeholder="City, Country"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={profile.website}
                      onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Social Links</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="github" className="flex items-center gap-2">
                        <Github className="h-4 w-4" /> GitHub
                      </Label>
                      <Input
                        id="github"
                        value={profile.githubUrl}
                        onChange={(e) => setProfile({ ...profile, githubUrl: e.target.value })}
                        placeholder="https://github.com/username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="linkedin" className="flex items-center gap-2">
                        <Linkedin className="h-4 w-4" /> LinkedIn
                      </Label>
                      <Input
                        id="linkedin"
                        value={profile.linkedinUrl}
                        onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })}
                        placeholder="https://linkedin.com/in/username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="twitter" className="flex items-center gap-2">
                        <Twitter className="h-4 w-4" /> Twitter
                      </Label>
                      <Input
                        id="twitter"
                        value={profile.twitterUrl}
                        onChange={(e) => setProfile({ ...profile, twitterUrl: e.target.value })}
                        placeholder="https://twitter.com/username"
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose how and when you want to be notified
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-medium">Email Notifications</h3>
                  {[
                    { key: 'emailNotifications', label: 'Enable email notifications', icon: Mail },
                    { key: 'weeklyDigest', label: 'Weekly digest email', icon: Mail },
                    { key: 'marketingEmails', label: 'Product updates and tips', icon: Mail },
                  ].map((item) => (
                    <label key={item.key} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                        {item.label}
                      </span>
                      <input
                        type="checkbox"
                        checked={notifications[item.key as keyof typeof notifications]}
                        onChange={(e) =>
                          setNotifications({ ...notifications, [item.key]: e.target.checked })
                        }
                        className="h-5 w-5 rounded border-gray-300"
                      />
                    </label>
                  ))}
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Push Notifications</h3>
                  {[
                    { key: 'pushNotifications', label: 'Enable push notifications', icon: Smartphone },
                    { key: 'messageNotifications', label: 'New messages', icon: Mail },
                    { key: 'mentionNotifications', label: 'Mentions', icon: User },
                    { key: 'followNotifications', label: 'New followers', icon: User },
                    { key: 'projectUpdates', label: 'Project updates', icon: Bell },
                  ].map((item) => (
                    <label key={item.key} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                        {item.label}
                      </span>
                      <input
                        type="checkbox"
                        checked={notifications[item.key as keyof typeof notifications]}
                        onChange={(e) =>
                          setNotifications({ ...notifications, [item.key]: e.target.checked })
                        }
                        className="h-5 w-5 rounded border-gray-300"
                      />
                    </label>
                  ))}
                </div>

                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === 'privacy' && (
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>
                  Control your profile visibility and data sharing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Profile Visibility</Label>
                    <select
                      value={privacy.profileVisibility}
                      onChange={(e) => setPrivacy({ ...privacy, profileVisibility: e.target.value })}
                      className="w-full h-10 rounded-md border border-input bg-background px-3"
                    >
                      <option value="public">Public - Anyone can see</option>
                      <option value="developers">Developers Only</option>
                      <option value="connections">Connections Only</option>
                      <option value="private">Private - Only you</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Who can message you</Label>
                    <select
                      value={privacy.allowMessages}
                      onChange={(e) => setPrivacy({ ...privacy, allowMessages: e.target.value })}
                      className="w-full h-10 rounded-md border border-input bg-background px-3"
                    >
                      <option value="everyone">Everyone</option>
                      <option value="connections">Connections Only</option>
                      <option value="nobody">Nobody</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { key: 'showEmail', label: 'Show email on profile' },
                    { key: 'showActivity', label: 'Show activity status' },
                    { key: 'showOnlineStatus', label: 'Show online status' },
                  ].map((item) => (
                    <label key={item.key} className="flex items-center justify-between">
                      <span>{item.label}</span>
                      <input
                        type="checkbox"
                        checked={privacy[item.key as keyof typeof privacy] as boolean}
                        onChange={(e) =>
                          setPrivacy({ ...privacy, [item.key]: e.target.checked })
                        }
                        className="h-5 w-5 rounded border-gray-300"
                      />
                    </label>
                  ))}
                </div>

                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Save Privacy Settings
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === 'appearance' && (
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                  Customize how DevConnect looks for you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <div className="grid grid-cols-3 gap-4">
                    {['light', 'dark', 'system'].map((theme) => (
                      <button
                        key={theme}
                        onClick={() => setAppearance({ ...appearance, theme })}
                        className={cn(
                          "p-4 rounded-lg border-2 text-center capitalize",
                          appearance.theme === theme
                            ? "border-primary bg-primary/5"
                            : "border-transparent bg-muted hover:bg-muted/80"
                        )}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Font Size</Label>
                  <select
                    value={appearance.fontSize}
                    onChange={(e) => setAppearance({ ...appearance, fontSize: e.target.value })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>

                <label className="flex items-center justify-between">
                  <span>Compact Mode</span>
                  <input
                    type="checkbox"
                    checked={appearance.compactMode}
                    onChange={(e) => setAppearance({ ...appearance, compactMode: e.target.checked })}
                    className="h-5 w-5 rounded border-gray-300"
                  />
                </label>

                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Save Appearance
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === 'connections' && (
            <Card>
              <CardHeader>
                <CardTitle>Connected Accounts</CardTitle>
                <CardDescription>
                  Link your accounts for easier login and profile enrichment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: 'GitHub', icon: Github, connected: false, description: 'Import repos and contributions' },
                  { name: 'LinkedIn', icon: Linkedin, connected: false, description: 'Import work experience' },
                  { name: 'Twitter', icon: Twitter, connected: false, description: 'Share your posts' },
                ].map((account) => {
                  const Icon = account.icon;
                  return (
                    <div
                      key={account.name}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{account.name}</p>
                          <p className="text-sm text-muted-foreground">{account.description}</p>
                        </div>
                      </div>
                      <Button variant={account.connected ? 'outline' : 'default'}>
                        {account.connected ? 'Disconnect' : 'Connect'}
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {activeTab === 'account' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>
                    Update your password to keep your account secure
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input id="currentPassword" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input id="newPassword" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input id="confirmPassword" type="password" />
                  </div>
                  <Button>
                    <Key className="h-4 w-4 mr-2" />
                    Update Password
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  <CardDescription>
                    Irreversible actions for your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg">
                    <div>
                      <p className="font-medium">Delete Account</p>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete your account and all data
                      </p>
                    </div>
                    <Button variant="destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

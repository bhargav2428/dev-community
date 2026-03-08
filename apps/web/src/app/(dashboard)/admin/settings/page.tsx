'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings,
  Globe,
  Shield,
  Mail,
  Bell,
  Palette,
  Database,
  Zap,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Lock,
  Eye,
  Users,
  MessageSquare,
  FileText,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PlatformSettings {
  general: {
    siteName: string;
    siteDescription: string;
    siteUrl: string;
    supportEmail: string;
    logoUrl: string;
    faviconUrl: string;
  };
  features: {
    registrationEnabled: boolean;
    emailVerificationRequired: boolean;
    profileVisibilityDefault: 'PUBLIC' | 'PRIVATE';
    allowGuestViewing: boolean;
    enableBlog: boolean;
    enableProjects: boolean;
    enableIdeas: boolean;
    enableJobs: boolean;
    enableHackathons: boolean;
    enableMessaging: boolean;
  };
  moderation: {
    autoModeration: boolean;
    moderationLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    spamFilterEnabled: boolean;
    profanityFilterEnabled: boolean;
    requirePostApproval: boolean;
    maxReportsBeforeHidden: number;
  };
  limits: {
    maxPostLength: number;
    maxCommentLength: number;
    maxBioLength: number;
    maxProjectsPerUser: number;
    maxDailyPosts: number;
    maxFileUploadSize: number;
  };
  notifications: {
    emailNotificationsEnabled: boolean;
    pushNotificationsEnabled: boolean;
    digestFrequency: 'DAILY' | 'WEEKLY' | 'NEVER';
    adminAlertEmail: string;
  };
  maintenance: {
    maintenanceMode: boolean;
    maintenanceMessage: string;
    scheduledMaintenance: string | null;
  };
}

const defaultSettings: PlatformSettings = {
  general: {
    siteName: 'Dev Community',
    siteDescription: '',
    siteUrl: '',
    supportEmail: '',
    logoUrl: '',
    faviconUrl: '',
  },
  features: {
    registrationEnabled: true,
    emailVerificationRequired: true,
    profileVisibilityDefault: 'PUBLIC',
    allowGuestViewing: false,
    enableBlog: true,
    enableProjects: true,
    enableIdeas: true,
    enableJobs: true,
    enableHackathons: true,
    enableMessaging: true,
  },
  moderation: {
    autoModeration: false,
    moderationLevel: 'MEDIUM',
    spamFilterEnabled: true,
    profanityFilterEnabled: false,
    requirePostApproval: false,
    maxReportsBeforeHidden: 5,
  },
  limits: {
    maxPostLength: 5000,
    maxCommentLength: 1000,
    maxBioLength: 500,
    maxProjectsPerUser: 50,
    maxDailyPosts: 20,
    maxFileUploadSize: 25,
  },
  notifications: {
    emailNotificationsEnabled: true,
    pushNotificationsEnabled: true,
    digestFrequency: 'WEEKLY',
    adminAlertEmail: '',
  },
  maintenance: {
    maintenanceMode: false,
    maintenanceMessage: '',
    scheduledMaintenance: null,
  },
};

function normalizeSettings(raw: any): PlatformSettings {
  if (!raw) return defaultSettings;
  return {
    ...defaultSettings,
    features: {
      ...defaultSettings.features,
      registrationEnabled: raw?.registration?.enabled ?? defaultSettings.features.registrationEnabled,
      emailVerificationRequired:
        raw?.registration?.requireEmailVerification ?? defaultSettings.features.emailVerificationRequired,
      enableJobs: raw?.features?.jobs ?? defaultSettings.features.enableJobs,
      enableHackathons: raw?.features?.hackathons ?? defaultSettings.features.enableHackathons,
      enableIdeas: raw?.features?.ideas ?? defaultSettings.features.enableIdeas,
      enableMessaging: raw?.features?.messaging ?? defaultSettings.features.enableMessaging,
      enableProjects: raw?.features?.projects ?? defaultSettings.features.enableProjects,
    },
    moderation: {
      ...defaultSettings.moderation,
      autoModeration: raw?.moderation?.autoModeration ?? defaultSettings.moderation.autoModeration,
      requirePostApproval: raw?.moderation?.requireApproval ?? defaultSettings.moderation.requirePostApproval,
    },
    limits: {
      ...defaultSettings.limits,
      maxPostLength: raw?.limits?.maxPostLength ?? defaultSettings.limits.maxPostLength,
      maxBioLength: raw?.limits?.maxBioLength ?? defaultSettings.limits.maxBioLength,
      maxProjectsPerUser: raw?.limits?.maxProjectsPerUser ?? defaultSettings.limits.maxProjectsPerUser,
    },
  };
}

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userRole = (session?.user as any)?.role;

  const [activeTab, setActiveTab] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);
  const [localSettings, setLocalSettings] = useState<PlatformSettings | null>(null);

  // Check super admin access
  useEffect(() => {
    if (status === 'authenticated' && userRole !== 'SUPER_ADMIN') {
      router.push('/admin');
    }
  }, [session, status, userRole, router]);

  // Fetch settings
  const { data: settings, isLoading, refetch } = useQuery<any>({
    queryKey: ['admin-settings'],
    queryFn: () => apiClient.get('/admin/settings'),
    enabled: userRole === 'SUPER_ADMIN',
  });

  // Initialize local settings
  useEffect(() => {
    if (settings && !localSettings) {
      setLocalSettings(normalizeSettings(settings));
    }
  }, [settings, localSettings]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (newSettings: PlatformSettings) => {
      return apiClient.put('/admin/settings', newSettings);
    },
    onSuccess: () => {
      toast.success('Settings saved successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      setHasChanges(false);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to save settings');
    },
  });

  const updateSetting = (section: keyof PlatformSettings, key: string, value: any) => {
    if (!localSettings) return;
    
    setLocalSettings({
      ...localSettings,
      [section]: {
        ...localSettings[section],
        [key]: value,
      },
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    if (localSettings) {
      saveMutation.mutate(localSettings);
    }
  };

  if (userRole !== 'SUPER_ADMIN') {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-muted-foreground">Access denied. Super Admin only.</p>
      </div>
    );
  }

  if (isLoading || !localSettings) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <RefreshCw className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Platform Settings</h1>
          <p className="text-muted-foreground">
            Configure global platform settings and features
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="text-orange-500 border-orange-500">
              Unsaved changes
            </Badge>
          )}
          <Button
            variant="outline"
            onClick={async () => {
              const fresh = await refetch();
              setLocalSettings(normalizeSettings(fresh.data));
              setHasChanges(false);
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Maintenance Mode Alert */}
      {localSettings.maintenance.maintenanceMode && (
        <Card className="border-orange-500 bg-orange-500/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="font-medium">Maintenance Mode is Active</p>
                <p className="text-sm text-muted-foreground">
                  The platform is currently in maintenance mode. Only admins can access the site.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full">
          <TabsTrigger value="general"><Globe className="h-4 w-4 mr-2" /> General</TabsTrigger>
          <TabsTrigger value="features"><Zap className="h-4 w-4 mr-2" /> Features</TabsTrigger>
          <TabsTrigger value="moderation"><Shield className="h-4 w-4 mr-2" /> Moderation</TabsTrigger>
          <TabsTrigger value="limits"><Database className="h-4 w-4 mr-2" /> Limits</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-2" /> Notifications</TabsTrigger>
          <TabsTrigger value="maintenance"><Settings className="h-4 w-4 mr-2" /> Maintenance</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Site Information</CardTitle>
              <CardDescription>Basic site configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input
                    id="siteName"
                    value={localSettings.general.siteName}
                    onChange={(e) => updateSetting('general', 'siteName', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="siteUrl">Site URL</Label>
                  <Input
                    id="siteUrl"
                    value={localSettings.general.siteUrl}
                    onChange={(e) => updateSetting('general', 'siteUrl', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="siteDescription">Site Description</Label>
                <Textarea
                  id="siteDescription"
                  value={localSettings.general.siteDescription}
                  onChange={(e) => updateSetting('general', 'siteDescription', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={localSettings.general.supportEmail}
                  onChange={(e) => updateSetting('general', 'supportEmail', e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>Logo and visual identity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    value={localSettings.general.logoUrl}
                    onChange={(e) => updateSetting('general', 'logoUrl', e.target.value)}
                    className="mt-1"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label htmlFor="faviconUrl">Favicon URL</Label>
                  <Input
                    id="faviconUrl"
                    value={localSettings.general.faviconUrl}
                    onChange={(e) => updateSetting('general', 'faviconUrl', e.target.value)}
                    className="mt-1"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Settings */}
        <TabsContent value="features" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>User Registration</CardTitle>
              <CardDescription>Control user registration settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Registration</Label>
                  <p className="text-sm text-muted-foreground">Allow new users to register</p>
                </div>
                <Switch
                  checked={localSettings.features.registrationEnabled}
                  onCheckedChange={(v) => updateSetting('features', 'registrationEnabled', v)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Require Email Verification</Label>
                  <p className="text-sm text-muted-foreground">Users must verify email before accessing features</p>
                </div>
                <Switch
                  checked={localSettings.features.emailVerificationRequired}
                  onCheckedChange={(v) => updateSetting('features', 'emailVerificationRequired', v)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow Guest Viewing</Label>
                  <p className="text-sm text-muted-foreground">Allow non-logged-in users to view content</p>
                </div>
                <Switch
                  checked={localSettings.features.allowGuestViewing}
                  onCheckedChange={(v) => updateSetting('features', 'allowGuestViewing', v)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Default Profile Visibility</Label>
                  <p className="text-sm text-muted-foreground">Default visibility for new profiles</p>
                </div>
                <Select
                  value={localSettings.features.profileVisibilityDefault}
                  onValueChange={(v) => updateSetting('features', 'profileVisibilityDefault', v)}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLIC">Public</SelectItem>
                    <SelectItem value="PRIVATE">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Platform Features</CardTitle>
              <CardDescription>Enable or disable platform modules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'enableBlog', label: 'Blog / Posts', icon: FileText },
                { key: 'enableProjects', label: 'Projects', icon: Database },
                { key: 'enableIdeas', label: 'Ideas', icon: Zap },
                { key: 'enableJobs', label: 'Job Listings', icon: Users },
                { key: 'enableHackathons', label: 'Hackathons', icon: Zap },
                { key: 'enableMessaging', label: 'Direct Messaging', icon: MessageSquare },
              ].map((feature) => (
                <div key={feature.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <feature.icon className="h-4 w-4 text-muted-foreground" />
                    <Label>{feature.label}</Label>
                  </div>
                  <Switch
                    checked={(localSettings.features as any)[feature.key]}
                    onCheckedChange={(v) => updateSetting('features', feature.key, v)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Moderation Settings */}
        <TabsContent value="moderation" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Auto-Moderation</CardTitle>
              <CardDescription>Automated content moderation settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Auto-Moderation</Label>
                  <p className="text-sm text-muted-foreground">Automatically moderate content using AI</p>
                </div>
                <Switch
                  checked={localSettings.moderation.autoModeration}
                  onCheckedChange={(v) => updateSetting('moderation', 'autoModeration', v)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Moderation Level</Label>
                  <p className="text-sm text-muted-foreground">How strict the moderation should be</p>
                </div>
                <Select
                  value={localSettings.moderation.moderationLevel}
                  onValueChange={(v) => updateSetting('moderation', 'moderationLevel', v)}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Spam Filter</Label>
                  <p className="text-sm text-muted-foreground">Filter spam and suspicious content</p>
                </div>
                <Switch
                  checked={localSettings.moderation.spamFilterEnabled}
                  onCheckedChange={(v) => updateSetting('moderation', 'spamFilterEnabled', v)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Profanity Filter</Label>
                  <p className="text-sm text-muted-foreground">Filter inappropriate language</p>
                </div>
                <Switch
                  checked={localSettings.moderation.profanityFilterEnabled}
                  onCheckedChange={(v) => updateSetting('moderation', 'profanityFilterEnabled', v)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Require Post Approval</Label>
                  <p className="text-sm text-muted-foreground">New posts require moderator approval</p>
                </div>
                <Switch
                  checked={localSettings.moderation.requirePostApproval}
                  onCheckedChange={(v) => updateSetting('moderation', 'requirePostApproval', v)}
                />
              </div>
              <Separator />
              <div>
                <Label>Max Reports Before Hidden</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Number of reports before content is auto-hidden
                </p>
                <Input
                  type="number"
                  value={localSettings.moderation.maxReportsBeforeHidden}
                  onChange={(e) => updateSetting('moderation', 'maxReportsBeforeHidden', parseInt(e.target.value))}
                  className="w-[100px]"
                  min={1}
                  max={100}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Limits Settings */}
        <TabsContent value="limits" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Limits</CardTitle>
              <CardDescription>Configure maximum limits for various content types</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Max Post Length (characters)</Label>
                  <Input
                    type="number"
                    value={localSettings.limits.maxPostLength}
                    onChange={(e) => updateSetting('limits', 'maxPostLength', parseInt(e.target.value))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Max Comment Length (characters)</Label>
                  <Input
                    type="number"
                    value={localSettings.limits.maxCommentLength}
                    onChange={(e) => updateSetting('limits', 'maxCommentLength', parseInt(e.target.value))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Max Bio Length (characters)</Label>
                  <Input
                    type="number"
                    value={localSettings.limits.maxBioLength}
                    onChange={(e) => updateSetting('limits', 'maxBioLength', parseInt(e.target.value))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Max Projects Per User</Label>
                  <Input
                    type="number"
                    value={localSettings.limits.maxProjectsPerUser}
                    onChange={(e) => updateSetting('limits', 'maxProjectsPerUser', parseInt(e.target.value))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Max Daily Posts Per User</Label>
                  <Input
                    type="number"
                    value={localSettings.limits.maxDailyPosts}
                    onChange={(e) => updateSetting('limits', 'maxDailyPosts', parseInt(e.target.value))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Max File Upload Size (MB)</Label>
                  <Input
                    type="number"
                    value={localSettings.limits.maxFileUploadSize}
                    onChange={(e) => updateSetting('limits', 'maxFileUploadSize', parseInt(e.target.value))}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure platform-wide notification settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Enable email notifications for users</p>
                </div>
                <Switch
                  checked={localSettings.notifications.emailNotificationsEnabled}
                  onCheckedChange={(v) => updateSetting('notifications', 'emailNotificationsEnabled', v)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Enable browser push notifications</p>
                </div>
                <Switch
                  checked={localSettings.notifications.pushNotificationsEnabled}
                  onCheckedChange={(v) => updateSetting('notifications', 'pushNotificationsEnabled', v)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Default Digest Frequency</Label>
                  <p className="text-sm text-muted-foreground">Default email digest frequency for new users</p>
                </div>
                <Select
                  value={localSettings.notifications.digestFrequency}
                  onValueChange={(v) => updateSetting('notifications', 'digestFrequency', v)}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="NEVER">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div>
                <Label htmlFor="adminAlertEmail">Admin Alert Email</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Email address for critical admin alerts
                </p>
                <Input
                  id="adminAlertEmail"
                  type="email"
                  value={localSettings.notifications.adminAlertEmail}
                  onChange={(e) => updateSetting('notifications', 'adminAlertEmail', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Settings */}
        <TabsContent value="maintenance" className="space-y-4 mt-4">
          <Card className={cn(localSettings.maintenance.maintenanceMode && "border-orange-500")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className={cn(
                  "h-5 w-5",
                  localSettings.maintenance.maintenanceMode ? "text-orange-500" : "text-muted-foreground"
                )} />
                Maintenance Mode
              </CardTitle>
              <CardDescription>
                Put the site in maintenance mode. Only admins will be able to access.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Show maintenance page to all non-admin users
                  </p>
                </div>
                <Switch
                  checked={localSettings.maintenance.maintenanceMode}
                  onCheckedChange={(v) => updateSetting('maintenance', 'maintenanceMode', v)}
                />
              </div>
              <div>
                <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
                <Textarea
                  id="maintenanceMessage"
                  value={localSettings.maintenance.maintenanceMessage}
                  onChange={(e) => updateSetting('maintenance', 'maintenanceMessage', e.target.value)}
                  className="mt-1"
                  placeholder="We're performing scheduled maintenance. We'll be back shortly!"
                />
              </div>
              <div>
                <Label htmlFor="scheduledMaintenance">Scheduled Maintenance</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Schedule future maintenance (shows warning banner to users)
                </p>
                <Input
                  id="scheduledMaintenance"
                  type="datetime-local"
                  value={localSettings.maintenance.scheduledMaintenance || ''}
                  onChange={(e) => updateSetting('maintenance', 'scheduledMaintenance', e.target.value || null)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Danger Zone</CardTitle>
              <CardDescription>Irreversible and destructive actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-red-500/50 rounded-lg">
                <div>
                  <p className="font-medium text-red-500">Clear All Cache</p>
                  <p className="text-sm text-muted-foreground">Clear all cached data from the platform</p>
                </div>
                <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-500/10">
                  Clear Cache
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 border border-red-500/50 rounded-lg">
                <div>
                  <p className="font-medium text-red-500">Reset All Settings</p>
                  <p className="text-sm text-muted-foreground">Reset all settings to default values</p>
                </div>
                <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-500/10">
                  Reset Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

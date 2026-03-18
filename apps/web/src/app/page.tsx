import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Rocket, 
  Sparkles, 
  Github, 
  Zap,
  MessageSquare,
  Trophy,
  Briefcase,
  Globe,
  Code2
} from 'lucide-react';
import Image from 'next/image';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Image src="/icons/bfd-cube.svg" alt="BFD Logo" width={32} height={32} />
            <span className="text-xl font-bold">BFD</span>
          </Link>
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/explore" className="text-muted-foreground hover:text-foreground transition-colors">
              Explore
            </Link>
            <Link href="/projects" className="text-muted-foreground hover:text-foreground transition-colors">
              Projects
            </Link>
            <Link href="/ideas" className="text-muted-foreground hover:text-foreground transition-colors">
              Ideas
            </Link>
            <Link href="/jobs" className="text-muted-foreground hover:text-foreground transition-colors">
              Jobs
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-24 sm:py-32">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm mb-8 bg-muted/50">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>The social network built for developers</span>
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            Where Developers
            <span className="text-gradient block">Build Together</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Connect with millions of developers worldwide. Share your projects, 
            find co-founders, join hackathons, and ship your ideas to the world.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="h-12 px-8 text-lg">
                <Github className="mr-2 h-5 w-5" />
                Sign up with GitHub
              </Button>
            </Link>
            <Link href="/explore">
              <Button size="lg" variant="outline" className="h-12 px-8 text-lg">
                Explore Community
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mt-6">
            Join 50,000+ developers already building on BFD
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-24 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need to succeed
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From finding collaborators to shipping products, we&apos;ve got you covered.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-2xl bg-card border card-hover"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-4 py-24">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl sm:text-5xl font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to build something amazing?
          </h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto mb-8">
            Join thousands of developers who are already building, 
            learning, and growing together.
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="h-12 px-8 text-lg">
              Get Started for Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-4 py-12">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/features" className="hover:text-foreground">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground">Pricing</Link></li>
                <li><Link href="/changelog" className="hover:text-foreground">Changelog</Link></li>
                <li><Link href="/roadmap" className="hover:text-foreground">Roadmap</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Community</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/explore" className="hover:text-foreground">Explore</Link></li>
                <li><Link href="/projects" className="hover:text-foreground">Projects</Link></li>
                <li><Link href="/hackathons" className="hover:text-foreground">Hackathons</Link></li>
                <li><Link href="/leaderboard" className="hover:text-foreground">Leaderboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/blog" className="hover:text-foreground">Blog</Link></li>
                <li><Link href="/docs" className="hover:text-foreground">Documentation</Link></li>
                <li><Link href="/api" className="hover:text-foreground">API</Link></li>
                <li><Link href="/support" className="hover:text-foreground">Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground">Terms</Link></li>
                <li><Link href="/security" className="hover:text-foreground">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Code2 className="h-6 w-6 text-primary" />
              <span className="font-semibold">DevCommunity</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} DevCommunity. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: Users,
    title: 'Find Your Team',
    description: 'Connect with developers who share your passion. Build teams for projects, startups, or open source.',
  },
  {
    icon: Rocket,
    title: 'Launch Ideas',
    description: 'Share your startup ideas, get feedback, and find co-founders to bring them to life.',
  },
  {
    icon: MessageSquare,
    title: 'Real-time Collaboration',
    description: 'Chat, video call, and collaborate in real-time with built-in project management tools.',
  },
  {
    icon: Globe,
    title: 'Open Source Hub',
    description: 'Discover and contribute to open source projects. Track your contributions and earn reputation.',
  },
  {
    icon: Trophy,
    title: 'Hackathons & Events',
    description: 'Join hackathons, coding challenges, and events to showcase your skills and win prizes.',
  },
  {
    icon: Briefcase,
    title: 'Job Board',
    description: 'Find developer jobs at startups and tech companies. Get discovered by recruiters.',
  },
];

const stats = [
  { value: '50K+', label: 'Developers' },
  { value: '10K+', label: 'Projects' },
  { value: '500+', label: 'Hackathons' },
  { value: '1M+', label: 'Contributions' },
];

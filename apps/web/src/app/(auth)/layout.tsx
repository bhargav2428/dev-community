import { Code2 } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side - Branding */}
      <div className="hidden lg:flex flex-col justify-between bg-primary p-10 text-primary-foreground">
        <Link href="/" className="flex items-center gap-2">
          <Code2 className="h-8 w-8" />
          <span className="text-2xl font-bold">DevCommunity</span>
        </Link>
        
        <div className="space-y-6">
          <blockquote className="space-y-2">
            <p className="text-lg">
              &ldquo;DevCommunity helped me find my co-founder and launch my startup 
              in just 3 months. The community is incredibly supportive!&rdquo;
            </p>
            <footer className="text-sm opacity-80">
              Sarah Chen, Founder of CodeFlow
            </footer>
          </blockquote>
        </div>

        <div className="text-sm opacity-80">
          © {new Date().getFullYear()} DevCommunity. All rights reserved.
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center">
            <Link href="/" className="flex items-center gap-2">
              <Code2 className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">DevCommunity</span>
            </Link>
          </div>
          
          {children}
        </div>
      </div>
    </div>
  );
}

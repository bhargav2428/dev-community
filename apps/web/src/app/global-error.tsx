'use client';

import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 text-center">
          <h2 className="text-2xl font-bold">Application Error</h2>
          <p className="mt-2 text-muted-foreground">
            {error.message || 'A fatal error occurred.'}
          </p>
          <Button className="mt-6" onClick={() => reset()}>
            Reload
          </Button>
        </div>
      </body>
    </html>
  );
}


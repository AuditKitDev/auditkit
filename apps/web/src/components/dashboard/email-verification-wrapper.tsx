'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { EmailVerificationBanner } from './email-verification-banner';

function EmailVerificationInner() {
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');

    // If there's a verification token in the URL, verify it first
    if (token && token.startsWith('ev_')) {
      apiFetch<{ ok: boolean }>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
      })
        .then(() => setEmailVerified(true))
        .catch(() => {
          // Token invalid/expired — fetch actual status
          apiFetch<{ user: { emailVerified: boolean } }>('/auth/me')
            .then((data) => setEmailVerified(data.user.emailVerified))
            .catch(() => setEmailVerified(null));
        });
    } else {
      apiFetch<{ user: { emailVerified: boolean } }>('/auth/me')
        .then((data) => setEmailVerified(data.user.emailVerified))
        .catch(() => setEmailVerified(null));
    }
  }, [searchParams]);

  if (emailVerified === null) return null;

  return <EmailVerificationBanner emailVerified={emailVerified} />;
}

export function EmailVerificationWrapper() {
  return (
    <Suspense>
      <EmailVerificationInner />
    </Suspense>
  );
}

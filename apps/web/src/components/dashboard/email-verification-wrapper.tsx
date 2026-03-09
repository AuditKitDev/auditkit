'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { EmailVerificationBanner } from './email-verification-banner';

export function EmailVerificationWrapper() {
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);

  useEffect(() => {
    apiFetch<{ user: { emailVerified: boolean } }>('/auth/me')
      .then((data) => setEmailVerified(data.user.emailVerified))
      .catch(() => setEmailVerified(null));
  }, []);

  if (emailVerified === null) return null;

  return <EmailVerificationBanner emailVerified={emailVerified} />;
}

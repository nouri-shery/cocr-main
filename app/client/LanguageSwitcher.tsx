'use client';

import { useTransition } from 'react';
import { changeLocale } from '../actions/actions';

interface LanguageSwitcherProps {
  currentLocale: string;
}

export default function LanguageSwitcher({ currentLocale }: LanguageSwitcherProps) {
  const [isPending, startTransition] = useTransition();

  // Determine the next language to switch to
  const nextLocale = currentLocale === 'en' ? 'ar' : 'en';
  const buttonLabel = currentLocale === 'en' ? 'العربية' : 'English';

  const handleToggle = () => {
    startTransition(async () => {
      await changeLocale(nextLocale);
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-800 dark:hover:bg-gray-700 font-medium"
    >
      {isPending ? '...' : buttonLabel}
    </button>
  );
}
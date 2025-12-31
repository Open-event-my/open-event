import { useState, useEffect } from 'react';
import { Cookie, Check } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  cookieConsentManager,
  type ConsentPreferences,
} from '@/lib/compliance/cookieConsent';
import { cn } from '@/lib/utils';

interface CookiePreferencesProps {
  className?: string;
}

export function CookiePreferences({ className }: CookiePreferencesProps) {
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
    timestamp: Date.now(),
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    // Load current preferences
    const current = cookieConsentManager.getConsent();
    if (current) {
      setPreferences(current);
    }
  }, []);

  const handleToggle = (category: keyof Omit<ConsentPreferences, 'timestamp'>) => {
    if (category === 'necessary') {
      // Necessary cookies cannot be disabled
      return;
    }

    setPreferences((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleSave = () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      cookieConsentManager.setConsent({
        ...preferences,
        timestamp: Date.now(),
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAcceptAll = () => {
    setPreferences({
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: Date.now(),
    });
  };

  const handleRejectAll = () => {
    setPreferences({
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: Date.now(),
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Cookie className="size-6 text-primary" weight="duotone" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-foreground">
            Cookie Preferences
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your cookie preferences and control how we use cookies on
            this website.
          </p>
          {preferences.timestamp > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Last updated: {formatDate(preferences.timestamp)}
            </p>
          )}
        </div>
      </div>

      {/* Cookie Categories */}
      <div className="space-y-4">
        {/* Necessary Cookies */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Necessary Cookies
                </h3>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  Always Active
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                These cookies are essential for the website to function properly.
                They enable core functionality such as security, network
                management, and accessibility. You cannot opt-out of these
                cookies.
              </p>
            </div>
            <div className="flex-shrink-0">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Check className="size-5 text-primary" weight="bold" />
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Cookies */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                Analytics Cookies
              </h3>
              <p className="text-sm text-muted-foreground">
                These cookies help us understand how visitors interact with our
                website by collecting and reporting information anonymously. This
                helps us improve the user experience.
              </p>
            </div>
            <button
              onClick={() => handleToggle('analytics')}
              className={cn(
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2',
                preferences.analytics ? 'bg-primary' : 'bg-muted'
              )}
              role="switch"
              aria-checked={preferences.analytics}
              aria-label="Toggle analytics cookies"
            >
              <span
                className={cn(
                  'pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  preferences.analytics ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>
        </div>

        {/* Marketing Cookies */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                Marketing Cookies
              </h3>
              <p className="text-sm text-muted-foreground">
                These cookies are used to deliver personalized advertisements
                that are relevant to you and your interests. They also help us
                measure the effectiveness of our marketing campaigns.
              </p>
            </div>
            <button
              onClick={() => handleToggle('marketing')}
              className={cn(
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2',
                preferences.marketing ? 'bg-primary' : 'bg-muted'
              )}
              role="switch"
              aria-checked={preferences.marketing}
              aria-label="Toggle marketing cookies"
            >
              <span
                className={cn(
                  'pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  preferences.marketing ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRejectAll}
            disabled={isSaving}
          >
            Reject All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAcceptAll}
            disabled={isSaving}
          >
            Accept All
          </Button>
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="relative"
        >
          {isSaving ? 'Saving...' : 'Save Preferences'}
          {saveSuccess && (
            <Check className="absolute -right-1 -top-1 size-4 text-green-500" weight="bold" />
          )}
        </Button>
      </div>

      {/* Success Message */}
      {saveSuccess && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3">
          <p className="text-sm text-green-700 dark:text-green-400">
            Your cookie preferences have been saved successfully.
          </p>
        </div>
      )}
    </div>
  );
}

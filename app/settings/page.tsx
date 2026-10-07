import { auth } from '@/lib/auth';
import { getAppSettings } from '@/app/actions/settings';
import SettingsClient from './SettingsClient';

export default async function SettingsPage() {
  const session = await auth();
  const settings = await getAppSettings();

  return (
    <main className="px-3 sm:px-6 py-2 sm:py-3 max-w-2xl mx-auto">
      <SettingsClient
        role={session?.user?.role ?? null}
        defaultServings={settings.defaultServings}
      />
    </main>
  );
}

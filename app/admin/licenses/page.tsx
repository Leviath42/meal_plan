import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getLicensesForAdmin } from '@/app/actions/license';
import LicensesClient from './LicensesClient';

export default async function AdminLicensesPage() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') redirect('/');

  const { licenses: rows, audit } = await getLicensesForAdmin();

  return (
    <main className="px-3 sm:px-6 py-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-lg sm:text-xl font-bold">Licences</h1>
        <LicensesClient licenses={rows} audit={audit} />
      </div>
    </main>
  );
}

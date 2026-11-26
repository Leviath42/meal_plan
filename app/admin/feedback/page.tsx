import { redirect } from 'next/navigation';

// La section admin des retours vit désormais sur /feedback (C-067) :
// redirection de compat pour les anciens liens.
export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; status?: string }>;
}) {
  const params = await searchParams;
  const q = new URLSearchParams();
  if (params.category) q.set('category', params.category);
  if (params.status) q.set('status', params.status);
  const qs = q.toString();
  redirect(`/feedback${qs ? `?${qs}` : ''}`);
}

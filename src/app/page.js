import { redirect } from 'next/navigation';

/**
 * Root page — redirects to the current month's globe.
 * Landing page with month management will be added later.
 */
export default function Home() {
  const now = new Date();
  const monthId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  redirect(`/globe/${monthId}`);
}

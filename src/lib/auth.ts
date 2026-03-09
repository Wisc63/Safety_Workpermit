import { cookies } from 'next/headers';

export const ADMIN_USER = 'Admin';
export const ADMIN_PASSWORD = 'SHE!';

export function isAdmin(): boolean {
  const cookieStore = cookies();
  return cookieStore.get('isAdmin')?.value === 'true';
}

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hasPermission(user: any | null, permissionId: string): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (!user.permissions) return false;
  return user.permissions.includes(permissionId) || user.permissions.includes('all');
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA'
  }).format(value);
}

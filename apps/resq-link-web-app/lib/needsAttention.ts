import type { DashboardStats, NeedsAttentionItem } from '@/lib/accountTypes';

export function buildNeedsAttention(
  stats: Pick<DashboardStats, 'pendingKyc' | 'disabledAccounts'>
): NeedsAttentionItem[] {
  const attention: NeedsAttentionItem[] = [];
  if (stats.pendingKyc > 0) {
    attention.push({
      id: 'pending-kyc',
      count: stats.pendingKyc,
      href: '/admin/kyc',
      label:
        stats.pendingKyc === 1
          ? '1 KYC application pending review'
          : `${stats.pendingKyc} KYC applications pending review`,
    });
  }
  if (stats.disabledAccounts > 0) {
    attention.push({
      id: 'disabled',
      count: stats.disabledAccounts,
      href: '/admin/dispatchers',
      label:
        stats.disabledAccounts === 1
          ? '1 disabled account'
          : `${stats.disabledAccounts} disabled accounts`,
    });
  }
  return attention;
}

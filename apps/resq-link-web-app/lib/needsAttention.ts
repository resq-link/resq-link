import type { DashboardStats, NeedsAttentionItem } from '@/lib/accountTypes';

export function buildNeedsAttention(
  stats: Pick<DashboardStats, 'pendingKyc' | 'disabledAccounts' | 'incompleteCommandCenters'>
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
  if (stats.incompleteCommandCenters > 0) {
    attention.push({
      id: 'incomplete-cc',
      count: stats.incompleteCommandCenters,
      href: '/admin/command-centers',
      label:
        stats.incompleteCommandCenters === 1
          ? '1 incomplete command-center profile'
          : `${stats.incompleteCommandCenters} incomplete command-center profiles`,
    });
  }
  return attention;
}

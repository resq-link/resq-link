import { invalidateAdminQueries } from '@/hooks/useAdminQuery';

/** Keep civilians, KYC review, and dashboard stats in sync after account mutations. */
export function invalidateAdminCivilianDataCaches() {
  invalidateAdminQueries('admin:accounts:civilians:');
  invalidateAdminQueries('admin:kyc:');
  invalidateAdminQueries('admin:dashboard:');
}

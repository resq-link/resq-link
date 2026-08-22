import { writeAuditLog, type WriteAuditLogInput } from '@packages/firebase/admin';

export async function recordAudit(input: WriteAuditLogInput): Promise<void> {
  try {
    await writeAuditLog(input);
  } catch (error) {
    console.error('Failed to write audit log', input.action, error);
  }
}

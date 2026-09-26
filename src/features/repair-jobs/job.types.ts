export const jobStatuses = [
  'RECEIVED',
  'DIAGNOSING',
  'AWAITING_APPROVAL',
  'AWAITING_PARTS',
  'REPAIRING',
  'TESTING',
  'READY',
  'DELIVERED',
  'CANCELLED',
  'UNREPAIRABLE',
] as const;
export type JobStatus = (typeof jobStatuses)[number];
export const testKeys = [
  'power',
  'display',
  'touch',
  'charging',
  'audio',
  'cameras',
  'connectivity',
] as const;
export interface JobTest {
  key: string;
  result: 'PASS' | 'FAIL' | 'NA';
  notes?: string;
}
export interface JobEstimate {
  revision: number;
  lines: Array<{ description: string; quantity: number; unitPriceInPaise: number }>;
  totalInPaise: number;
  reason: string;
  at: string;
  approval?: {
    decision: 'APPROVED' | 'DECLINED';
    method: string;
    customerName: string;
    evidence: string;
    at: string;
  };
}
export interface RepairJob {
  number: string;
  bookingReference?: string;
  billingInvoiceNumber?: string;
  warrantySourceJobNumber?: string;
  warrantySourceInvoiceNumber?: string;
  version: number;
  customerName: string;
  phone?: string;
  email?: string;
  deviceLabel: string;
  imei?: string;
  serial?: string;
  issue: string;
  condition: string;
  accessories: string;
  targetAt?: string;
  technicianId?: string;
  technicianName?: string;
  status: JobStatus;
  custody: 'IN_SHOP' | 'RETURNED';
  returnedAt?: string;
  returnedTo?: string;
  diagnosis?: string;
  createdAt: string;
  estimates: JobEstimate[];
  tests: JobTest[];
  history: Array<{
    at: string;
    actorName: string;
    action: string;
    status: JobStatus;
    reason: string;
  }>;
  photos: Array<{ id: string; width: number; height: number; createdAt: string; url: string }>;
  permissions: { manage: boolean; repair: boolean };
}
export interface JobIntake {
  idempotencyKey: string;
  bookingReference?: string;
  expectedBookingVersion?: number;
  customerName?: string;
  phone?: string;
  email?: string;
  deviceLabel?: string;
  issue?: string;
  imei?: string;
  serial?: string;
  condition: string;
  accessories: string;
  targetAt?: string;
}
export interface TeamMember {
  id: string;
  name: string;
  email?: string;
  roles: string[];
  status: 'ACTIVE' | 'DISABLED';
  version: number;
}
export const jobLabel = (value: string) => value.toLowerCase().replaceAll('_', ' ');

export interface Issuer {
  name: string;
  address: string;
  phone: string;
  taxId?: string;
}
export interface Tax {
  label: string;
  rateBps: number;
}
export interface BillingSettings {
  configured: boolean;
  version: number;
  issuer?: Issuer;
  taxes?: Tax[];
  warrantyDays?: number;
  warrantyCoverage?: string;
  warrantyExclusions?: string;
  invoiceNote?: string;
}
export interface InvoiceLine {
  kind: 'PART' | 'LABOUR' | 'SERVICE';
  description: string;
  quantity: number;
  unitPriceInPaise: number;
}
export interface Invoice {
  id: string;
  number: string;
  jobNumber: string;
  issuer: Issuer;
  customerName: string;
  phone: string;
  deviceLabel: string;
  imei?: string;
  serial?: string;
  estimateRevision: number;
  lines: InvoiceLine[];
  subtotalInPaise: number;
  discountInPaise: number;
  taxableInPaise: number;
  taxes: Array<Tax & { amountInPaise: number }>;
  totalInPaise: number;
  warrantyDays: number;
  warrantyCoverage: string;
  warrantyExclusions: string;
  note?: string;
  issuedAt: string;
  issuedByName: string;
  summary?: BillingSummary;
}
export interface MoneyEntry {
  id: string;
  number: string;
  jobNumber: string;
  kind: 'PAYMENT' | 'REFUND' | 'CREDIT';
  amountInPaise: number;
  method?: string;
  reference?: string;
  paymentId?: string;
  paymentNumber?: string;
  invoiceNumber?: string;
  reason: string;
  issuer: Issuer;
  customerName: string;
  recordedByName: string;
  recordedAt: string;
  verification?: string;
}
export interface BillingSummary {
  receivedInPaise: number;
  refundedInPaise: number;
  netPaidInPaise: number;
  creditedInPaise: number;
  chargeInPaise: number;
  dueInPaise: number;
  refundDueInPaise: number;
  advanceInPaise: number;
}
export interface JobBilling {
  jobNumber: string;
  jobVersion: number;
  invoice: Invoice | null;
  entries: MoneyEntry[];
  summary: BillingSummary;
  warranty: { days: number; startsAt?: string; endsAt?: string; active: boolean } | null;
  deliveryAuthorization: {
    invoiceNumber: string;
    dueInPaise: number;
    reason: string;
    authorizedByName: string;
    at: string;
  } | null;
  sourceJobNumber?: string;
  sourceInvoiceNumber?: string;
  followups: Array<{ number: string; status: string; createdAt: string }>;
  permissions: { owner: boolean };
}

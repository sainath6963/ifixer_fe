export type PricingMode = 'DIAGNOSIS' | 'INDICATIVE';
export type BookingStatus = 'REQUESTED' | 'CONFIRMED' | 'CANCELLED' | 'CONVERTED';
export type CatalogKind = 'brands' | 'models' | 'services' | 'options';
export interface CatalogEntry {
  id: string;
  name?: string;
  slug?: string;
  description?: string;
  active: boolean;
  sortOrder: number;
  brandId?: string;
  modelId?: string;
  serviceId?: string;
  pricingMode?: PricingMode;
  priceInPaise?: number;
  version: number;
}
export type RepairCatalog = Record<CatalogKind, CatalogEntry[]>;
export interface BookingInput {
  idempotencyKey: string;
  manageToken: string;
  customerName: string;
  phone: string;
  email?: string;
  brandId?: string;
  modelId?: string;
  serviceId?: string;
  deviceDescription?: string;
  issue: string;
  requestedVisitAt?: string;
}
export interface RepairBooking {
  jobNumber?: string;
  reference: string;
  customerName: string;
  phone: string;
  email?: string;
  deviceLabel: string;
  serviceLabel: string;
  issue: string;
  pricingMode: PricingMode;
  indicativePriceInPaise?: number;
  requestedVisitAt?: string;
  confirmedVisitAt?: string;
  status: BookingStatus;
  version: number;
  createdAt: string;
  source?: 'ONLINE' | 'WALK_IN';
  history: Array<{
    at: string;
    action: string;
    status: BookingStatus;
    reason: string;
    visitAt?: string;
    actor?: string;
  }>;
}
export interface BookingChange {
  expectedVersion: number;
  action: 'CONFIRM' | 'RESCHEDULE' | 'CANCEL';
  reason: string;
  visitAt?: string;
}

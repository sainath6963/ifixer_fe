export interface Page<T> {
  items: T[];
  page: number;
  total: number;
  totalPages: number;
}
export interface Part {
  id: string;
  version: number;
  sku: string;
  name: string;
  quality: string;
  modelIds: string[];
  modelLabels: string[];
  bin?: string;
  supplierId?: string;
  referenceCostInPaise?: number;
  customerPriceInPaise: number;
  active: boolean;
  openingRecorded: boolean;
  stock: {
    version: number;
    onHand: number;
    reserved: number;
    available: number;
    repairConsumed: number;
    reorderPoint: number;
    lowStock: boolean;
  };
}
export interface Supplier {
  id: string;
  version: number;
  name: string;
  code: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  active: boolean;
}
export interface Lot {
  id: string;
  source: string;
  supplierId?: string;
  purchaseId?: string;
  quantity: number;
  remaining: number;
  unitCostInPaise?: number;
  createdAt: string;
}
export interface Purchase {
  id: string;
  version: number;
  number: string;
  supplierName: string;
  status: string;
  note: string;
  cancellationReason?: string;
  createdAt: string;
  lines: Array<{
    partId: string;
    sku: string;
    name: string;
    ordered: number;
    received: number;
    unitCostInPaise: number;
  }>;
  receipts?: Array<{
    id: string;
    reference: string;
    note: string;
    createdAt: string;
    lines: Array<{ partId: string; lineIndex: number; quantity: number; unitCostInPaise: number }>;
  }>;
}
export interface Movement {
  id: string;
  partId: string;
  sku: string;
  action: string;
  deltaOnHand: number;
  deltaReserved: number;
  deltaConsumed: number;
  knownCostInPaise?: number;
  unknownCostQuantity: number;
  note: string;
  createdAt: string;
}
export interface Usage {
  id: string;
  partId: string;
  sku: string;
  name: string;
  quantity: number;
  status: string;
  estimateRevision: number;
  compatibilityNote: string;
  note: string;
  returnedUsable: number;
  returnedDamaged: number;
  costInPaise?: number;
  unknownCostQuantity?: number;
}
export interface JobParts {
  jobNumber: string;
  jobVersion: number;
  items: Usage[];
}
export interface Operation {
  path: string;
  method: 'POST' | 'PATCH';
  body: Record<string, unknown>;
}

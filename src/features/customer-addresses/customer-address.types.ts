export interface CustomerAddressFields {
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: 'IN';
}

export interface SavedCustomerAddress extends CustomerAddressFields {
  id: string;
  isDefault: boolean;
}

export interface CustomerAddressBook {
  version: number;
  limit: number;
  addresses: SavedCustomerAddress[];
}

export interface CreateCustomerAddressInput extends CustomerAddressFields {
  expectedVersion: number;
  isDefault?: boolean;
}

export interface ReplaceCustomerAddressInput extends CustomerAddressFields {
  id: string;
  expectedVersion: number;
}

export interface CustomerAddressMutationInput {
  id: string;
  expectedVersion: number;
}

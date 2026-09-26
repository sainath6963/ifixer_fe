import { createApi } from '@reduxjs/toolkit/query/react';

import { csrfAwareBaseQuery } from './base-query';

export const baseApi = createApi({
  reducerPath: 'richCultureApi',
  baseQuery: csrfAwareBaseQuery,
  tagTypes: [
    'InstagramReel',
    'StoreConfig',
    'RepairCatalog',
    'RepairBooking',
    'RepairJob',
    'RepairInventory',
    'RepairBilling',
    'RepairTeam',
    'Category',
    'Product',
    'Customer',
    'AddressBook',
    'Cart',
    'Order',
    'Admin',
    'Inventory',
    'Media',
    'Notification',
    'ReturnRequest',
    'ReturnEvidence',
    'Coupon',
    'Review',
    'Wishlist',
    'StockAlert',
    'AdminCustomer',
    'AdminAnalytics',
  ],
  endpoints: () => ({}),
});

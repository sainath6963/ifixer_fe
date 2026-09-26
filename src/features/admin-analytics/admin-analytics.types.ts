export type AnalyticsGranularity = 'AUTO' | 'DAY' | 'WEEK' | 'MONTH';

export interface AnalyticsQuery {
  dateFrom?: string;
  dateTo?: string;
  granularity?: AnalyticsGranularity;
}

export interface AnalyticsMetric {
  value: number;
  previousValue: number;
  changePercent: number | null;
}

export interface AdminAnalyticsOverview {
  period: {
    dateFrom: string;
    dateTo: string;
    timezone: 'Asia/Kolkata';
    days: number;
    granularity: Exclude<AnalyticsGranularity, 'AUTO'>;
  };
  kpis: {
    grossSalesInPaise: AnalyticsMetric;
    refundsInPaise: AnalyticsMetric;
    netRevenueInPaise: AnalyticsMetric;
    paidOrders: AnalyticsMetric;
    averageOrderValueInPaise: AnalyticsMetric;
    newCustomers: AnalyticsMetric;
  };
  trend: Array<{
    key: string;
    grossSalesInPaise: number;
    refundsInPaise: number;
    netRevenueInPaise: number;
    orders: number;
    newCustomers: number;
  }>;
  topProducts: Array<{
    productId: string;
    name: string;
    slug: string;
    unitsSold: number;
    itemSalesInPaise: number;
  }>;
  lowStock: Array<{
    productId: string;
    productName: string;
    variantId: string;
    variantTitle: string;
    sku: string;
    available: number;
    reorderPoint: number;
  }>;
  generatedAt: string;
}

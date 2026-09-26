export type ProductAvailability = 'IN_STOCK' | 'OUT_OF_STOCK';

export interface StorefrontImage {
  mediaAssetId: string;
  altText: string;
  width?: number;
  height?: number;
  sources: {
    original: string;
    thumbnail: string;
    card: string;
    large: string;
  };
}

export interface CategoryReference {
  id: string;
  name: string;
  slug: string;
}

export interface StorefrontCategory extends CategoryReference {
  description?: string;
  image?: StorefrontImage;
  children: StorefrontCategory[];
}

export interface PriceRange {
  minInPaise: number;
  maxInPaise: number;
  currency: 'INR';
}

export interface ProductCardView {
  id: string;
  name: string;
  slug: string;
  excerpt: string;
  categories: CategoryReference[];
  priceRange: PriceRange;
  primaryImage?: StorefrontImage;
  availability: ProductAvailability;
  isFeatured: boolean;
  tags: string[];
}

export interface ProductVariant {
  variantId: string;
  sku: string;
  title: string;
  attributes: Array<{ name: string; value: string }>;
  priceInPaise: number;
  compareAtPriceInPaise?: number;
  currency: 'INR';
  availability: ProductAvailability;
}

export interface ProductDetailView extends ProductCardView {
  description: string;
  variants: ProductVariant[];
  images: StorefrontImage[];
  publishedAt: string;
}

export interface StorefrontPage<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type ProductSort = 'relevance' | 'newest' | 'price-asc' | 'price-desc';

export interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  minPriceInPaise?: number;
  maxPriceInPaise?: number;
  sort?: ProductSort;
}

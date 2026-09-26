import { baseApi } from '@/app/api/base-api';

import type {
  ProductCardView,
  ProductDetailView,
  ProductQuery,
  StorefrontCategory,
  StorefrontPage,
} from './catalog.types';

interface CategoriesResponse {
  categories: StorefrontCategory[];
}

interface ProductResponse {
  product: ProductDetailView;
}

export const catalogApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCategories: build.query<CategoriesResponse, void>({
      query: () => 'catalog/categories',
      providesTags: [{ type: 'Category', id: 'LIST' }],
      keepUnusedDataFor: 300,
    }),
    getProducts: build.query<StorefrontPage<ProductCardView>, ProductQuery | void>({
      query: (query) => ({ url: 'catalog/products', params: { ...(query || {}) } }),
      providesTags: (result) => [
        { type: 'Product', id: 'LIST' },
        ...(result?.items.map(({ slug }) => ({ type: 'Product' as const, id: slug })) ?? []),
      ],
    }),
    getFeaturedProducts: build.query<StorefrontPage<ProductCardView>, ProductQuery | void>({
      query: (query) => ({ url: 'catalog/products/featured', params: { ...(query || {}) } }),
      providesTags: (result) => [
        { type: 'Product', id: 'FEATURED' },
        ...(result?.items.map(({ slug }) => ({ type: 'Product' as const, id: slug })) ?? []),
      ],
    }),
    getProductBySlug: build.query<ProductResponse, string>({
      query: (slug) => `catalog/products/${encodeURIComponent(slug)}`,
      providesTags: (_result, _error, slug) => [{ type: 'Product', id: slug }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCategoriesQuery,
  useGetFeaturedProductsQuery,
  useGetProductBySlugQuery,
  useGetProductsQuery,
} = catalogApi;

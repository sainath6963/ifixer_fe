import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import type { ProductCardView } from '@/features/catalog/catalog.types';

import { ProductCard } from './product-card';

const product: ProductCardView = {
  id: 'product-id',
  name: 'Signature Linen Shirt',
  slug: 'signature-linen-shirt',
  excerpt: 'A considered linen shirt.',
  categories: [{ id: 'category-id', name: 'Shirts', slug: 'shirts' }],
  priceRange: { minInPaise: 249900, maxInPaise: 249900, currency: 'INR' },
  availability: 'OUT_OF_STOCK',
  isFeatured: true,
  tags: [],
};

describe('product card', () => {
  it('links to the product and presents its server-provided availability', () => {
    render(
      <MemoryRouter>
        <ProductCard product={product} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: product.name })).toHaveAttribute(
      'href',
      '/products/signature-linen-shirt',
    );
    expect(screen.getByText('Sold out')).toBeVisible();
    expect(screen.getByText(/2,499/)).toBeVisible();
  });
});

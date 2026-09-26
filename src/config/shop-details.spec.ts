import { parseShopDetails } from './shop-details';

describe('shop contact details', () => {
  it('keeps unavailable contact actions absent instead of inventing details', () => {
    expect(parseShopDetails({})).toMatchObject({
      phone: '',
      phoneHref: undefined,
      whatsappHref: undefined,
      address: '',
      hours: '',
      mapUrl: undefined,
    });
  });

  it('creates direct links only from valid independently configured numbers', () => {
    expect(
      parseShopDetails({
        VITE_SHOP_PHONE: '+919876543210',
        VITE_SHOP_WHATSAPP: '+919123456789',
        VITE_SHOP_MAP_URL: 'https://maps.google.com/?q=shop',
      }),
    ).toMatchObject({
      phoneHref: 'tel:+919876543210',
      whatsappHref: 'https://wa.me/919123456789',
      mapUrl: 'https://maps.google.com/?q=shop',
    });
    expect(parseShopDetails({ VITE_SHOP_PHONE: '+919876543210' }).whatsappHref).toBeUndefined();
  });

  it('rejects unsafe links and invalid phone numbers', () => {
    expect(() => parseShopDetails({ VITE_SHOP_MAP_URL: 'javascript:alert(1)' })).toThrow();
    expect(() => parseShopDetails({ VITE_SHOP_PHONE: 'call-us' })).toThrow();
  });
});

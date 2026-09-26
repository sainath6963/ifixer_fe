import { normalizeApiBaseUrl, parseEnvironment } from './environment';

describe('frontend environment', () => {
  it('applies safe defaults and normalizes the API base URL', () => {
    expect(parseEnvironment({})).toEqual({
      appName: 'iFixer',
      apiBaseUrl: '/api/v1/',
    });
    expect(normalizeApiBaseUrl('https://api.example.com/api/v1')).toBe(
      'https://api.example.com/api/v1/',
    );
  });

  it('rejects non-HTTP and non-root-relative API locations', () => {
    expect(() => parseEnvironment({ VITE_API_BASE_URL: 'javascript:alert(1)' })).toThrow(
      'VITE_API_BASE_URL',
    );
  });
});

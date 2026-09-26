import { clearAdmin, clearCustomer, sessionReducer, setAdmin, setCustomer } from './session-slice';

describe('session slice', () => {
  it('keeps customer and admin identities isolated', () => {
    const customerState = sessionReducer(
      undefined,
      setCustomer({
        id: 'customer-1',
        name: 'Customer',
        email: 'customer@example.com',
        emailVerified: false,
        mobileVerified: false,
        version: 0,
        communicationPreferences: {
          marketingEmail: false,
          backInStockEmail: true,
          orderUpdatesSms: false,
          orderUpdatesWhatsapp: false,
        },
      }),
    );
    const authenticated = sessionReducer(
      customerState,
      setAdmin({
        id: 'admin-1',
        name: 'Owner',
        email: 'owner@example.com',
        roles: ['OWNER'],
      }),
    );

    expect(authenticated).toMatchObject({
      customerStatus: 'authenticated',
      adminStatus: 'authenticated',
      customer: { id: 'customer-1', emailVerified: false },
      admin: { id: 'admin-1', roles: ['OWNER'] },
    });
  });

  it('clears each browser session without affecting the other scope', () => {
    const authenticated = sessionReducer(
      sessionReducer(
        undefined,
        setCustomer({
          id: 'customer-1',
          name: 'Customer',
          email: 'customer@example.com',
          emailVerified: false,
          mobileVerified: false,
          version: 0,
          communicationPreferences: {
            marketingEmail: false,
            backInStockEmail: true,
            orderUpdatesSms: false,
            orderUpdatesWhatsapp: false,
          },
        }),
      ),
      setAdmin({
        id: 'admin-1',
        name: 'Owner',
        email: 'owner@example.com',
        roles: ['OWNER'],
      }),
    );
    const customerCleared = sessionReducer(authenticated, clearCustomer());
    const allCleared = sessionReducer(customerCleared, clearAdmin());

    expect(customerCleared.customerStatus).toBe('anonymous');
    expect(customerCleared.adminStatus).toBe('authenticated');
    expect(allCleared.adminStatus).toBe('anonymous');
  });
});

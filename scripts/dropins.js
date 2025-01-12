/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/no-extraneous-dependencies */

// Drop-in Tools
import { events } from '@dropins/tools/event-bus.js';
import {
  setEndpoint,
  setFetchGraphQlHeader,
  removeFetchGraphQlHeader,
} from '@dropins/tools/fetch-graphql.js';
import { initializers } from '@dropins/tools/initializer.js';

// Drop-ins
import * as cartApi from '@dropins/storefront-cart/api.js';
import * as authApi from '@dropins/storefront-auth/api.js';

// Libs
import { getConfigValue, getCookie } from './configs.js';

const getUserTokenCookie = () => getCookie('auth_dropin_user_token');

export default async function initializeDropins() {
  events.enableLogger(true);

  // Set Fetch Endpoint (Global)
  setEndpoint(await getConfigValue('commerce-core-endpoint'));
  setFetchGraphQlHeader('store', await getConfigValue('store'));

  // Initializers (Global)
  initializers.register(authApi.initialize, {});
  initializers.register(cartApi.initialize, {});

  // Set auth headers
  events.on('authenticated', (isAuthenticated) => {
    if (isAuthenticated) {
      const token = getUserTokenCookie();

      setFetchGraphQlHeader('Authorization', `Bearer ${token}`);
    } else {
      removeFetchGraphQlHeader('Authorization');
    }
  });

  // Redirect to order confirmation page
  events.on('checkout/order', (data) => {
    const token = getUserTokenCookie();
    const orderRef = token ? data.number : data.token;

    window.location.replace(
      `/order-confirmation?orderRef=${encodeURIComponent(orderRef)}`,
    );
  });

  // Cache cartId in session storage
  events.on(
    'cart/data',
    (data) => {
      if (data?.id) {
        sessionStorage.setItem('DROPINS_CART_ID', data.id);
      } else {
        sessionStorage.removeItem('DROPINS_CART_ID');
      }
    },
    { eager: true },
  );

  // After load or reload page we check token
  const token = getUserTokenCookie();

  // Handle page load
  const mount = () => {
    initializers.mount();
    events.emit('authenticated', !!token);
  };

  // Mount all registered drop-ins
  if (document.readyState === 'complete') {
    mount();
  } else {
    // Handle on prerendering document activated
    document.addEventListener('prerenderingchange', mount);
    // Handle on page load
    window.addEventListener('load', mount);
  }
}

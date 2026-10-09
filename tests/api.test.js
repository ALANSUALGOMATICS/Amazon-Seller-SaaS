// @vitest-environment jsdom
import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { getCurrentCustomer, request } from '../src/api';
beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem('seller.session', JSON.stringify({ idToken: 'raw-id-token', expiresAt: Date.now() + 60000 }));
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => vi.unstubAllGlobals());
test('current customer uses raw ID token and no chosen customer ID', async () => {
  fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true, data: { customer_id: 'C1', admin: 'Y' }, error: null }) });
  expect((await getCurrentCustomer()).customer_id).toBe('C1');
  const [url, options] = fetch.mock.calls[0];
  expect(url.pathname).toBe('/prod/customers');
  expect(url.search).toBe('');
  expect(options.headers.Authorization).toBe('raw-id-token');
});
test.each([401, 403, 404, 500])('preserves backend error for HTTP %s', async status => {
  fetch.mockResolvedValue({ ok: false, status, json: async () => ({ success: false, data: null, error: { code: 'BACKEND_CODE', message: 'Backend message' } }) });
  await expect(getCurrentCustomer()).rejects.toMatchObject({ status, code: 'BACKEND_CODE', message: 'Backend message' });
  expect(sessionStorage.getItem('seller.session') === null).toBe(status === 401);
});
test('expired token does not reach backend', async () => {
  sessionStorage.clear();
  await expect(getCurrentCustomer()).rejects.toMatchObject({ status: 401 });
  expect(fetch).not.toHaveBeenCalled();
});
test('customer response must identify one current customer', async () => {
  fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true, data: [] }) });
  await expect(getCurrentCustomer()).rejects.toMatchObject({ code: 'INVALID_CUSTOMER_RESPONSE' });
});
test('blocks browser catalog writes', async () => {
  await expect(request('/products', { method: 'POST', body: {} })).rejects.toThrow('Catalog writes');
  expect(fetch).not.toHaveBeenCalled();
});

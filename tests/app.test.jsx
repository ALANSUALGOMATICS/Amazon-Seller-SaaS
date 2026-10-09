// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from '../src/App';
import { clearSession } from '../src/auth';
beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState(null, '', '/#/dashboard');
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function signedIn(admin = 'N') {
  sessionStorage.setItem('seller.session', JSON.stringify({ idToken: 'raw-token', expiresAt: Date.now() + 60000 }));
  fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true, data: { customer_id: 'C1', customer_name: 'Asha', admin }, error: null }) });
}
test('protected route redirects anonymous users to login', async () => {
  render(<App />);
  expect(await screen.findByText('Sign in securely')).toBeTruthy();
  expect(window.location.hash).toBe('#/login');
  expect(fetch).not.toHaveBeenCalled();
});
test.each(['Y', 'N'])('customer loads; admin navigation reflects %s', async admin => {
  signedIn(admin);
  render(<App />);
  expect(await screen.findByText('Welcome, Asha.')).toBeTruthy();
  expect(Boolean(screen.queryByText('Administration'))).toBe(admin === 'Y');
  fireEvent.click(screen.getByText('My profile'));
  expect(await screen.findByText('C1')).toBeTruthy();
});
test('normal customer cannot open admin route', async () => {
  signedIn('N');
  window.history.replaceState(null, '', '/#/admin');
  render(<App />);
  expect(await screen.findByText('Access denied')).toBeTruthy();
  expect(screen.queryByText('Admin workspace')).toBeNull();
});
test.each([[404, 'Customer profile not found'], [403, 'Access denied']])('HTTP %s has clear state', async (status, title) => {
  signedIn();
  fetch.mockResolvedValue({ ok: false, status, json: async () => ({ success: false, data: null, error: { code: 'CUSTOMER_ERROR', message: 'Backend detail' } }) });
  render(<App />);
  expect(await screen.findByText(title)).toBeTruthy();
  expect(screen.getByText('Backend detail')).toBeTruthy();
  expect(screen.getByText('Error code: CUSTOMER_ERROR')).toBeTruthy();
});
test('401 clears session and returns to login with backend message', async () => {
  signedIn();
  fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({ success: false, error: { code: 'UNAUTHORIZED', message: 'Token rejected' } }) });
  render(<App />);
  expect(await screen.findByText('Sign in securely')).toBeTruthy();
  expect(screen.getByText('Token rejected')).toBeTruthy();
  expect(sessionStorage.getItem('seller.session')).toBeNull();
});
test('clearing the session removes the protected customer shell', async () => {
  signedIn();
  render(<App />);
  await screen.findByText('Welcome, Asha.');
  clearSession();
  await waitFor(() => expect(screen.queryByText('Welcome, Asha.')).toBeNull());
  expect(await screen.findByText('Sign in securely')).toBeTruthy();
});
test('root callback exchanges code, then loads the linked customer', async () => {
  sessionStorage.setItem('seller.login', JSON.stringify({ verifier: 'saved-verifier', state: 'saved-state', createdAt: Date.now() }));
  window.history.replaceState(null, '', '/?code=callback-code&state=saved-state');
  const idToken = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) + '.signature';
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id_token: idToken, expires_in: 3600 }) })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ success: true, data: { customer_id: 'C2', customer_name: 'Linked customer', admin: 'N' }, error: null }) });
  render(<App />);
  expect(await screen.findByText('Welcome, Linked customer.')).toBeTruthy();
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(new URL(fetch.mock.calls[0][0]).pathname).toBe('/oauth2/token');
  expect(fetch.mock.calls[1][1].headers.Authorization).toBe(idToken);
  expect(window.location.search).toBe('');
  expect(sessionStorage.getItem('seller.login')).toBeNull();
});
test('expiry on browser focus clears customer and protects the route', async () => {
  signedIn();
  render(<App />);
  await screen.findByText('Welcome, Asha.');
  sessionStorage.setItem('seller.session', JSON.stringify({ idToken: 'raw-token', expiresAt: Date.now() - 1 }));
  fireEvent(window, new Event('focus'));
  expect(await screen.findByText('Sign in securely')).toBeTruthy();
  expect(screen.queryByText('Welcome, Asha.')).toBeNull();
});

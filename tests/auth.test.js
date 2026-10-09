// @vitest-environment jsdom
import { webcrypto } from 'node:crypto';
import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { challengeFor, login, finishCallback, getSession, clearSession, logout } from '../src/auth';
import { config } from '../src/config';

beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal('crypto', webcrypto);
  vi.stubGlobal('fetch', vi.fn());
  vi.stubGlobal('window', { location: { search: '', href: config.redirectUri, assign: vi.fn() }, history: { replaceState: vi.fn() } });
});
afterEach(() => vi.unstubAllGlobals());
test('S256 matches the RFC 7636 challenge', async () => {
  expect(await challengeFor('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
});
async function callback(stateOverride) {
  await login();
  const pending = JSON.parse(sessionStorage.getItem('seller.login'));
  window.location.search = '?code=one-use-code&state=' + (stateOverride || pending.state);
  window.location.href = config.redirectUri + window.location.search;
  return pending;
}
test('login uses PKCE, correct scopes and production callback; exchange is single-use', async () => {
  const pending = await callback();
  const authorize = new URL(window.location.assign.mock.calls[0][0]);
  expect(authorize.searchParams.get('code_challenge_method')).toBe('S256');
  expect(authorize.searchParams.get('redirect_uri')).toBe(config.redirectUri);
  expect(authorize.searchParams.get('scope')).toBe('openid email');
  expect(authorize.searchParams.has('client_secret')).toBe(false);
  const token = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) + '.signature';
  fetch.mockResolvedValue({ ok: true, json: async () => ({ id_token: token, expires_in: 3600, refresh_token: 'not-retained' }) });
  await Promise.all([finishCallback(), finishCallback()]);
  expect(fetch).toHaveBeenCalledTimes(1);
  const body = fetch.mock.calls[0][1].body;
  expect(body.get('code_verifier')).toBe(pending.verifier);
  expect(body.has('client_secret')).toBe(false);
  expect(getSession().idToken).toBe(token);
  expect(sessionStorage.getItem('seller.session')).not.toContain('refresh');
  expect(sessionStorage.getItem('seller.login')).toBeNull();
  expect(window.history.replaceState).toHaveBeenCalled();
});
test('wrong state stops token exchange and removes pending authentication', async () => {
  await callback('wrong-state');
  await expect(finishCallback()).rejects.toThrow('verified');
  expect(fetch).not.toHaveBeenCalled();
  expect(getSession()).toBeNull();
  expect(sessionStorage.getItem('seller.login')).toBeNull();
});
test('expired and corrupted sessions are discarded', () => {
  sessionStorage.setItem('seller.session', JSON.stringify({ idToken: 'expired', expiresAt: Date.now() - 1 }));
  expect(getSession()).toBeNull();
  sessionStorage.setItem('seller.session', '{bad');
  expect(getSession()).toBeNull();
});
test('logout clears app storage and uses Cognito logout', () => {
  sessionStorage.setItem('seller.session', JSON.stringify({ idToken: 'valid', expiresAt: Date.now() + 60000 }));
  sessionStorage.setItem('seller.login', '{}');
  logout();
  expect(getSession()).toBeNull();
  expect(sessionStorage.getItem('seller.login')).toBeNull();
  expect(new URL(window.location.assign.mock.calls[0][0]).pathname).toBe('/logout');
  clearSession();
});

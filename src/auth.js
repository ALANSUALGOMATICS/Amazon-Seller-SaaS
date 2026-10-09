import { config } from './config';
const SESSION_KEY = 'seller.session';
const LOGIN_KEY = 'seller.login';
const listeners = new Set();
let callbackPromise;
let generation = 0;

function encode(bytes) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
export async function challengeFor(verifier) {
  return encode(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
}
function random() {
  return encode(crypto.getRandomValues(new Uint8Array(32)));
}
export function subscribeSession(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function clearSession() {
  generation += 1;
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(LOGIN_KEY);
  listeners.forEach(listener => listener());
}
export function getSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    if (typeof session?.idToken === 'string' && Number.isFinite(session.expiresAt) && session.expiresAt > Date.now()) return session;
  } catch { /* Invalid saved state is discarded. */ }
  if (sessionStorage.getItem(SESSION_KEY)) clearSession();
  return null;
}
export async function login() {
  clearSession();
  callbackPromise = undefined;
  const verifier = random();
  const state = random();
  const challenge = await challengeFor(verifier);
  sessionStorage.setItem(LOGIN_KEY, JSON.stringify({ verifier, state, createdAt: Date.now() }));
  const url = new URL('/oauth2/authorize', config.domain);
  url.search = new URLSearchParams({
    response_type: 'code', client_id: config.clientId, redirect_uri: config.redirectUri,
    scope: config.scopes, state, code_challenge: challenge, code_challenge_method: 'S256',
  });
  window.location.assign(url.href);
}
export function hasCallback() {
  const params = new URLSearchParams(window.location.search);
  return params.has('code') || params.has('error');
}
export function finishCallback() {
  // One code exchange even if React re-renders or mounts twice.
  if (!callbackPromise) callbackPromise = exchangeCallback();
  return callbackPromise;
}
async function exchangeCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  let pending;
  try { pending = JSON.parse(sessionStorage.getItem(LOGIN_KEY)); } catch { /* Rejected below. */ }
  clearSession();
  const attempt = generation;
  const cleanUrl = new URL(window.location.href);
  ['code', 'state', 'error', 'error_description'].forEach(key => cleanUrl.searchParams.delete(key));
  window.history.replaceState(null, '', cleanUrl);
  if (!pending || state !== pending.state || typeof pending.verifier !== 'string' ||
      !Number.isFinite(pending.createdAt) || Date.now() - pending.createdAt > 600000 || pending.createdAt > Date.now()) {
    throw new Error('Sign-in could not be verified. Please sign in again.');
  }
  if (params.has('error')) throw new Error(params.get('error_description') || 'Sign-in was cancelled.');
  if (!code) throw new Error('The sign-in callback did not contain a code.');
  const response = await fetch(new URL('/oauth2/token', config.domain), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code', client_id: config.clientId,
      redirect_uri: config.redirectUri, code, code_verifier: pending.verifier,
    }),
  });
  if (!response.ok) throw new Error('Token exchange failed. Please sign in again.');
  const tokens = await response.json();
  const lifetime = Number(tokens.expires_in);
  if (typeof tokens.id_token !== 'string' || !tokens.id_token || !Number.isFinite(lifetime) || lifetime <= 30) {
    throw new Error('Cognito returned an invalid session.');
  }
  // Also respect the ID token's expiry. Claims are not used as authorization.
  let claims;
  try {
    const payload = tokens.id_token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
    claims = JSON.parse(atob(payload));
  } catch { throw new Error('Cognito returned an invalid ID token.'); }
  if (!Number.isFinite(claims.exp)) throw new Error('The ID token has no expiry.');
  const expiresAt = Math.min(Date.now() + lifetime * 1000, claims.exp * 1000) - 30000;
  if (expiresAt <= Date.now() || generation !== attempt) throw new Error('The sign-in session expired. Please sign in again.');
  const session = { idToken: tokens.id_token, expiresAt };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}
export function logout() {
  clearSession();
  const url = new URL('/logout', config.domain);
  url.search = new URLSearchParams({ client_id: config.clientId, logout_uri: config.logoutUri });
  window.location.assign(url.href);
}

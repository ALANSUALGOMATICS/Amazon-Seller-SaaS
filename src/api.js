import { config } from './config';
import { clearSession, getSession } from './auth';
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export async function request(path, { method = 'GET', query = {}, body, signal } = {}) {
  if (!['GET', 'POST'].includes(method)) throw new Error('Unsupported API method.');
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('..')) throw new Error('Invalid API path.');
  if (method === 'POST' && /^\/(products|suppliers)(\/|$)/.test(path)) throw new Error('Catalog writes are not available in the customer browser.');
  const session = getSession();
  if (!session) throw new ApiError(401, 'SESSION_EXPIRED', 'Your session has expired. Please sign in again.');
  const url = new URL(config.apiBaseUrl.replace(/\/$/, '') + path);
  Object.entries(query).forEach(([key, value]) => { if (value != null) url.searchParams.set(key, value); });
  let response;
  try {
    response = await fetch(url, {
      method, signal,
      headers: { Authorization: session.idToken, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK_ERROR', 'Unable to reach the service. Please try again.');
  }
  if (response.status === 401) clearSession();
  let envelope;
  try { envelope = await response.json(); } catch {
    throw new ApiError(response.status, 'INVALID_RESPONSE', 'The service returned an unreadable response.');
  }
  if (!response.ok || envelope.success !== true) {
    throw new ApiError(response.status, envelope.error?.code || 'API_ERROR',
      envelope.error?.message || envelope.message || 'The request could not be completed.');
  }
  return envelope.data;
}
export async function getCurrentCustomer(options) {
  const customer = await request('/customers', options);
  if (!customer || typeof customer.customer_id !== 'string' || !customer.customer_id) {
    throw new ApiError(200, 'INVALID_CUSTOMER_RESPONSE', 'The service did not return a current customer profile.');
  }
  return customer;
}

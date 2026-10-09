import { createContext, useContext, useEffect, useState } from 'react';
import { finishCallback, getSession, hasCallback, clearSession, subscribeSession, login, logout } from './auth';
import { getCurrentCustomer } from './api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', customer: null, error: null });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    let timer;
    // Ignore callback cleanup notifications while establishing the new session.
    let initializing = true;
    const unsubscribe = subscribeSession(() => {
      if (!initializing && active) setState({ status: 'anonymous', customer: null, error: null });
    });
    const controller = new AbortController();
    async function initialize() {
      setState({ status: 'loading', customer: null, error: null });
      try {
        const session = hasCallback() ? await finishCallback() : getSession();
        initializing = false;
        if (!active) return;
        if (!session) {
          setState({ status: 'anonymous', customer: null, error: null });
          return;
        }
        timer = setTimeout(clearSession, Math.max(0, session.expiresAt - Date.now()));
        const customer = await getCurrentCustomer({ signal: controller.signal });
        if (active && getSession()) setState({ status: 'ready', customer, error: null });
      } catch (error) {
        initializing = false;
        if (!active || error.name === 'AbortError') return;
        setState({ status: error.status === 401 ? 'anonymous' : 'error', customer: null, error });
      }
    }
    initialize();
    const checkExpiry = () => { if (!getSession() && !initializing) setState(previous => previous.status === 'ready' ? { status: 'anonymous', customer: null, error: null } : previous); };
    window.addEventListener('focus', checkExpiry);
    return () => { active = false; controller.abort(); clearTimeout(timer); unsubscribe(); window.removeEventListener('focus', checkExpiry); };
  }, [revision]);
  return <AuthContext.Provider value={{ ...state, login, logout, retry: () => setRevision(value => value + 1) }}>{children}</AuthContext.Provider>;
}

import { useState } from 'react';
import { HashRouter, Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthProvider';

function Login() {
  const auth = useAuth();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  if (auth.status === 'ready') return <Navigate to="/dashboard" replace />;
  async function signIn() {
    setBusy(true);
    try { await auth.login(); } catch { setError('Unable to start sign-in. Check that browser session storage is available.'); setBusy(false); }
  }
  return <main className="login"><section className="card login-card">
    <span className="eyebrow">AMAZON SELLER WORKSPACE</span>
    <h1>Your sourcing workspace starts here.</h1>
    <p>Sign in to access your seller workspace and account profile.</p>
    {(error || auth.error) && <p role="alert" className="error">{error || auth.error.message}</p>}
    <button onClick={signIn} disabled={busy}>{busy ? 'Redirecting…' : 'Sign in securely'}</button>
    <p className="muted">Authentication is managed by Amazon Cognito.</p>
  </section></main>;
}
function Guard() {
  const auth = useAuth();
  if (auth.status === 'anonymous') return <Navigate to="/login" replace />;
  if (auth.status === 'error') {
    const title = auth.error.status === 404 ? 'Customer profile not found' : auth.error.status === 403 ? 'Access denied' : 'Unable to load your workspace';
    return <main className="login"><section className="card"><h1>{title}</h1>
      {auth.error.status === 404 && <p>Your sign-in succeeded, but no linked customer profile was found. Contact your account administrator.</p>}
      <p role="alert" className="error">{auth.error.message}</p>
      {auth.error.code && <p className="muted">Error code: {auth.error.code}</p>}
      <div className="actions"><button onClick={auth.retry}>Try again</button><button className="secondary" onClick={auth.logout}>Sign out</button></div>
    </section></main>;
  }
  return <Outlet />;
}
function Shell() {
  const { customer, logout } = useAuth();
  return <div className="workspace">
    <aside><div className="brand">Seller Workspace<span>India</span></div>
      <nav aria-label="Main navigation">
        <NavLink to="/dashboard">Overview</NavLink><NavLink to="/profile">My profile</NavLink>
        {customer.admin === 'Y' && <NavLink to="/admin">Administration</NavLink>}
      </nav><div className="aside-footer">Your seller account</div>
    </aside>
    <div className="content"><header><span>{customer.company_name || 'Your workspace'}</span><div className="actions"><span>{customer.customer_name || customer.email}</span><button className="secondary" onClick={logout}>Sign out</button></div></header>
      <main id="main-content"><Outlet /></main>
    </div>
  </div>;
}
function Overview() {
  const { customer } = useAuth();
  return <><span className="eyebrow">OVERVIEW</span><h1>Welcome, {customer.customer_name || 'seller'}.</h1><p className="muted">Your account at a glance.</p>
    <div className="cards"><section className="card"><h2>Customer account</h2><p>{customer.customer_id}</p><span className="badge">{customer.status || 'Not available'}</span></section>
    <section className="card"><h2>Subscription</h2><p>{customer.subscription_plan || 'No plan recorded'}</p><span className="badge">{customer.subscription_status || 'Not available'}</span></section></div>
    <section className="card"><h2>Your workspace</h2><p>Review your account details in My profile.</p><NavLink to="/profile">View my profile →</NavLink></section></>;
}
function Profile() {
  const { customer } = useAuth();
  const fields = [['customer_id', 'Customer ID'], ['customer_name', 'Name'], ['company_name', 'Company'], ['email', 'Email'], ['phone', 'Phone'], ['country', 'Country'], ['currency', 'Currency'], ['timezone', 'Timezone']];
  return <><span className="eyebrow">ACCOUNT</span><h1>My profile</h1><section className="card"><dl>{fields.map(([field, label]) => <div key={field}><dt>{label}</dt><dd>{customer[field] || 'Not provided'}</dd></div>)}</dl></section></>;
}
function Admin() {
  const { customer } = useAuth();
  if (customer.admin !== 'Y') return <section className="card"><h1>Access denied</h1><p role="alert">This page is available to administrators only.</p></section>;
  return <><span className="eyebrow">ADMINISTRATION</span><h1>Admin workspace</h1><section className="card"><h2>Administrator access</h2><p>Your account has administrator access. Management tools will be added in a later milestone.</p></section></>;
}
function AppRoutes() {
  const { status } = useAuth();
  if (status === 'loading') return <main className="login"><p role="status">Loading your workspace…</p></main>;
  return <Routes>
    <Route path="/login" element={<Login />} />
    <Route element={<Guard />}><Route element={<Shell />}>
      <Route path="/dashboard" element={<Overview />} /><Route path="/profile" element={<Profile />} /><Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Route></Route>
  </Routes>;
}
export default function App() {
  return <AuthProvider><HashRouter><AppRoutes /></HashRouter></AuthProvider>;
}

import React, { useState, useEffect } from 'react';

const RAW_API =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) ||
  'http://localhost:5000/api';
const API_BASE = RAW_API.replace(/\/+$/, '');

export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem('sv_admin_token') || '');
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  const [dashboard, setDashboard] = useState(null);
  const [statusBanner, setStatusBanner] = useState('');

  // Platform Settings State
  const [feeInput, setFeeInput] = useState('50');
  const [announcementInput, setAnnouncementInput] = useState('');

  // Admin Add Job State
  const [jobTitle, setJobTitle] = useState('');
  const [jobLocation, setJobLocation] = useState('');
  const [jobAddress, setJobAddress] = useState('');
  const [jobShift, setJobShift] = useState('Tomorrow • 08:30 AM – 05:30 PM');
  const [jobWage, setJobWage] = useState('800');
  const [jobEmployer, setJobEmployer] = useState('');

  const notify = (msg) => {
    setStatusBanner(msg);
    setTimeout(() => setStatusBanner(''), 4500);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('sv_admin_token');
    setToken('');
    setDashboard(null);
  };

  const fetchDashboard = async (authToken = token) => {
    if (!authToken) return;
    try {
      const res = await fetch(`${API_BASE}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.status === 401) {
        handleLogout();
        setLoginError('Session expired. Please login again.');
        return;
      }
      const data = await res.json();
      setDashboard(data);
      if (data.config) {
        setFeeInput(String(data.config.platform_fee));
        setAnnouncementInput(data.config.announcement || '');
      }
    } catch {
      notify('⚠️ Backend server se connect nahi ho paya.');
    }
  };

  useEffect(() => {
    if (token) fetchDashboard(token);
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();
      if (data.success && data.token) {
        sessionStorage.setItem('sv_admin_token', data.token);
        setToken(data.token);
        setPin('');
      } else {
        setLoginError(data.message || 'Invalid Owner Password');
      }
    } catch {
      setLoginError('Server unreachable. Check VITE_API_URL.');
    } finally {
      setLoading(false);
    }
  };

  const handleKycDecision = async (role, action) => {
    const res = await fetch(`${API_BASE}/admin/kyc/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ role, action })
    });
    if (res.ok) {
      notify(`✅ ${role.toUpperCase()} KYC ${action === 'APPROVE' ? 'Approved' : 'Rejected'}!`);
      fetchDashboard();
    }
  };

  const handleUpdateConfig = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE}/admin/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        platform_fee: parseFloat(feeInput),
        announcement: announcementInput
      })
    });
    if (res.ok) {
      notify('✅ Platform Fee & Live Banner updated!');
      fetchDashboard();
    }
  };

  const handleAddJob = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE}/admin/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        title: jobTitle,
        location: jobLocation,
        address: jobAddress || jobLocation,
        shift_time: jobShift,
        wage: parseFloat(jobWage),
        employer_name: jobEmployer || 'Verified Contractor'
      })
    });
    if (res.ok) {
      setJobTitle('');
      setJobLocation('');
      setJobAddress('');
      setJobEmployer('');
      notify('✅ New Verified Job published!');
      fetchDashboard();
    }
  };

  const handleDeleteJob = async (id) => {
    const res = await fetch(`${API_BASE}/admin/jobs/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      notify('🗑️ Job listing removed.');
      fetchDashboard();
    }
  };

  const handleForceRelease = async (utr) => {
    const res = await fetch(`${API_BASE}/admin/escrow/${utr}/force-release`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      notify(`✅ Escrow UTR ${utr} Force-Released to Worker!`);
      fetchDashboard();
    }
  };

  // ==================== OWNER LOGIN SCREEN ====================
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl">
          <div className="space-y-2 text-center">
            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-xs font-extrabold">
              🛡️ RESTRICTED OWNER VAULT
            </span>
            <h1 className="text-2xl font-extrabold mt-2">ShramVaani Admin Portal</h1>
            <p className="text-xs text-slate-400">
              Enter your Render <code className="text-amber-400">ADMIN_PIN</code> (Min 8 chars, Uppercase, Lowercase, Number & Special Char).
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Enter Strong Owner Password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
              required
            />
            {loginError && (
              <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-700 text-rose-200 text-xs font-semibold">
                ❌ {loginError}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-sm transition"
            >
              {loading ? 'Verifying...' : '🔐 Unlock Command Center'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==================== COMMAND CENTER DASHBOARD ====================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-amber-400">🛡️ ShramVaani — Owner Command Center</h1>
            <p className="text-xs text-slate-400">Escrow Vault, KYC Approvals, Fraud Firewall & Revenue Control</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchDashboard()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold"
            >
              🔄 Refresh Live Data
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-bold"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {statusBanner && (
        <div className="bg-emerald-600 text-white text-xs font-extrabold py-2 px-4 text-center">
          {statusBanner}
        </div>
      )}

      {!dashboard ? (
        <div className="p-12 text-center text-slate-400 text-sm">Loading Command Center metrics...</div>
      ) : (
        <main className="max-w-6xl mx-auto p-6 space-y-6">
          {/* 1. FINANCIAL & ESCROW METRICS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <p className="text-xs text-slate-400 font-bold">Total GMV Processed</p>
              <p className="text-2xl font-extrabold text-white mt-1">₹{dashboard.metrics.gmv}</p>
            </div>
            <div className="bg-slate-900 border border-blue-900/60 p-5 rounded-2xl">
              <p className="text-xs text-blue-400 font-bold">🔒 Locked in Escrow Vault</p>
              <p className="text-2xl font-extrabold text-blue-300 mt-1">₹{dashboard.metrics.locked_vault}</p>
            </div>
            <div className="bg-slate-900 border border-emerald-900/60 p-5 rounded-2xl">
              <p className="text-xs text-emerald-400 font-bold">✅ Released to Workers</p>
              <p className="text-2xl font-extrabold text-emerald-300 mt-1">₹{dashboard.metrics.released_wages}</p>
            </div>
            <div className="bg-slate-900 border border-amber-700/60 p-5 rounded-2xl">
              <p className="text-xs text-amber-400 font-bold">💰 Net Platform Revenue</p>
              <p className="text-2xl font-extrabold text-amber-300 mt-1">₹{dashboard.metrics.net_revenue}</p>
            </div>
          </div>

          {/* 2. KYC VERIFICATION QUEUE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="font-extrabold text-base">👷 Worker e-Shram KYC</h2>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-amber-400">
                  {dashboard.worker_kyc.status}
                </span>
              </div>
              <p className="text-sm"><b>Name:</b> {dashboard.worker_kyc.name} ({dashboard.worker_kyc.id})</p>
              <p className="text-xs font-mono text-slate-400">Document: {dashboard.worker_kyc.doc}</p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleKycDecision('worker', 'APPROVE')}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-extrabold"
                >
                  ✅ Approve Badge
                </button>
                <button
                  onClick={() => handleKycDecision('worker', 'REJECT')}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-extrabold"
                >
                  ❌ Reject
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="font-extrabold text-base">🏗️ Employer GSTIN KYC</h2>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-amber-400">
                  {dashboard.employer_kyc.status}
                </span>
              </div>
              <p className="text-sm"><b>Company:</b> {dashboard.employer_kyc.name}</p>
              <p className="text-xs font-mono text-slate-400">GSTIN: {dashboard.employer_kyc.doc}</p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleKycDecision('employer', 'APPROVE')}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-extrabold"
                >
                  ✅ Approve GST Badge
                </button>
                <button
                  onClick={() => handleKycDecision('employer', 'REJECT')}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-extrabold"
                >
                  ❌ Reject
                </button>
              </div>
            </div>
          </div>

          {/* 3. PLATFORM FEE & LIVE ANNOUNCEMENT CONTROL */}
          <form onSubmit={handleUpdateConfig} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
            <h2 className="font-extrabold text-base">⚙️ Platform Fee & Live Public Announcement</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Safety Fee per Booking (₹)</label>
                <input
                  type="number"
                  value={feeInput}
                  onChange={(e) => setFeeInput(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-sm font-bold"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-slate-400 block mb-1">Top Banner Announcement (Live in Public App)</label>
                <input
                  type="text"
                  value={announcementInput}
                  onChange={(e) => setAnnouncementInput(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-sm"
                />
              </div>
            </div>
            <button type="submit" className="px-6 py-2.5 bg-amber-500 text-slate-950 font-extrabold rounded-xl text-xs">
              Save Live Settings
            </button>
          </form>

          {/* 4. ESCROW TRANSACTION LEDGER */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
            <h2 className="font-extrabold text-base">📒 Escrow Transaction Ledger ({dashboard.ledger.length})</h2>
            {dashboard.ledger.length === 0 ? (
              <p className="text-xs text-slate-400">No transactions yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2">Order ID</th>
                      <th className="py-2">NPCI UTR</th>
                      <th className="py-2">Total</th>
                      <th className="py-2">Net Wage</th>
                      <th className="py-2">Fee</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {dashboard.ledger.map((tx) => (
                      <tr key={tx.utr}>
                        <td className="py-3 font-mono">{tx.order_id}</td>
                        <td className="py-3 font-mono text-amber-300">{tx.utr}</td>
                        <td className="py-3">₹{tx.total_amount}</td>
                        <td className="py-3 text-emerald-400 font-bold">₹{tx.net_wage}</td>
                        <td className="py-3">₹{tx.platform_fee}</td>
                        <td className="py-3 font-bold">{tx.status}</td>
                        <td className="py-3">
                          {tx.status === 'LOCKED' ? (
                            <button
                              onClick={() => handleForceRelease(tx.utr)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold"
                            >
                              Force Release
                            </button>
                          ) : (
                            <span className="text-slate-500">Settled</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 5. MANAGE JOB LISTINGS & FRAUD LOGS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
              <h2 className="font-extrabold text-base">📍 Manage Active Jobs ({dashboard.jobs.length})</h2>
              <form onSubmit={handleAddJob} className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Job Title (e.g. Electrician)"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs"
                  required
                />
                <input
                  type="text"
                  placeholder="Location (e.g. Sector 62)"
                  value={jobLocation}
                  onChange={(e) => setJobLocation(e.target.value)}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs"
                  required
                />
                <input
                  type="text"
                  placeholder="Employer Name"
                  value={jobEmployer}
                  onChange={(e) => setJobEmployer(e.target.value)}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs"
                  required
                />
                <input
                  type="number"
                  placeholder="Daily Wage ₹"
                  value={jobWage}
                  onChange={(e) => setJobWage(e.target.value)}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs"
                  required
                />
                <button type="submit" className="col-span-2 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-extrabold">
                  + Publish Verified Job
                </button>
              </form>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {dashboard.jobs.map((j) => (
                  <div key={j.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold">{j.title} — ₹{j.wage}</p>
                      <p className="text-slate-400">{j.location} • {j.employer_name}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteJob(j.id)}
                      className="px-2.5 py-1 bg-rose-950 text-rose-300 border border-rose-800 rounded-lg font-bold"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
              <h2 className="font-extrabold text-base text-rose-400">🚨 Blocked Fake UTR Fraud Logs ({dashboard.fraud_logs.length})</h2>
              {dashboard.fraud_logs.length === 0 ? (
                <p className="text-xs text-slate-400">Zero fraud attempts recorded.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {dashboard.fraud_logs.map((f) => (
                    <div key={f.id} className="p-3 bg-rose-950/30 border border-rose-900/60 rounded-xl text-xs">
                      <p className="font-mono font-bold text-rose-300">Blocked UTR: {f.attempted_utr}</p>
                      <p className="text-slate-300 mt-0.5">{f.reason}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{f.timestamp}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';

const RAW_API =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) ||
  'http://localhost:5000/api';
const API_BASE = RAW_API.replace(/\/+$/, '');

const FALLBACK_LANGUAGES = {
  hi: { name: 'Hindi', native: 'हिन्दी', locale: 'hi-IN' },
  en: { name: 'English', native: 'English', locale: 'en-IN' }
};

function LiveJobMap({ jobs, selectedJob, onSelectJob }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (window.L) {
      setMapReady(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => setMapReady(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!mapReady || !mapContainerRef.current || !window.L) return;
    const L = window.L;
    if (!mapInstanceRef.current) {
      const center = selectedJob ? [selectedJob.lat, selectedJob.lng] : [28.6273, 77.3725];
      mapInstanceRef.current = L.map(mapContainerRef.current).setView(center, 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(mapInstanceRef.current);
    }
    const map = mapInstanceRef.current;
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });
    jobs.forEach((job) => {
      const marker = L.marker([job.lat, job.lng]).addTo(map);
      marker.bindPopup(`<b>${job.title}</b><br/>${job.location}<br/>₹${job.wage}/day • ${job.employer_name}`);
      marker.on('click', () => onSelectJob(job));
      if (selectedJob && selectedJob.id === job.id) {
        marker.openPopup();
        map.setView([job.lat, job.lng], 13);
      }
    });
  }, [mapReady, jobs, selectedJob]);

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
      <div ref={mapContainerRef} style={{ height: '260px', width: '100%', zIndex: 1 }} />
    </div>
  );
}

export default function App() {
  const [languages, setLanguages] = useState(FALLBACK_LANGUAGES);
  const [selectedLang, setSelectedLang] = useState(null);
  const [portal, setPortal] = useState('worker');
  const [workerTab, setWorkerTab] = useState('home');
  const [liveTime, setLiveTime] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [spokenBanner, setSpokenBanner] = useState('');

  // Multi-Worker Selection & Self-Registration
  const [workersList, setWorkersList] = useState([]);
  const [activeWorkerId, setActiveWorkerId] = useState('W-101');
  const [worker, setWorker] = useState(null);
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerSkill, setNewWorkerSkill] = useState('');

  // KYC & Voice
  const [uanInput, setUanInput] = useState('');
  const [kycMsg, setKycMsg] = useState('');
  const [voiceText, setVoiceText] = useState('');
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);

  // Permanent Receipt History
  const [receipts, setReceipts] = useState([]);
  const [selectedReceiptModal, setSelectedReceiptModal] = useState(null);

  // In-App Unlock OTP
  const [inAppUnlockOtp, setInAppUnlockOtp] = useState('');
  const [unlockReason, setUnlockReason] = useState('');
  const [unlockOtpInput, setUnlockOtpInput] = useState('');

  // Employer Self-Service Job Posting + QR Payment
  const [employer, setEmployer] = useState(null);
  const [myEmployerName, setMyEmployerName] = useState('');
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobLocation, setNewJobLocation] = useState('');
  const [newJobShift, setNewJobShift] = useState('');
  const [newJobWage, setNewJobWage] = useState('800');
  const [jobPostMsg, setJobPostMsg] = useState('');

  const [gstInput, setGstInput] = useState('');
  const [empKycMsg, setEmpKycMsg] = useState('');
  const [wageAmount, setWageAmount] = useState('800');
  const [customMerchantUpi, setCustomMerchantUpi] = useState('');
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [utr, setUtr] = useState('');
  const [escrowFeedback, setEscrowFeedback] = useState(null);
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [releaseOtpInput, setReleaseOtpInput] = useState('');
  const [releaseFeedback, setReleaseFeedback] = useState(null);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [chatText, setChatText] = useState('');

  useEffect(() => {
    const tick = () => {
      setLiveTime(
        new Date().toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          day: '2-digit',
          month: 'short',
          hour12: true
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/languages`).then((r) => r.json()).then(setLanguages).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedLang) return;
    loadAll(activeWorkerId);
  }, [selectedLang, activeWorkerId]);

  const loadAll = (wId = activeWorkerId) => {
    fetch(`${API_BASE}/config`).then((r) => r.json()).then((c) => setAnnouncement(c.announcement)).catch(() => {});
    fetch(`${API_BASE}/workers`).then((r) => r.json()).then(setWorkersList).catch(() => {});
    fetch(`${API_BASE}/worker/${wId}`).then((r) => r.json()).then(setWorker).catch(() => {});
    fetch(`${API_BASE}/employer/EMP-01`).then((r) => r.json()).then((emp) => {
      setEmployer(emp);
      if (!myEmployerName && emp?.company_name) setMyEmployerName(emp.company_name);
    }).catch(() => {});
    fetch(`${API_BASE}/jobs`).then((r) => r.json()).then((data) => {
      setJobs(data);
      if (data.length > 0 && !selectedJob) setSelectedJob(data[0]);
    }).catch(() => {});
    fetch(`${API_BASE}/receipts`).then((r) => r.json()).then(setReceipts).catch(() => {});
    fetch(`${API_BASE}/chat`).then((r) => r.json()).then(setMessages).catch(() => {});
  };

  const speak = (text) => {
    setSpokenBanner(text);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = selectedLang?.locale || 'hi-IN';
      window.speechSynthesis.speak(u);
    }
  };

  const handleVoiceInput = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      speak('इस ब्राउज़र में माइक सपोर्ट नहीं है।');
      return;
    }
    const rec = new SR();
    rec.lang = selectedLang?.locale || 'hi-IN';
    rec.onresult = (e) => {
      const txt = e.results[0][0].transcript;
      setVoiceText(txt);
      speak(`आपने कहा: ${txt}`);
    };
    rec.start();
  };

  // Register a brand-new worker self-service
  const handleAddNewWorker = async (e) => {
    e.preventDefault();
    if (!newWorkerName.trim() || !newWorkerSkill.trim()) return;
    const res = await fetch(`${API_BASE}/workers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newWorkerName, skill: newWorkerSkill, daily_wage: 800 })
    });
    const data = await res.json();
    if (data.success) {
      setActiveWorkerId(data.worker_id);
      setNewWorkerName('');
      setNewWorkerSkill('');
      setShowAddWorker(false);
      speak(`नया मज़दूर ${data.name} जुड़ गया है।`);
    }
  };

  // Post a brand-new job self-service from Employer Portal
  const handlePostNewJob = async (e) => {
    e.preventDefault();
    setJobPostMsg('');
    const res = await fetch(`${API_BASE}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employer_name: myEmployerName || 'Sharma',
        title: newJobTitle,
        location: newJobLocation,
        address: newJobLocation,
        shift_time: newJobShift || 'Tomorrow • 09:00 AM',
        wage: parseFloat(newJobWage)
      })
    });
    const data = await res.json();
    if (data.success) {
      setJobPostMsg(`✅ काम "${newJobTitle}" लाइव हो गया! अब मज़दूर के नक्शे और बुकिंग में यही दिखेगा।`);
      setWageAmount(newJobWage);
      setNewJobTitle('');
      setNewJobLocation('');
      setNewJobShift('');
      loadAll();
    } else {
      setJobPostMsg(`❌ ${data.message}`);
    }
  };

  const verifyIdentity = async (role, docNumber) => {
    const res = await fetch(`${API_BASE}/verify/identity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role,
        doc_number: docNumber,
        worker_id: activeWorkerId,
        company_name: myEmployerName
      })
    });
    const data = await res.json();
    if (role === 'worker') {
      if (data.success) {
        setKycMsg(`⏳ ${data.message}`);
        setUanInput('');
        loadAll();
      } else {
        setKycMsg(`❌ ${data.message}`);
      }
    } else {
      if (data.success) {
        setEmpKycMsg(`⏳ ${data.message}`);
        setGstInput('');
        loadAll();
      } else {
        setEmpKycMsg(`❌ ${data.message}`);
      }
    }
  };

  const generateInAppUnlockOtp = async () => {
    const res = await fetch(`${API_BASE}/worker/${activeWorkerId}/generate-unlock-otp`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      setInAppUnlockOtp(data.in_app_otp);
      speak(`आपका इन-ऐप अनलॉक OTP ${data.in_app_otp.split('').join(' ')} है।`);
    }
  };

  const confirmUnlock = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE}/worker/${activeWorkerId}/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: unlockReason, otp: unlockOtpInput })
    });
    const data = await res.json();
    if (data.success) {
      setInAppUnlockOtp('');
      setUnlockOtpInput('');
      setUnlockReason('');
      loadAll();
      speak('लॉक खुल गया है।');
    } else {
      alert(data.message);
    }
  };

  const createOrder = async () => {
    setEscrowFeedback(null);
    const res = await fetch(`${API_BASE}/payments/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: parseFloat(wageAmount),
        merchant_upi: customMerchantUpi,
        employer_name: myEmployerName || 'Sharma',
        worker_id: activeWorkerId
      })
    });
    const data = await res.json();
    if (data.success) setPaymentOrder(data.order);
    else setEscrowFeedback({ ok: false, text: data.message });
  };

  const verifyUtrAndLock = async () => {
    if (!paymentOrder) return;
    setEscrowFeedback(null);
    const res = await fetch(`${API_BASE}/escrow/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: paymentOrder.order_id, utr, amount: paymentOrder.expected_amount })
    });
    const data = await res.json();
    if (data.success) {
      setEscrowFeedback({ ok: true, text: data.message });
      setActiveReceipt(data.receipt);
      setPaymentOrder(null);
      setUtr('');
      loadAll();
    } else {
      setEscrowFeedback({ ok: false, text: data.message });
    }
  };

  const releaseWithOtp = async () => {
    if (!activeReceipt) return;
    setReleaseFeedback(null);
    const res = await fetch(`${API_BASE}/escrow/${activeReceipt.utr}/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp: releaseOtpInput })
    });
    const data = await res.json();
    if (data.success) {
      setReleaseFeedback({ ok: true, text: data.message });
      setActiveReceipt({ ...activeReceipt, status: 'RELEASED' });
      setReleaseOtpInput('');
      loadAll();
    } else {
      setReleaseFeedback({ ok: false, text: data.message });
    }
  };

  const downloadReceipt = (rcp) => {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Invoice ${rcp.order_id}</title>
    <style>body{font-family:sans-serif;padding:24px;background:#f8fafc} .box{max-width:520px;margin:auto;background:#fff;border:2px solid #0f172a;border-radius:16px;padding:24px} .row{display:flex;justify-content:space-between;margin:8px 0;font-size:14px}</style>
    </head><body><div class="box"><h2>ShramVaani (श्रमवाणी) — Official Wage Receipt</h2><hr/>
    <div class="row"><span>Booking Order ID:</span><b>${rcp.order_id}</b></div>
    <div class="row"><span>NPCI UTR:</span><b>${rcp.utr}</b></div>
    <div class="row"><span>Date & Time:</span><span>${rcp.created_at}</span></div>
    <div class="row"><span>Work / Project:</span><b>${rcp.job_title}</b></div>
    <div class="row"><span>Site Address:</span><span>${rcp.job_address || rcp.job_location}</span></div>
    <div class="row"><span>Worker Name:</span><b>${rcp.worker_name}</b></div>
    <div class="row"><span>Employer / Client:</span><b>${rcp.employer_name}</b></div><hr/>
    <div class="row"><span>Gross Escrow Locked:</span><span>₹${rcp.total_amount}</span></div>
    <div class="row"><span>Platform Safety Fee:</span><span>- ₹${rcp.platform_fee}</span></div>
    <div class="row"><span>Net Wage Paid:</span><b style="color:green;font-size:16px">₹${rcp.net_wage}</b></div>
    <div class="row"><span>Status:</span><b>${rcp.status}</b></div>
    </div></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ShramVaani_Receipt_${rcp.order_id}.html`;
    a.click();
    speak('रसीद डाउनलोड हो गई है।');
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender_role: portal,
        sender_name: portal === 'worker' ? (worker?.name || 'Worker') : (myEmployerName || 'Employer'),
        content: chatText
      })
    });
    setChatText('');
    loadAll();
  };

  if (!selectedLang) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-3xl w-full text-center space-y-6">
          <div className="inline-block px-4 py-1 bg-amber-500 text-slate-950 font-extrabold text-xs rounded-full">
            🇮🇳 SHRAMVAANI • 23 भारतीय भाषाएं
          </div>
          <h1 className="text-4xl font-extrabold">अपनी भाषा चुनें / Select Language</h1>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto p-4 bg-slate-900 rounded-2xl border border-slate-800">
            {Object.entries(languages).map(([code, info]) => (
              <button
                key={code}
                onClick={() => setSelectedLang({ code, ...info })}
                className="p-4 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 transition text-left"
              >
                <div className="text-lg font-extrabold">{info.native}</div>
                <div className="text-xs opacity-75">{info.name}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const nextJob = worker?.next_job;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans">
      {announcement && (
        <div className="bg-amber-500 text-slate-950 text-xs font-extrabold py-1.5 px-4 text-center">
          📢 {announcement}
        </div>
      )}

      <header className="bg-slate-950 text-white px-5 py-4 sticky top-0 z-40 shadow">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-between items-center gap-3">
          <div>
            <h1 className="text-xl font-extrabold">श्रमवाणी (ShramVaani)</h1>
            <p className="text-xs text-emerald-400 font-mono">🕒 {liveTime} • {selectedLang.native}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPortal('worker')} className={`px-4 py-2 rounded-xl text-sm font-bold ${portal === 'worker' ? 'bg-blue-600' : 'bg-slate-800'}`}>
              👷 मज़दूर (Worker)
            </button>
            <button onClick={() => setPortal('employer')} className={`px-4 py-2 rounded-xl text-sm font-bold ${portal === 'employer' ? 'bg-emerald-600' : 'bg-slate-800'}`}>
              🏗️ काम देने वाला (Employer)
            </button>
          </div>
        </div>
      </header>

      {spokenBanner && (
        <div className="bg-blue-50 border-b border-blue-200 text-blue-950 text-sm py-2 px-4 text-center font-semibold">
          🔊 {spokenBanner}
        </div>
      )}

      <main className="max-w-4xl mx-auto p-5 space-y-6">
        {/* ==================== 1. WORKER PORTAL ==================== */}
        {portal === 'worker' && worker && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                onClick={() => setWorkerTab('home')}
                className={`p-3.5 rounded-2xl font-extrabold text-xs sm:text-sm border-2 transition ${workerTab === 'home' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-800 border-slate-200'}`}
              >
                🏠 बुकिंग और OTP
              </button>
              <button
                onClick={() => { setWorkerTab('receipts'); loadAll(); }}
                className={`p-3.5 rounded-2xl font-extrabold text-xs sm:text-sm border-2 transition ${workerTab === 'receipts' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-800 border-slate-200'}`}
              >
                📦 मेरी रसीदें ({receipts.length})
              </button>
              <button
                onClick={() => setWorkerTab('map')}
                className={`p-3.5 rounded-2xl font-extrabold text-xs sm:text-sm border-2 transition ${workerTab === 'map' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-800 border-slate-200'}`}
              >
                🗺️ नक्शा (Map)
              </button>
              <button
                onClick={() => setWorkerTab('chat')}
                className={`p-3.5 rounded-2xl font-extrabold text-xs sm:text-sm border-2 transition ${workerTab === 'chat' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-800 border-slate-200'}`}
              >
                💬 बात करें
              </button>
            </div>

            {workerTab === 'home' && (
              <div className="space-y-6">
                {/* ADD NEW WORKER / SWITCH PROFILE */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">मज़दूर चुनें:</span>
                      <select
                        value={activeWorkerId}
                        onChange={(e) => setActiveWorkerId(e.target.value)}
                        className="p-2 border rounded-xl text-xs font-bold bg-slate-50"
                      >
                        {workersList.map((w) => (
                          <option key={w.id} value={w.id}>{w.name} ({w.skill})</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => setShowAddWorker(!showAddWorker)}
                      className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
                    >
                      {showAddWorker ? '✕ बंद करें' : '➕ नया मज़दूर जोड़ें (Add Worker)'}
                    </button>
                  </div>

                  {showAddWorker && (
                    <form onSubmit={handleAddNewWorker} className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex flex-wrap gap-2">
                      <input
                        type="text"
                        placeholder="मज़दूर का नाम (जैसे: Suresh)"
                        value={newWorkerName}
                        onChange={(e) => setNewWorkerName(e.target.value)}
                        className="flex-1 p-2.5 border rounded-xl bg-white text-xs"
                        required
                      />
                      <input
                        type="text"
                        placeholder="काम / हुनर (जैसे: Bijli Mistri / Electrician)"
                        value={newWorkerSkill}
                        onChange={(e) => setNewWorkerSkill(e.target.value)}
                        className="flex-1 p-2.5 border rounded-xl bg-white text-xs"
                        required
                      />
                      <button type="submit" className="px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs">
                        Save करें
                      </button>
                    </form>
                  )}
                </div>

                {/* IN-APP BOOKING & SECRET OTP PASS */}
                <div className="bg-white p-6 rounded-3xl border-2 border-emerald-500 shadow-sm space-y-4">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-900 text-xs font-extrabold rounded-full">
                      🔐 PURE IN-APP BOOKING OTP PASS
                    </span>
                    {worker.active_booking && (
                      <button
                        onClick={() => speak(`आपकी बुकिंग कन्फर्म है। आपका गुप्त OTP ${worker.active_booking.release_otp.split('').join(' ')} है।`)}
                        className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold"
                      >
                        🔊 OTP सुनें
                      </button>
                    )}
                  </div>

                  {worker.active_booking ? (
                    <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-4">
                      <div className="flex flex-wrap justify-between items-center gap-4">
                        <div>
                          <p className="text-xs font-bold text-emerald-800">✅ Booking Confirmed • {worker.active_booking.job_title}</p>
                          <p className="text-3xl font-extrabold text-emerald-950 mt-1">₹{worker.active_booking.net_wage}</p>
                          <p className="text-xs text-slate-600 mt-1">
                            Employer: <b>{worker.active_booking.employer_name}</b> • UTR: <span className="font-mono">{worker.active_booking.utr}</span>
                          </p>
                        </div>

                        <div className="bg-white px-6 py-4 rounded-2xl border-2 border-dashed border-emerald-600 text-center shadow-sm">
                          <p className="text-[11px] font-extrabold text-slate-500 uppercase">This is your Secret OTP</p>
                          <p className="text-4xl font-mono font-extrabold tracking-widest text-slate-950 my-1">
                            {worker.active_booking.release_otp}
                          </p>
                          <p className="text-[11px] text-emerald-700 font-bold">Valid In-App Pass</p>
                        </div>
                      </div>

                      <div className="p-3.5 bg-white rounded-xl border border-emerald-200 text-xs text-slate-700">
                        <b>📌 निर्देश:</b> काम पूरा होने पर काम देने वाले को यह 4-अंक का OTP (<b>{worker.active_booking.release_otp}</b>) दें ताकि सारी जानकारी मैच हो और आपकी ₹{worker.active_booking.net_wage} दिहाड़ी तुरंत रिलीज़ हो जाए।
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 bg-slate-50 rounded-2xl text-sm text-slate-600">
                      अभी {worker.name} के लिए कोई पेमेंट लॉक नहीं है। काम देने वाला जैसे ही पेमेंट लॉक करेगा, आपका <b>4-अंक का गुप्त OTP</b> सीधे यहीं दिखेगा।
                    </div>
                  )}
                </div>

                {/* WORKER PROFILE & KYC */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-wrap justify-between items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-2xl font-extrabold">{worker.name}</h2>
                        <span className={`px-3 py-1 text-xs font-extrabold rounded-full ${worker.kyc_status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {worker.kyc_status === 'VERIFIED' ? `✅ ${worker.kyc_badge}` : `⚠️ ${worker.kyc_badge}`}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{worker.skill} • Trust Score: {worker.trust_score}/100</p>
                    </div>
                    <button
                      onClick={handleVoiceInput}
                      className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl text-sm shadow"
                    >
                      🎙️ बोलकर बताएं
                    </button>
                  </div>

                  {voiceText && (
                    <div className="p-3 bg-blue-50 rounded-xl text-sm font-semibold text-blue-900">
                      🎤 आपकी आवाज़: "{voiceText}"
                    </div>
                  )}

                  {worker.kyc_status !== 'VERIFIED' && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                      <p className="text-xs font-extrabold text-amber-900">
                        सरकारी बैज पाने के लिए अपना वैध 12-अंक का e-Shram UAN नंबर डालें (Verhoeff Checksum + Admin Approval):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <input
                          type="text"
                          maxLength={12}
                          placeholder="12-Digit Valid e-Shram UAN"
                          value={uanInput}
                          onChange={(e) => setUanInput(e.target.value)}
                          className="flex-1 p-3 border rounded-xl bg-white font-mono text-sm"
                        />
                        <button
                          onClick={() => verifyIdentity('worker', uanInput)}
                          className="px-5 py-3 bg-slate-900 text-white font-bold rounded-xl text-xs"
                        >
                          Submit for Badge
                        </button>
                      </div>
                      {kycMsg && <p className="text-xs font-bold">{kycMsg}</p>}
                    </div>
                  )}
                </div>

                {/* WHERE YOUR NEXT JOB IS */}
                {nextJob && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex flex-wrap justify-between items-start gap-3">
                      <div>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-extrabold rounded-full">
                          📍 अगला काम कहाँ है (Where Your Next Job Is)
                        </span>
                        <h3 className="text-2xl font-extrabold mt-2">{nextJob.title}</h3>
                        <p className="text-sm text-slate-600">{nextJob.address}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          समय: <b>{nextJob.shift_time}</b> • काम देने वाला: <b>{nextJob.employer_name}</b>{' '}
                          {nextJob.employer_verified ? '✅ Verified' : '⚠️ Unverified'}
                        </p>
                      </div>
                      <div className="text-right space-y-2">
                        <p className="text-2xl font-extrabold text-emerald-700">₹{nextJob.wage}/दिन</p>
                        <button
                          onClick={() => speak(`आपका अगला काम ${nextJob.location} में है। काम देने वाले का नाम ${nextJob.employer_name} है। मज़दूरी ${nextJob.wage} रुपये है।`)}
                          className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold"
                        >
                          🔊 सुनें
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {worker.is_locked && (
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-bold">🔒 7-दिन काम की गारंटी लॉक है</p>
                      <button onClick={generateInAppUnlockOtp} className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs">
                        🔐 Generate In-App OTP
                      </button>
                    </div>
                    {inAppUnlockOtp && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-900">
                        Your In-App Unlock OTP: <span className="text-base font-mono bg-white px-2 py-0.5 rounded border">{inAppUnlockOtp}</span>
                      </div>
                    )}
                    <form onSubmit={confirmUnlock} className="flex flex-wrap gap-2">
                      <input type="text" placeholder="छुट्टी का कारण लिखें" value={unlockReason} onChange={(e) => setUnlockReason(e.target.value)} className="flex-1 p-2.5 border rounded-xl text-xs" />
                      <input type="text" maxLength={4} placeholder="4-अंक OTP" value={unlockOtpInput} onChange={(e) => setUnlockOtpInput(e.target.value)} className="w-28 p-2.5 border rounded-xl text-xs font-mono" />
                      <button type="submit" className="px-4 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs">Unlock करें</button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* PERMANENT RECEIPTS TAB */}
            {workerTab === 'receipts' && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div>
                  <h2 className="text-xl font-extrabold">📦 मेरी रसीदें और पिछले काम (Cloud Order History)</h2>
                  <p className="text-xs text-slate-500">सालों तक सुरक्षित रिकॉर्ड — किसी भी कार्ड पर क्लिक करके पूरी डिटेल देखें और रसीद डाउनलोड करें।</p>
                </div>

                {receipts.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed text-sm text-slate-500">
                    अभी तक कोई रसीद नहीं बनी है।
                  </div>
                ) : (
                  <div className="space-y-3">
                    {receipts.map((rcp) => (
                      <div
                        key={rcp.utr}
                        onClick={() => setSelectedReceiptModal(rcp)}
                        className="p-4 rounded-2xl border-2 border-slate-200 hover:border-blue-600 cursor-pointer transition flex flex-wrap justify-between items-center gap-3 bg-slate-50/50"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm">{rcp.job_title}</span>
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${rcp.status === 'RELEASED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                              {rcp.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">📍 {rcp.job_location} • काम देने वाला: {rcp.employer_name}</p>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">Order: {rcp.order_id} • {rcp.created_at}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-extrabold text-emerald-700">₹{rcp.net_wage}</p>
                          <span className="text-xs font-bold text-blue-600 underline">पूरी रसीद देखें →</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedReceiptModal && (
                  <div className="p-5 bg-blue-50 border-2 border-blue-600 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-extrabold text-base">🧾 रसीद विवरण ({selectedReceiptModal.order_id})</h3>
                      <button onClick={() => setSelectedReceiptModal(null)} className="text-xs font-bold px-2.5 py-1 bg-white rounded-lg border">✕ बंद करें</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs bg-white p-4 rounded-xl border">
                      <p><b>काम:</b> {selectedReceiptModal.job_title}</p>
                      <p><b>तारीख:</b> {selectedReceiptModal.created_at}</p>
                      <p><b>साइट पता:</b> {selectedReceiptModal.job_address || selectedReceiptModal.job_location}</p>
                      <p><b>काम देने वाला:</b> {selectedReceiptModal.employer_name}</p>
                      <p><b>NPCI UTR:</b> <span className="font-mono">{selectedReceiptModal.utr}</span></p>
                      <p><b>स्टेटस:</b> {selectedReceiptModal.status}</p>
                      <p><b>कुल Escrow:</b> ₹{selectedReceiptModal.total_amount}</p>
                      <p className="text-emerald-700 font-extrabold"><b>मज़दूर को मिली राशि:</b> ₹{selectedReceiptModal.net_wage}</p>
                    </div>
                    <button
                      onClick={() => downloadReceipt(selectedReceiptModal)}
                      className="w-full py-3 bg-slate-950 text-white font-extrabold rounded-xl text-xs"
                    >
                      ⬇️ यह रसीद डाउनलोड करें
                    </button>
                  </div>
                )}
              </div>
            )}

            {workerTab === 'map' && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
                <h2 className="text-xl font-extrabold">🗺️ नज़दीकी काम का असली नक्शा</h2>
                <LiveJobMap jobs={jobs} selectedJob={selectedJob} onSelectJob={setSelectedJob} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {jobs.map((j) => (
                    <div
                      key={j.id}
                      onClick={() => setSelectedJob(j)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer ${selectedJob?.id === j.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200'}`}
                    >
                      <p className="font-extrabold text-sm">{j.title}</p>
                      <p className="text-xs text-slate-500">📍 {j.location} • <b>{j.employer_name}</b></p>
                      <p className="text-xs text-slate-400">🕒 {j.shift_time}</p>
                      <p className="text-sm font-extrabold text-emerald-700 mt-1">₹{j.wage}/दिन</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {workerTab === 'chat' && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col h-[420px]">
                <h3 className="font-extrabold mb-3">💬 सीधी बात (Chat)</h3>
                <div className="flex-1 overflow-y-auto space-y-2">
                  {messages.map((m) => (
                    <div key={m.id} className="p-3 bg-slate-50 rounded-2xl border text-sm">
                      <b>{m.sender_name}:</b> {m.content} <span className="text-[10px] text-slate-400">({m.timestamp})</span>
                    </div>
                  ))}
                </div>
                <form onSubmit={sendMessage} className="pt-3 flex gap-2">
                  <input type="text" placeholder="संदेश लिखें..." value={chatText} onChange={(e) => setChatText(e.target.value)} className="flex-1 p-3 border rounded-2xl text-sm" />
                  <button type="submit" className="px-5 py-3 bg-blue-600 text-white font-bold rounded-2xl text-sm">भेजें</button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ==================== 2. EMPLOYER SELF-SERVICE PORTAL ==================== */}
        {portal === 'employer' && employer && (
          <div className="space-y-6">
            {/* POST ANY WORK REQUIREMENT SELF-SERVICE (E.G. BIJLI KA KAAM BY SHARMA) */}
            <div className="bg-white p-6 rounded-3xl border-2 border-blue-600 shadow-sm space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div>
                  <h2 className="text-xl font-extrabold">➕ नया काम पोस्ट करें (Post Your Requirement)</h2>
                  <p className="text-xs text-slate-500">अपना नाम, कौन-सा काम करवाना है (जैसे बिजली का काम) और कल की टाइमिंग डालें—तुरंत लाइव हो जाएगा।</p>
                </div>
                <span className={`px-3 py-1 text-xs font-extrabold rounded-full ${employer.kyc_status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {employer.kyc_status === 'VERIFIED' ? `✅ ${employer.kyc_badge}` : `⚠️ ${employer.kyc_badge}`}
                </span>
              </div>

              <form onSubmit={handlePostNewJob} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="आपका नाम / कंपनी (जैसे: Sharma)"
                  value={myEmployerName}
                  onChange={(e) => setMyEmployerName(e.target.value)}
                  className="p-3 border rounded-xl text-sm font-semibold"
                  required
                />
                <input
                  type="text"
                  placeholder="क्या काम करवाना है? (जैसे: Bijli ka kaam / Electrician)"
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                  className="p-3 border rounded-xl text-sm font-semibold"
                  required
                />
                <input
                  type="text"
                  placeholder="जगह / पता (जैसे: Sector 62, Noida)"
                  value={newJobLocation}
                  onChange={(e) => setNewJobLocation(e.target.value)}
                  className="p-3 border rounded-xl text-sm"
                  required
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="कब और समय (जैसे: Kal subah 9:00 AM)"
                    value={newJobShift}
                    onChange={(e) => setNewJobShift(e.target.value)}
                    className="flex-1 p-3 border rounded-xl text-sm"
                    required
                  />
                  <input
                    type="number"
                    placeholder="दिहाड़ी ₹"
                    value={newJobWage}
                    onChange={(e) => setNewJobWage(e.target.value)}
                    className="w-24 p-3 border rounded-xl text-sm font-bold"
                    required
                  />
                </div>
                <button type="submit" className="sm:col-span-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-sm">
                  🚀 काम पोस्ट करें (Publish Live Now)
                </button>
              </form>

              {jobPostMsg && <p className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800">{jobPostMsg}</p>}

              {employer.kyc_status !== 'VERIFIED' && (
                <div className="pt-3 border-t flex flex-wrap gap-2">
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="Optional: 15-Digit GSTIN Verified Badge के लिए"
                    value={gstInput}
                    onChange={(e) => setGstInput(e.target.value)}
                    className="flex-1 p-2.5 border rounded-xl font-mono text-xs uppercase"
                  />
                  <button onClick={() => verifyIdentity('employer', gstInput)} className="px-4 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs">
                    Verify GST Badge
                  </button>
                </div>
              )}
              {empKycMsg && <p className="text-xs font-bold">{empKycMsg}</p>}
            </div>

            {/* STEP 1, 2 & 3: QR PAYMENT + OTP RELEASE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-lg font-extrabold">Step 1 & 2: मज़दूर को बुक करें (UPI QR)</h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-600">किस मज़दूर को रखना है:</span>
                  <select
                    value={activeWorkerId}
                    onChange={(e) => setActiveWorkerId(e.target.value)}
                    className="flex-1 p-2 border rounded-xl font-bold bg-slate-50"
                  >
                    {workersList.map((w) => (
                      <option key={w.id} value={w.id}>{w.name} — {w.skill}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="आपकी अपनी UPI ID (जैसे: name@oksbi)"
                  value={customMerchantUpi}
                  onChange={(e) => setCustomMerchantUpi(e.target.value)}
                  className="w-full p-2.5 border rounded-xl text-xs font-mono"
                />
                <div className="flex gap-2">
                  <input type="number" min="1" value={wageAmount} onChange={(e) => setWageAmount(e.target.value)} className="w-28 p-3 border rounded-xl font-bold text-sm" />
                  <button onClick={createOrder} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl text-xs">
                    1. Generate Real UPI QR Code
                  </button>
                </div>

                {paymentOrder && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-3 text-center">
                    <p className="text-xs font-extrabold text-blue-900">Order: {paymentOrder.order_id} • Pay ₹{paymentOrder.expected_amount}</p>
                    <div className="flex justify-center">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentOrder.upi_uri)}`}
                        alt="Real UPI QR"
                        className="w-44 h-44 rounded-xl border-4 border-white shadow bg-white p-1"
                      />
                    </div>
                    <input
                      type="text"
                      maxLength={12}
                      placeholder="पेमेंट के बाद 12-Digit UTR डालें"
                      value={utr}
                      onChange={(e) => setUtr(e.target.value)}
                      className="w-full p-3 border rounded-xl bg-white font-mono text-sm text-center"
                    />
                    <button onClick={verifyUtrAndLock} className="w-full py-3 bg-emerald-600 text-white font-extrabold rounded-xl text-sm">
                      2. Verify UTR & Lock Booking
                    </button>
                  </div>
                )}

                {escrowFeedback && (
                  <div className={`p-3 rounded-xl text-xs font-bold ${escrowFeedback.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                    {escrowFeedback.text}
                  </div>
                )}
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-lg font-extrabold">Step 3: काम पूरा होने पर OTP से पेमेंट दें</h3>
                {activeReceipt ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-slate-50 rounded-2xl border font-mono text-xs space-y-1">
                      <p>Order: <b>{activeReceipt.order_id}</b></p>
                      <p>Client: <b>{activeReceipt.employer_name}</b></p>
                      <p>Worker: <b>{activeReceipt.worker_name}</b></p>
                      <p>Net Wage: <b>₹{activeReceipt.net_wage}</b></p>
                      <p>Status: <b className="text-blue-700">{activeReceipt.status}</b></p>
                    </div>
                    {activeReceipt.status === 'LOCKED' && (
                      <div className="flex gap-2">
                        <input type="text" maxLength={4} placeholder="4-Digit OTP" value={releaseOtpInput} onChange={(e) => setReleaseOtpInput(e.target.value)} className="flex-1 p-3 border rounded-xl font-mono text-sm" />
                        <button onClick={releaseWithOtp} className="px-5 py-3 bg-emerald-600 text-white font-extrabold rounded-xl text-xs">Match OTP & Pay</button>
                      </div>
                    )}
                    {releaseFeedback && (
                      <div className={`p-3 rounded-xl text-xs font-bold ${releaseFeedback.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                        {releaseFeedback.text}
                      </div>
                    )}
                    <button onClick={() => downloadReceipt(activeReceipt)} className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs">
                      ⬇️ Download Receipt
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-2xl">पहले बाईं तरफ से पेमेंट लॉक करें।</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

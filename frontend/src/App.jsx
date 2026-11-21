import React, { useState, useEffect, useRef } from 'react';

const RAW_API =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) ||
  'https://shramvaani-backend.onrender.com/api';
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
      const center = selectedJob ? [selectedJob.lat || 28.6273, selectedJob.lng || 77.3725] : [28.6273, 77.3725];
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
      const lat = job.lat || 28.6273;
      const lng = job.lng || 77.3725;
      const marker = L.marker([lat, lng]).addTo(map);
      marker.bindPopup(`<b>${job.title}</b><br/>${job.location}<br/>₹${job.wage}/day • ${job.employer_name}`);
      marker.on('click', () => onSelectJob(job));
      if (selectedJob && selectedJob.id === job.id) {
        marker.openPopup();
        map.setView([lat, lng], 13);
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
  // 1. Language & Role-Based Mobile/Password Auth (Permanent Storage)
  const [selectedLang, setSelectedLang] = useState(() => JSON.parse(localStorage.getItem('sv_lang_obj')) || null);
  const [authUser, setAuthUser] = useState(() => JSON.parse(localStorage.getItem('sv_auth_user')) || null);
  const [usersDb, setUsersDb] = useState(() => JSON.parse(localStorage.getItem('sv_users_db')) || []);

  const [loginRole, setLoginRole] = useState('worker');
  const [loginName, setLoginName] = useState('');
  const [loginMobile, setLoginMobile] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [portal, setPortal] = useState(authUser?.role || 'worker'); // 'worker' | 'employer' | 'admin'
  const [workerTab, setWorkerTab] = useState('home');
  const [liveTime, setLiveTime] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [spokenBanner, setSpokenBanner] = useState('');

  // Worker Profile & Voice Auto-Fill States
  const [workersList, setWorkersList] = useState([]);
  const [activeWorkerId, setActiveWorkerId] = useState('W-101');
  const [worker, setWorker] = useState(null);
  const [profileName, setProfileName] = useState(authUser?.name || '');
  const [profileAge, setProfileAge] = useState(authUser?.age || '');
  const [profileSkill, setProfileSkill] = useState(authUser?.skill || 'Electrician');
  const [profileSavedMsg, setProfileSavedMsg] = useState('');

  // KYC & Voice
  const [uanInput, setUanInput] = useState('');
  const [kycMsg, setKycMsg] = useState('');
  const [voiceText, setVoiceText] = useState('');
  const [isListening, setIsListening] = useState(false);

  // Jobs, Accept Lock & OTP States (Synced with LocalStorage + Backend)
  const [jobs, setJobs] = useState(() => JSON.parse(localStorage.getItem('sv_jobs_list')) || []);
  const [selectedJob, setSelectedJob] = useState(null);
  const [workerOtpInputs, setWorkerOtpInputs] = useState({});

  // Permanent Receipt & Escrow History
  const [receipts, setReceipts] = useState(() => JSON.parse(localStorage.getItem('sv_receipts_list')) || []);
  const [escrowLedger, setEscrowLedger] = useState(() => JSON.parse(localStorage.getItem('sv_escrow_ledger')) || []);
  const [selectedReceiptModal, setSelectedReceiptModal] = useState(null);

  // In-App Unlock OTP
  const [inAppUnlockOtp, setInAppUnlockOtp] = useState('');
  const [unlockReason, setUnlockReason] = useState('');
  const [unlockOtpInput, setUnlockOtpInput] = useState('');

  // Employer Job Posting + QR Payment
  const [employer, setEmployer] = useState(null);
  const [myEmployerName, setMyEmployerName] = useState(authUser?.name || '');
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

  // Chat state
  const [messages, setMessages] = useState([]);
  const [chatText, setChatText] = useState('');

  const isHi = selectedLang?.code === 'hi';

  useEffect(() => {
    localStorage.setItem('sv_users_db', JSON.stringify(usersDb));
  }, [usersDb]);

  useEffect(() => {
    localStorage.setItem('sv_jobs_list', JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem('sv_receipts_list', JSON.stringify(receipts));
  }, [receipts]);

  useEffect(() => {
    localStorage.setItem('sv_escrow_ledger', JSON.stringify(escrowLedger));
  }, [escrowLedger]);

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
    if (!selectedLang || !authUser) return;
    loadAll(activeWorkerId);
  }, [selectedLang, authUser, activeWorkerId]);

  const loadAll = (wId = activeWorkerId) => {
    fetch(`${API_BASE}/config`).then((r) => r.json()).then((c) => setAnnouncement(c.announcement)).catch(() => {});
    fetch(`${API_BASE}/workers`).then((r) => r.json()).then(setWorkersList).catch(() => {});
    fetch(`${API_BASE}/worker/${wId}`).then((r) => r.json()).then(setWorker).catch(() => {});
    fetch(`${API_BASE}/employer/EMP-01`).then((r) => r.json()).then((emp) => {
      setEmployer(emp);
    }).catch(() => {});
    fetch(`${API_BASE}/jobs`).then((r) => r.json()).then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setJobs((prev) => {
          const merged = [...prev];
          data.forEach((bJob) => {
            if (!merged.some((m) => m.id === bJob.id)) {
              merged.push({ ...bJob, status: bJob.status || 'OPEN', accepted_by: bJob.accepted_by || null, otp: bJob.otp || String(Math.floor(1000 + Math.random() * 9000)) });
            }
          });
          return merged;
        });
        if (!selectedJob) setSelectedJob(data[0]);
      }
    }).catch(() => {});
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

  // Voice Input that Auto-Types into Form Fields (Name, Age, Skill)
  const handleVoiceAutoFill = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      speak('इस ब्राउज़र में माइक सपोर्ट नहीं है। कृपया Chrome का उपयोग करें।');
      return;
    }
    const rec = new SR();
    rec.lang = selectedLang?.locale || 'hi-IN';
    rec.onstart = () => setIsListening(true);
    rec.onresult = (e) => {
      const txt = e.results[0][0].transcript;
      setVoiceText(txt);

      // Extract Age
      const ageMatch = txt.match(/\b(1[89]|[2-6][0-9])\b/);
      if (ageMatch) setProfileAge(ageMatch[0]);

      // Extract Skill
      const lower = txt.toLowerCase();
      if (lower.includes('बिजली') || lower.includes('electric')) setProfileSkill('Electrician');
      else if (lower.includes('प्लंबर') || lower.includes('नल') || lower.includes('plumb')) setProfileSkill('Plumber');
      else if (lower.includes('मिस्त्री') || lower.includes('mason')) setProfileSkill('Mason');
      else if (lower.includes('पेंटर') || lower.includes('paint')) setProfileSkill('Painter');

      // Extract Name
      const nameHi = txt.match(/नाम\s+([^\s,]+(?:\s+[^\s,]+)?)\s*(?:है|हैं)?/);
      const nameEn = txt.match(/name is\s+([a-zA-Z\s]+)/i);
      if (nameHi && nameHi[1]) setProfileName(nameHi[1].trim());
      else if (nameEn && nameEn[1]) setProfileName(nameEn[1].trim());

      setIsListening(false);
      speak(`जानकारी भर दी गई है: ${txt}`);
    };
    rec.onerror = () => setIsListening(false);
    rec.start();
  };

  const handleSaveWorkerProfile = () => {
    const updated = { ...authUser, name: profileName, age: profileAge, skill: profileSkill };
    setAuthUser(updated);
    localStorage.setItem('sv_auth_user', JSON.stringify(updated));
    setUsersDb(usersDb.map((u) => (u.mobile === authUser.mobile && u.role === 'worker' ? updated : u)));
    setProfileSavedMsg(isHi ? '✅ आपकी जानकारी सेव हो गई है!' : '✅ Profile details saved!');
    setTimeout(() => setProfileSavedMsg(''), 3000);
  };

  // Post a brand-new job from Employer Portal (Broadcasts to all workers)
  const handlePostNewJob = async (e) => {
    e.preventDefault();
    setJobPostMsg('');
    const generatedOtp = String(Math.floor(1000 + Math.random() * 9000));
    const newJobObj = {
      id: `JOB-${Math.floor(100 + Math.random() * 900)}`,
      employer_name: myEmployerName || authUser?.name || 'Employer',
      employer_mobile: authUser?.mobile || '',
      title: newJobTitle,
      location: newJobLocation,
      address: newJobLocation,
      shift_time: newJobShift || 'Tomorrow • 09:00 AM',
      wage: parseFloat(newJobWage),
      lat: 28.6273 + (Math.random() - 0.5) * 0.03,
      lng: 77.3725 + (Math.random() - 0.5) * 0.03,
      status: 'OPEN',
      accepted_by: null,
      accepted_by_mobile: null,
      otp: generatedOtp
    };

    setJobs((prev) => [newJobObj, ...prev]);
    setEscrowLedger((prev) => [
      {
        id: Date.now(),
        job_id: newJobObj.id,
        job_title: newJobObj.title,
        from_employer: newJobObj.employer_name,
        to_worker: 'Pending (मज़दूर का इंतज़ार)',
        amount: newJobObj.wage,
        status: 'LOCKED_IN_ESCROW',
        updated_at: new Date().toLocaleString('en-IN')
      },
      ...prev
    ]);

    fetch(`${API_BASE}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newJobObj)
    }).catch(() => {});

    setJobPostMsg(
      isHi
        ? `✅ काम "${newJobTitle}" लाइव हो गया! अब सभी मज़दूर इसे देख और अप्लाई कर सकते हैं।`
        : `✅ Job "${newJobTitle}" is now live for all workers!`
    );
    setWageAmount(newJobWage);
    setNewJobTitle('');
    setNewJobLocation('');
    setNewJobShift('');
  };

  // Worker clicks "Job के लिए अप्लाई करें" -> Locks job for others & generates OTP for Employer
  const handleAcceptJob = (jobId) => {
    const wName = profileName || authUser?.name || 'Worker';
    const wMobile = authUser?.mobile || '';
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? { ...j, status: 'ACCEPTED', accepted_by: wName, accepted_by_mobile: wMobile }
          : j
      )
    );
    setEscrowLedger((prev) =>
      prev.map((tx) =>
        tx.job_id === jobId ? { ...tx, to_worker: `${wName} (${wMobile})` } : tx
      )
    );
    speak(
      isHi
        ? 'आपने यह काम स्वीकार कर लिया है। काम पूरा होने पर मालिक से 4-अंक का OTP पूछकर डालें।'
        : 'Job accepted! Ask Employer for the 4-digit OTP after completing work.'
    );
  };

  // Worker enters OTP given by Employer -> Releases Escrow & Saves Permanent Receipt
  const handleWorkerVerifyOtp = (job) => {
    const entered = (workerOtpInputs[job.id] || '').trim();
    if (entered !== job.otp) {
      alert(isHi ? '❌ गलत OTP! काम देने वाले से सही 4-अंक का कोड पूछें।' : '❌ Invalid OTP!');
      return;
    }

    const netWage = Math.max(0, Number(job.wage) - 20);
    const newReceipt = {
      order_id: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
      utr: `UTR${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      created_at: new Date().toLocaleString('en-IN'),
      job_title: job.title,
      job_location: job.location,
      job_address: job.address || job.location,
      worker_name: profileName || authUser?.name,
      worker_mobile: authUser?.mobile,
      employer_name: job.employer_name,
      total_amount: job.wage,
      platform_fee: 20,
      net_wage: netWage,
      status: 'RELEASED'
    };

    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: 'COMPLETED' } : j)));
    setEscrowLedger((prev) =>
      prev.map((tx) =>
        tx.job_id === job.id
          ? { ...tx, status: 'RELEASED', updated_at: new Date().toLocaleString('en-IN') }
          : tx
      )
    );
    setReceipts((prev) => [newReceipt, ...prev]);
    setWorkerOtpInputs((prev) => ({ ...prev, [job.id]: '' }));
    speak(isHi ? `बधाई हो! OTP मैच हो गया और ₹${netWage} की रसीद बन गई है।` : `OTP verified! ₹${netWage} released.`);
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
      setKycMsg(data.success ? `⏳ ${data.message}` : `❌ ${data.message}`);
      if (data.success) setUanInput('');
    } else {
      setEmpKycMsg(data.success ? `⏳ ${data.message}` : `❌ ${data.message}`);
      if (data.success) setGstInput('');
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
        employer_name: myEmployerName || 'Employer',
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
        sender_name: portal === 'worker' ? (profileName || authUser?.name || 'Worker') : (myEmployerName || authUser?.name || 'Employer'),
        content: chatText
      })
    });
    setChatText('');
    loadAll();
  };

  // ==================== STEP 1: LANGUAGE SELECTION SCREEN ====================
  if (!selectedLang) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6 bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl">
          <div className="inline-block px-4 py-1 bg-amber-500 text-slate-950 font-extrabold text-xs rounded-full">
            🇮🇳 SHRAMVAANI • श्रमवाणी
          </div>
          <h1 className="text-3xl font-extrabold">अपनी भाषा चुनें<br /><span className="text-lg font-medium text-slate-400">Select Your Language</span></h1>
          <div className="space-y-3">
            <button
              onClick={() => {
                const langObj = { code: 'hi', ...FALLBACK_LANGUAGES.hi };
                localStorage.setItem('sv_lang_obj', JSON.stringify(langObj));
                setSelectedLang(langObj);
              }}
              className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xl transition shadow-lg"
            >
              🇮🇳 हिन्दी (Hindi)
            </button>
            <button
              onClick={() => {
                const langObj = { code: 'en', ...FALLBACK_LANGUAGES.en };
                localStorage.setItem('sv_lang_obj', JSON.stringify(langObj));
                setSelectedLang(langObj);
              }}
              className="w-full py-4 rounded-2xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white font-extrabold text-xl transition"
            >
              🇬🇧 English
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== STEP 2: MOBILE NUMBER & PASSWORD LOGIN ====================
  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (loginMobile.length < 10) {
      alert(isHi ? 'कृपया 10 अंकों का सही मोबाइल नंबर दर्ज करें' : 'Please enter a valid 10-digit mobile number');
      return;
    }

    const existing = usersDb.find((u) => u.mobile === loginMobile && u.role === loginRole);
    if (existing) {
      if (existing.password !== loginPassword) {
        alert(isHi ? '❌ गलत पासवर्ड! कृपया सही पासवर्ड डालें।' : '❌ Incorrect password!');
        return;
      }
      setAuthUser(existing);
      localStorage.setItem('sv_auth_user', JSON.stringify(existing));
      setPortal(existing.role);
      setProfileName(existing.name);
      setProfileAge(existing.age || '');
      setProfileSkill(existing.skill || 'Electrician');
      setMyEmployerName(existing.name);
    } else {
      const finalName = loginName.trim() || (loginRole === 'worker' ? 'मज़दूर' : 'काम देने वाला');
      const newUser = {
        name: finalName,
        mobile: loginMobile,
        password: loginPassword,
        role: loginRole,
        age: '',
        skill: 'Electrician'
      };
      setUsersDb((prev) => [...prev, newUser]);
      setAuthUser(newUser);
      localStorage.setItem('sv_auth_user', JSON.stringify(newUser));
      setPortal(loginRole);
      setProfileName(finalName);
      setMyEmployerName(finalName);
    }
  };

  if (!authUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-lg max-w-md w-full space-y-5">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-extrabold text-slate-900">
              {isHi ? 'लॉगिन / नया खाता बनाएं' : 'Login / Create Account'}
            </h2>
            <button
              onClick={() => {
                localStorage.removeItem('sv_lang_obj');
                setSelectedLang(null);
              }}
              className="text-xs font-bold bg-slate-100 px-3 py-1.5 rounded-xl"
            >
              {isHi ? '🌐 भाषा बदलें' : '🌐 Language'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setLoginRole('worker')}
              className={`py-3 rounded-2xl font-extrabold text-sm ${loginRole === 'worker' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              {isHi ? '👷 मैं मज़दूर हूँ' : '👷 I am a Worker'}
            </button>
            <button
              type="button"
              onClick={() => setLoginRole('employer')}
              className={`py-3 rounded-2xl font-extrabold text-sm ${loginRole === 'employer' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              {isHi ? '🏗️ काम देने वाला' : '🏗️ Employer'}
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                {isHi ? 'आपका नाम (नए खाते के लिए)' : 'Your Name (for new account)'}
              </label>
              <input
                type="text"
                placeholder={isHi ? 'जैसे: सुरेश कुमार' : 'e.g., Suresh Kumar'}
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                className="w-full p-3 border rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                {isHi ? 'मोबाइल नंबर दर्ज करें' : 'Enter Mobile Number'}
              </label>
              <input
                type="tel"
                maxLength={10}
                placeholder={isHi ? '10 अंकों का मोबाइल नंबर' : '10-digit mobile number'}
                value={loginMobile}
                onChange={(e) => setLoginMobile(e.target.value)}
                required
                className="w-full p-3 border rounded-xl text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                {isHi ? 'अपना एक पासवर्ड बनाएं / दर्ज करें (दोबारा लॉगिन के लिए)' : 'Create / Enter Password (for future login)'}
              </label>
              <input
                type="password"
                placeholder={isHi ? 'पासवर्ड डालें' : 'Enter password'}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="w-full p-3 border rounded-xl text-sm"
              />
            </div>

            <button type="submit" className="w-full py-3.5 bg-slate-950 text-white font-extrabold rounded-2xl text-sm">
              {isHi ? 'आगे बढ़ें →' : 'Continue →'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('sv_auth_user');
    setAuthUser(null);
  };

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
            <p className="text-xs text-emerald-400 font-mono">
              🕒 {liveTime} • {authUser.name} ({authUser.mobile})
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {authUser.role === 'worker' && (
              <button onClick={() => setPortal('worker')} className={`px-3.5 py-2 rounded-xl text-xs font-bold ${portal === 'worker' ? 'bg-blue-600' : 'bg-slate-800'}`}>
                👷 {isHi ? 'मज़दूर डैशबोर्ड' : 'Worker'}
              </button>
            )}
            {authUser.role === 'employer' && (
              <button onClick={() => setPortal('employer')} className={`px-3.5 py-2 rounded-xl text-xs font-bold ${portal === 'employer' ? 'bg-emerald-600' : 'bg-slate-800'}`}>
                🏗️ {isHi ? 'काम देने वाला' : 'Employer'}
              </button>
            )}
            <button onClick={() => setPortal('admin')} className={`px-3.5 py-2 rounded-xl text-xs font-bold ${portal === 'admin' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-amber-400'}`}>
              🛡️ Admin / Escrow
            </button>
            <button onClick={handleLogout} className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white">
              {isHi ? 'लॉगआउट' : 'Logout'}
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
        {portal === 'worker' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                onClick={() => setWorkerTab('home')}
                className={`p-3.5 rounded-2xl font-extrabold text-xs sm:text-sm border-2 transition ${workerTab === 'home' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-800 border-slate-200'}`}
              >
                🏠 {isHi ? 'काम और OTP' : 'Jobs & OTP'}
              </button>
              <button
                onClick={() => setWorkerTab('receipts')}
                className={`p-3.5 rounded-2xl font-extrabold text-xs sm:text-sm border-2 transition ${workerTab === 'receipts' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-800 border-slate-200'}`}
              >
                📦 {isHi ? 'मेरी रसीदें' : 'Receipts'} ({receipts.filter((r) => r.worker_mobile === authUser.mobile).length})
              </button>
              <button
                onClick={() => setWorkerTab('map')}
                className={`p-3.5 rounded-2xl font-extrabold text-xs sm:text-sm border-2 transition ${workerTab === 'map' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-800 border-slate-200'}`}
              >
                🗺️ {isHi ? 'नक्शा (Map)' : 'Live Map'}
              </button>
              <button
                onClick={() => setWorkerTab('chat')}
                className={`p-3.5 rounded-2xl font-extrabold text-xs sm:text-sm border-2 transition ${workerTab === 'chat' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-800 border-slate-200'}`}
              >
                💬 {isHi ? 'बात करें' : 'Chat'}
              </button>
            </div>

            {workerTab === 'home' && (
              <div className="space-y-6">
                {/* VOICE AUTO-FILL PROFILE SECTION */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-wrap justify-between items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-2xl font-extrabold">{profileName || authUser.name}</h2>
                        <span className={`px-3 py-1 text-xs font-extrabold rounded-full ${worker?.kyc_status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {worker?.kyc_status === 'VERIFIED' ? `✅ ${worker.kyc_badge}` : '⚠️ Unverified Worker'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {isHi ? 'माइक दबाकर बोलें—आपका नाम, उम्र और काम नीचे बॉक्स में अपने आप लिख जाएगा:' : 'Tap mic to auto-type your name, age & skill:'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleVoiceAutoFill}
                      className={`px-5 py-3 text-white font-extrabold rounded-2xl text-sm shadow ${isListening ? 'bg-rose-600 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                      {isListening ? (isHi ? '🎙️ सुन रहा हूँ...' : '🎙️ Listening...') : (isHi ? '🎙️ बोलकर टाइप करें' : '🎙️ Speak to Auto-Fill')}
                    </button>
                  </div>

                  {voiceText && (
                    <div className="p-3 bg-blue-50 rounded-xl text-xs font-semibold text-blue-900">
                      🎤 {isHi ? 'आपने बोला:' : 'You said:'} "{voiceText}"
                    </div>
                  )}

                  {/* AUTO-TYPING INPUT BOXES */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{isHi ? 'मज़दूर का नाम' : 'Worker Name'}</label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full p-2.5 border rounded-xl bg-slate-50 text-sm font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{isHi ? 'उम्र (Age)' : 'Age'}</label>
                      <input
                        type="number"
                        placeholder="28"
                        value={profileAge}
                        onChange={(e) => setProfileAge(e.target.value)}
                        className="w-full p-2.5 border rounded-xl bg-slate-50 text-sm font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{isHi ? 'आपका काम (Skill)' : 'Skill'}</label>
                      <select
                        value={profileSkill}
                        onChange={(e) => setProfileSkill(e.target.value)}
                        className="w-full p-2.5 border rounded-xl bg-slate-50 text-sm font-semibold"
                      >
                        <option value="Electrician">{isHi ? 'बिजली का काम (Electrician)' : 'Electrician'}</option>
                        <option value="Plumber">{isHi ? 'प्लंबर (Plumber)' : 'Plumber'}</option>
                        <option value="Mason">{isHi ? 'राजमिस्त्री (Mason)' : 'Mason'}</option>
                        <option value="Painter">{isHi ? 'पेंटर (Painter)' : 'Painter'}</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSaveWorkerProfile}
                      className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs"
                    >
                      {isHi ? '💾 जानकारी सेव करें' : '💾 Save Profile'}
                    </button>
                    {profileSavedMsg && <span className="text-xs font-bold text-emerald-700">{profileSavedMsg}</span>}
                  </div>

                  {worker?.kyc_status !== 'VERIFIED' && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                      <p className="text-xs font-extrabold text-amber-900">
                        {isHi ? 'सरकारी बैज पाने के लिए अपना 12-अंक का e-Shram UAN नंबर डालें:' : 'Enter 12-digit e-Shram UAN for Verified Badge:'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <input
                          type="text"
                          maxLength={12}
                          placeholder="12-Digit e-Shram UAN"
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

                {/* AVAILABLE JOBS FEED + APPLY LOCK + OTP CONFIRMATION */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-xl font-extrabold">
                    📋 {isHi ? 'उपलब्ध काम (सभी मज़दूरों के लिए)' : 'Available Jobs Feed'}
                  </h3>

                  {jobs.length === 0 ? (
                    <p className="text-sm text-slate-500">{isHi ? 'अभी कोई काम उपलब्ध नहीं है।' : 'No jobs posted yet.'}</p>
                  ) : (
                    <div className="space-y-3">
                      {jobs.map((job) => {
                        const isAcceptedByMe = job.status === 'ACCEPTED' && job.accepted_by_mobile === authUser.mobile;
                        return (
                          <div key={job.id} className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/70 space-y-3">
                            <div className="flex flex-wrap justify-between items-start gap-3">
                              <div>
                                <h4 className="text-lg font-extrabold text-slate-900">{job.title}</h4>
                                <p className="text-xs text-slate-600">📍 {job.location} • 🕒 {job.shift_time}</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {isHi ? 'काम देने वाला:' : 'Employer:'} <b>{job.employer_name}</b>
                                </p>
                              </div>

                              <div className="text-right space-y-2">
                                <p className="text-xl font-extrabold text-emerald-700">₹{job.wage}/{isHi ? 'दिन' : 'day'}</p>

                                {job.status === 'OPEN' && (
                                  <button
                                    onClick={() => handleAcceptJob(job.id)}
                                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs shadow"
                                  >
                                    {isHi ? 'Job के लिए अप्लाई करें' : 'Apply for Job'}
                                  </button>
                                )}

                                {job.status === 'ACCEPTED' && (
                                  <span className="inline-block px-3 py-1.5 bg-amber-100 text-amber-900 font-extrabold rounded-xl text-xs">
                                    ✅ Accepted ({job.accepted_by})
                                  </span>
                                )}

                                {job.status === 'COMPLETED' && (
                                  <span className="inline-block px-3 py-1.5 bg-emerald-100 text-emerald-900 font-extrabold rounded-xl text-xs">
                                    🎉 Completed & Paid
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* IF THIS WORKER ACCEPTED THE JOB -> ENTER OTP FROM EMPLOYER TO COMPLETE */}
                            {isAcceptedByMe && (
                              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl space-y-2">
                                <p className="text-xs font-extrabold text-emerald-900">
                                  🔐 {isHi
                                    ? `काम पूरा होने पर मालिक (${job.employer_name}) से 4-अंकों का OTP पूछकर यहाँ डालें:`
                                    : `Ask Employer (${job.employer_name}) for the 4-digit OTP after finishing work:`}
                                </p>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    maxLength={4}
                                    placeholder="4-Digit OTP"
                                    value={workerOtpInputs[job.id] || ''}
                                    onChange={(e) => setWorkerOtpInputs({ ...workerOtpInputs, [job.id]: e.target.value })}
                                    className="w-36 p-2.5 border rounded-xl bg-white font-mono text-sm font-bold text-center"
                                  />
                                  <button
                                    onClick={() => handleWorkerVerifyOtp(job)}
                                    className="px-4 py-2.5 bg-emerald-600 text-white font-extrabold rounded-xl text-xs"
                                  >
                                    {isHi ? 'OTP कन्फर्म करें और रसीद पाएं' : 'Confirm OTP & Get Receipt'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {worker?.is_locked && (
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
                  <h2 className="text-xl font-extrabold">📦 {isHi ? 'मेरी रसीदें और पिछले काम (Saved Order History)' : 'My Receipts & Order History'}</h2>
                  <p className="text-xs text-slate-500">{isHi ? 'हमेशा के लिए सुरक्षित रिकॉर्ड — क्लिक करके पूरी रसीद देखें और डाउनलोड करें।' : 'Permanent records — click to view and download.'}</p>
                </div>

                {receipts.filter((r) => r.worker_mobile === authUser.mobile).length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed text-sm text-slate-500">
                    {isHi ? 'अभी तक कोई रसीद नहीं बनी है।' : 'No receipts generated yet.'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {receipts
                      .filter((r) => r.worker_mobile === authUser.mobile)
                      .map((rcp) => (
                        <div
                          key={rcp.utr}
                          onClick={() => setSelectedReceiptModal(rcp)}
                          className="p-4 rounded-2xl border-2 border-slate-200 hover:border-blue-600 cursor-pointer transition flex flex-wrap justify-between items-center gap-3 bg-slate-50/50"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm">{rcp.job_title}</span>
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                {rcp.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5">📍 {rcp.job_location} • {isHi ? 'काम देने वाला:' : 'Employer:'} {rcp.employer_name}</p>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">Order: {rcp.order_id} • {rcp.created_at}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-extrabold text-emerald-700">₹{rcp.net_wage}</p>
                            <span className="text-xs font-bold text-blue-600 underline">{isHi ? 'पूरी रसीद देखें →' : 'View Receipt →'}</span>
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

            {/* LIVE MAP TAB */}
            {workerTab === 'map' && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
                <h2 className="text-xl font-extrabold">🗺️ {isHi ? 'नज़दीकी काम का असली नक्शा' : 'Live Job Location Map'}</h2>
                <LiveJobMap jobs={jobs} selectedJob={selectedJob} onSelectJob={setSelectedJob} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {jobs.map((j) => (
                    <div
                      key={j.id}
                      onClick={() => setSelectedJob(j)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer ${selectedJob?.id === j.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200'}`}
                    >
                      <div className="flex justify-between">
                        <p className="font-extrabold text-sm">{j.title}</p>
                        <span className="text-[11px] font-bold">{j.status}</span>
                      </div>
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

        {/* ==================== 2. EMPLOYER PORTAL ==================== */}
        {portal === 'employer' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border-2 border-blue-600 shadow-sm space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div>
                  <h2 className="text-xl font-extrabold">➕ {isHi ? 'नया काम पोस्ट करें (Post Your Requirement)' : 'Post Your Requirement'}</h2>
                  <p className="text-xs text-slate-500">
                    {isHi ? 'काम पोस्ट करते ही यह सभी मज़दूरों को दिखेगा।' : 'Posted jobs appear immediately to all workers.'}
                  </p>
                </div>
                <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-emerald-100 text-emerald-800">
                  ✅ {authUser.name}
                </span>
              </div>

              <form onSubmit={handlePostNewJob} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder={isHi ? 'आपका नाम / कंपनी' : 'Your Name / Company'}
                  value={myEmployerName}
                  onChange={(e) => setMyEmployerName(e.target.value)}
                  className="p-3 border rounded-xl text-sm font-semibold"
                  required
                />
                <input
                  type="text"
                  placeholder={isHi ? 'क्या काम करवाना है? (जैसे: Bijli ka kaam)' : 'Work required (e.g., Electrician)'}
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                  className="p-3 border rounded-xl text-sm font-semibold"
                  required
                />
                <input
                  type="text"
                  placeholder={isHi ? 'जगह / पता (जैसे: Sector 62, Noida)' : 'Location / Address'}
                  value={newJobLocation}
                  onChange={(e) => setNewJobLocation(e.target.value)}
                  className="p-3 border rounded-xl text-sm"
                  required
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={isHi ? 'कब और समय (Kal 9:00 AM)' : 'Shift Time'}
                    value={newJobShift}
                    onChange={(e) => setNewJobShift(e.target.value)}
                    className="flex-1 p-3 border rounded-xl text-sm"
                    required
                  />
                  <input
                    type="number"
                    placeholder="₹"
                    value={newJobWage}
                    onChange={(e) => setNewJobWage(e.target.value)}
                    className="w-24 p-3 border rounded-xl text-sm font-bold"
                    required
                  />
                </div>
                <button type="submit" className="sm:col-span-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-sm">
                  🚀 {isHi ? 'काम पोस्ट करें (Publish Live Now)' : 'Publish Job Live Now'}
                </button>
              </form>

              {jobPostMsg && <p className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800">{jobPostMsg}</p>}

              {employer?.kyc_status !== 'VERIFIED' && (
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

            {/* EMPLOYER SECRET OTP DISPLAY WHEN WORKER ACCEPTS JOB */}
            <div className="bg-white p-6 rounded-3xl border-2 border-emerald-500 shadow-sm space-y-4">
              <h3 className="text-lg font-extrabold">
                🔐 {isHi ? 'मज़दूर द्वारा स्वीकार किए गए काम और आपका गुप्त OTP' : 'Accepted Jobs & Secret OTP to Share with Worker'}
              </h3>
              <p className="text-xs text-slate-600">
                {isHi
                  ? 'जब मज़दूर आज का काम पूरा कर ले, तो नीचे दिख रहा 4-अंकों का OTP उसे बताएं ताकि वह कन्फर्म करके पेमेंट ले सके:'
                  : 'Once the worker finishes today’s work, share this 4-digit OTP with them to release payment:'}
              </p>

              {jobs.filter((j) => j.employer_mobile === authUser.mobile || j.employer_name === myEmployerName).length === 0 ? (
                <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-2xl">
                  {isHi ? 'अभी तक आपने कोई काम पोस्ट नहीं किया है।' : 'No jobs posted yet.'}
                </p>
              ) : (
                <div className="space-y-3">
                  {jobs
                    .filter((j) => j.employer_mobile === authUser.mobile || j.employer_name === myEmployerName)
                    .map((job) => (
                      <div key={job.id} className="p-4 rounded-2xl border bg-slate-50 flex flex-wrap justify-between items-center gap-4">
                        <div>
                          <h4 className="font-extrabold text-base">{job.title} — ₹{job.wage}</h4>
                          <p className="text-xs text-slate-600">📍 {job.location} • Status: <b>{job.status}</b></p>
                          {job.accepted_by && (
                            <p className="text-xs font-bold text-blue-800 mt-1">
                              👷 मज़दूर: {job.accepted_by} ({job.accepted_by_mobile})
                            </p>
                          )}
                        </div>

                        {job.status === 'ACCEPTED' && (
                          <div className="bg-white px-5 py-3 rounded-2xl border-2 border-dashed border-emerald-600 text-center shadow-sm">
                            <p className="text-[10px] font-extrabold text-slate-500 uppercase">
                              {isHi ? 'मज़दूर को देने वाला OTP' : 'Share OTP with Worker'}
                            </p>
                            <p className="text-3xl font-mono font-extrabold tracking-widest text-emerald-700 my-0.5">
                              {job.otp}
                            </p>
                          </div>
                        )}

                        {job.status === 'COMPLETED' && (
                          <span className="px-3 py-1.5 bg-emerald-100 text-emerald-900 font-extrabold rounded-xl text-xs">
                            ✅ Payment Released
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* QR ESCROW PAYMENT SECTION */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-lg font-extrabold">💳 Escrow में पेमेंट लॉक करें (UPI QR)</h3>
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
                  Generate Real UPI QR Code
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
                    Verify UTR & Lock in Escrow
                  </button>
                </div>
              )}

              {escrowFeedback && (
                <div className={`p-3 rounded-xl text-xs font-bold ${escrowFeedback.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                  {escrowFeedback.text}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== 3. ADMIN / ESCROW LEDGER PORTAL ==================== */}
        {portal === 'admin' && (
          <div className="bg-slate-950 text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-2xl font-extrabold text-amber-400">🛡️ ShramVaani — Admin & Escrow Money Ledger</h2>
                <p className="text-xs text-slate-400">किस एम्प्लॉयर का पैसा किस मज़दूर के पास जा रहा है, उसका पूरा लाइव हिसाब</p>
              </div>
              <button
                onClick={() => setPortal(authUser.role)}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs"
              >
                ← वापस डैशबोर्ड पर जाएं
              </button>
            </div>

            {escrowLedger.length === 0 ? (
              <p className="text-sm text-slate-400 bg-slate-900 p-5 rounded-2xl">अभी तक कोई Escrow ट्रांजेक्शन रिकॉर्ड नहीं है।</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs">
                      <th className="py-3">Job ID / काम</th>
                      <th>किसने दिया (Employer)</th>
                      <th>किसको मिलेगा (Worker)</th>
                      <th>राशि</th>
                      <th>Escrow स्टेटस</th>
                    </tr>
                  </thead>
                  <tbody>
                    {escrowLedger.map((tx) => (
                      <tr key={tx.id} className="border-b border-slate-800 text-sm">
                        <td className="py-3">
                          <span className="font-mono text-xs text-slate-400">{tx.job_id}</span>
                          <div className="font-bold">{tx.job_title}</div>
                        </td>
                        <td>{tx.from_employer}</td>
                        <td className="font-semibold text-blue-300">{tx.to_worker}</td>
                        <td className="font-extrabold text-emerald-400">₹{tx.amount}</td>
                        <td>
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${tx.status === 'RELEASED' ? 'bg-emerald-900/70 text-emerald-300' : 'bg-amber-900/70 text-amber-300'}`}>
                            {tx.status === 'RELEASED' ? '✅ मज़दूर को भेज दिया गया' : '🔒 Escrow में सुरक्षित'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

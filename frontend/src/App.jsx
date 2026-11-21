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
  // 1. Language & Auth States
  const [selectedLang, setSelectedLang] = useState(() => JSON.parse(localStorage.getItem('sv_lang_obj')) || null);
  const [authUser, setAuthUser] = useState(() => JSON.parse(localStorage.getItem('sv_auth_user')) || null);
  const [usersDb, setUsersDb] = useState(() => JSON.parse(localStorage.getItem('sv_users_db')) || []);

  const [loginRole, setLoginRole] = useState('worker');
  const [loginName, setLoginName] = useState('');
  const [loginMobile, setLoginMobile] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [resetNewPass, setResetNewPass] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Full Owner Admin Portal States (Triggered from corner link on Login screen)
  const [showAdminPortal, setShowAdminPortal] = useState(false);
  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem('sv_admin_token') || '');
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminLoginErr, setAdminLoginErr] = useState('');
  const [adminData, setAdminData] = useState(null);
  const [adminFeeInput, setAdminFeeInput] = useState('50');
  const [adminBannerInput, setAdminBannerInput] = useState('');
  const [adminStatusMsg, setAdminStatusMsg] = useState('');

  const [portal, setPortal] = useState(authUser?.role || 'worker');
  const [workerTab, setWorkerTab] = useState('home');
  const [employerTab, setEmployerTab] = useState('jobs');
  const [liveTime, setLiveTime] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [spokenBanner, setSpokenBanner] = useState('');

  // Worker Profile (Any custom work allowed via typing OR voice)
  const [activeWorkerId] = useState('W-101');
  const [worker, setWorker] = useState(null);
  const [profileName, setProfileName] = useState(authUser?.name || '');
  const [profileAge, setProfileAge] = useState(authUser?.age || '');
  const [profileSkill, setProfileSkill] = useState(authUser?.skill || '');
  const [profileSavedMsg, setProfileSavedMsg] = useState('');

  // KYC & Voice
  const [uanInput, setUanInput] = useState('');
  const [kycMsg, setKycMsg] = useState('');
  const [voiceText, setVoiceText] = useState('');
  const [isListening, setIsListening] = useState(false);

  // Jobs, Accept Lock & OTP States
  const [jobs, setJobs] = useState(() => JSON.parse(localStorage.getItem('sv_jobs_list')) || []);
  const [selectedJob, setSelectedJob] = useState(null);
  const [workerOtpInputs, setWorkerOtpInputs] = useState({});

  // Permanent Receipt History
  const [receipts, setReceipts] = useState(() => JSON.parse(localStorage.getItem('sv_receipts_list')) || []);
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

  // Live Chat state (Typing + Instant Voice-to-Text)
  const [messages, setMessages] = useState([]);
  const [chatText, setChatText] = useState('');
  const [isChatListening, setIsChatListening] = useState(false);

  const isHi = selectedLang?.code === 'hi';

  useEffect(() => { localStorage.setItem('sv_users_db', JSON.stringify(usersDb)); }, [usersDb]);
  useEffect(() => { localStorage.setItem('sv_jobs_list', JSON.stringify(jobs)); }, [jobs]);
  useEffect(() => { localStorage.setItem('sv_receipts_list', JSON.stringify(receipts)); }, [receipts]);

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

  // Real-Time Chat & Jobs Auto-Sync every 3 seconds
  useEffect(() => {
    if (!authUser) return;
    const syncInterval = setInterval(() => {
      fetch(`${API_BASE}/chat`)
        .then((r) => r.json())
        .then((data) => { if (Array.isArray(data)) setMessages(data); })
        .catch(() => {});

      fetch(`${API_BASE}/jobs`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) setJobs(data);
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(syncInterval);
  }, [authUser]);

  const loadAll = (wId = activeWorkerId) => {
    fetch(`${API_BASE}/config`).then((r) => r.json()).then((c) => setAnnouncement(c.announcement)).catch(() => {});
    fetch(`${API_BASE}/worker/${wId}`).then((r) => r.json()).then(setWorker).catch(() => {});
    fetch(`${API_BASE}/employer/EMP-01`).then((r) => r.json()).then(setEmployer).catch(() => {});
    fetch(`${API_BASE}/jobs`).then((r) => r.json()).then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setJobs(data);
        if (!selectedJob) setSelectedJob(data[0]);
      }
    }).catch(() => {});
    fetch(`${API_BASE}/receipts`).then((r) => r.json()).then((data) => {
      if (Array.isArray(data) && data.length > 0) setReceipts(data);
    }).catch(() => {});
    fetch(`${API_BASE}/chat`).then((r) => r.json()).then(setMessages).catch(() => {});
  };

  // ==================== ADMIN PORTAL FUNCTIONS ====================
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminLoginErr('');
    if (adminPinInput === 'Rounak@2026') {
      sessionStorage.setItem('sv_admin_token', 'LOCAL_OWNER_SESSION');
      setAdminToken('LOCAL_OWNER_SESSION');
      setAdminPinInput('');
    }
    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: adminPinInput })
      });
      const json = await res.json();
      if (json.success) {
        sessionStorage.setItem('sv_admin_token', json.token);
        setAdminToken(json.token);
        setAdminPinInput('');
        loadAdminDashboard(json.token);
      } else if (adminPinInput !== 'Rounak@2026') {
        setAdminLoginErr(json.message || 'गलत एडमिन पासवर्ड');
      }
    } catch {
      if (adminPinInput !== 'Rounak@2026') setAdminLoginErr('गलत एडमिन पासवर्ड');
    }
  };

  const loadAdminDashboard = async (tok = adminToken) => {
    if (!tok) return;
    try {
      const res = await fetch(`${API_BASE}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${tok}` }
      });
      if (res.ok) {
        const json = await res.json();
        setAdminData(json);
        if (json.config) {
          setAdminFeeInput(String(json.config.platform_fee));
          setAdminBannerInput(json.config.announcement);
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (showAdminPortal && adminToken) {
      loadAdminDashboard(adminToken);
    }
  }, [showAdminPortal, adminToken]);

  const handleAdminKyc = async (role, action) => {
    await fetch(`${API_BASE}/admin/kyc/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ role, action })
    }).catch(() => {});
    setAdminStatusMsg(`✅ ${role.toUpperCase()} KYC ${action} हो गया!`);
    loadAdminDashboard();
  };

  const handleAdminConfigSave = async (e) => {
    e.preventDefault();
    await fetch(`${API_BASE}/admin/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ platform_fee: parseFloat(adminFeeInput), announcement: adminBannerInput })
    }).catch(() => {});
    setAdminStatusMsg('✅ प्लेटफॉर्म सेटिंग्स अपडेट हो गईं!');
    loadAdminDashboard();
  };

  const handleAdminForceRelease = async (utrCode) => {
    await fetch(`${API_BASE}/admin/escrow/${utrCode}/force-release`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }).catch(() => {});
    setAdminStatusMsg(`✅ UTR ${utrCode} का पेमेंट वर्कर को रिलीज़ कर दिया गया!`);
    loadAdminDashboard();
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

  // Voice Input that Auto-Types ANY Work/Skill, Name, and Age into Input Boxes
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

      const ageMatch = txt.match(/\b(1[89]|[2-6][0-9])\b/);
      if (ageMatch) setProfileAge(ageMatch[0]);

      const nameHi = txt.match(/नाम\s+([^\s,]+(?:\s+[^\s,]+)?)\s*(?:है|हैं)?/);
      const nameEn = txt.match(/name is\s+([a-zA-Z\s]+)/i);
      if (nameHi && nameHi[1]) setProfileName(nameHi[1].trim());
      else if (nameEn && nameEn[1]) setProfileName(nameEn[1].trim());

      const lower = txt.toLowerCase();
      if (lower.includes('खाना') || lower.includes('रसोइ') || lower.includes('cook')) {
        setProfileSkill(isHi ? 'खाना बनाना (Cook)' : 'Cook / Chef');
      } else if (lower.includes('ड्राइवर') || lower.includes('गाड़ी') || lower.includes('driver')) {
        setProfileSkill(isHi ? 'ड्राइवर (Driver)' : 'Driver');
      } else if (lower.includes('बढ़ई') || lower.includes('लकड़ी') || lower.includes('carpenter')) {
        setProfileSkill(isHi ? 'बढ़ई (Carpenter)' : 'Carpenter');
      } else if (lower.includes('सफाई') || lower.includes('clean')) {
        setProfileSkill(isHi ? 'सफाई कर्मचारी (Cleaner)' : 'Cleaner');
      } else if (lower.includes('बिजली') || lower.includes('electric')) {
        setProfileSkill(isHi ? 'बिजली का काम (Electrician)' : 'Electrician');
      } else if (lower.includes('प्लंबर') || lower.includes('नल') || lower.includes('plumb')) {
        setProfileSkill(isHi ? 'प्लंबर (Plumber)' : 'Plumber');
      } else if (lower.includes('मिस्त्री') || lower.includes('mason')) {
        setProfileSkill(isHi ? 'राजमिस्त्री (Mason)' : 'Mason');
      } else if (lower.includes('पेंटर') || lower.includes('paint')) {
        setProfileSkill(isHi ? 'पेंटर (Painter)' : 'Painter');
      } else {
        const cleanedWork = txt
          .replace(/मेरा नाम\s+[^\s,]+(\s+[^\s,]+)?\s*(है|हैं)?/gi, '')
          .replace(/मैं\s+(मेल|फीमेल|पुरुष|महिला)\s*(हूँ|हूं)?/gi, '')
          .replace(/उम्र\s*\d+\s*(साल|वर्ष)?/gi, '')
          .trim();
        setProfileSkill(cleanedWork || txt);
      }

      setIsListening(false);
      speak(`जानकारी बॉक्स में लिख दी गई है: ${txt}`);
    };
    rec.onerror = () => setIsListening(false);
    rec.start();
  };

  // Voice-to-Text directly inside Chat Input Box
  const handleVoiceChatInput = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert(isHi ? 'कृपया Google Chrome ब्राउज़र का उपयोग करें' : 'Please use Google Chrome');
      return;
    }
    const rec = new SR();
    rec.lang = selectedLang?.locale || 'hi-IN';
    rec.onstart = () => setIsChatListening(true);
    rec.onresult = (e) => {
      const spokenMsg = e.results[0][0].transcript;
      setChatText((prev) => (prev ? `${prev} ${spokenMsg}` : spokenMsg));
      setIsChatListening(false);
    };
    rec.onerror = () => setIsChatListening(false);
    rec.start();
  };

  const handleSaveWorkerProfile = () => {
    const updated = { ...authUser, name: profileName, age: profileAge, skill: profileSkill };
    setAuthUser(updated);
    localStorage.setItem('sv_auth_user', JSON.stringify(updated));
    setUsersDb(usersDb.map((u) => (u.mobile === authUser.mobile && u.role === 'worker' ? updated : u)));

    fetch(`${API_BASE}/auth/update-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(() => {});

    setProfileSavedMsg(isHi ? '✅ आपकी जानकारी सेव हो गई है!' : '✅ Profile saved!');
    setTimeout(() => setProfileSavedMsg(''), 3000);
  };

  const handlePostNewJob = async (e) => {
    e.preventDefault();
    setJobPostMsg('');
    const generatedOtp = String(Math.floor(1000 + Math.random() * 9000));
    const payload = {
      employer_name: myEmployerName || authUser?.name || 'Employer',
      employer_mobile: authUser?.mobile || '',
      title: newJobTitle,
      location: newJobLocation,
      address: newJobLocation,
      shift_time: newJobShift || 'Tomorrow • 09:00 AM',
      wage: parseFloat(newJobWage),
      otp: generatedOtp
    };

    try {
      const res = await fetch(`${API_BASE}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) loadAll();
    } catch {
      const fallbackJob = {
        id: Date.now(),
        ...payload,
        lat: 28.6273,
        lng: 77.3725,
        status: 'OPEN',
        accepted_by: null,
        accepted_by_mobile: null
      };
      setJobs((prev) => [fallbackJob, ...prev]);
    }

    setJobPostMsg(
      isHi
        ? `✅ काम "${newJobTitle}" लाइव हो गया! अब सभी मज़दूर इसे देख और अप्लाई कर सकते हैं।`
        : `✅ Job "${newJobTitle}" is now live!`
    );
    setWageAmount(newJobWage);
    setNewJobTitle('');
    setNewJobLocation('');
    setNewJobShift('');
  };

  const handleAcceptJob = async (jobId) => {
    const wName = profileName || authUser?.name || 'Worker';
    const wMobile = authUser?.mobile || '';

    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId ? { ...j, status: 'ACCEPTED', accepted_by: wName, accepted_by_mobile: wMobile } : j
      )
    );

    try {
      await fetch(`${API_BASE}/jobs/${jobId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worker_name: wName, worker_mobile: wMobile })
      });
      loadAll();
    } catch {}

    speak(
      isHi
        ? 'आपने यह काम स्वीकार कर लिया है। काम पूरा होने पर मालिक से 4-अंक का OTP पूछकर डालें।'
        : 'Job accepted! Ask Employer for the 4-digit OTP after completing work.'
    );
  };

  const handleWorkerVerifyOtp = async (job) => {
    const entered = (workerOtpInputs[job.id] || '').trim();
    if (entered !== job.otp) {
      alert(isHi ? '❌ गलत OTP! काम देने वाले से सही 4-अंक का कोड पूछें।' : '❌ Invalid OTP!');
      return;
    }

    try {
      await fetch(`${API_BASE}/jobs/${job.id}/complete-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: entered })
      });
      loadAll();
    } catch {}

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
    const msgToSend = chatText.trim();
    setChatText('');
    await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender_role: portal,
        sender_name: portal === 'worker' ? (profileName || authUser?.name || 'Worker') : (myEmployerName || authUser?.name || 'Employer'),
        content: msgToSend
      })
    }).catch(() => {});
    loadAll();
  };

  // ==================== FULL OWNER ADMIN PORTAL (OPENED FROM LOGIN CORNER LINK) ====================
  if (showAdminPortal) {
    if (!adminToken) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
          <form onSubmit={handleAdminLogin} className="bg-slate-900 p-8 rounded-3xl border border-slate-800 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex justify-between items-center">
              <span className="px-3 py-1 bg-amber-500 text-slate-950 font-extrabold text-xs rounded-full">
                🛡️ OWNER ADMIN PORTAL
              </span>
              <button
                type="button"
                onClick={() => setShowAdminPortal(false)}
                className="text-xs font-bold text-slate-400 hover:text-white"
              >
                ← वापस लॉगिन पर
              </button>
            </div>
            <h1 className="text-2xl font-extrabold">Admin Control & Escrow Vault</h1>
            <p className="text-xs text-slate-400">एडमिन पैनल खोलने के लिए अपना गुप्त पासवर्ड दर्ज करें:</p>
            <input
              type="password"
              placeholder="Enter Admin Password"
              value={adminPinInput}
              onChange={(e) => setAdminPinInput(e.target.value)}
              required
              className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm"
            />
            {adminLoginErr && <p className="text-xs font-bold text-rose-400">❌ {adminLoginErr}</p>}
            <button type="submit" className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-sm">
              🔓 Unlock Admin Portal
            </button>
          </form>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-950 text-white p-5 font-sans">
        <div className="max-w-6xl mx-auto space-y-6">
          <header className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-800 pb-4">
            <div>
              <h1 className="text-2xl font-extrabold text-amber-400">🛡️ ShramVaani — Owner Admin & Escrow Portal</h1>
              <p className="text-xs text-slate-400">Connected Live to Cloud Database • Full Escrow & Payment Control</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => loadAdminDashboard()} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold">
                🔄 Refresh Data
              </button>
              <button
                onClick={() => {
                  sessionStorage.removeItem('sv_admin_token');
                  setAdminToken('');
                  setShowAdminPortal(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-bold"
              >
                🔒 Lock & Exit
              </button>
            </div>
          </header>

          {adminStatusMsg && (
            <div className="p-3 bg-emerald-950 border border-emerald-700 text-emerald-300 rounded-xl text-xs font-bold">
              {adminStatusMsg}
            </div>
          )}

          {/* 4 LIVE FINANCIAL METRICS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
              <p className="text-xs text-slate-400">Total Escrow Volume (GMV)</p>
              <p className="text-2xl font-extrabold text-white mt-1">₹{adminData?.metrics?.gmv || 0}</p>
            </div>
            <div className="bg-slate-900 p-5 rounded-2xl border border-amber-500/40">
              <p className="text-xs text-amber-400">🔒 Locked in Escrow Vault</p>
              <p className="text-2xl font-extrabold text-amber-300 mt-1">₹{adminData?.metrics?.locked_vault || 0}</p>
            </div>
            <div className="bg-slate-900 p-5 rounded-2xl border border-emerald-500/40">
              <p className="text-xs text-emerald-400">✅ Released to Workers</p>
              <p className="text-2xl font-extrabold text-emerald-300 mt-1">₹{adminData?.metrics?.released_wages || 0}</p>
            </div>
            <div className="bg-slate-900 p-5 rounded-2xl border border-blue-500/40">
              <p className="text-xs text-blue-400">💰 Platform Net Revenue</p>
              <p className="text-2xl font-extrabold text-blue-300 mt-1">₹{adminData?.metrics?.net_revenue || 0}</p>
            </div>
          </div>

          {/* KYC APPROVAL + LIVE PLATFORM CONTROLS */}
          {adminData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
                <h2 className="text-lg font-extrabold text-blue-400">🪪 Identity & Badge Approvals (KYC)</h2>
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-sm">👷 Worker: {adminData.worker_kyc.name}</p>
                    <p className="text-xs text-slate-400">{adminData.worker_kyc.doc} • {adminData.worker_kyc.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleAdminKyc('worker', 'APPROVE')} className="px-3 py-1.5 bg-emerald-600 rounded-lg text-xs font-bold">Approve</button>
                    <button onClick={() => handleAdminKyc('worker', 'REJECT')} className="px-3 py-1.5 bg-rose-600 rounded-lg text-xs font-bold">Reject</button>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-sm">🏗️ Employer: {adminData.employer_kyc.name}</p>
                    <p className="text-xs text-slate-400">{adminData.employer_kyc.doc} • {adminData.employer_kyc.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleAdminKyc('employer', 'APPROVE')} className="px-3 py-1.5 bg-emerald-600 rounded-lg text-xs font-bold">Approve</button>
                    <button onClick={() => handleAdminKyc('employer', 'REJECT')} className="px-3 py-1.5 bg-rose-600 rounded-lg text-xs font-bold">Reject</button>
                  </div>
                </div>
              </div>

              <form onSubmit={handleAdminConfigSave} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h2 className="text-lg font-extrabold text-amber-400">⚙️ Live Platform Controls</h2>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Platform Safety Fee (₹)</label>
                  <input type="number" value={adminFeeInput} onChange={(e) => setAdminFeeInput(e.target.value)} className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Top Announcement Banner</label>
                  <input type="text" value={adminBannerInput} onChange={(e) => setAdminBannerInput(e.target.value)} className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm" />
                </div>
                <button type="submit" className="px-5 py-2.5 bg-blue-600 rounded-xl text-xs font-extrabold">Save Live Config</button>
              </form>
            </div>
          )}

          {/* LIVE ESCROW MONEY TRACKING LEDGER */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
            <h2 className="text-lg font-extrabold text-emerald-400">💸 Live Escrow Money Ledger (किस एम्प्लॉयर का पैसा किस मज़दूर को जा रहा है)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-3">Order / UTR</th>
                    <th>किसने दिया (Employer)</th>
                    <th>किसको मिलेगा (Worker)</th>
                    <th>काम (Job)</th>
                    <th>कुल राशि → दिहाड़ी</th>
                    <th>स्टेटस / एक्शन</th>
                  </tr>
                </thead>
                <tbody>
                  {(adminData?.ledger || []).map((tx) => (
                    <tr key={tx.utr} className="border-b border-slate-800">
                      <td className="py-3 font-mono">
                        <div>{tx.order_id}</div>
                        <div className="text-slate-500">{tx.utr}</div>
                      </td>
                      <td className="font-bold">{tx.from_employer}</td>
                      <td className="font-bold text-blue-300">{tx.to_worker}</td>
                      <td>{tx.job_title}</td>
                      <td>
                        <span className="font-bold">₹{tx.total_amount}</span> → <span className="text-emerald-400 font-extrabold">₹{tx.net_wage}</span>
                      </td>
                      <td>
                        {tx.status === 'LOCKED' ? (
                          <button onClick={() => handleAdminForceRelease(tx.utr)} className="px-3 py-1 bg-amber-500 text-slate-950 font-extrabold rounded-lg">
                            🔒 Locked (Force Release)
                          </button>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 font-bold rounded-lg">✅ RELEASED</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

  // ==================== STEP 2: LOGIN SCREEN (WITH CORNER ADMIN LINK) ====================
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (loginMobile.length < 10) {
      alert(isHi ? 'कृपया 10 अंकों का सही मोबाइल नंबर दर्ज करें' : 'Please enter a valid 10-digit mobile number');
      return;
    }
    setAuthLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: loginName.trim(),
          mobile: loginMobile,
          password: loginPassword,
          role: loginRole
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || (isHi ? '❌ गलत पासवर्ड!' : '❌ Wrong password!'));
        setAuthLoading(false);
        return;
      }
      const loggedUser = data.user;
      setAuthUser(loggedUser);
      localStorage.setItem('sv_auth_user', JSON.stringify(loggedUser));
      setPortal(loggedUser.role);
      setProfileName(loggedUser.name);
      setProfileAge(loggedUser.age || '');
      setProfileSkill(loggedUser.skill || '');
      setMyEmployerName(loggedUser.name);
    } catch {
      const existing = usersDb.find((u) => u.mobile === loginMobile && u.role === loginRole);
      if (existing) {
        if (existing.password !== loginPassword) {
          alert(isHi ? '❌ गलत पासवर्ड!' : '❌ Incorrect password!');
          setAuthLoading(false);
          return;
        }
        setAuthUser(existing);
        localStorage.setItem('sv_auth_user', JSON.stringify(existing));
        setPortal(existing.role);
        setProfileName(existing.name);
        setProfileAge(existing.age || '');
        setProfileSkill(existing.skill || '');
        setMyEmployerName(existing.name);
      } else {
        const finalName = loginName.trim() || (loginRole === 'worker' ? 'मज़दूर' : 'काम देने वाला');
        const newUser = { name: finalName, mobile: loginMobile, password: loginPassword, role: loginRole, age: '', skill: '' };
        setUsersDb((prev) => [...prev, newUser]);
        setAuthUser(newUser);
        localStorage.setItem('sv_auth_user', JSON.stringify(newUser));
        setPortal(loginRole);
        setProfileName(finalName);
        setMyEmployerName(finalName);
      }
    }
    setAuthLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (loginMobile.length < 10 || !resetNewPass) {
      alert(isHi ? 'मोबाइल नंबर और नया पासवर्ड दोनों डालें' : 'Enter mobile number and new password');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: loginMobile, role: loginRole, new_password: resetNewPass })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setIsForgotMode(false);
        setLoginPassword(resetNewPass);
        setResetNewPass('');
        return;
      }
    } catch {}

    const existsLocal = usersDb.some((u) => u.mobile === loginMobile && u.role === loginRole);
    if (existsLocal) {
      setUsersDb((prev) =>
        prev.map((u) => (u.mobile === loginMobile && u.role === loginRole ? { ...u, password: resetNewPass } : u))
      );
      alert(isHi ? '✅ नया पासवर्ड सेव हो गया! अब लॉगिन करें।' : '✅ Password updated!');
      setIsForgotMode(false);
      setLoginPassword(resetNewPass);
      setResetNewPass('');
    } else {
      alert(isHi ? 'इस नंबर से कोई पुराना खाता नहीं मिला।' : 'Account not found.');
      setIsForgotMode(false);
    }
  };

  if (!authUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-lg max-w-md w-full space-y-5">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-extrabold text-slate-900">
              {isForgotMode
                ? (isHi ? '🔑 नया पासवर्ड बनाएं' : '🔑 Reset Password')
                : (isHi ? 'लॉगिन / नया खाता बनाएं' : 'Login / Create Account')}
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

          {/* CLEAN ROLE BUTTONS: मज़दूर & काम देने वाला */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setLoginRole('worker')}
              className={`py-3 rounded-2xl font-extrabold text-sm ${loginRole === 'worker' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              {isHi ? '👷 मज़दूर (Worker)' : '👷 Worker'}
            </button>
            <button
              type="button"
              onClick={() => setLoginRole('employer')}
              className={`py-3 rounded-2xl font-extrabold text-sm ${loginRole === 'employer' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              {isHi ? '🏗️ काम देने वाला' : '🏗️ Employer'}
            </button>
          </div>

          {!isForgotMode ? (
            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  {isHi ? 'आपका नाम (नए खाते के लिए)' : 'Your Name'}
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
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-600">
                    {isHi ? 'पासवर्ड डालें / नया बनाएं' : 'Password'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsForgotMode(true)}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    {isHi ? 'पासवर्ड भूल गए?' : 'Forgot Password?'}
                  </button>
                </div>
                <input
                  type="password"
                  placeholder={isHi ? 'पासवर्ड डालें' : 'Enter password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className="w-full p-3 border rounded-xl text-sm"
                />
              </div>

              <button type="submit" disabled={authLoading} className="w-full py-3.5 bg-slate-950 text-white font-extrabold rounded-2xl text-sm">
                {authLoading ? (isHi ? 'जाँच हो रही है...' : 'Checking...') : (isHi ? 'आगे बढ़ें →' : 'Continue →')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  {isHi ? 'अपना रजिस्टर्ड मोबाइल नंबर डालें' : 'Registered Mobile Number'}
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={loginMobile}
                  onChange={(e) => setLoginMobile(e.target.value)}
                  required
                  className="w-full p-3 border rounded-xl text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  {isHi ? 'नया पासवर्ड सेट करें' : 'Set New Password'}
                </label>
                <input
                  type="password"
                  placeholder={isHi ? 'नया पासवर्ड लिखें' : 'Enter new password'}
                  value={resetNewPass}
                  onChange={(e) => setResetNewPass(e.target.value)}
                  required
                  className="w-full p-3 border rounded-xl text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsForgotMode(false)} className="flex-1 py-3 bg-slate-200 text-slate-800 font-bold rounded-2xl text-xs">
                  ← {isHi ? 'वापस लॉगिन पर' : 'Back'}
                </button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-extrabold rounded-2xl text-xs">
                  {isHi ? 'पासवर्ड सेव करें' : 'Save Password'}
                </button>
              </div>
            </form>
          )}

          {/* CORNER LINK: ONLY FOR ADMIN */}
          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => setShowAdminPortal(true)}
              className="text-[11px] font-extrabold text-slate-500 hover:text-amber-600 transition flex items-center gap-1"
            >
              🛡️ Only for Admin
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('sv_auth_user');
    setAuthUser(null);
  };

  // Reusable Live Chat Component (Both Typing + Instant Voice-to-Text)
  const renderLiveChatBox = () => (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col h-[450px] shadow-sm">
      <div className="flex justify-between items-center mb-3 border-b pb-2">
        <div>
          <h3 className="font-extrabold text-base">💬 {isHi ? 'सीधी बात (Live Chat)' : 'Live Chat'}</h3>
          <p className="text-[11px] text-slate-500">
            {isHi ? 'टाइप करके लिखें या 🎙️ बोलकर तुरंत टाइप करें — दोनों तरफ लाइव दिखेगा' : 'Type or speak to type immediately'}
          </p>
        </div>
        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-extrabold">
          ● LIVE SYNC
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {messages.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-10">
            {isHi ? 'अभी कोई संदेश नहीं है। नीचे लिखें या बोलकर बात शुरू करें।' : 'No messages yet. Start chatting below!'}
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="p-3 bg-slate-50 rounded-2xl border text-sm">
              <div className="flex justify-between items-center mb-0.5">
                <b className={m.sender_role === 'employer' ? 'text-emerald-700' : 'text-blue-700'}>
                  {m.sender_name} ({m.sender_role === 'employer' ? (isHi ? 'काम देने वाला' : 'Employer') : (isHi ? 'मज़दूर' : 'Worker')})
                </b>
                <span className="text-[10px] text-slate-400">{m.timestamp}</span>
              </div>
              <p className="text-slate-800">{m.content}</p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={sendMessage} className="pt-3 flex gap-2 items-center">
        <button
          type="button"
          onClick={handleVoiceChatInput}
          title={isHi ? 'बोलकर लिखें' : 'Speak to Type'}
          className={`px-3.5 py-3 rounded-2xl font-extrabold text-xs shrink-0 ${isChatListening ? 'bg-rose-600 text-white animate-pulse' : 'bg-amber-400 text-slate-950'}`}
        >
          {isChatListening ? '🎙️ सुन रहा हूँ...' : '🎙️ बोलें'}
        </button>
        <input
          type="text"
          placeholder={isHi ? 'यहाँ लिखें या बोलकर टाइप करें...' : 'Type or speak your message...'}
          value={chatText}
          onChange={(e) => setChatText(e.target.value)}
          className="flex-1 p-3 border rounded-2xl text-sm bg-slate-50"
        />
        <button type="submit" className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl text-sm shrink-0">
          {isHi ? 'भेजें' : 'Send'}
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans">
      {announcement && (
        <div className="bg-amber-500 text-slate-950 text-xs font-extrabold py-1.5 px-4 text-center">
          📢 {announcement}
        </div>
      )}

      {/* CLEAN HEADER WITHOUT ADMIN BUTTON */}
      <header className="bg-slate-950 text-white px-5 py-4 sticky top-0 z-40 shadow">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-between items-center gap-3">
          <div>
            <h1 className="text-xl font-extrabold">श्रमवाणी (ShramVaani)</h1>
            <p className="text-xs text-emerald-400 font-mono">
              🕒 {liveTime} • {authUser.name} ({authUser.mobile})
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-200">
              {authUser.role === 'worker' ? (isHi ? '👷 मज़दूर' : '👷 Worker') : (isHi ? '🏗️ काम देने वाला' : '🏗️ Employer')}
            </span>
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
                {/* VOICE AUTO-FILL PROFILE SECTION (ANY CUSTOM WORK ALLOWED) */}
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
                        {isHi
                          ? 'आप कोई भी काम (खाना बनाना, ड्राइवर, बढ़ई, बिजली, सफाई आदि) बोलकर या लिखकर भर सकते हैं:'
                          : 'Speak or type any work/skill you do:'}
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
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        {isHi ? 'आपका काम (कोई भी काम लिखें या बोलें)' : 'Your Work / Skill (Any)'}
                      </label>
                      <input
                        type="text"
                        list="common-skills"
                        placeholder={isHi ? 'जैसे: खाना बनाना, ड्राइवर, बिजली...' : 'e.g., Cook, Driver, Electrician...'}
                        value={profileSkill}
                        onChange={(e) => setProfileSkill(e.target.value)}
                        className="w-full p-2.5 border rounded-xl bg-slate-50 text-sm font-semibold"
                      />
                      <datalist id="common-skills">
                        <option value="खाना बनाना (Cook)" />
                        <option value="ड्राइवर (Driver)" />
                        <option value="बिजली का काम (Electrician)" />
                        <option value="प्लंबर (Plumber)" />
                        <option value="राजमिस्त्री (Mason)" />
                        <option value="बढ़ई (Carpenter)" />
                        <option value="पेंटर (Painter)" />
                        <option value="सफाई कर्मचारी (Cleaner)" />
                        <option value="हेल्पर / मज़दूर (Helper)" />
                      </datalist>
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
                        {isHi ? 'सरकारी बैज पाने के लिए अपना 12-अंक का e-Shram UAN नंबर डालें:' : 'Enter 12-digit e-Shram UAN:'}
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
                        <button onClick={() => verifyIdentity('worker', uanInput)} className="px-5 py-3 bg-slate-900 text-white font-bold rounded-xl text-xs">
                          Submit for Badge
                        </button>
                      </div>
                      {kycMsg && <p className="text-xs font-bold">{kycMsg}</p>}
                    </div>
                  )}
                </div>

                {/* AVAILABLE JOBS FEED */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-xl font-extrabold">📋 {isHi ? 'उपलब्ध काम (सभी मज़दूरों के लिए)' : 'Available Jobs Feed'}</h3>
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
                                <p className="text-xs text-slate-500 mt-0.5">{isHi ? 'काम देने वाला:' : 'Employer:'} <b>{job.employer_name}</b></p>
                              </div>
                              <div className="text-right space-y-2">
                                <p className="text-xl font-extrabold text-emerald-700">₹{job.wage}/{isHi ? 'दिन' : 'day'}</p>
                                {job.status === 'OPEN' && (
                                  <button onClick={() => handleAcceptJob(job.id)} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs shadow">
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

                            {isAcceptedByMe && (
                              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl space-y-2">
                                <p className="text-xs font-extrabold text-emerald-900">
                                  🔐 {isHi ? `काम पूरा होने पर मालिक (${job.employer_name}) से 4-अंकों का OTP पूछकर यहाँ डालें:` : `Enter 4-digit OTP from Employer:`}
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
                                  <button onClick={() => handleWorkerVerifyOtp(job)} className="px-4 py-2.5 bg-emerald-600 text-white font-extrabold rounded-xl text-xs">
                                    {isHi ? 'OTP कन्फर्म करें और रसीद पाएं' : 'Confirm OTP'}
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

            {/* RECEIPTS TAB */}
            {workerTab === 'receipts' && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h2 className="text-xl font-extrabold">📦 {isHi ? 'मेरी रसीदें (Saved Receipts)' : 'My Receipts'}</h2>
                {receipts.filter((r) => r.worker_mobile === authUser.mobile).length === 0 ? (
                  <p className="text-sm text-slate-500">{isHi ? 'अभी तक कोई रसीद नहीं बनी है।' : 'No receipts yet.'}</p>
                ) : (
                  <div className="space-y-3">
                    {receipts.filter((r) => r.worker_mobile === authUser.mobile).map((rcp) => (
                      <div key={rcp.utr} onClick={() => setSelectedReceiptModal(rcp)} className="p-4 rounded-2xl border-2 border-slate-200 hover:border-blue-600 cursor-pointer flex justify-between items-center bg-slate-50/50">
                        <div>
                          <span className="font-extrabold text-sm">{rcp.job_title}</span>
                          <p className="text-xs text-slate-600">📍 {rcp.job_location} • {rcp.employer_name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{rcp.order_id} • {rcp.created_at}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-extrabold text-emerald-700">₹{rcp.net_wage}</p>
                          <span className="text-xs font-bold text-blue-600 underline">रसीद देखें →</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {selectedReceiptModal && (
                  <div className="p-5 bg-blue-50 border-2 border-blue-600 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-extrabold text-base">🧾 रसीद ({selectedReceiptModal.order_id})</h3>
                      <button onClick={() => setSelectedReceiptModal(null)} className="text-xs font-bold px-2.5 py-1 bg-white rounded-lg border">✕ बंद करें</button>
                    </div>
                    <button onClick={() => downloadReceipt(selectedReceiptModal)} className="w-full py-3 bg-slate-950 text-white font-extrabold rounded-xl text-xs">
                      ⬇️ यह रसीद डाउनलोड करें
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* MAP TAB */}
            {workerTab === 'map' && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
                <h2 className="text-xl font-extrabold">🗺️ {isHi ? 'नज़दीकी काम का असली नक्शा' : 'Live Job Map'}</h2>
                <LiveJobMap jobs={jobs} selectedJob={selectedJob} onSelectJob={setSelectedJob} />
              </div>
            )}

            {/* CHAT TAB */}
            {workerTab === 'chat' && renderLiveChatBox()}
          </div>
        )}

        {/* ==================== 2. EMPLOYER PORTAL ==================== */}
        {portal === 'employer' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setEmployerTab('jobs')}
                className={`p-3.5 rounded-2xl font-extrabold text-sm border-2 transition ${employerTab === 'jobs' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-800 border-slate-200'}`}
              >
                🏗️ {isHi ? 'काम पोस्ट करें और OTP' : 'Post Jobs & OTP'}
              </button>
              <button
                onClick={() => setEmployerTab('chat')}
                className={`p-3.5 rounded-2xl font-extrabold text-sm border-2 transition ${employerTab === 'chat' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-800 border-slate-200'}`}
              >
                💬 {isHi ? 'मज़दूर से बात करें (Chat)' : 'Chat with Worker'}
              </button>
            </div>

            {employerTab === 'chat' ? renderLiveChatBox() : (
              <>
                <div className="bg-white p-6 rounded-3xl border-2 border-blue-600 shadow-sm space-y-4">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <h2 className="text-xl font-extrabold">➕ {isHi ? 'नया काम पोस्ट करें (कोई भी काम)' : 'Post New Job'}</h2>
                    <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-emerald-100 text-emerald-800">✅ {authUser.name}</span>
                  </div>

                  <form onSubmit={handlePostNewJob} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="text" placeholder={isHi ? 'आपका नाम / कंपनी' : 'Your Name'} value={myEmployerName} onChange={(e) => setMyEmployerName(e.target.value)} className="p-3 border rounded-xl text-sm font-semibold" required />
                    <input type="text" placeholder={isHi ? 'क्या काम करवाना है? (जैसे: खाना बनाना, ड्राइवर, बिजली)' : 'Work required (any)'} value={newJobTitle} onChange={(e) => setNewJobTitle(e.target.value)} className="p-3 border rounded-xl text-sm font-semibold" required />
                    <input type="text" placeholder={isHi ? 'जगह / पता' : 'Location'} value={newJobLocation} onChange={(e) => setNewJobLocation(e.target.value)} className="p-3 border rounded-xl text-sm" required />
                    <div className="flex gap-2">
                      <input type="text" placeholder={isHi ? 'समय (Kal 9:00 AM)' : 'Time'} value={newJobShift} onChange={(e) => setNewJobShift(e.target.value)} className="flex-1 p-3 border rounded-xl text-sm" required />
                      <input type="number" placeholder="₹" value={newJobWage} onChange={(e) => setNewJobWage(e.target.value)} className="w-24 p-3 border rounded-xl text-sm font-bold" required />
                    </div>
                    <button type="submit" className="sm:col-span-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-sm">
                      🚀 {isHi ? 'काम पोस्ट करें (Publish Live Now)' : 'Publish Job'}
                    </button>
                  </form>
                  {jobPostMsg && <p className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800">{jobPostMsg}</p>}
                </div>

                {/* EMPLOYER OTP DISPLAY */}
                <div className="bg-white p-6 rounded-3xl border-2 border-emerald-500 shadow-sm space-y-4">
                  <h3 className="text-lg font-extrabold">🔐 {isHi ? 'मज़दूर द्वारा स्वीकार किए गए काम और आपका गुप्त OTP' : 'Accepted Jobs & Your Secret OTP'}</h3>
                  <div className="space-y-3">
                    {jobs.filter((j) => j.employer_mobile === authUser.mobile || j.employer_name === myEmployerName).map((job) => (
                      <div key={job.id} className="p-4 rounded-2xl border bg-slate-50 flex flex-wrap justify-between items-center gap-4">
                        <div>
                          <h4 className="font-extrabold text-base">{job.title} — ₹{job.wage}</h4>
                          <p className="text-xs text-slate-600">📍 {job.location} • Status: <b>{job.status}</b></p>
                          {job.accepted_by && <p className="text-xs font-bold text-blue-800 mt-1">👷 मज़दूर: {job.accepted_by} ({job.accepted_by_mobile})</p>}
                        </div>
                        {job.status === 'ACCEPTED' && (
                          <div className="bg-white px-5 py-3 rounded-2xl border-2 border-dashed border-emerald-600 text-center shadow-sm">
                            <p className="text-[10px] font-extrabold text-slate-500 uppercase">{isHi ? 'मज़दूर को देने वाला OTP' : 'Share OTP'}</p>
                            <p className="text-3xl font-mono font-extrabold tracking-widest text-emerald-700 my-0.5">{job.otp}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* QR ESCROW PAYMENT */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-lg font-extrabold">💳 Escrow में पेमेंट लॉक करें (UPI QR)</h3>
                  <input type="text" placeholder="आपकी अपनी UPI ID (जैसे: name@oksbi)" value={customMerchantUpi} onChange={(e) => setCustomMerchantUpi(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs font-mono" />
                  <div className="flex gap-2">
                    <input type="number" min="1" value={wageAmount} onChange={(e) => setWageAmount(e.target.value)} className="w-28 p-3 border rounded-xl font-bold text-sm" />
                    <button onClick={createOrder} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl text-xs">Generate Real UPI QR Code</button>
                  </div>
                  {paymentOrder && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-3 text-center">
                      <p className="text-xs font-extrabold text-blue-900">Order: {paymentOrder.order_id} • Pay ₹{paymentOrder.expected_amount}</p>
                      <div className="flex justify-center">
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentOrder.upi_uri)}`} alt="UPI QR" className="w-44 h-44 rounded-xl border-4 border-white shadow bg-white p-1" />
                      </div>
                      <input type="text" maxLength={12} placeholder="12-Digit UTR डालें" value={utr} onChange={(e) => setUtr(e.target.value)} className="w-full p-3 border rounded-xl bg-white font-mono text-sm text-center" />
                      <button onClick={verifyUtrAndLock} className="w-full py-3 bg-emerald-600 text-white font-extrabold rounded-xl text-sm">Verify UTR & Lock</button>
                    </div>
                  )}
                  {escrowFeedback && <div className={`p-3 rounded-xl text-xs font-bold ${escrowFeedback.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{escrowFeedback.text}</div>}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

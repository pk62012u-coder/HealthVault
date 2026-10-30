import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity, Bell, CalendarDays, ChevronDown, CircleHelp, ClipboardList, Clock3,
  FileHeart, FileText, FolderLock, HeartPulse, LayoutDashboard, LogOut, Menu,
  Pill, Plus, Search, Settings, Share2, ShieldCheck, Stethoscope, UploadCloud,
  UserRound, Users, X, Download, Trash2, CheckCircle2, AlertCircle, LockKeyhole
} from 'lucide-react';

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'records', label: 'Medical records', icon: FileHeart },
  { id: 'appointments', label: 'Appointments', icon: CalendarDays },
  { id: 'medications', label: 'Medications', icon: Pill },
  { id: 'sharing', label: 'Sharing & consent', icon: Share2 }
];

async function api(url, options = {}) {
  const opts = { credentials: 'include', ...options, headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) } };
  const response = await fetch(url, opts);
  const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}
const formatDate = value => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const formatDateTime = value => value ? new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'patient' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const data = await api(`/api/auth/${mode}`, { method: 'POST', body: JSON.stringify(form) });
      onAuth(data.user);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return <div className="auth-page">
    <div className="auth-aside">
      <div className="brand brand-light"><span className="brand-mark"><HeartPulse size={22}/></span><span>HealthVault</span></div>
      <div className="auth-copy"><span className="eyebrow">YOUR HEALTH, IN ONE PLACE</span><h1>Care starts with understanding your health.</h1><p>Keep your medical history organized, your documents close, and your care team connected — with you in control.</p>
        <div className="trust-line"><ShieldCheck size={18}/> Private by design <span>·</span> Patient controlled</div>
      </div>
      <div className="aside-bottom">A personal health record workspace</div>
    </div>
    <div className="auth-main"><div className="auth-card">
      <div className="mobile-brand brand"><span className="brand-mark"><HeartPulse size={22}/></span><span>HealthVault</span></div>
      <span className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'GET STARTED'}</span>
      <h2>{mode === 'login' ? 'Sign in to HealthVault' : 'Create your account'}</h2>
      <p className="muted">{mode === 'login' ? 'Your personal health space is ready when you are.' : 'Use a fictional account for this demonstration.'}</p>
      <form onSubmit={submit} className="form-stack">
        {mode === 'register' && <label>Full name<input required maxLength="100" value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="e.g. Alex Morgan"/></label>}
        <label>Email address<input type="email" required maxLength="254" value={form.email} onChange={e => setForm({...form, email:e.target.value})} placeholder="you@example.com"/></label>
        <label>Password<input type="password" required minLength="10" maxLength="128" value={form.password} onChange={e => setForm({...form, password:e.target.value})} placeholder="At least 10 characters"/></label>
        {mode === 'register' && <label>Account type<select value={form.role} onChange={e => setForm({...form, role:e.target.value})}><option value="patient">Patient</option><option value="clinician">Clinician (demo)</option></select><span className="field-help">For a real service, clinician identities must be verified before access is enabled.</span></label>}
        {error && <div className="alert alert-error"><AlertCircle size={16}/>{error}</div>}
        <button className="btn btn-primary btn-wide" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      </form>
      <div className="auth-switch">{mode === 'login' ? 'New to HealthVault?' : 'Already have an account?'} <button className="text-button" onClick={() => {setMode(mode === 'login' ? 'register' : 'login');setError('');}}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></div>
      <div className="demo-note"><LockKeyhole size={16}/><span>Demo project only. Do not upload real medical records.</span></div>
    </div></div>
  </div>;
}

function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [page, setPage] = useState('overview');
  const [records, setRecords] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [medications, setMedications] = useState([]);
  const [shares, setShares] = useState([]);
  const [toast, setToast] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState('');

  const notify = message => { setToast(message); window.setTimeout(() => setToast(''), 3200); };
  const loadData = useCallback(async currentUser => {
    if (!currentUser) return;
    const [r, a, m, s] = await Promise.all([
      api('/api/records'), api('/api/appointments'), api('/api/medications'),
      currentUser.role === 'patient' ? api('/api/shares') : Promise.resolve({ shares: [] })
    ]);
    setRecords(r.records || []); setAppointments(a.appointments || []); setMedications(m.medications || []); setShares(s.shares || []);
  }, []);
  useEffect(() => { api('/api/auth/me').then(d => setUser(d.user)).catch(() => {}).finally(() => setChecking(false)); }, []);
  useEffect(() => { if (user) loadData(user).catch(e => notify(e.message)); }, [user, loadData]);
  const logout = async () => { try { await api('/api/auth/logout', {method:'POST', body:JSON.stringify({})}); } finally { setUser(null); setPage('overview'); } };

  if (checking) return <div className="loading-screen"><div className="loading-mark"><HeartPulse/></div><span>Loading your health space…</span></div>;
  if (!user) return <AuthScreen onAuth={setUser}/>;

  const visibleRecords = records.filter(r => `${r.title} ${r.category} ${r.originalName || ''}`.toLowerCase().includes(search.toLowerCase()));
  const upcoming = appointments.filter(a => a.status === 'Upcoming' && new Date(a.appointmentAt) >= new Date()).sort((a,b) => new Date(a.appointmentAt)-new Date(b.appointmentAt));
  const activeMeds = medications.filter(m => m.active);

  const refresh = () => loadData(user).catch(e => notify(e.message));
  const downloadRecord = async record => {
    try {
      const response = await fetch(`/api/records/${record._id || record.id}/download`, {credentials:'include'});
      if (!response.ok) { const data = await response.json().catch(()=>({})); throw new Error(data.message || 'Could not download file'); }
      const blob = await response.blob(); const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = record.originalName || record.title; a.click(); URL.revokeObjectURL(url);
    } catch(e) { notify(e.message); }
  };

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-brand"><div className="brand-mark"><HeartPulse size={22}/></div><span>HealthVault</span><button className="icon-btn close-sidebar" onClick={()=>setSidebarOpen(false)}><X size={18}/></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="nav-list">
        {navItems.filter(n => n.id !== 'sharing' || user.role === 'patient').map(item => <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={()=>{setPage(item.id);setSidebarOpen(false);}}><item.icon size={19}/><span>{item.label}</span>{item.id === 'records' && records.length > 0 && <span className="nav-count">{records.length}</span>}</button>)}
      </nav>
      {user.role === 'clinician' && <div className="clinician-note"><Stethoscope size={18}/><div><b>Clinician portal</b><span>Only records patients share with you are visible.</span></div></div>}
      <div className="sidebar-bottom"><div className="privacy-card"><div className="privacy-icon"><ShieldCheck size={18}/></div><b>Your records, your choice</b><p>Share only what you choose, and revoke access when you need to.</p><button onClick={()=>setPage(user.role === 'patient' ? 'sharing' : 'records')}>Manage access <span>→</span></button></div><button className="nav-item" onClick={logout}><LogOut size={18}/><span>Sign out</span></button><div className="version-label">HEALTHVAULT · DEMO BUILD</div></div>
    </aside>
    {sidebarOpen && <button className="sidebar-scrim" aria-label="Close menu" onClick={()=>setSidebarOpen(false)}/>}
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="icon-btn mobile-menu" onClick={()=>setSidebarOpen(true)}><Menu/></button><div className="breadcrumb">Workspace <span>/</span> <b>{navItems.find(n=>n.id===page)?.label || 'Overview'}</b></div></div><div className="topbar-actions"><label className="global-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search records…"/><kbd>⌘ K</kbd></label><button className="icon-btn notification-btn" title="Notifications"><Bell size={19}/><i/></button><div className="top-user"><div className="avatar">{user.name.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase()}</div><div className="top-user-copy"><b>{user.name}</b><span>{user.role === 'patient' ? 'Patient account' : 'Clinician account'}</span></div><ChevronDown size={15}/></div></div></header>
      <div className="page-content">
        <div className="welcome-row"><div><div className="eyebrow">{new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})}</div><h1>{page === 'overview' ? `Good ${new Date().getHours()<12?'morning':new Date().getHours()<18?'afternoon':'evening'}, ${user.name.split(' ')[0]}` : navItems.find(n=>n.id===page)?.label || 'HealthVault'}</h1><p className="muted">{page === 'overview' ? 'Here’s your personal health overview.' : user.role === 'clinician' ? 'Records and details available to your account.' : 'Keep your health information organized in one secure place.'}</p></div>{user.role === 'patient' && <button className="btn btn-primary" onClick={()=>setModal('upload')}><Plus size={17}/> Add a record</button>}</div>
        {page === 'overview' && <Overview user={user} records={records} upcoming={upcoming} meds={activeMeds} setPage={setPage} setModal={setModal} downloadRecord={downloadRecord}/>}
        {page === 'records' && <Records user={user} records={visibleRecords} search={search} setSearch={setSearch} setModal={setModal} downloadRecord={downloadRecord} refresh={refresh} notify={notify}/>}
        {page === 'appointments' && <Appointments appointments={appointments} setModal={setModal} user={user}/>}
        {page === 'medications' && <Medications medications={medications} setModal={setModal} user={user} refresh={refresh} notify={notify}/>}
        {page === 'sharing' && user.role === 'patient' && <Sharing records={records} shares={shares} setModal={setModal} refresh={refresh} notify={notify}/>}
        <footer className="app-footer"><span>© {new Date().getFullYear()} HealthVault</span><span><ShieldCheck size={14}/> Privacy-first demo workspace</span><span>Not for emergency use or medical advice</span></footer>
      </div>
    </main>
    {modal && <Modal type={modal} onClose={()=>setModal('')} user={user} records={records} refresh={refresh} notify={notify}/>}
    {toast && <div className="toast"><CheckCircle2 size={18}/>{toast}</div>}
  </div>;
}

function Overview({user, records, upcoming, meds, setPage, setModal, downloadRecord}) {
  const stats = [
    {label:'Medical records',value:records.length,caption:'Documents in your vault',icon:FileText,color:'blue'},
    {label:'Upcoming visits',value:upcoming.length,caption:'Appointments scheduled',icon:CalendarDays,color:'purple'},
    {label:'Active medications',value:meds.length,caption:'Reminder schedules',icon:Pill,color:'teal'},
    {label:'Shared records',value:user.role === 'patient' ? 'Controlled' : 'Granted',caption:user.role === 'patient' ? 'You control access' : 'Consent-based access',icon:ShieldCheck,color:'orange'}
  ];
  return <>
    <div className="hero-card"><div className="hero-copy"><span className="hero-pill"><Activity size={14}/> YOUR HEALTH, ORGANIZED</span><h2>Your health story,<br/>all in one place.</h2><p>Keep your medical documents together and make sharing with your care team more straightforward.</p><button className="btn btn-white" onClick={()=>setPage('records')}>Explore records <span>→</span></button></div><div className="hero-art"><div className="art-circle circle-one"/><div className="art-circle circle-two"/><div className="health-card-float"><div className="float-icon"><HeartPulse size={22}/></div><div><b>Personal health vault</b><span>Organized · Private · Yours</span></div><ShieldCheck className="float-shield" size={23}/></div><div className="art-cross">+</div><div className="art-dot dot-one"/><div className="art-dot dot-two"/></div></div>
    <div className="section-heading"><div><h3>Your overview</h3><p>A snapshot of your health workspace</p></div><button className="text-button" onClick={()=>setPage('records')}>View records <span>→</span></button></div>
    <div className="stats-grid">{stats.map(s=><div className="stat-card" key={s.label}><div className={`stat-icon ${s.color}`}><s.icon size={20}/></div><span className="stat-label">{s.label}</span><strong>{s.value}</strong><span className="stat-caption">{s.caption}</span></div>)}</div>
    <div className="content-grid">
      <section className="panel timeline-panel"><div className="panel-heading"><div><h3>Recent medical records</h3><p>Your latest uploaded documents</p></div><button className="icon-btn" onClick={()=>setPage('records')}><ChevronDown size={18} className="rotate-minus"/></button></div>
        {records.length ? <div className="record-list">{records.slice(0,4).map(r=><div className="record-row" key={r._id || r.id}><div className={`file-icon ${r.category === 'Prescription'?'purple':r.category === 'Lab report'?'blue':'teal'}`}><FileText size={19}/></div><div className="record-info"><b>{r.title}</b><span>{r.category} · {formatDate(r.recordDate)}</span></div><button className="icon-btn" title="Download" onClick={()=>downloadRecord(r)}><Download size={17}/></button></div>)}</div> : <Empty icon={FileHeart} title="Your health story starts here" text="Upload a prescription or lab report to build your personal timeline." action="Add first record" onAction={()=>setPage('records')}/>}
      </section>
      <section className="panel upcoming-panel"><div className="panel-heading"><div><h3>Upcoming appointments</h3><p>Plan your next visit</p></div><button className="icon-btn" onClick={()=>setPage('appointments')}><ChevronDown size={18} className="rotate-minus"/></button></div>
        {upcoming.length ? upcoming.slice(0,3).map(a=><div className="appointment-row" key={a._id}><div className="date-tile"><b>{new Date(a.appointmentAt).getDate()}</b><span>{new Date(a.appointmentAt).toLocaleDateString(undefined,{month:'short'}).toUpperCase()}</span></div><div className="appointment-info"><b>{a.clinicianName}</b><span>{a.department} · {formatDateTime(a.appointmentAt)}</span></div><span className="status-dot"/></div>) : <Empty icon={CalendarDays} title="No visits scheduled" text="Keep track of upcoming appointments in one place." action="Add appointment" onAction={()=>setPage('appointments')}/>}
        <button className="panel-bottom-link" onClick={()=>setPage('appointments')}>View appointment history <span>→</span></button>
      </section>
    </div>
    <div className="privacy-banner"><div className="privacy-banner-icon"><ShieldCheck size={22}/></div><div><b>Your health information belongs to you</b><p>Only your account can access your private records unless you explicitly share them with a clinician.</p></div><button className="text-button" onClick={()=>setPage(user.role==='patient'?'sharing':'records')}>Review access <span>→</span></button></div>
  </>;
}

function Empty({icon:Icon,title,text,action,onAction}) {
  return <div className="empty-state"><div className="empty-icon"><Icon size={22}/></div><b>{title}</b><p>{text}</p>{action && <button className="text-button" onClick={onAction}>{action} <span>→</span></button>}</div>;
}

function Records({user, records, search, setSearch, setModal, downloadRecord, refresh, notify}) {
  const remove = async r => { if (!window.confirm(`Delete "${r.title}"? This also revokes existing shares.`)) return; try { await api(`/api/records/${r._id || r.id}`, {method:'DELETE'}); notify('Record deleted'); refresh(); } catch(e) { notify(e.message); } };
  return <div className="panel full-panel"><div className="toolbar"><div className="filter-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search your records"/></div>{user.role === 'patient' && <button className="btn btn-primary" onClick={()=>setModal('upload')}><Plus size={17}/> Upload record</button>}</div>
    <div className="table-wrap"><table><thead><tr><th>DOCUMENT</th><th>CATEGORY</th><th>RECORD DATE</th><th>FILE</th><th>ACTIONS</th></tr></thead><tbody>
      {records.map(r=><tr key={r._id || r.id}><td><div className="table-record"><div className="file-icon blue"><FileText size={18}/></div><div><b>{r.title}</b><span>Added {formatDate(r.createdAt)}</span></div></div></td><td><span className="category-pill">{r.category}</span></td><td>{formatDate(r.recordDate)}</td><td className="file-name">{r.originalName || 'Shared record'}</td><td><div className="table-actions"><button className="icon-btn" title="Download" onClick={()=>downloadRecord(r)}><Download size={17}/></button>{user.role === 'patient' && <button className="icon-btn danger-hover" title="Delete" onClick={()=>remove(r)}><Trash2 size={17}/></button>}</div></td></tr>)}
      </tbody></table>{records.length === 0 && <Empty icon={FileText} title="No records found" text={search ? 'Try a different search term.' : user.role==='patient' ? 'Upload your first document to start building your health history.' : 'Patients have not shared any records with this account.'} action={user.role==='patient'?'Upload a record':null} onAction={()=>setModal('upload')}/>}</div>
    <div className="table-foot">{records.length} record{records.length===1?'':'s'} {user.role==='clinician'?'shared with your account':'in your vault'} <span><LockKeyhole size={14}/> Private access</span></div>
  </div>;
}

function Appointments({appointments,setModal,user}) {
  return <div className="panel full-panel"><div className="panel-heading panel-heading-padded"><div><h3>Appointment history</h3><p>Past and upcoming visits in one timeline</p></div><button className="btn btn-primary" onClick={()=>setModal('appointment')}><Plus size={17}/> Add appointment</button></div>
    {appointments.length ? <div className="appointment-list">{appointments.map(a=><div className="appointment-full-row" key={a._id}><div className="appointment-symbol"><CalendarDays size={20}/></div><div className="appointment-main"><b>{a.clinicianName}</b><span>{a.department} department</span>{a.notes && <p>{a.notes}</p>}</div><div className="appointment-meta"><b>{formatDateTime(a.appointmentAt)}</b><span className={`status-pill ${a.status.toLowerCase()}`}>{a.status}</span></div></div>)}</div> : <Empty icon={CalendarDays} title="No appointments yet" text="Add a visit to keep your care history organized." action="Add appointment" onAction={()=>setModal('appointment')}/>}
  </div>;
}

function Medications({medications,setModal,user,refresh,notify}) {
  const toggle = async med => { try { await api(`/api/medications/${med._id}`, {method:'PATCH',body:JSON.stringify({active:!med.active})}); refresh(); notify(med.active?'Reminder paused':'Reminder activated'); } catch(e) {notify(e.message);} };
  return <div className="panel full-panel"><div className="panel-heading panel-heading-padded"><div><h3>Medication reminders</h3><p>Organize reminders based on your prescribed schedule</p></div><button className="btn btn-primary" onClick={()=>setModal('medication')}><Plus size={17}/> Add reminder</button></div>
    <div className="reminder-disclaimer"><Bell size={17}/><span>HealthVault reminders are organizational aids and do not confirm that a medication was taken. Follow your clinician's instructions.</span></div>
    {medications.length ? <div className="med-list">{medications.map(m=><div className={`med-row ${!m.active?'inactive':''}`} key={m._id}><div className="med-symbol"><Pill size={20}/></div><div className="med-main"><b>{m.name}</b><span>{m.instructions || 'No instructions added'}</span></div><div className="med-time"><Clock3 size={16}/>{m.reminderTime}</div><button className={`toggle ${m.active?'on':''}`} aria-label={m.active?'Pause reminder':'Activate reminder'} onClick={()=>toggle(m)}><span/></button></div>)}</div> : <Empty icon={Pill} title="No reminders yet" text="Add a reminder schedule based on your existing prescription." action="Add reminder" onAction={()=>setModal('medication')}/>}
  </div>;
}

function Sharing({records,shares,setModal,refresh,notify}) {
  const revoke = async s => { if (!window.confirm('Revoke this clinician’s access to this record?')) return; try { await api(`/api/shares/${s.id}`,{method:'DELETE'}); refresh(); notify('Access revoked'); } catch(e) {notify(e.message);} };
  return <div className="sharing-layout"><div className="panel share-intro"><div className="share-illustration"><ShieldCheck size={34}/></div><h3>You decide who sees your records.</h3><p>Grant a registered clinician access to one specific record. You can revoke that permission at any time.</p><button className="btn btn-primary" onClick={()=>setModal('share')}><Share2 size={17}/> Share a record</button><div className="share-rules"><div><CheckCircle2 size={16}/> Per-record consent</div><div><CheckCircle2 size={16}/> Access can be revoked</div><div><CheckCircle2 size={16}/> No public document links</div></div></div>
    <div className="panel share-list-panel"><div className="panel-heading"><div><h3>Active permissions</h3><p>Records currently shared with clinicians</p></div><span className="count-badge">{shares.length}</span></div>
      {shares.length ? shares.map(s=><div className="share-row" key={s.id}><div className="share-avatar"><Stethoscope size={19}/></div><div className="share-info"><b>{s.clinician?.name || 'Clinician'}</b><span>{s.clinician?.email}</span><small>{s.record?.title || 'Record unavailable'} · Granted {formatDate(s.grantedAt)}</small></div><button className="revoke-button" onClick={()=>revoke(s)}>Revoke</button></div>) : <Empty icon={Users} title="No active shares" text="Records you choose to share will appear here."/>}
    </div></div>;
}

function Modal({type,onClose,user,records,refresh,notify}) {
  const [form,setForm] = useState({title:'',category:'Lab report',recordDate:new Date().toISOString().slice(0,10),clinicianName:'',department:'General',appointmentAt:'',name:'',instructions:'',reminderTime:'09:00',clinicianEmail:'',recordId:''});
  const [file,setFile] = useState(null); const [error,setError] = useState(''); const [busy,setBusy] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const submit = async e => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if(type==='upload') {
        if(!file) throw new Error('Choose a file first.');
        const body = new FormData(); body.append('file',file); body.append('title',form.title); body.append('category',form.category); body.append('recordDate',form.recordDate);
        await api('/api/records',{method:'POST',body});
      } else if(type==='appointment') await api('/api/appointments',{method:'POST',body:JSON.stringify(form)});
      else if(type==='medication') await api('/api/medications',{method:'POST',body:JSON.stringify(form)});
      else if(type==='share') await api('/api/shares',{method:'POST',body:JSON.stringify(form)});
      await refresh(); notify(type==='share'?'Record shared with clinician':type==='upload'?'Record uploaded securely':type==='appointment'?'Appointment added':'Reminder added'); onClose();
    } catch(e) { setError(e.message); } finally { setBusy(false); }
  };
  const title = {upload:'Upload a medical record',appointment:'Add an appointment',medication:'Add medication reminder',share:'Share a record'}[type];
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div className="modal-card"><div className="modal-heading"><div><span className="eyebrow">HEALTHVAULT</span><h2>{title}</h2></div><button className="icon-btn" onClick={onClose}><X size={20}/></button></div>
    <form className="form-stack modal-form" onSubmit={submit}>
      {type==='upload' && <><label>Record title<input required maxLength="120" value={form.title} onChange={e=>set('title',e.target.value)} placeholder="e.g. Annual blood test"/></label><div className="two-fields"><label>Category<select value={form.category} onChange={e=>set('category',e.target.value)}>{['Lab report','Prescription','Medical history','Imaging','Other'].map(x=><option key={x}>{x}</option>)}</select></label><label>Record date<input type="date" value={form.recordDate} onChange={e=>set('recordDate',e.target.value)}/></label></div><label className="upload-drop"><UploadCloud size={25}/><b>{file ? file.name : 'Choose a document'}</b><span>PDF, JPG, PNG or WEBP · up to 10 MB</span><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0] || null)}/></label></>}
      {type==='appointment' && <><label>Clinician / hospital name<input required maxLength="100" value={form.clinicianName} onChange={e=>set('clinicianName',e.target.value)} placeholder="e.g. Dr. Taylor (demo)"/></label><label>Department<input maxLength="100" value={form.department} onChange={e=>set('department',e.target.value)} placeholder="e.g. General medicine"/></label><label>Date and time<input required type="datetime-local" value={form.appointmentAt} onChange={e=>set('appointmentAt',e.target.value)}/></label></>}
      {type==='medication' && <><label>Medication name<input required maxLength="120" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Name as written on your prescription"/></label><label>Reminder instructions<input maxLength="300" value={form.instructions} onChange={e=>set('instructions',e.target.value)} placeholder="Optional note from your prescription"/></label><label>Reminder time<input required type="time" value={form.reminderTime} onChange={e=>set('reminderTime',e.target.value)}/></label></>}
      {type==='share' && <><div className="consent-warning"><ShieldCheck size={20}/><span>Only share records with a clinician you know. This grants access to the selected record until you revoke it.</span></div><label>Clinician account email<input required type="email" value={form.clinicianEmail} onChange={e=>set('clinicianEmail',e.target.value)} placeholder="clinician@example.com"/></label><label>Select record<select required value={form.recordId} onChange={e=>set('recordId',e.target.value)}><option value="">Choose a record…</option>{records.map(r=><option key={r._id || r.id} value={r._id || r.id}>{r.title} · {r.category}</option>)}</select></label>{records.length===0 && <span className="field-help">Upload a record before sharing.</span>}</>}
      {error && <div className="alert alert-error"><AlertCircle size={16}/>{error}</div>}
      <div className="modal-actions"><button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy || (type==='share' && records.length===0)}>{busy?'Saving…':type==='share'?'Grant access':type==='upload'?'Upload record':'Save'}</button></div>
    </form>
  </div></div>;
}

export default App;


import React, { useMemo, useState } from "react";
import { Activity, BarChart3, Bell, CalendarDays, Camera, Filter, HeartPulse, Pill, ScanLine, ShieldCheck, UserRound, Users } from "lucide-react";

const initialProfile = { name:"", dob:"", weight:"", height:"", medications:[{name:"",frequency:"Once daily"}], bpFrequency:"Daily", sugarFrequency:"Daily" };
const initialRecords = [
  { id:1, type:"BP", value:"130/85 mmHg", date:"2026-04-12", time:"08:00" },
  { id:2, type:"Sugar", value:"145 mg/dL", date:"2026-04-12", time:"08:05" },
  { id:3, type:"BP", value:"128/82 mmHg", date:"2026-04-11", time:"08:10" },
  { id:4, type:"Sugar", value:"138 mg/dL", date:"2026-04-11", time:"08:15" },
];
const users = [
  { id:1, name:"Sajjad", email:"sajjad@example.com", role:"Owner" },
  { id:2, name:"Family Member", email:"family@example.com", role:"Member" },
];
const upcoming = [
  { label:"Take medication", time:"8:00 AM" },
  { label:"Check blood pressure", time:"9:00 AM" },
  { label:"Check blood sugar", time:"9:15 AM" },
];

function Card({ title, children }) {
  return <section className="card">{title ? <div className="card-header">{title}</div> : null}<div className="card-body">{children}</div></section>;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState("record");
  const [loginData, setLoginData] = useState({ email:"", password:"" });
  const [profile, setProfile] = useState(initialProfile);
  const [records, setRecords] = useState(initialRecords);
  const [historyFilter, setHistoryFilter] = useState("All");
  const [bpSystolic, setBpSystolic] = useState("");
  const [bpDiastolic, setBpDiastolic] = useState("");
  const [sugar, setSugar] = useState("");
  const [ocrMode, setOcrMode] = useState("BP");
  const [ocrPreview, setOcrPreview] = useState(null);
  const [ocrRawText, setOcrRawText] = useState("");
  const [ocrDetected, setOcrDetected] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("1");

  const filteredHistory = useMemo(() => historyFilter === "All" ? records : records.filter(r => r.type === historyFilter), [records, historyFilter]);
  const bpTrend = useMemo(() => records.filter(r => r.type === "BP").slice(0, 6).reverse().map(r => { const [sys, dia] = r.value.split(" ")[0].split("/").map(Number); return { label: r.date.slice(5), systolic: sys, diastolic: dia }; }), [records]);
  const sugarTrend = useMemo(() => records.filter(r => r.type === "Sugar").slice(0, 6).reverse().map(r => ({ label: r.date.slice(5), value: Number(r.value.split(" ")[0]) })), [records]);

  const addMedication = () => setProfile(prev => ({ ...prev, medications: [...prev.medications, { name:"", frequency:"Once daily" }] }));
  const updateMedication = (index, field, value) => setProfile(prev => ({ ...prev, medications: prev.medications.map((m,i)=> i===index ? { ...m, [field]:value } : m) }));

  const saveBP = () => {
    if (!bpSystolic || !bpDiastolic) return;
    const now = new Date();
    setRecords(prev => [{ id:Date.now(), type:"BP", value:`${bpSystolic}/${bpDiastolic} mmHg`, date:now.toISOString().slice(0,10), time:now.toTimeString().slice(0,5) }, ...prev]);
    setBpSystolic(""); setBpDiastolic("");
  };
  const saveSugar = () => {
    if (!sugar) return;
    const now = new Date();
    setRecords(prev => [{ id:Date.now(), type:"Sugar", value:`${sugar} mg/dL`, date:now.toISOString().slice(0,10), time:now.toTimeString().slice(0,5) }, ...prev]);
    setSugar("");
  };

  const parseBloodPressureText = (text) => {
    const cleaned = text.replace(/\s+/g, " ").trim();
    const slashMatch = cleaned.match(/(\d{2,3})\s*[\/\\]\s*(\d{2,3})/);
    if (slashMatch) return { primary: slashMatch[1], secondary: slashMatch[2], confidence: "Parsed" };
    const pairMatch = cleaned.match(/\bSYS\D*(\d{2,3}).*?DIA\D*(\d{2,3})\b/i) || cleaned.match(/\b(\d{2,3})\b.*?\b(\d{2,3})\b/);
    if (pairMatch) return { primary: pairMatch[1], secondary: pairMatch[2], confidence: "Parsed" };
    return null;
  };
  const parseBloodSugarText = (text) => {
    const cleaned = text.replace(/\s+/g, " ").trim();
    const match = cleaned.match(/\b(\d{2,3}(?:\.\d)?)\b/);
    return match ? { primary: match[1], confidence: "Parsed" } : null;
  };
  const parseOCRText = () => {
    if (!ocrRawText.trim()) return;
    setOcrDetected(ocrMode === "BP" ? parseBloodPressureText(ocrRawText) : parseBloodSugarText(ocrRawText));
  };
  const runMockOCR = () => {
  const runMock = () => {
    setIsScanning(true);
    setTimeout(() => {
      if (ocrMode === "BP") {
        setOcrPreview("bp-monitor-sample");
        setOcrRawText("SYS 126 DIA 82 PUL 71");
        setOcrDetected({ primary:"126", secondary:"82", confidence:"96%" });
      } else {
        setOcrPreview("glucometer-sample");
        setOcrRawText("Glucose 142 mg/dL");
        setOcrDetected({ primary:"142", confidence:"94%" });
      }
      setIsScanning(false);
    }, 700);
  };
  const applyOCRResult = () => {
    if (!ocrDetected) return;
    if (ocrMode === "BP") { setBpSystolic(ocrDetected.primary); setBpDiastolic(ocrDetected.secondary || ""); }
    else { setSugar(ocrDetected.primary); }
  };

  if (!isLoggedIn) return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <img src="/logo.png" alt="SIZA logo" className="logo-large" />
          <h1>SIZA</h1><p>Health Tracker</p>
        </div>
        <div className="form-stack">
          <label><span>Email</span><input value={loginData.email} onChange={(e)=>setLoginData({ ...loginData, email:e.target.value })} /></label>
          <label><span>Password</span><input type="password" value={loginData.password} onChange={(e)=>setLoginData({ ...loginData, password:e.target.value })} /></label>
          <button className="btn btn-primary btn-block" onClick={()=>setIsLoggedIn(true)}>Login</button>
          <p className="muted center">Testing version — multi-user auth will be connected next.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      <div className="top-grid">
        <Card>
          <div className="brand-row">
            <div className="logo-box"><img src="/logo.png" alt="logo" /></div>
            <div><h1 className="brand-title">SIZA</h1><p className="brand-subtitle">Health Tracker</p></div>
          </div>
        </Card>
        <Card>
          <div className="mini-stats">
            <div><p className="label">Today's Blood Pressure</p><p className="value">130/85 mmHg</p></div>
            <div><p className="label">Today's Blood Sugar</p><p className="value">145 mg/dL</p></div>
            <div className="next-reminder"><p className="label danger">Next Reminder</p><p className="value danger-text">8:00 AM · Take medication</p></div>
          </div>
        </Card>
      </div>

      <div className="tabs-bar">
        {["dashboard","profile","record","history","trends","medications"].map(tab => (
          <button key={tab} className={`tab-btn ${activeTab===tab ? "active" : ""}`} onClick={()=>setActiveTab(tab)}>{tab[0].toUpperCase()+tab.slice(1)}</button>
        ))}
      </div>

      {activeTab === "record" && (
        <div className="grid-2">
          <Card title={<div className="card-title-row"><HeartPulse size={18} color="#dc2626" /><span>Add Record</span></div>}>
            <div className="toggle-row">
              <button className={`seg-btn ${ocrMode==="BP" ? "active" : ""}`} onClick={()=>setOcrMode("BP")}>Blood Pressure</button>
              <button className={`seg-btn ${ocrMode==="Sugar" ? "active" : ""}`} onClick={()=>setOcrMode("Sugar")}>Blood Sugar</button>
            </div>
            {ocrMode === "BP" ? (
              <>
                <div className="form-grid two">
                  <label><span>Systolic</span><input value={bpSystolic} onChange={(e)=>setBpSystolic(e.target.value)} /></label>
                  <label><span>Diastolic</span><input value={bpDiastolic} onChange={(e)=>setBpDiastolic(e.target.value)} /></label>
                </div>
                <div className="row">
                  <button className="btn btn-primary" onClick={saveBP}>Save BP</button>
                  <button className="btn btn-outline" onClick={()=>{ setOcrMode("BP"); setOcrPreview(null); setOcrRawText(""); setOcrDetected(null); }}><Camera size={16} /> Scan via Camera</button>
                </div>
              </>
            ) : (
              <>
                <label><span>Blood Sugar</span><input value={sugar} onChange={(e)=>setSugar(e.target.value)} placeholder="mg/dL" /></label>
                <div className="row">
                  <button className="btn btn-primary" onClick={saveSugar}>Save Sugar</button>
                  <button className="btn btn-outline" onClick={()=>{ setOcrMode("Sugar"); setOcrPreview(null); setOcrRawText(""); setOcrDetected(null); }}><Camera size={16} /> Scan via Camera</button>
                </div>
              </>
            )}
          </Card>

          <Card title={<div className="card-title-row"><ScanLine size={18} color="#dc2626" /><span>Camera Scan / OCR Flow</span></div>}>
            <div className="row">
              <button className={`btn ${ocrMode==="BP" ? "btn-primary" : "btn-outline"}`} onClick={()=>setOcrMode("BP")}>Scan BP Machine</button>
              <button className={`btn ${ocrMode==="Sugar" ? "btn-primary" : "btn-outline"}`} onClick={()=>setOcrMode("Sugar")}>Scan Glucometer</button>
            </div>
            <div className="scan-preview">
              {isScanning ? <div><strong>Scanning device screen...</strong><p className="muted">Running OCR detection</p></div> :
               ocrPreview ? <div><strong>Preview loaded</strong><p className="muted">{ocrPreview}</p><p className="tiny">Camera/live preview will connect here in the native build stage</p></div> :
               <div><strong>Point camera at device screen</strong><p className="muted">OCR will detect the reading automatically</p></div>}
            </div>
            <div className="row">
              <button className="btn btn-primary" onClick={runMock}><ScanLine size={16} /> Run OCR Detection</button>
              <button className="btn btn-outline" onClick={applyOCRResult}>Apply Detected Values</button>
            </div>
            <label><span>OCR Raw Text (parser input)</span><input value={ocrRawText} onChange={(e)=>setOcrRawText(e.target.value)} placeholder={ocrMode === "BP" ? "e.g. SYS 126 DIA 82" : "e.g. Glucose 142 mg/dL"} /></label>
            <div className="row"><button className="btn btn-outline" onClick={parseOCRText}>Parse OCR Text</button><span className="tiny muted">Ready for real OCR engine wiring</span></div>
            <div className="result-box">
              <strong>Detected Result</strong>
              {ocrDetected ? (
                <div className="stack-sm">
                  {ocrMode === "BP" ? (
                    <>
                      <div className="list-row"><span className="muted">Systolic</span><strong>{ocrDetected.primary}</strong></div>
                      <div className="list-row"><span className="muted">Diastolic</span><strong>{ocrDetected.secondary}</strong></div>
                    </>
                  ) : <div className="list-row"><span className="muted">Blood Sugar</span><strong>{ocrDetected.primary} mg/dL</strong></div>}
                  <div className="list-row"><span className="muted">Confidence</span><strong className="green">{ocrDetected.confidence}</strong></div>
                </div>
              ) : <p className="muted small">No OCR result yet. Capture or preview a device screen, then run detection.</p>}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "history" && (
        <Card title={<div className="card-title-row"><BarChart3 size={18} color="#dc2626" /><span>History</span></div>}>
          <div className="row wrap">
            <button className={`btn ${historyFilter==="All" ? "btn-primary" : "btn-outline"}`} onClick={()=>setHistoryFilter("All")}><Filter size={16} /> All</button>
            <button className={`btn ${historyFilter==="BP" ? "btn-primary" : "btn-outline"}`} onClick={()=>setHistoryFilter("BP")}>BP</button>
            <button className={`btn ${historyFilter==="Sugar" ? "btn-primary" : "btn-outline"}`} onClick={()=>setHistoryFilter("Sugar")}>Sugar</button>
          </div>
          <div className="table-wrap">
            <table><thead><tr><th>Date</th><th>Time</th><th>Type</th><th>Value</th></tr></thead>
              <tbody>{filteredHistory.map(row => <tr key={row.id}><td>{row.date}</td><td>{row.time}</td><td>{row.type}</td><td><strong>{row.value}</strong></td></tr>)}</tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === "trends" && (
        <div className="grid-2">
          <Card title={<div className="card-title-row"><HeartPulse size={18} color="#dc2626" /><span>Blood Pressure Trends</span></div>}>
            <div className="chart-box">
              <div className="chart-head"><span className="muted small">Latest 6 records</span><span className="muted small">Date-wise view</span></div>
              <div className="stack-sm">{bpTrend.map((item,i)=><div key={i}><div className="list-row"><span>{item.label}</span><span className="muted">{item.systolic}/{item.diastolic}</span></div><div className="bar-bg"><div className="bar bar-red" style={{width:`${Math.min(item.systolic/2,100)}%`}} /></div><div className="bar-bg"><div className="bar bar-pink" style={{width:`${Math.min(item.diastolic/1.5,100)}%`}} /></div></div>)}</div>
            </div>
          </Card>
          <Card title={<div className="card-title-row"><Activity size={18} color="#dc2626" /><span>Blood Sugar Trends</span></div>}>
            <div className="chart-box">
              <div className="chart-head"><span className="muted small">Latest 6 records</span><span className="muted small">Date-wise view</span></div>
              <div className="stack-sm">{sugarTrend.map((item,i)=><div key={i}><div className="list-row"><span>{item.label}</span><span className="muted">{item.value} mg/dL</span></div><div className="bar-bg"><div className="bar bar-red" style={{width:`${Math.min(item.value/2,100)}%`}} /></div></div>)}</div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "profile" && (
        <Card title={<div className="card-title-row"><UserRound size={18} color="#dc2626" /><span>User Registration</span></div>}>
          <div className="form-grid four">
            <label><span>Name</span><input value={profile.name} onChange={(e)=>setProfile({...profile,name:e.target.value})} /></label>
            <label><span>Date of Birth</span><input type="date" value={profile.dob} onChange={(e)=>setProfile({...profile,dob:e.target.value})} /></label>
            <label><span>Weight</span><input value={profile.weight} onChange={(e)=>setProfile({...profile,weight:e.target.value})} placeholder="kg" /></label>
            <label><span>Height</span><input value={profile.height} onChange={(e)=>setProfile({...profile,height:e.target.value})} placeholder="cm" /></label>
          </div>
          <div className="form-grid two">
            <label><span>Blood Pressure Recording Frequency</span><select value={profile.bpFrequency} onChange={(e)=>setProfile({...profile,bpFrequency:e.target.value})}><option>Daily</option><option>Twice Daily</option><option>Weekly</option></select></label>
            <label><span>Blood Sugar Recording Frequency</span><select value={profile.sugarFrequency} onChange={(e)=>setProfile({...profile,sugarFrequency:e.target.value})}><option>Daily</option><option>Twice Daily</option><option>Weekly</option></select></label>
          </div>
          <div className="section-head"><strong>Current Medications</strong><button className="btn btn-outline" onClick={addMedication}>Add Medication</button></div>
          <div className="stack-sm">{profile.medications.map((med,index)=><div key={index} className="form-grid two"><input placeholder="Medication name" value={med.name} onChange={(e)=>updateMedication(index,"name",e.target.value)} /><select value={med.frequency} onChange={(e)=>updateMedication(index,"frequency",e.target.value)}><option>Once daily</option><option>Twice daily</option><option>Three times daily</option><option>Weekly</option></select></div>)}</div>
          <div className="section-actions"><button className="btn btn-primary">Save Profile</button></div>
        </Card>
      )}

      {activeTab === "medications" && (
        <div className="grid-2">
          <Card title={<div className="card-title-row"><Pill size={18} color="#dc2626" /><span>Medications</span></div>}>
            <div className="stack-sm">
              {profile.medications.map((med,index)=><div key={index} className="list-row"><div><strong>{med.name || "Medication name"}</strong><p className="muted small">{med.frequency}</p></div><span className="badge-light">Reminder On</span></div>)}
            </div>
            <div className="section-actions"><button className="btn btn-primary" onClick={addMedication}>Add Medication</button></div>
          </Card>
          <Card title={<div className="card-title-row"><Users size={18} color="#dc2626" /><span>Multi-user Login + Storage</span></div>}>
            <div className="soft-card"><p className="label">Current active profile</p><select value={selectedUserId} onChange={(e)=>setSelectedUserId(e.target.value)}>{users.map(user => <option key={user.id} value={String(user.id)}>{user.name} · {user.role}</option>)}</select></div>
            <div className="stack-sm">{users.map(user => <div key={user.id} className="list-row"><div><strong>{user.name}</strong><p className="muted small">{user.email}</p></div><span className="badge-light">{user.role}</span></div>)}</div>
            <div className="soft-card dashed"><div className="row"><ShieldCheck size={18} color="#dc2626" /><strong>Planned next build</strong></div><p className="muted small">Real authentication and cloud storage using Firebase Auth + Firestore so each user can securely access their own records on one device or across multiple devices.</p></div>
          </Card>
        </div>
      )}
    </div>
  );
}

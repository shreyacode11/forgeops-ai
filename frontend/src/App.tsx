import { useEffect, useState } from 'react'
import {
  Activity, Bot, LayoutDashboard, ShieldCheck, ClipboardList, Settings,
  Search, Bell, ArrowUpRight, ArrowDownRight, Server, Clock3, Check,
  X, Send, Sparkles, Menu, RefreshCw, CircleAlert, CheckCircle2, BookOpen,
  Terminal, ChevronRight, Zap
} from 'lucide-react'

const API = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')
type Service = { name: string; status: string; latency_ms: number; error_rate: number; region: string }
type Approval = { id: number; action: string; service: string; reason: string; status: string; requested_by: string; decided_by?: string }
type Incident = { id: number; title: string; service: string; severity: string; status: string; description: string }
type Log = { id: number; actor: string; event: string; detail: string; created_at: string }
type ChatResult = { answer: string; provider: string; tools_used: string[]; runbooks: {title:string;text:string}[]; approval_id: number }

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) }
  })
  if (!res.ok) throw new Error((await res.text()) || `Request failed: ${res.status}`)
  return res.json()
}

export default function App() {
  const [page, setPage] = useState('Overview')
  const [services, setServices] = useState<Service[]>([])
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [stats, setStats] = useState({incident_count:0,pending_approvals:0,availability:'99.92%',open_incidents:0})
  const [message, setMessage] = useState('Investigate payment service latency and recommend a safe next step.')
  const [chat, setChat] = useState<ChatResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [mobileNav, setMobileNav] = useState(false)

  async function refresh() {
    try {
      const [d, a, i, l] = await Promise.all([
        request('/api/dashboard'), request('/api/approvals'), request('/api/incidents'), request('/api/audit-logs')
      ])
      setServices(d.services); setStats(d); setApprovals(a); setIncidents(i); setLogs(l); setError('')
    } catch (e) { setError(`Cannot reach API at ${API}. Start the backend and check VITE_API_URL.`) }
  }
  useEffect(() => { refresh(); const timer = setInterval(refresh, 12000); return () => clearInterval(timer) }, [])

  async function ask() {
    if (message.trim().length < 2) return
    setBusy(true); setError(''); setChat(null)
    try {
      const result = await request('/api/assistant/chat', {method:'POST', body:JSON.stringify({message})})
      setChat(result); setToast('Investigation completed · approval request created'); await refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Assistant request failed') }
    finally { setBusy(false) }
  }
  async function decide(id:number, decision:'approve'|'reject') {
    try {
      const result = await request(`/api/approvals/${id}/${decision}`, {method:'POST',body:JSON.stringify({decided_by:'Demo Engineer'})})
      setToast(result.message); await refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update approval') }
  }

  const nav = [
    {name:'Overview',icon:LayoutDashboard},
    {name:'AI Assistant',icon:Bot},
    {name:'Approvals',icon:ShieldCheck,badge:stats.pending_approvals},
    {name:'Incidents',icon:CircleAlert},
    {name:'Audit Log',icon:ClipboardList}
  ]
  const title = page === 'Overview' ? 'Operations overview' : page
  const healthy = services.filter(s=>s.status==='healthy').length

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav?'open':''}`}>
      <div className="brand"><div className="brand-mark"><Zap size={19}/></div><div><b>forgeops<span>.ai</span></b><small>ENGINEERING OPERATIONS</small></div></div>
      <div className="workspace"><div className="workspace-dot"/> Platform Engineering <ChevronRight size={14}/></div>
      <div className="nav-label">WORKSPACE</div>
      <nav>{nav.map(item=><button key={item.name} className={`nav-item ${page===item.name?'active':''}`} onClick={()=>{setPage(item.name);setMobileNav(false)}}><item.icon size={17}/><span>{item.name}</span>{item.badge ? <em>{item.badge}</em>:null}</button>)}</nav>
      <div className="sidebar-bottom"><div className="nav-label">SYSTEM</div><button className="nav-item"><Settings size={17}/><span>Settings</span></button><div className="user-card"><div className="avatar">DE</div><div><b>Demo Engineer</b><small>Platform team</small></div><span className="online-dot"/></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="mobile-menu icon-btn" onClick={()=>setMobileNav(!mobileNav)}><Menu size={19}/></button><div className="crumb">ForgeOps <span>/</span> <b>{title}</b></div><div className="top-actions"><div className="live"><i/> ALL SYSTEMS MONITORED</div><button className="icon-btn" onClick={refresh} title="Refresh"><RefreshCw size={17}/></button><button className="icon-btn" title="Notifications"><Bell size={17}/></button><div className="top-avatar">DE</div></div></header>
      <div className="content">
        {error && <div className="error-banner"><CircleAlert size={16}/>{error}</div>}
        {toast && <div className="toast" onClick={()=>setToast('')}><CheckCircle2 size={16}/>{toast}<X size={14}/></div>}
        {page==='Overview' && <Overview services={services} stats={stats} approvals={approvals} incidents={incidents} setPage={setPage}/>}
        {page==='AI Assistant' && <Assistant message={message} setMessage={setMessage} busy={busy} ask={ask} chat={chat} setPage={setPage}/>}
        {page==='Approvals' && <Approvals approvals={approvals} decide={decide}/>}
        {page==='Incidents' && <Incidents incidents={incidents} refresh={refresh}/>}
        {page==='Audit Log' && <Audit logs={logs}/>}
        <footer>FORGEOPS AI <span>·</span> HUMAN-SUPERVISED OPERATIONS <span>·</span> DEMO ENVIRONMENT</footer>
      </div>
    </main>
  </div>
}

function PageHeading({eyebrow,title,desc,action}:{eyebrow:string,title:string,desc:string,action?:React.ReactNode}) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{desc}</p></div>{action}</div>
}
function Overview({services,stats,approvals,incidents,setPage}:{services:Service[],stats:any,approvals:Approval[],incidents:Incident[],setPage:(p:string)=>void}) {
  return <>
    <PageHeading eyebrow="TUESDAY, NOVEMBER 24 · PLATFORM ENGINEERING" title="Good evening, Engineer" desc="Here's what's happening across your simulated infrastructure." action={<button className="primary-btn" onClick={()=>setPage('AI Assistant')}><Sparkles size={16}/> Ask ForgeOps AI</button>}/>
    <div className="stat-grid">
      <Stat icon={<Server/>} label="Monitored services" value={`${services.length}`} note="Across 1 region" trend="All connected" good/>
      <Stat icon={<Activity/>} label="Service availability" value={stats.availability} note="Rolling 30-day demo metric" trend="+0.04%" good/>
      <Stat icon={<CircleAlert/>} label="Open incidents" value={`${stats.open_incidents}`} note="Requires investigation" trend={stats.open_incidents?'Needs attention':'No active incidents'} good={!stats.open_incidents}/>
      <Stat icon={<ShieldCheck/>} label="Pending approvals" value={`${stats.pending_approvals}`} note="Human review required" trend="Review queue" good={!stats.pending_approvals}/>
    </div>
    <div className="section-row"><div><h2>Service health</h2><p>Live status from the simulated service inventory</p></div><button className="text-btn" onClick={()=>setPage('Incidents')}>View incidents <ArrowUpRight size={15}/></button></div>
    <div className="service-grid">{services.map(s=><div className="service-card" key={s.name}><div className="service-top"><div className="service-icon"><Server size={17}/></div><Status status={s.status}/></div><h3>{s.name}</h3><p>{s.region}</p><div className="service-metrics"><div><small>LATENCY</small><b>{s.latency_ms.toLocaleString()} <small>ms</small></b></div><div><small>ERROR RATE</small><b>{s.error_rate}%</b></div></div><div className="meter"><i style={{width:`${Math.min(s.error_rate*8,100)}%`}}/></div></div>)}</div>
    <div className="two-col">
      <section className="panel"><div className="panel-head"><div><h2>Approval queue</h2><p>AI-proposed actions awaiting review</p></div><button className="text-btn" onClick={()=>setPage('Approvals')}>View all <ArrowUpRight size={14}/></button></div>
        {approvals.filter(a=>a.status==='pending').slice(0,3).length ? approvals.filter(a=>a.status==='pending').slice(0,3).map(a=><div className="list-row" key={a.id}><div className="list-icon amber"><ShieldCheck size={17}/></div><div className="list-main"><b>{a.action}</b><small>{a.service} · Requested by {a.requested_by}</small></div><Status status="pending"/></div>):<Empty text="No pending approvals. You're all caught up."/>}
      </section>
      <section className="panel"><div className="panel-head"><div><h2>Recent incidents</h2><p>Latest operational events</p></div><button className="text-btn" onClick={()=>setPage('Incidents')}>View all <ArrowUpRight size={14}/></button></div>
        {incidents.slice(0,3).length ? incidents.slice(0,3).map(i=><div className="list-row" key={i.id}><div className="list-icon red"><CircleAlert size={17}/></div><div className="list-main"><b>{i.title}</b><small>{i.service} · {i.severity} severity</small></div><Status status={i.status}/></div>):<Empty text="No incidents recorded yet."/>}
      </section>
    </div>
  </>
}
function Stat({icon,label,value,note,trend,good}:{icon:React.ReactNode,label:string,value:string,note:string,trend:string,good:boolean}) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><div className="stat-icon">{icon}</div></div><strong>{value}</strong><div className="stat-foot"><span>{note}</span><em className={good?'good':'bad'}>{good?<ArrowUpRight size={12}/>:<ArrowDownRight size={12}/>} {trend}</em></div></div>
}
function Status({status}:{status:string}) {
  const s=status.toLowerCase()
  return <span className={`status ${s}` }><i/>{status}</span>
}
function Empty({text}:{text:string}) { return <div className="empty"><CheckCircle2 size={19}/>{text}</div> }

function Assistant({message,setMessage,busy,ask,chat,setPage}:{message:string,setMessage:(s:string)=>void,busy:boolean,ask:()=>void,chat:ChatResult|null,setPage:(p:string)=>void}) {
  return <>
    <PageHeading eyebrow="AI OPERATIONS COPILOT" title="Ask ForgeOps AI" desc="Investigate incidents, search runbooks, and get recommendations with human oversight."/>
    <div className="assistant-layout">
      <section className="panel assistant-panel"><div className="assistant-intro"><div className="ai-orb"><Bot size={24}/></div><div><h2>Operations assistant</h2><p>Grounded in simulated service telemetry and operational runbooks.</p></div><span className="powered">GEMINI-READY</span></div>
        <div className="prompt-label">YOUR REQUEST</div><textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Describe an operational issue..." rows={4}/>
        <div className="prompt-examples"><span>Try:</span><button onClick={()=>setMessage('Investigate payment service latency')}>Payment latency</button><button onClick={()=>setMessage('What should I check for elevated API errors?')}>Elevated API errors</button><button onClick={()=>setMessage('How do I investigate database connection exhaustion?')}>Database capacity</button></div>
        <button className="primary-btn ask-btn" onClick={ask} disabled={busy}>{busy?<RefreshCw className="spin" size={16}/>:<Sparkles size={16}/>} {busy?'Investigating...':'Run investigation'} <Send size={15}/></button>
        {chat && <div className="response-block"><div className="response-title"><Sparkles size={16}/> Investigation result <span>{chat.provider}</span></div><p className="answer">{chat.answer}</p><div className="tool-list"><b>TOOLS USED</b>{chat.tools_used.map(t=><span key={t}><Check size={12}/>{t}</span>)}</div>
          <div className="runbook-box"><b><BookOpen size={15}/> Relevant runbooks</b>{chat.runbooks.map(r=><div key={r.title}><strong>{r.title}</strong><p>{r.text}</p></div>)}</div>
          <div className="approval-callout"><ShieldCheck size={18}/><div><b>Human approval requested</b><p>Proposal #{chat.approval_id} has been added to the approval queue.</p></div><button className="text-btn" onClick={()=>setPage('Approvals')}>Review <ArrowUpRight size={14}/></button></div>
        </div>}
      </section>
      <aside className="panel context-panel"><h3><Terminal size={16}/> Available tools</h3><div className="tool-card"><b>get_service_health()</b><p>Read status, latency and error rate for monitored services.</p></div><div className="tool-card"><b>get_recent_incidents()</b><p>Retrieve recent incidents for operational context.</p></div><div className="tool-card"><b>search_runbooks(query)</b><p>Find operational guidance relevant to the request.</p></div><div className="guardrail"><ShieldCheck size={17}/><div><b>Human-in-the-loop</b><p>ForgeOps can propose actions, but only a human can approve simulated remediation.</p></div></div><div className="context-note"><Clock3 size={14}/> Demo telemetry · ap-south-1</div></aside>
    </div>
  </>
}
function Approvals({approvals,decide}:{approvals:Approval[],decide:(id:number,d:'approve'|'reject')=>void}) {
  return <><PageHeading eyebrow="GOVERNANCE & CONTROL" title="Approval center" desc="Review AI-proposed operational actions before simulated execution."/><div className="approval-summary"><div><ShieldCheck/><b>{approvals.filter(a=>a.status==='pending').length} pending</b><span>Awaiting human decision</span></div><div><CheckCircle2/><b>{approvals.filter(a=>a.status==='approved').length} approved</b><span>Simulated actions accepted</span></div><div><X/><b>{approvals.filter(a=>a.status==='rejected').length} rejected</b><span>Proposals declined</span></div></div><section className="panel"><div className="panel-head"><div><h2>Action requests</h2><p>Every decision is recorded in the audit log.</p></div></div>{approvals.length?approvals.map(a=><div className="approval-row" key={a.id}><div className="list-icon amber"><ShieldCheck size={18}/></div><div className="approval-detail"><b>{a.action}</b><p>{a.reason}</p><small>{a.service} · Requested by {a.requested_by} · Request #{a.id}</small></div><div className="approval-actions"><Status status={a.status}/>{a.status==='pending'&&<><button className="approve-btn" onClick={()=>decide(a.id,'approve')}><Check size={14}/> Approve</button><button className="reject-btn" onClick={()=>decide(a.id,'reject')}><X size={14}/> Reject</button></>}</div></div>):<Empty text="No approval requests yet. Run an AI investigation to create one."/>}</section></>
}
function Incidents({incidents,refresh}:{incidents:Incident[],refresh:()=>void}) {
  const [show,setShow]=useState(false),[title,setTitle]=useState('Elevated API latency'),[service,setService]=useState('payments-api'),[severity,setSeverity]=useState('high'),[desc,setDesc]=useState('Latency increased above the expected threshold.')
  async function create(){await request('/api/incidents',{method:'POST',body:JSON.stringify({title,service,severity,description:desc})});setShow(false);refresh()}
  return <><PageHeading eyebrow="RELIABILITY" title="Incident management" desc="Track and review operational incidents in the demo environment." action={<button className="primary-btn" onClick={()=>setShow(!show)}>+ New incident</button>}/>{show&&<section className="panel form-panel"><h3>Create incident</h3><div className="form-grid"><label>Title<input value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Service<input value={service} onChange={e=>setService(e.target.value)}/></label><label>Severity<select value={severity} onChange={e=>setSeverity(e.target.value)}><option>low</option><option>medium</option><option>high</option><option>critical</option></select></label><label>Description<input value={desc} onChange={e=>setDesc(e.target.value)}/></label></div><button className="primary-btn" onClick={create}>Create incident</button></section>}<section className="panel"><div className="panel-head"><div><h2>All incidents</h2><p>{incidents.length} recorded incidents</p></div></div>{incidents.length?incidents.map(i=><div className="incident-row" key={i.id}><div className="list-icon red"><CircleAlert size={17}/></div><div className="list-main"><b>{i.title}</b><small>{i.service} · {i.description}</small></div><span className={`severity ${i.severity}`}>{i.severity}</span><Status status={i.status}/></div>):<Empty text="No incidents yet. Use the AI assistant to investigate the simulated services."/>}</section></>
}
function Audit({logs}:{logs:Log[]}) {
  return <><PageHeading eyebrow="TRACEABILITY" title="Audit log" desc="A chronological record of assistant investigations and human decisions."/><section className="panel"><div className="panel-head"><div><h2>Activity history</h2><p>Latest 100 recorded events</p></div><span className="status healthy"><i/> RECORDING</span></div>{logs.length?logs.map(l=><div className="audit-row" key={l.id}><div className="audit-dot"/><div className="list-main"><b>{l.event}</b><small>{l.actor} · {l.detail}</small></div><time>{l.created_at?new Date(l.created_at).toLocaleString():'Just now'}</time></div>):<Empty text="No audit events recorded yet."/>}</section></>
}

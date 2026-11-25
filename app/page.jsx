'use client';
import { useEffect, useRef, useState } from 'react';
import { AudioLines, BookOpen, Bookmark, ChartNoAxesCombined, Check, Clock, Globe2, GraduationCap, Home, LayoutDashboard, Library, Menu, Mic, Search, ShieldCheck, Target, User, X } from 'lucide-react';
import { languages, translate } from '../lib/i18n';
import { formats, formatTime, filterTopics, summarize, csvCell } from '../lib/exams.mjs';
import { supabase } from '../lib/supabase';
import { usePlatform } from '../lib/use-platform';
import { Auth, Account, PracticeSession, Modal } from './student-components';
import { SkillModules } from './skill-modules';
import { GoalsAnalytics } from './goals-analytics';
import { StaffConsole } from './staff-console';

export default function App() {
  const db = usePlatform();
  const [locale, setLocale] = useState('en'), [page, setPage] = useState('home'), [exam, setExam] = useState('TCF');
  const [task, setTask] = useState(''), [search, setSearch] = useState(''), [modal, setModal] = useState(null);
  const [mobile, setMobile] = useState(false), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), [legacy, setLegacy] = useState(null);
  const preferenceUser = useRef(null);
  const t = translate(locale);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('parleo-locale');
      const detected = navigator.language.split('-')[0];
      setLocale(languages[stored] ? stored : languages[detected] ? detected : 'en');
      const old = Object.fromEntries(['parleo-records', 'parleo-custom', 'parleo-favorites'].map(key => [key, JSON.parse(localStorage.getItem(key) || '[]')]));
      if (Object.values(old).some(v => Array.isArray(v) && v.length)) setLegacy(old);
    } catch { /* A restricted browser can still explore subjects. */ }
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY') setModal({ type: 'recovery' });
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    try { localStorage.setItem('parleo-locale', locale); } catch {}
  }, [locale]);
  useEffect(() => {
    setModal(current => current?.type === 'recovery' ? current : null);
    setPage(db.user ? 'dashboard' : 'home');
    setNotice(''); preferenceUser.current = null;
  }, [db.user?.id]);
  useEffect(() => {
    if (db.user && db.profile && preferenceUser.current !== db.user.id) {
      setLocale(db.profile.locale); setExam(db.profile.exam); preferenceUser.current = db.user.id;
    }
  }, [db.profile, db.user]);
  const selectExam = value => { setExam(value); setTask(''); setSearch(''); };
  const go = next => { setPage(next); setMobile(false); setNotice(''); };
  const requireAccount = callback => db.user ? callback() : setModal({ type: 'auth' });
  async function action(callback) {
    setBusy(true); setNotice('');
    try { await callback(); } catch { setNotice(t('error')); } finally { setBusy(false); }
  }
  const openSession = (topic, record) => setModal({ type: 'session', topic, record });
  const completed = db.records.filter(r => r.status === 'completed' && formats[r.format].exam === exam);
  const drafts = db.records.filter(r => r.status === 'draft' && formats[r.format].exam === exam);
  const stats = summarize(completed);
  const visible = filterTopics(db.topics, exam, task, search).filter(topic => page !== 'favorites' || db.favorites.includes(topic.id));
  const nav = [['home', Home], ['dashboard', LayoutDashboard], ['library', Library], ['skills', GraduationCap], ['goals', Target], ['favorites', Bookmark], ['progress', ChartNoAxesCombined], ...(db.staffRole ? [['staff', ShieldCheck]] : [])];
  const displayName = db.profile?.display_name || db.user?.user_metadata?.display_name || t('student');
  const languageControl = <label className="language-control"><Globe2 size={17}/><select aria-label="Language / Langue" value={locale} onChange={e => setLocale(e.target.value)}>{Object.entries(languages).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>;
  const examCards = <div className="exam-grid">{['TCF', 'TEF'].map(value => <article className="exam-card" key={value}><span className="chip">{t('oral')}</span><h2>{value} Canada</h2><p>{t(value === 'TCF' ? 'tcfSummary' : 'tefSummary')}</p><ul>{Object.entries(formats).filter(([, f]) => f.exam === value).map(([id, f]) => <li key={id}><strong>{f.label.split(' · ')[1]} · {t(f.name)}</strong><span>{formatTime(f.talk)} · {f.prep ? `${formatTime(f.prep)} ${t('preparation')}` : t('noPrep')}</span></li>)}</ul><button className="primary" onClick={() => { selectExam(value); go('library'); }}>{t('start')}</button><a className="official-link" href={value === 'TCF' ? 'https://www.france-education-international.fr/test/tcf-canada' : 'https://www.lefrancaisdesaffaires.fr/candidat/test-evaluation-francais/tef-canada/presentation/'} target="_blank" rel="noreferrer">{t('official')}</a></article>)}</div>;
  return <div className={`app-shell ${page === 'home' ? 'public-shell' : ''}`}>
    <a className="skip-link" href="#main-content">{t('start')}</a>
    {page !== 'home' && <>
      {mobile && <button className="nav-scrim" aria-label={t('close')} onClick={() => setMobile(false)}/>}
      <aside className={`sidebar ${mobile ? 'opened' : ''}`}><button className="brand" onClick={() => go('home')}><span className="brand-icon"><AudioLines/></span>parléo<span className="brand-dot">.</span></button><div className="workspace-label">TCF CANADA · TEF CANADA</div><div className="workspace"><span className="avatar"><User size={20}/></span><div><strong>{db.user ? displayName : t('guest')}</strong><small>{t('student')}</small></div></div><nav aria-label={t('menu')}>{nav.map(([id, Icon]) => <button className={`nav-item ${page === id ? 'active' : ''}`} key={id} onClick={() => go(id)} aria-current={page === id ? 'page' : undefined}><Icon size={19}/>{t(id)}</button>)}</nav><div className="sidebar-bottom"><div className="tip-card"><Mic size={22}/><p>{t('frenchNote')}</p></div><button className="nav-item profile" onClick={() => setModal({ type: db.user ? 'account' : 'auth' })}><User size={19}/>{t(db.user ? 'account' : 'signin')}</button></div></aside>
    </>}
    <main id="main-content"><header className="topbar">
      {page === 'home' ? <button className="brand" onClick={() => go('home')}><span className="brand-icon"><AudioLines/></span>parléo<span className="brand-dot">.</span></button> : <><button className="mobile-menu" aria-label={t('menu')} aria-expanded={mobile} onClick={() => setMobile(!mobile)}><Menu/></button><span className="breadcrumb">{t(page)}</span></>}
      <div className="top-controls">{languageControl}<button className="outline" onClick={() => setModal({ type: db.user ? 'account' : 'auth' })}><User size={17}/>{t(db.user ? 'account' : 'signin')}</button></div>
    </header>
    <div className="content">
      {notice && <div className="notice error" role="alert">{notice}<button aria-label={t('close')} onClick={() => setNotice('')}><X size={18}/></button></div>}
      {page === 'home' ? <>
        <section className="hero landing-hero"><div className="hero-copy"><span className="hero-pill">TCF CANADA · TEF CANADA</span><h1>{t('welcome')}</h1><p>{t('tagline')}</p><div className="hero-actions"><button onClick={() => document.getElementById('exam-choice').scrollIntoView({ behavior: 'smooth' })}>{t('choose')}</button><button className="hero-secondary" onClick={() => db.user ? go('dashboard') : setModal({ type: 'auth', mode: 'signup' })}>{t(db.user ? 'dashboard' : 'signup')}</button></div></div><div className="hero-art" aria-hidden="true"><div className="art-orbit"/><div className="art-star">✳</div><div className="speech speech-light" lang="fr" dir="ltr">Et vous, qu’en pensez-vous ?<span>● ● ●</span></div><div className="speech speech-orange" lang="fr" dir="ltr">À vous la parole !<AudioLines size={34}/></div></div></section>
        <section id="exam-choice" className="exam-choice"><div className="section-heading"><div><h2>{t('choose')}</h2><p>{t('chooseHelp')}</p></div></div>{examCards}<p className="scope-note">{t('scope')}</p></section>
        <section className="create-banner"><span className="banner-icon"><ChartNoAxesCombined/></span><div><h2>{t('syncPitch')}</h2><p>{t('syncHelp')}</p></div><button onClick={() => db.user ? go('dashboard') : setModal({ type: 'auth', mode: 'signup' })}>{t(db.user ? 'dashboard' : 'signup')}</button></section>
      </> : <>
        <div className="page-heading"><div><span className="eyebrow">{t('student')}</span><h1>{t(page)}</h1><p>{t('tagline')}</p></div><div className="exam-switch" aria-label={t('choose')}>{['TCF', 'TEF'].map(value => <button aria-pressed={exam === value} className={exam === value ? 'selected' : ''} key={value} onClick={() => selectExam(value)}>{value} Canada</button>)}</div></div>
        {!db.user && <div className="notice">{t(supabase ? 'preview' : 'notConfigured')}{supabase && <button onClick={() => setModal({ type: 'auth' })}>{t('signin')}</button>}</div>}
        {db.error && <div className="notice error" role="alert">{t('error')}<button onClick={db.refresh}>{t('retry')}</button></div>}
        {db.loading || !db.ready ? <p role="status" className="loading">{t('loading')}</p> : <>
          {db.user && <div className="sync-bar"><span><Check size={14}/>{!db.error && t('synced')}</span><button onClick={db.refresh}>{t('refresh')}</button></div>}
          {(page === 'dashboard' || page === 'progress') && <section className="stats"><div><span className="stat-icon sage"><BookOpen/></span><div><strong>{stats.count}</strong><p>{t('completed')}</p></div></div><div><span className="stat-icon peach"><Clock/></span><div><strong>{stats.minutes}</strong><p>{t('minutes')}</p></div></div><div><span className="stat-icon sand"><ChartNoAxesCombined/></span><div><strong>{stats.average === null ? '—' : `${stats.average.toFixed(1)}/5`}</strong><p>{t('average')}</p></div></div></section>}
          {(page === 'dashboard' || page === 'progress') && drafts.length > 0 && <section className="draft-list"><h2>{t('draft')}</h2>{drafts.map(record => <article key={record.id}><div><strong lang="fr">{record.topic.title}</strong><small>{formats[record.format].label} · {new Date(record.updated_at).toLocaleDateString(locale)}</small></div><button className="outline" onClick={() => openSession(record.topic, record)}>{t('resume')}</button><button disabled={busy} aria-label={t('remove')} onClick={() => { if (confirm(t('confirmDelete'))) action(() => db.deleteSession(record.id)); }}><X size={18}/></button></article>)}</section>}
          {page === 'progress' ? <Progress records={completed} t={t} locale={locale} busy={busy} onDelete={id => { if (confirm(t('confirmDelete'))) action(() => db.deleteSession(id)); }} onStart={() => go('library')}/> : page === 'skills' ? <SkillModules t={t} exam={exam} user={db.user} attempts={db.attempts} onSave={db.saveAttempt} onAuth={() => setModal({ type: 'auth' })}/> : page === 'goals' ? <GoalsAnalytics t={t} records={db.records} attempts={db.attempts} goal={db.goal} user={db.user} onSave={db.saveGoal} onAuth={() => setModal({ type: 'auth' })}/> : page === 'staff' && db.staffRole ? <StaffConsole t={t} user={db.user} role={db.staffRole}/> : <>
            <div className="section-heading"><div><h2>{exam} Canada · {t('oral')}</h2><p>{t('frenchNote')}</p></div></div>
            <div className="filters"><label className="search"><Search size={18}/><input aria-label={t('search')} value={search} onChange={e => setSearch(e.target.value)} placeholder={t('search')}/></label><div className="select-wrap"><select aria-label={t('allTasks')} value={task} onChange={e => setTask(e.target.value)}><option value="">{t('allTasks')}</option>{Object.entries(formats).filter(([, f]) => f.exam === exam).map(([id, f]) => <option key={id} value={id}>{f.label} · {t(f.name)}</option>)}</select></div></div>
            <div className="scenario-grid">{visible.map(topic => { const f = formats[topic.format]; return <article key={topic.id} className="scenario-card"><div className="card-top"><span className={`topic-icon ${topic.color || 'sage'}`}><Mic size={23}/></span><button disabled={busy} aria-label={t('favorites')} aria-pressed={db.favorites.includes(topic.id)} className={`bookmark ${db.favorites.includes(topic.id) ? 'saved' : ''}`} onClick={() => requireAccount(() => action(() => db.toggleFavorite(topic.id)))}><Bookmark size={20} fill={db.favorites.includes(topic.id) ? 'currentColor' : 'none'}/></button></div><div className="card-tags"><span>{f.label}</span>{topic.custom && <span>{t('custom')}</span>}</div><h3 lang="fr" dir="ltr">{topic.title}</h3><p>{t(f.name)}</p><div className="card-meta"><span><Clock size={14}/>{formatTime(f.talk)}</span><span>{f.prep ? `${formatTime(f.prep)} ${t('preparation')}` : t('noPrep')}</span></div><div className="card-bottom"><button onClick={() => openSession(topic)}>{t('open')}</button></div></article>; })}</div>
            {!visible.length && <div className="empty"><h3>{t('empty')}</h3><p>{t('emptyHelp')}</p></div>}
          </>}
        </>}
      </>}
      {legacy && <div className="notice legacy"><p>{t('legacy')}</p><button onClick={() => download(JSON.stringify(legacy, null, 2), 'parleo-legacy.json', 'application/json')}>{t('legacyExport')}</button></div>}
      <footer><span>parléo. <small>{t('independent')}</small></span></footer>
    </div></main>
    {modal && <Modal title={t(modal.type === 'session' ? 'oral' : 'account')} closeLabel={t('close')} onClose={() => { if (modal.type !== 'session' || confirm(t('leave'))) setModal(null); }} wide={modal.type === 'session'}>
      {(modal.type === 'auth' || modal.type === 'recovery') && <Auth t={t} mode={modal.type === 'recovery' ? 'recovery' : modal.mode} locale={locale} exam={exam} onDone={() => { setModal(null); go('dashboard'); }}/>} 
      {modal.type === 'account' && <Account t={t} user={db.user} profile={db.profile} locale={locale} exam={exam} onSave={db.saveProfile} onDone={() => setModal(null)}/>}
      {modal.type === 'session' && <PracticeSession key={modal.record?.id || modal.topic.id} t={t} topic={modal.topic} record={modal.record} user={db.user} onSave={async record => { await db.saveSession(record); setModal(null); go(record.status === 'completed' ? 'progress' : 'dashboard'); }} onAuth={() => setModal({ type: 'auth' })}/>}
    </Modal>}
  </div>;
}
function download(content, name, type) { const url = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function Progress({ records, t, locale, onDelete, onStart, busy }) {
  return <><div className="progress-toolbar"><p className="fine-print">{t('assessment')}</p><button className="outline" disabled={!records.length} onClick={() => download('\uFEFF' + [['Date', 'Exam', 'Subject', 'Fluency', 'Vocabulary', 'Accuracy', 'Communication', 'Seconds', 'Notes'], ...records.map(r => [r.created_at, formats[r.format].label, r.topic.title, ...r.scores, r.duration_seconds, r.notes])].map(row => row.map(csvCell).join(',')).join('\r\n'), 'parleo-progress.csv', 'text/csv;charset=utf-8')}>{t('export')}</button></div>
    {records.length ? <><div className="performance-summary">{['fluency', 'vocabulary', 'accuracy', 'communication'].map((key, i) => <div key={key}><span>{t(key)}</span><strong>{(records.reduce((sum, r) => sum + r.scores[i], 0) / records.length).toFixed(1)}<small>/5</small></strong></div>)}</div><div className="records">{records.map(r => <article className="record" key={r.id}><div className="record-top"><div><strong>{formats[r.format].label}</strong><small>{new Date(r.created_at).toLocaleString(locale)}</small></div><strong className="score">{(r.scores.reduce((a, b) => a + b) / 4).toFixed(1)}<small>/5</small></strong><button disabled={busy} onClick={() => onDelete(r.id)} aria-label={t('remove')}><X size={19}/></button></div><h3 lang="fr" dir="ltr">{r.topic.title}</h3><p className="user-notes">{r.notes}</p></article>)}</div></> : <div className="empty"><ChartNoAxesCombined/><h2>{t('empty')}</h2><p>{t('emptyHelp')}</p><button className="primary" onClick={onStart}>{t('start')}</button></div>}
  </>;
}

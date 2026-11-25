'use client';
import { useEffect, useRef, useState } from 'react';
import { X, Clock, Mic, Pause, Play, RotateCcw, Square, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formats, formatTime } from '../lib/exams.mjs';

export function Modal({ title, closeLabel, onClose, wide, children }) {
  const ref = useRef(null), close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const prior = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current.focus();
    function keydown(e) {
      if (e.key === 'Escape') { e.preventDefault(); close.current(); }
      if (e.key !== 'Tab') return;
      const elements = [...ref.current.querySelectorAll('button:not(:disabled), input, select, textarea, a[href], [tabindex="0"]')].filter(el => el.getClientRects().length);
      const first = elements[0], last = elements.at(-1);
      if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { e.preventDefault(); first?.focus(); }
    }
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); prior?.focus(); };
  }, []);
  return <div className="modal-backdrop"><section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`modal ${wide ? 'session-modal' : ''}`}><button className="close" aria-label={closeLabel} onClick={onClose}><X size={21}/></button>{children}</section></div>;
}
export function Auth({ t, mode: initial = 'signin', locale, exam, onDone }) {
  const [mode, setMode] = useState(initial), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [name, setName] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const switchMode = next => { setMode(next); setError(''); setMessage(''); };
  async function submit(e) {
    e.preventDefault(); if (!supabase) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const redirectTo = window.location.origin + '/';
      let result;
      if (mode === 'signup') result = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo, data: { display_name: name.trim(), locale, exam } } });
      else if (mode === 'forgot') result = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      else if (mode === 'recovery') result = await supabase.auth.updateUser({ password });
      else result = await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (mode === 'forgot' || (mode === 'signup' && !result.data.session)) setMessage(t('checkEmail'));
      else onDone();
    } catch { setError(t('authError')); } finally { setBusy(false); }
  }
  return <><span className="eyebrow">{t('student')}</span><h2>{t(mode === 'recovery' ? 'newPassword' : mode === 'forgot' ? 'forgot' : mode)}</h2><p className="modal-text">{t('syncHelp')}</p>{!supabase ? <p className="notice">{t('notConfigured')}</p> : <form onSubmit={submit}>
    {mode === 'signup' && <label>{t('name')}<input autoComplete="nickname" required maxLength={80} value={name} onChange={e => setName(e.target.value)}/></label>}
    {mode !== 'recovery' && <label>{t('email')}<input type="email" dir="ltr" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)}/></label>}
    {mode !== 'forgot' && <label>{t('password')}<input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={8} maxLength={128} required value={password} onChange={e => setPassword(e.target.value)}/></label>}
    {error && <p role="alert" className="error">{error}</p>}{message && <p role="status" className="notice">{message}</p>}
    <button className="primary full" disabled={busy}>{t(busy ? 'loading' : mode === 'forgot' ? 'reset' : mode === 'recovery' ? 'newPassword' : mode)}</button>
    {mode !== 'recovery' && <div className="auth-links">{mode === 'signin' ? <><button type="button" onClick={() => switchMode('signup')}>{t('signup')}</button><button type="button" onClick={() => switchMode('forgot')}>{t('forgot')}</button></> : <button type="button" onClick={() => switchMode('signin')}>{t('signin')}</button>}</div>}
  </form>}<p className="fine-print">{t('privacy')}</p></>;
}
export function Account({ t, user, profile, locale, exam, onSave, onDone }) {
  const [name, setName] = useState(profile?.display_name || user?.user_metadata?.display_name || ''), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  async function run(fn) { setBusy(true); setMessage(''); try { await fn(); } catch { setMessage(t('error')); } finally { setBusy(false); } }
  return <><h2>{t('account')}</h2><p className="modal-text" dir="ltr">{user?.email}</p><form onSubmit={e => { e.preventDefault(); run(async () => { await onSave({ display_name: name.trim(), locale, exam }); setMessage(t('saved')); }); }}><label>{t('name')}<input required maxLength={80} value={name} onChange={e => setName(e.target.value)}/></label><p className="fine-print">{locale.toUpperCase()} · {exam} Canada</p><button className="primary full" disabled={busy}>{t(busy ? 'saving' : 'save')}</button></form>{message && <p role="status" className="notice">{message}</p>}<p className="modal-text">{t('privacy')}</p><button className="outline" disabled={busy} onClick={() => run(async () => { const { error } = await supabase.auth.signOut({ scope: 'local' }); if (error) throw error; onDone(); })}>{t('signout')}</button></>;
}
export function PracticeSession({ t, topic, record, user, onSave, onAuth }) {
  const f = formats[topic.format], savedState = record?.state;
  const [id] = useState(() => record?.id || crypto.randomUUID());
  const [tab, setTab] = useState('scenario'), [phase, setPhase] = useState(savedState?.phase || (f.prep ? 'preparation' : 'speaking'));
  const [left, setLeft] = useState(savedState?.left ?? (f.prep || f.talk)), [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(record?.duration_seconds || 0), [scores, setScores] = useState(record?.scores || [0, 0, 0, 0]), [notes, setNotes] = useState(record?.notes || '');
  const [audioFeedback, setAudioFeedback] = useState(savedState?.audio_feedback || null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const clockState = useRef(null);
  useEffect(() => {
    const preventLoss = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', preventLoss);
    return () => window.removeEventListener('beforeunload', preventLoss);
  }, []);
  useEffect(() => {
    if (!running) { clockState.current = null; return; }
    const start = Date.now(), remaining = left, duration = elapsed;
    clockState.current = { start, remaining, duration };
    const tick = () => {
      const used = Math.min(remaining, Math.floor((Date.now() - start) / 1000));
      setLeft(remaining - used); setElapsed(duration + used);
      if (used >= remaining) { setRunning(false); if (phase === 'preparation') { setPhase('speaking'); setLeft(f.talk); } else setPhase('finished'); }
    };
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [running, phase]);
  const snapshotClock = () => {
    if (clockState.current) {
      const { start, remaining, duration } = clockState.current;
      const used = Math.min(remaining, Math.floor((Date.now() - start) / 1000));
      return { left: remaining - used, elapsed: duration + used };
    }
    return { left, elapsed };
  };
  const stop = () => {
    const snapshot = snapshotClock();
    setLeft(snapshot.left); setElapsed(snapshot.elapsed);
    setRunning(false);
    return snapshot;
  };
  async function save(status) {
    if (status === 'completed' && scores.some(n => !n)) { setError(t('rateAll')); return; }
    const snapshot = stop(); setBusy(true); setError('');
    try { await onSave({ id, ...(record?.version ? { version: record.version } : {}), format: topic.format, topic, status, scores, notes, duration_seconds: snapshot.elapsed, state: { phase, left: snapshot.left, audio_feedback: audioFeedback } }); }
    catch { setError(t('error')); } finally { setBusy(false); }
  }
  return <><div className="session-heading"><span className="eyebrow">{f.label} · {t(f.name)}</span><h2 lang="fr" dir="ltr">{topic.title}</h2><p className="fine-print">{t('frenchNote')}</p></div><div className="session-layout"><div><div className="session-tabs" role="tablist">{['scenario', 'examples', 'audioPractice', 'reflection'].map(key => <button role="tab" aria-selected={tab === key} className={tab === key ? 'selected' : ''} key={key} onClick={() => { if (key === 'reflection' || key === 'audioPractice') stop(); setTab(key); }}>{t(key)}</button>)}</div>
    <section className="session-panel">
      {tab === 'scenario' && <><span className="chip">{f.label}</span><p className="scenario-consigne" lang="fr" dir="ltr">{topic.context}</p><div className="note"><Clock size={19}/><span>{t('speaking')}: {formatTime(f.talk)} · {f.prep ? `${t('preparation')}: ${formatTime(f.prep)}` : t('noPrep')}</span></div></>}
      {tab === 'examples' && <div>{topic.qa?.length ? topic.qa.map((qa, i) => <details className="example" key={i} lang="fr" dir="ltr"><summary>{qa[0]}</summary><p>{qa[1]}</p><p>{qa[2]}</p></details>) : <p>{t('customHelp')}</p>}</div>}
      {tab === 'audioPractice' && <AudioCoach t={t} previous={audioFeedback} onFeedback={setAudioFeedback}/>} 
      {tab === 'reflection' && <><h3>{t('reflection')}</h3><p className="fine-print">{t('assessment')}</p><div className="rating-list">{['fluency', 'vocabulary', 'accuracy', 'communication'].map((key, i) => <div key={key}><span>{t(key)}</span><div role="group" aria-label={t(key)}>{[1, 2, 3, 4, 5].map(n => <button aria-label={`${t(key)}: ${n}/5`} aria-pressed={scores[i] === n} className={scores[i] >= n ? 'filled' : ''} key={n} onClick={() => setScores(values => values.map((v, index) => index === i ? n : v))}>{n}</button>)}</div></div>)}</div><label>{t('notes')}<textarea maxLength={5000} rows={4} value={notes} onChange={e => setNotes(e.target.value)}/></label>{user ? <button className="primary full" disabled={busy} onClick={() => save('completed')}>{t(busy ? 'saving' : 'saveSession')}</button> : <div className="notice"><p>{t('preview')}</p><button className="primary" onClick={() => { if (confirm(t('leave'))) onAuth(); }}>{t('signin')}</button></div>}</>}
      {error && <p role="alert" className="error">{error}</p>}
    </section></div><aside className="timer-panel"><span className="timer-status">{t(phase)}</span><div className="timer" dir="ltr">{formatTime(left)}</div><button disabled={phase === 'finished' || busy} className="primary full" onClick={() => running ? stop() : setRunning(true)}>{running ? <Pause size={17}/> : <Play size={17}/>} {t(running ? 'pause' : 'startTimer')}</button><button className="timer-reset" disabled={busy} onClick={() => { setRunning(false); setPhase(f.prep ? 'preparation' : 'speaking'); setLeft(f.prep || f.talk); }}><RotateCcw size={16}/>{t('restart')}</button><button className="text-button" onClick={() => { stop(); setTab('reflection'); }}>{t('finish')}</button>{user && <button className="outline full draft-button" disabled={busy} onClick={() => save('draft')}>{t(busy ? 'saving' : 'saveDraft')}</button>}</aside></div></>;
}

function AudioCoach({ t, previous, onFeedback }) {
  const [recording, setRecording] = useState(false), [audioUrl, setAudioUrl] = useState(''), [message, setMessage] = useState(''), [transcript, setTranscript] = useState(previous?.transcript || '');
  const media = useRef(null), recognition = useRef(null), chunks = useRef([]), started = useRef(0), confidence = useRef([]), transcriptRef = useRef(previous?.transcript || '');
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); media.current?.stream?.getTracks().forEach(track => track.stop()); recognition.current?.stop?.(); }, [audioUrl]);
  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { setMessage(t('audioUnsupported')); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = []; confidence.current = []; transcriptRef.current = ''; setTranscript(''); setMessage(''); started.current = Date.now();
      const recorder = new MediaRecorder(stream); media.current = recorder;
      recorder.ondataavailable = event => { if (event.data.size) chunks.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: recorder.mimeType || 'audio/webm' });
        if (audioUrl) URL.revokeObjectURL(audioUrl); setAudioUrl(URL.createObjectURL(blob)); stream.getTracks().forEach(track => track.stop());
        const seconds = Math.max(1, Math.round((Date.now() - started.current) / 1000));
        const current = transcriptRef.current;
        const words = current.trim() ? current.trim().split(/\s+/).length : 0;
        const fillers = (current.match(/\b(euh|hum|heu)\b/gi) || []).length;
        setTranscript(current);
        onFeedback({ transcript: current, seconds, words_per_minute: Math.round(words * 60 / seconds), pronunciation: confidence.current.length ? Math.round(confidence.current.reduce((a, b) => a + b, 0) / confidence.current.length * 100) : null, fillers });
      };
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) { const engine = new SpeechRecognition(); engine.lang = 'fr-FR'; engine.continuous = true; engine.interimResults = false; engine.onresult = event => { let text = ''; for (let i = event.resultIndex; i < event.results.length; i++) { text += `${event.results[i][0].transcript} `; confidence.current.push(event.results[i][0].confidence); } transcriptRef.current += text; setTranscript(transcriptRef.current); }; engine.start(); recognition.current = engine; }
      recorder.start(); setRecording(true);
    } catch { setMessage(t('microphoneDenied')); }
  };
  const stop = () => { recognition.current?.stop?.(); recognition.current = null; media.current?.stop(); setRecording(false); };
  const clear = () => { if (audioUrl) URL.revokeObjectURL(audioUrl); transcriptRef.current = ''; setAudioUrl(''); setTranscript(''); onFeedback(null); };
  const result = previous;
  return <div className="audio-coach"><h3>{t('audioPractice')}</h3><p className="fine-print">{t('audioHelp')}</p><div className="audio-actions"><button className={recording ? 'danger' : 'primary'} onClick={recording ? stop : start}>{recording ? <Square size={18}/> : <Mic size={18}/>} {t(recording ? 'stopRecording' : 'startRecording')}</button>{audioUrl && <button className="outline" onClick={clear}><Trash2 size={17}/>{t('remove')}</button>}</div>{audioUrl && <audio controls src={audioUrl}/>} {transcript && <div className="transcript" lang="fr"><strong>{t('transcript')}</strong><p>{transcript}</p></div>}{result && <div className="speech-metrics"><div><strong>{result.words_per_minute}</strong><span>{t('wordsPerMinute')}</span></div><div><strong>{result.pronunciation == null ? '—' : `${result.pronunciation}%`}</strong><span>{t('pronunciation')}</span></div><div><strong>{result.fillers}</strong><span>{t('fillers')}</span></div></div>}<p className="fine-print">{t('speechDisclaimer')}</p>{message && <p role="alert" className="error">{message}</p>}</div>;
}

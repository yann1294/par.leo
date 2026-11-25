'use client';
import { useEffect, useState } from 'react';
import { BookOpen, Headphones, PenLine, Play, Square } from 'lucide-react';
import { skillActivities } from '../lib/skills.mjs';

// Complementary reading, listening, and writing exercises share one persistence model:
// one upserted skill_attempt per student/activity, synchronized through Supabase.
export function SkillModules({ t, exam, user, attempts, onSave, onAuth }) {
  const [skill, setSkill] = useState('reading');
  const activity = skillActivities[exam][skill];
  const previous = attempts.find(item => item.activity_id === activity.id);
  const [choice, setChoice] = useState(''), [writing, setWriting] = useState(''), [feedback, setFeedback] = useState(''), [busy, setBusy] = useState(false), [speaking, setSpeaking] = useState(false);
  useEffect(() => { setChoice(previous?.response?.choice ?? ''); setWriting(previous?.response?.text ?? ''); setFeedback(''); window.speechSynthesis?.cancel(); setSpeaking(false); }, [activity.id, previous?.updated_at]);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  const submit = async () => {
    if (!user) { onAuth(); return; }
    const response = skill === 'writing' ? { text: writing } : { choice: Number(choice) };
    const score = skill === 'writing' ? Math.min(100, Math.round(writing.trim().split(/\s+/).filter(Boolean).length / activity.minimum * 100)) : Number(choice) === activity.answer ? 100 : 0;
    setBusy(true);
    try { await onSave({ exam, skill, activity_id: activity.id, response, score }); setFeedback(score === 100 ? t('correct') : skill === 'writing' ? t('writingSaved') : t('tryAgain')); }
    catch { setFeedback(t('error')); } finally { setBusy(false); }
  };
  // SpeechSynthesis provides a lightweight listening exercise without shipping or
  // storing copyrighted audio files. The French voice depends on browser/OS support.
  const listen = () => {
    if (!('speechSynthesis' in window)) { setFeedback(t('audioUnsupported')); return; }
    if (speaking) { speechSynthesis.cancel(); setSpeaking(false); return; }
    const utterance = new SpeechSynthesisUtterance(activity.text); utterance.lang = 'fr-FR'; utterance.rate = .9; utterance.onend = () => setSpeaking(false); speechSynthesis.speak(utterance); setSpeaking(true);
  };
  const icons = { reading: BookOpen, listening: Headphones, writing: PenLine };
  const words = writing.trim() ? writing.trim().split(/\s+/).length : 0;
  return <section className="skills-workspace"><div className="skill-tabs">{Object.keys(icons).map(key => { const Icon = icons[key]; return <button className={skill === key ? 'selected' : ''} key={key} onClick={() => setSkill(key)}><Icon size={19}/>{t(key)}</button>; })}</div><article className="skill-card"><span className="eyebrow">{exam} Canada · {t(skill)}</span><h2 lang="fr">{activity.title}</h2>{skill === 'reading' && <><p className="reading-passage" lang="fr">{activity.text}</p><Question activity={activity} choice={choice} setChoice={setChoice}/></>}{skill === 'listening' && <><button className="primary audio-play" onClick={listen}>{speaking ? <Square size={18}/> : <Play size={18}/>} {t(speaking ? 'stopListening' : 'playListening')}</button><Question activity={activity} choice={choice} setChoice={setChoice}/></>}{skill === 'writing' && <><p className="reading-passage" lang="fr">{activity.prompt}</p><label>{t('yourAnswer')}<textarea lang="fr" rows={10} value={writing} onChange={event => setWriting(event.target.value)} maxLength={5000}/></label><p className="word-count">{words} {t('words')} · {t('target')}: {activity.minimum}+</p></>}<button className="primary" disabled={busy || (skill === 'writing' ? words < 10 : choice === '')} onClick={submit}>{t(busy ? 'saving' : 'saveAttempt')}</button>{previous && <p className="fine-print">{t('lastScore')}: {previous.score}%</p>}{feedback && <p className="notice" role="status">{feedback}</p>}</article></section>;
}
function Question({ activity, choice, setChoice }) { return <fieldset className="skill-question"><legend lang="fr">{activity.question}</legend>{activity.choices.map((item, index) => <label key={item}><input type="radio" name={activity.id} value={index} checked={String(index) === String(choice)} onChange={event => setChoice(event.target.value)}/><span lang="fr">{item}</span></label>)}</fieldset>; }

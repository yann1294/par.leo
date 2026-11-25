'use client';
import { useEffect, useMemo, useState } from 'react';
import { Bell, Flame, Target } from 'lucide-react';

const dayKey = value => new Date(value).toLocaleDateString('en-CA');
export function GoalsAnalytics({ t, records, attempts, goal, user, onSave, onAuth }) {
  const [target, setTarget] = useState(goal?.weekly_sessions || 3), [enabled, setEnabled] = useState(goal?.reminder_enabled || false), [time, setTime] = useState(goal?.reminder_time?.slice(0,5) || '18:00'), [message, setMessage] = useState('');
  useEffect(() => { if (goal) { setTarget(goal.weekly_sessions); setEnabled(goal.reminder_enabled); setTime(goal.reminder_time.slice(0,5)); } }, [goal?.updated_at]);
  const analytics = useMemo(() => {
    const activity = [...records.filter(item => item.status === 'completed').map(item => ({ date: item.updated_at, score: item.scores.reduce((a,b) => a+b,0) * 5, skill: 'speaking' })), ...attempts.map(item => ({ date: item.updated_at, score: Number(item.score || 0), skill: item.skill }))];
    const days = new Map(); activity.forEach(item => days.set(dayKey(item.date), (days.get(dayKey(item.date)) || 0) + 1));
    let streak = 0, cursor = new Date(); if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1); while (days.has(dayKey(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); weekStart.setHours(0,0,0,0);
    const week = activity.filter(item => new Date(item.date) >= weekStart).length;
    const recent = Array.from({length:7}, (_, index) => { const date = new Date(); date.setDate(date.getDate() - (6-index)); return { label: date.toLocaleDateString(undefined,{weekday:'short'}), count: days.get(dayKey(date)) || 0 }; });
    const skills = ['speaking','reading','listening','writing'].map(skill => { const rows = activity.filter(item => item.skill === skill); return { skill, average: rows.length ? Math.round(rows.reduce((sum,item) => sum + item.score,0) / rows.length) : 0 }; });
    return { streak, week, recent, skills };
  }, [records, attempts]);
  useEffect(() => {
    if (!enabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const check = () => { const now = new Date(), stamp = `${dayKey(now)}-${time}`; if (now.toTimeString().slice(0,5) === time && localStorage.getItem('parleo-reminder') !== stamp) { new Notification('Parléo', { body: t('reminderBody') }); localStorage.setItem('parleo-reminder', stamp); } };
    check(); const timer = setInterval(check, 60000); return () => clearInterval(timer);
  }, [enabled, time, t]);
  const save = async event => { event.preventDefault(); if (!user) { onAuth(); return; } let nextEnabled = enabled; if (enabled && 'Notification' in window && Notification.permission === 'default') nextEnabled = (await Notification.requestPermission()) === 'granted'; await onSave({ weekly_sessions: Number(target), reminder_enabled: nextEnabled, reminder_days: [1,3,5], reminder_time: `${time}:00`, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }); setEnabled(nextEnabled); setMessage(t('saved')); };
  return <div className="goals-page"><section className="goal-summary"><article><Target/><div><strong>{analytics.week}/{target}</strong><span>{t('weeklyGoal')}</span></div></article><article><Flame/><div><strong>{analytics.streak}</strong><span>{t('dayStreak')}</span></div></article></section><section className="analytics-card"><h2>{t('activityLastWeek')}</h2><div className="week-chart">{analytics.recent.map(day => <div key={day.label}><span style={{height:`${Math.max(8, day.count * 24)}px`}}/><strong>{day.count}</strong><small>{day.label}</small></div>)}</div><h2>{t('skillBreakdown')}</h2><div className="skill-bars">{analytics.skills.map(item => <div key={item.skill}><span>{t(item.skill)}</span><div><i style={{width:`${item.average}%`}}/></div><strong>{item.average}%</strong></div>)}</div></section><form className="goal-form" onSubmit={save}><h2><Bell size={20}/>{t('goalSettings')}</h2><label>{t('weeklyTarget')}<input type="number" min="1" max="21" value={target} onChange={event => setTarget(event.target.value)}/></label><label className="check-label"><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)}/>{t('browserReminder')}</label><label>{t('reminderTime')}<input type="time" value={time} onChange={event => setTime(event.target.value)}/></label><p className="fine-print">{t('reminderHelp')}</p><button className="primary">{t('save')}</button>{message && <p role="status" className="notice">{message}</p>}</form></div>;
}

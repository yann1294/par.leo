'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import { seedTopics } from './catalog.mjs';

function unwrap(result) { if (result.error) throw result.error; return result.data; }
export function usePlatform() {
  const [user, setUser] = useState(null), [ready, setReady] = useState(!supabase);
  const [topics, setTopics] = useState(supabase ? [] : seedTopics);
  const [records, setRecords] = useState([]), [favorites, setFavorites] = useState([]), [attempts, setAttempts] = useState([]);
  const [profile, setProfile] = useState(null), [goal, setGoal] = useState(null), [staffRole, setStaffRole] = useState(null), [loading, setLoading] = useState(false), [error, setError] = useState(false);
  const generation = useRef(0), currentUser = useRef(null);
  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user ?? null;
      if (currentUser.current !== next?.id) {
        generation.current++;
        currentUser.current = next?.id;
        setRecords([]); setFavorites([]); setAttempts([]); setProfile(null); setGoal(null); setStaffRole(null); setTopics([]);
      }
      setUser(next); setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);
  const refresh = useCallback(async () => {
    if (!supabase || !ready) return;
    const ticket = ++generation.current;
    setLoading(true); setError(false);
    try {
      const results = await Promise.all([
        supabase.from('topics').select('*').eq('published', true).order('created_at'),
        user ? supabase.from('sessions').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }) : Promise.resolve({ data: [] }),
        user ? supabase.from('favorites').select('topic_id').eq('user_id', user.id) : Promise.resolve({ data: [] }),
        user ? supabase.from('profiles').select('*').eq('id', user.id).maybeSingle() : Promise.resolve({ data: null }),
        user ? supabase.from('skill_attempts').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }) : Promise.resolve({ data: [] }),
        user ? supabase.from('student_goals').select('*').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
        user ? supabase.rpc('get_staff_role') : Promise.resolve({ data: null }),
      ]);
      const [catalog, sessions, saved, preferences, skillAttempts, studentGoal, role] = results.map(unwrap);
      if (ticket !== generation.current) return;
      setTopics(catalog.map(row => ({ ...row.content, id: row.id, format: row.format, custom: !!row.owner_id })));
      setRecords(sessions); setFavorites(saved.map(row => row.topic_id)); setProfile(preferences); setAttempts(skillAttempts); setGoal(studentGoal); setStaffRole(role);
    } catch { if (ticket === generation.current) setError(true); }
    finally { if (ticket === generation.current) setLoading(false); }
  }, [user?.id, ready]);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (!supabase || !user) return;
    const channel = supabase.channel(`student-sync:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `user_id=eq.${user.id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'favorites', filter: `user_id=eq.${user.id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'skill_attempts', filter: `user_id=eq.${user.id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_goals', filter: `user_id=eq.${user.id}` }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, refresh]);
  useEffect(() => {
    const onFocus = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => { window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus); };
  }, [refresh]);
  function requireUser() { if (!supabase || !user) throw new Error('Authentication required'); return user.id; }
  async function saveSession(record) {
    const userId = requireUser();
    const { version, created_at, updated_at, ...payload } = record;
    let result;
    if (version) result = await supabase.from('sessions').update({ ...payload, user_id: userId }).eq('id', record.id).eq('user_id', userId).eq('version', version).select().single();
    else result = await supabase.from('sessions').insert({ ...payload, user_id: userId }).select().single();
    const saved = unwrap(result);
    if (currentUser.current === userId) setRecords(rows => [saved, ...rows.filter(row => row.id !== saved.id)]);
    return saved;
  }
  async function toggleFavorite(id) {
    const userId = requireUser();
    const exists = favorites.includes(id);
    unwrap(await (exists ? supabase.from('favorites').delete().eq('user_id', userId).eq('topic_id', id) : supabase.from('favorites').insert({ user_id: userId, topic_id: id })));
    if (currentUser.current === userId) setFavorites(rows => exists ? rows.filter(v => v !== id) : [...new Set([...rows, id])]);
  }
  async function saveAttempt(attempt) {
    const userId = requireUser();
    const saved = unwrap(await supabase.from('skill_attempts').upsert({ ...attempt, user_id: userId }, { onConflict: 'user_id,activity_id' }).select().single());
    if (currentUser.current === userId) setAttempts(rows => [saved, ...rows.filter(row => row.id !== saved.id)]);
    return saved;
  }
  async function deleteSession(id) {
    const userId = requireUser();
    unwrap(await supabase.from('sessions').delete().eq('id', id).eq('user_id', userId));
    if (currentUser.current === userId) setRecords(rows => rows.filter(r => r.id !== id));
  }
  async function saveProfile(values) {
    const id = requireUser();
    unwrap(await supabase.from('profiles').upsert({ id, ...values }));
    if (currentUser.current === id) setProfile({ id, ...values });
  }
  async function saveGoal(values) {
    const userId = requireUser();
    const saved = unwrap(await supabase.from('student_goals').upsert({ user_id: userId, ...values }).select().single());
    if (currentUser.current === userId) setGoal(saved);
    return saved;
  }
  return { user, ready, topics, records, favorites, attempts, profile, goal, staffRole, loading, error, refresh, saveSession, saveAttempt, toggleFavorite, deleteSession, saveProfile, saveGoal };
}

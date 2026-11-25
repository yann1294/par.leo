export const formats = {
  'tcf-1': { exam: 'TCF', label: 'TCF Canada · 1', name: 'intro', prep: 0, talk: 120 },
  'tcf-2': { exam: 'TCF', label: 'TCF Canada · 2', name: 'information', prep: 120, talk: 210 },
  'tcf-3': { exam: 'TCF', label: 'TCF Canada · 3', name: 'opinion', prep: 0, talk: 270 },
  'tef-a': { exam: 'TEF', label: 'TEF Canada · A', name: 'information', prep: 0, talk: 300 },
  'tef-b': { exam: 'TEF', label: 'TEF Canada · B', name: 'persuasion', prep: 0, talk: 600 },
};
export const formatTime = n => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
export function filterTopics(topics, exam, format = '', search = '') {
  const query = search.trim().toLocaleLowerCase();
  return topics.filter(t => formats[t.format]?.exam === exam && (!format || t.format === format) &&
    `${t.title} ${t.name} ${t.context}`.toLocaleLowerCase().includes(query));
}
export function summarize(records) {
  return { count: records.length, minutes: Math.round(records.reduce((sum, r) => sum + (r.duration_seconds || 0), 0) / 60),
    average: records.length ? records.reduce((sum, r) => sum + r.scores.reduce((a, b) => a + b, 0) / 4, 0) / records.length : null };
}
export function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}

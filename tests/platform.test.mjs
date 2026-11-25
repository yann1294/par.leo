import test from 'node:test';
import assert from 'node:assert/strict';
import { formats, filterTopics, summarize, csvCell } from '../lib/exams.mjs';
import { seedTopics } from '../lib/catalog.mjs';
import { dictionaries } from '../lib/i18n.js';

test('TCF and TEF timing and catalog are separate', () => {
  assert.equal(Object.values(formats).filter(f => f.exam === 'TCF').reduce((s, f) => s + f.prep + f.talk, 0), 720);
  assert.equal(Object.values(formats).filter(f => f.exam === 'TEF').reduce((s, f) => s + f.prep + f.talk, 0), 900);
  assert.equal(formats['tcf-3'].talk, 270);
  assert.equal(filterTopics(seedTopics, 'TCF').length, 10);
  assert.equal(filterTopics(seedTopics, 'TEF').length, 6);
  assert.deepEqual(filterTopics(seedTopics, 'TEF', 'tcf-2'), []);
  assert.equal(filterTopics(seedTopics, 'TCF', 'tcf-3', 'télétravail').length, 1);
  assert.equal(new Set(seedTopics.map(t => t.id)).size, seedTopics.length);
});
test('progress derives only from supplied student sessions', () => {
  assert.deepEqual(summarize([]), { count: 0, minutes: 0, average: null });
  assert.deepEqual(summarize([{ scores: [1, 2, 3, 4], duration_seconds: 120 }, { scores: [3, 4, 5, 2], duration_seconds: 60 }]), { count: 2, minutes: 3, average: 3 });
});
test('all supported languages have complete nonempty interface strings', () => {
  for (const dictionary of Object.values(dictionaries)) {
    assert.deepEqual(Object.keys(dictionary), Object.keys(dictionaries.en));
    assert(Object.values(dictionary).every(value => typeof value === 'string' && value.trim()));
  }
});
test('CSV protects notes against formulas and escapes quotes', () => {
  assert.equal(csvCell('=1+1'), '"\'=1+1"');
  assert.equal(csvCell('  @SUM(A1)'), '"\'  @SUM(A1)"');
  assert.equal(csvCell('a,"b"\nc'), '"a,""b""\nc"');
});

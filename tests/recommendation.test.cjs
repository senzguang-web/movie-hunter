const { test } = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../engine.js');
const catalog = require('../data/catalog.js');
const ratings = require('../data/ratings.js');
const options = { size: 7, seed: 1, dateKey: '2026-10-05', ratings };
const ids = result => result.entries.map(entry => entry.movie.id);

test('jazz uses the same explicit topic pool in first batch and refresh, in both locales', () => {
  for (const locale of ['zh', 'en']) {
    const query = { text: 'jazz', desired: 'think', locale };
    const first = engine.recommendBatch(query, {}, options);
    assert.deepEqual(ids(first), ['soul']);
    assert.equal(first.relevantCount, 1);
    assert.equal(first.alternativeCount, 0);
    assert.equal(first.shortfall, 6);
    assert.equal(engine.recommendBatch(query, { recommendedIds: ids(first) }, { ...options, refresh: true }).entries.length, 0);
  }
});

test('all batches obey genre OR, country OR and strict runtime, and exhaust without repeats', () => {
  let checked = 0;
  for (const text of ['今天有点累', 'jazz', '想看太空', 'a good story'])
  for (const genres of [[], ['animation'], ['drama', 'comedy'], ['scifi', 'music']])
  for (const countries of [[], ['US'], ['JP', 'GB'], ['CN', 'FR']])
  for (const maxMinutes of [0, 90, 120, 180]) {
    const query = { text, genres, countries, maxMinutes, desired: 'comfort' };
    let history = [], first = true, previousIds = [], expected;
    for (let round = 0; round < 34; round++) {
      const result = engine.recommendBatch(query, { recommendedIds: history }, { ...options, refresh: !first, previousIds, seed: round });
      if (first) expected = result.relevantCount;
      for (const {movie} of result.entries) {
        assert.ok(!genres.length || movie.genres.some(g => genres.includes(g)));
        assert.ok(!countries.length || movie.countries.some(c => countries.includes(c)));
        assert.ok(!maxMinutes || movie.minutes <= maxMinutes);
        assert.ok(!history.includes(movie.id));
      }
      history.push(...ids(result));
      assert.equal(result.unseenCount, expected - history.length);
      first = false; previousIds = ids(result);
      if (!result.unseenCount) break;
      assert.ok(result.entries.length > 0);
    }
    assert.equal(history.length, expected); checked++;
  }
  assert.equal(checked, 256);
});

test('zero results never relax explicit topic or filters; clearing history restores candidates', () => {
  assert.equal(engine.recommendBatch({text: 'jazz', maxMinutes: 90}, {}, options).entries.length, 0);
  const query = {text:'温暖', desired:'comfort'};
  const initial = engine.recommendBatch(query, {}, options);
  const exhausted = engine.recommendBatch(query, {recommendedIds:catalog.map(m=>m.id)}, {...options,refresh:true});
  assert.equal(exhausted.entries.length,0);
  assert.deepEqual(ids(engine.recommendBatch(query,{},options)),ids(initial));
});

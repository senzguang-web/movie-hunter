(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MovieHunterCountryOrder = factory();
}(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  var commonCountries = ['US', 'JP', 'GB', 'FR', 'DE', 'CN', 'HK', 'KR', 'IN', 'IT', 'ES', 'CA', 'AU', 'TW'];
  var minimumScore = 8;
  var maxPrimary = 6;

  function parseVerifiedScore(score) {
    if (!score || (score.platform !== 'imdb' && score.platform !== 'douban')) return null;
    if (typeof score.url !== 'string') return null;
    try {
      var source = new URL(score.url);
      if (source.protocol !== 'https:' || !source.hostname || source.username || source.password) return null;
      // The source must belong to the platform being credited, not merely be an HTTPS link.
      var host = source.hostname.toLowerCase();
      if (score.platform === 'imdb' && host !== 'imdb.com' && host !== 'www.imdb.com') return null;
      if (score.platform === 'douban' && host !== 'movie.douban.com') return null;
    } catch (_) { return null; }
    var raw = score.value;
    if (typeof raw !== 'number' && typeof raw !== 'string') return null;
    if (typeof raw === 'string' && !/^\s*\d+(?:\.\d+)?\s*(?:\/\s*10)?\s*$/.test(raw)) return null;
    var value = typeof raw === 'number' ? raw : Number(raw.split('/')[0].trim());
    return Number.isFinite(value) && value >= 0 && value <= 10 ? value : null;
  }

  function buildCountryOrder(catalog, ratings) {
    var films = new Map();
    ratings = ratings && typeof ratings === 'object' ? ratings : {};
    (Array.isArray(catalog) ? catalog : []).forEach(function (movie, index) {
      if (!movie || typeof movie !== 'object') return;
      var hasId = typeof movie.id === 'string' && movie.id.trim().length > 0;
      var id = hasId ? movie.id : Symbol('unidentified-film-' + index);
      var entry = films.get(id);
      if (!entry) {
        var record = hasId && Object.prototype.hasOwnProperty.call(ratings, id) ? ratings[id] : null;
        var scores = record && Array.isArray(record.scores) ? record.scores : [];
        var values = scores.map(parseVerifiedScore).filter(function (value) { return value !== null; });
        entry = { countries: new Set(), verified: values.length > 0, highRated: values.some(function (value) { return value >= minimumScore; }) };
        films.set(id, entry);
      }
      (Array.isArray(movie.countries) ? movie.countries : []).forEach(function (code) {
        if (typeof code === 'string' && code.trim()) entry.countries.add(code.trim().toUpperCase());
      });
    });

    var counts = new Map();
    films.forEach(function (film) {
      film.countries.forEach(function (code) {
        var count = counts.get(code) || { highRatedCount: 0, verifiedCount: 0, totalCount: 0 };
        count.totalCount += 1;
        if (film.verified) count.verifiedCount += 1;
        if (film.highRated) count.highRatedCount += 1;
        counts.set(code, count);
      });
    });
    function compare(a, b) {
      var byHighRated = counts.get(b).highRatedCount - counts.get(a).highRatedCount;
      if (byHighRated) return byHighRated;
      var byTotal = counts.get(b).totalCount - counts.get(a).totalCount;
      if (byTotal) return byTotal;
      var rankA = commonCountries.indexOf(a);
      var rankB = commonCountries.indexOf(b);
      rankA = rankA === -1 ? commonCountries.length : rankA;
      rankB = rankB === -1 ? commonCountries.length : rankB;
      return rankA - rankB || (a < b ? -1 : a > b ? 1 : 0);
    }
    var codes = Array.from(counts.keys());
    var primary = codes.filter(function (code) { return commonCountries.indexOf(code) !== -1; }).sort(compare).slice(0, maxPrimary);
    var additional = codes.filter(function (code) { return primary.indexOf(code) === -1; }).sort(compare);
    return {
      primary: primary,
      additional: additional,
      stats: Object.fromEntries(counts),
      criteria: {
        scope: 'catalog',
        platforms: ['imdb', 'douban'],
        minimumScore: minimumScore,
        scoreScale: 10,
        maxPrimary: maxPrimary,
        missingScores: 'unrated',
        coProductions: 'once-per-country',
        order: ['highRatedCount:desc', 'totalCount:desc', 'common-country-order', 'country-code:asc']
      }
    };
  }

  return { buildCountryOrder: buildCountryOrder };
}));

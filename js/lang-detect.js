/**
 * Lightweight zh/en language detection.
 * Analyzes character distribution in the first 1500 chars of text.
 * @param {string} text
 * @returns {'zh'|'en'|'unknown'}
 */
function detectZhEn(text) {
  var sample = text.slice(0, 1500);
  var stripped = sample.replace(/[\s\d.,;:!?'"()\[\]{}<>\/\\@#$%^&*+=_~`|，。；：！？""''（）【】《》、\-\u2014\u2013\u2026\u00b7]/g, '');
  if (stripped.length === 0) return 'unknown';

  var cjkPattern = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g;
  var cjkCount = (stripped.match(cjkPattern) || []).length;
  var cjkRatio = cjkCount / stripped.length;

  if (cjkRatio > 0.3) return 'zh';

  var latinPattern = /[a-zA-Z]/g;
  var latinCount = (stripped.match(latinPattern) || []).length;
  var latinRatio = latinCount / stripped.length;

  if (latinRatio > 0.4) return 'en';

  return 'unknown';
}

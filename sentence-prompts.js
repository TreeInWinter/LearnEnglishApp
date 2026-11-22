(function (root) {
  'use strict';

  function cleanDefinition(pos, meaningEn) {
    var value = String(meaningEn || '').trim();
    var marker = String(pos || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (marker) value = value.replace(new RegExp('^' + marker + '\\s*', 'i'), '');
    value = value.replace(/^(?:[a-z]{1,12}\.)\s*/i, '');
    return value.replace(/[.!?]+$/, '').trim();
  }

  root.generateClozeSentence = function (word, pos, meaningEn) {
    var definition = cleanDefinition(pos, meaningEn);
    if (!definition) return 'In this lesson, ___ is used as a vocabulary word.';
    return 'In this lesson, ___ means ' + definition + '.';
  };
})(typeof window === 'object' ? window : globalThis);

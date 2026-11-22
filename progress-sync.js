(function (root) {
  'use strict';

  var LEARNING_FIELDS = ['progress', 'wrongBook', 'today', 'checkin', 'history', 'totalPracticed', 'totalCorrect'];

  function createClientId() {
    if (root.crypto && typeof root.crypto.randomUUID === 'function') return root.crypto.randomUUID();
    return 'client-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  }

  function loadMeta(storage, key) {
    var fallback = { clientId: '', localUpdatedAt: 0, serverUpdatedAt: 0, lastSyncedAt: 0 };
    try {
      var raw = storage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fallback;
      return {
        clientId: typeof parsed.clientId === 'string' ? parsed.clientId : '',
        localUpdatedAt: Number(parsed.localUpdatedAt) || 0,
        serverUpdatedAt: Number(parsed.serverUpdatedAt) || 0,
        lastSyncedAt: Number(parsed.lastSyncedAt) || 0
      };
    } catch (e) { return fallback; }
  }

  function snapshotFromState(state, clientUpdatedAt) {
    var payload = { version: 1, clientUpdatedAt: Number(clientUpdatedAt) || 0 };
    LEARNING_FIELDS.forEach(function (key) { payload[key] = state[key]; });
    return payload;
  }

  function applySnapshot(state, snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return false;
    LEARNING_FIELDS.forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(snapshot, key)) state[key] = snapshot[key];
    });
    return true;
  }

  root.LearningProgressSync = {
    createClientId: createClientId,
    loadMeta: loadMeta,
    snapshotFromState: snapshotFromState,
    applySnapshot: applySnapshot
  };
})(typeof window === 'object' ? window : globalThis);

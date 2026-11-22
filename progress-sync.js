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

  function newerProgress(local, remote) {
    if (!local) return remote;
    if (!remote) return local;
    var localDate = String(local.lastSeen || '');
    var remoteDate = String(remote.lastSeen || '');
    if (remoteDate > localDate || Number(remote.seen) > Number(local.seen)) return remote;
    return local;
  }

  function resultCount(today) {
    return today && today.results ? Object.keys(today.results).length : 0;
  }

  function mergeSnapshot(state, snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return false;
    var progress = {};
    var ids = Object.keys(state.progress || {}).concat(Object.keys(snapshot.progress || {}));
    ids.forEach(function (id) {
      if (Object.prototype.hasOwnProperty.call(progress, id)) return;
      progress[id] = newerProgress(state.progress && state.progress[id], snapshot.progress && snapshot.progress[id]);
    });
    state.progress = progress;

    var localToday = state.today;
    var remoteToday = snapshot.today;
    if (!localToday || (remoteToday && (String(remoteToday.date) > String(localToday.date) ||
        (String(remoteToday.date) === String(localToday.date) && resultCount(remoteToday) >= resultCount(localToday))))) {
      state.today = remoteToday;
    }

    var history = {};
    var dates = Object.keys(state.history || {}).concat(Object.keys(snapshot.history || {}));
    dates.forEach(function (date) {
      if (history[date]) return;
      var localDay = state.history && state.history[date];
      var remoteDay = snapshot.history && snapshot.history[date];
      history[date] = {
        done: Math.max(Number(localDay && localDay.done) || 0, Number(remoteDay && remoteDay.done) || 0),
        correct: Math.max(Number(localDay && localDay.correct) || 0, Number(remoteDay && remoteDay.correct) || 0)
      };
    });
    state.history = history;
    state.wrongBook = [...new Set([].concat(state.wrongBook || [], snapshot.wrongBook || []))]
      .filter(function (id) { return state.progress[id] && state.progress[id].wrong > 0 && !state.progress[id].mastered; });

    var localCheckin = state.checkin || {};
    var remoteCheckin = snapshot.checkin || {};
    state.checkin = String(remoteCheckin.lastDate || '') >= String(localCheckin.lastDate || '') ? remoteCheckin : localCheckin;
    state.totalPracticed = Math.max(Number(state.totalPracticed) || 0, Number(snapshot.totalPracticed) || 0);
    state.totalCorrect = Math.max(Number(state.totalCorrect) || 0, Number(snapshot.totalCorrect) || 0);
    return true;
  }

  root.LearningProgressSync = {
    createClientId: createClientId,
    loadMeta: loadMeta,
    snapshotFromState: snapshotFromState,
    applySnapshot: applySnapshot,
    mergeSnapshot: mergeSnapshot
  };
})(typeof window === 'object' ? window : globalThis);

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NovelRelease = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function parseRelease(text, manifestUrl) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length !== 2 || !/^[a-zA-Z0-9_-]{1,80}$/.test(lines[0])) throw new Error('Invalid release pointer');
    if (lines[1] !== 'releases/' + lines[0] + '/') throw new Error('Invalid release path');
    const url = new URL(lines[1], manifestUrl);
    if (url.origin !== new URL(manifestUrl).origin) throw new Error('Cross-origin release rejected');
    return { id: lines[0], url: url.href };
  }
  function createUpdateChecker(options) {
    let busy = false, announced = '';
    return { async check() {
      if (busy) return;
      busy = true;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const url = new URL(options.manifestUrl);
        url.searchParams.set('check', Date.now().toString());
        const response = await options.fetch(url.href, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) return;
        const release = parseRelease(await response.text(), options.manifestUrl);
        if (release.id !== options.currentId && release.id !== announced) {
          announced = release.id;
          options.onUpdate(release);
        }
      } catch (_) {
        // Offline, incomplete upload or invalid pointer: the current game continues.
      } finally { clearTimeout(timeout); busy = false; }
    } };
  }
  return { parseRelease, createUpdateChecker };
});

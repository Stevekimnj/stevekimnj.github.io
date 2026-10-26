// Shared helpers for every calculator page. No network calls; inputs never leave the browser.
(function (root) {
  function num(id) {
    var el = document.getElementById(id);
    if (!el) return NaN;
    var v = String(el.value).replace(/,/g, '').trim();
    return v === '' ? NaN : Number(v);
  }

  function fmt(n, digits) {
    if (!isFinite(n)) return '—';
    return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function money(n) {
    if (!isFinite(n)) return '—';
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function duration(seconds) {
    if (!isFinite(seconds) || seconds < 0) return '—';
    var s = Math.round(seconds);
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60); s -= m * 60;
    var parts = [];
    if (d) parts.push(d + ' d');
    if (h || d) parts.push(h + ' h');
    parts.push(m + ' min');
    if (!d && !h) parts.push(s + ' s');
    return parts.join(' ');
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // Recalculate whenever any input or select in the form changes.
  function bind(formId, run) {
    var form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener('input', run);
    form.addEventListener('change', run);
    form.addEventListener('submit', function (e) { e.preventDefault(); run(); });
    run();
  }

  root.UI = { num: num, fmt: fmt, money: money, duration: duration, setText: setText, bind: bind };
})(this);

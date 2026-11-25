// Chat collector: runs on the TikTok LIVE page in your own browser.
// It reads the chat messages shown on screen and sends them (text only,
// no usernames) to the website every 10 seconds, where they are counted.
(() => {
  'use strict';
  const API = '%API%';
  const TOKEN = '%TOKEN%';

  // Chat rows on TikTok's live page. Several fallbacks in case TikTok renames things.
  const ROW = '[data-e2e="chat-message"], [data-e2e="live-chat-message"], [class*="ChatMessageItem"], [class*="chat-message-item"]';
  const NAME = '[data-e2e="message-owner-name"], [class*="OwnerName"], [class*="nickname"], [class*="Nickname"]';

  const seen = new WeakSet();
  let queue = [], sent = 0, found = 0, lastOk = true;

  // little status badge in the corner
  const badge = document.createElement('div');
  badge.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:2147483647;background:#111;color:#fff;font:12px/1.4 system-ui,sans-serif;padding:8px 12px;border-radius:8px;border:2px solid #5bae3c;box-shadow:0 4px 14px rgba(0,0,0,.4);pointer-events:none';
  const show = () => {
    badge.textContent = found
      ? `📡 Chat collector: ${sent} sent${lastOk ? '' : ' ⚠️ site not reachable'}`
      : '📡 Chat collector: waiting for chat…';
    badge.style.borderColor = lastOk ? '#5bae3c' : '#e5484d';
  };
  const mount = () => document.body && !badge.isConnected && document.body.appendChild(badge);

  function textOf(row) {
    const clone = row.cloneNode(true);
    clone.querySelectorAll(NAME).forEach(n => n.remove());
    clone.querySelectorAll('img, svg, [class*="Badge"], [class*="badge"]').forEach(n => n.remove());
    return (clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function scan() {
    document.querySelectorAll(ROW).forEach(row => {
      if (seen.has(row)) return;
      seen.add(row);
      const t = textOf(row);
      if (t && t.length <= 80) { queue.push(t); found++; }
    });
  }

  function flush() {
    mount(); scan();
    if (!queue.length) { show(); return; }
    const batch = queue.splice(0, 500);
    GM_xmlhttpRequest({
      method: 'POST',
      url: API,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: 'a=chat_push&token=' + encodeURIComponent(TOKEN) + '&msgs=' + encodeURIComponent(JSON.stringify(batch)),
      onload: r => { lastOk = r.status === 200; if (lastOk) sent += batch.length; else queue = batch.concat(queue).slice(0, 2000); show(); },
      onerror: () => { lastOk = false; queue = batch.concat(queue).slice(0, 2000); show(); },
    });
  }

  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  setInterval(flush, 10000);
  setTimeout(() => { mount(); show(); }, 1500);
})();

// Live collector: runs on the TikTok LIVE page in your own browser.
// Every 10 seconds it sends what it saw on screen to the website:
//   - chat messages (for "Most said in chat")
//   - who wrote them (for "Top Viewers": most active in chat)
//   - gifts (for "Top Donators", counted in coins)
// Click the badge in the corner to copy a short report if something looks wrong.
(() => {
  'use strict';
  const API = '%API%';
  const TOKEN = '%TOKEN%';

  // What TikTok calls things on the live page, with fallbacks in case it renames them.
  const ROW = '[data-e2e="chat-message"], [data-e2e="live-chat-message"], [data-e2e*="gift-message"], [data-e2e*="social-message"], [class*="ChatMessageItem"], [class*="chat-message-item"], [class*="GiftMessage"], [class*="DivGiftItem"]';
  const NAME = '[data-e2e="message-owner-name"], [data-e2e*="owner-name"], [class*="OwnerName"], [class*="nickname"], [class*="Nickname"], [class*="UserName"]';
  // "name sent Rose ×5" (English), "name heeft Roos gestuurd ×5" / "name stuurde Roos" (Dutch)
  const GIFT_RE = [
    /^(?<u>.+?)\s*:?\s+sent\s+(?:a\s+|an\s+)?(?<g>.+?)(?:\s*[x×]\s*(?<n>\d+))?$/i,
    /^(?<u>.+?)\s+heeft\s+(?:een\s+)?(?<g>.+?)\s+(?:gestuurd|verstuurd|gegeven)(?:\s*[x×]\s*(?<n>\d+))?$/i,
    /^(?<u>.+?)\s+stuurde\s+(?:een\s+)?(?<g>.+?)(?:\s*[x×]\s*(?<n>\d+))?$/i,
  ];
  const DUTCH_GIFTS = { roos: 'rose', vingerhartje: 'finger heart', 'hand hartjes': 'hand hearts', donut: 'doughnut', parfum: 'perfume', zonnebril: 'sunglasses', leeuw: 'lion', universum: 'universe', zwaan: 'swan', trein: 'train', melkweg: 'galaxy', vuurwerk: 'fireworks', 'geld pistool': 'money gun', 'ijsje': 'ice cream cone' };

  const done = new WeakMap();          // row -> last gift count already sent (gift combos grow: ×1, ×2, ×3…)
  let msgs = [], users = [], gifts = [];
  let sentMsgs = 0, sentGifts = 0, rowsSeen = 0, lastOk = true;
  const recent = [];                   // last raw rows, for the debug report

  const clean = t => (t || '').replace(/\s+/g, ' ').trim();

  function parts(row) {
    const nameEl = row.querySelector(NAME);
    const name = clean(nameEl && (nameEl.innerText || nameEl.textContent));
    const clone = row.cloneNode(true);
    clone.querySelectorAll(NAME).forEach(n => n.remove());
    const giftImg = row.querySelector('img[alt]:not([alt=""])');
    clone.querySelectorAll('img, svg, [class*="Badge"], [class*="badge"]').forEach(n => n.remove());
    return { name, text: clean(clone.innerText || clone.textContent), full: clean(row.innerText || row.textContent), img: giftImg ? clean(giftImg.alt) : '' };
  }

  function asGift(p) {
    for (const re of GIFT_RE) {
      const m = (p.name ? `${p.name} ${p.text}` : p.full).match(re);
      if (!m) continue;
      let g = clean(m.groups.g).replace(/[x×]\s*\d+$/, '').trim().toLowerCase();
      if (p.img && !/^\d+$/.test(p.img)) g = p.img.toLowerCase();
      g = DUTCH_GIFTS[g] || g;
      const n = parseInt(m.groups.n || (p.full.match(/[x×]\s*(\d+)\s*$/) || [])[1] || '1', 10);
      return { u: p.name || clean(m.groups.u), g, n };
    }
    return null;
  }

  function handle(row) {
    const p = parts(row);
    if (!p.full) return;
    // only rows TikTok marks as gifts, or lines that start with "sent …" (so "I sent you love" in chat stays chat)
    const giftish = row.matches('[data-e2e*="gift"], [class*="Gift"]') || /^(sent|heeft|stuurde)\b/i.test(p.text);
    const gift = giftish ? asGift(p) : null;
    if (gift) {
      const before = done.get(row) || 0;
      if (gift.n > before) { gifts.push({ u: gift.u, g: gift.g, n: gift.n - before }); done.set(row, gift.n); }
      return;
    }
    if (done.has(row)) return;
    done.set(row, 1);
    rowsSeen++;
    recent.push(p.full.slice(0, 120)); if (recent.length > 25) recent.shift();
    if (p.text && p.text.length <= 80) msgs.push(p.text);
    if (p.name) users.push(p.name);
  }

  const scan = () => document.querySelectorAll(ROW).forEach(handle);

  // badge in the corner
  const badge = document.createElement('button');
  badge.type = 'button';
  badge.title = 'Click to copy a report (send it to whoever set this up if something looks wrong)';
  badge.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:2147483647;background:#111;color:#fff;font:12px/1.4 system-ui,sans-serif;padding:8px 12px;border-radius:8px;border:2px solid #5bae3c;box-shadow:0 4px 14px rgba(0,0,0,.4);cursor:pointer;text-align:left';
  const show = () => {
    badge.textContent = rowsSeen || sentGifts
      ? `📡 Collector: ${sentMsgs} chat · ${sentGifts} gifts sent${lastOk ? '' : ' ⚠️ site not reachable'}`
      : '📡 Collector: waiting for chat…';
    badge.style.borderColor = lastOk ? '#5bae3c' : '#e5484d';
  };
  badge.addEventListener('click', () => {
    const e2e = {};
    document.querySelectorAll('[data-e2e]').forEach(el => { const k = el.getAttribute('data-e2e'); e2e[k] = (e2e[k] || 0) + 1; });
    const report = ['Collector report', 'page: ' + location.href, 'rows found: ' + rowsSeen + ', chat sent: ' + sentMsgs + ', gifts sent: ' + sentGifts,
      'page parts: ' + Object.entries(e2e).map(([k, v]) => k + '×' + v).join(', ').slice(0, 1500), 'last rows:', ...recent].join('\n');
    const copied = () => { badge.textContent = '📋 Report copied! Paste it to whoever set this up.'; setTimeout(show, 3000); };
    navigator.clipboard.writeText(report).then(copied).catch(() => {
      // copying blocked: show the report so it can be copied by hand
      const box = document.createElement('textarea');
      box.value = report;
      box.style.cssText = 'position:fixed;left:12px;bottom:60px;width:min(520px,90vw);height:260px;z-index:2147483647;font:12px monospace;background:#fff;color:#000';
      document.body.appendChild(box); box.select();
      box.addEventListener('blur', () => box.remove());
      badge.textContent = '📋 Select all + copy (Ctrl+C) the text above';
    });
  });
  const mount = () => document.body && !badge.isConnected && document.body.appendChild(badge);

  function flush() {
    mount(); scan();
    if (!msgs.length && !users.length && !gifts.length) { show(); return; }
    const batch = { msgs: msgs.splice(0, 500), users: users.splice(0, 500), gifts: gifts.splice(0, 200) };
    GM_xmlhttpRequest({
      method: 'POST',
      url: API,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: 'a=chat_push&token=' + encodeURIComponent(TOKEN) + '&msgs=' + encodeURIComponent(JSON.stringify(batch.msgs)) +
            '&users=' + encodeURIComponent(JSON.stringify(batch.users)) + '&gifts=' + encodeURIComponent(JSON.stringify(batch.gifts)),
      onload: r => {
        lastOk = r.status === 200;
        if (lastOk) { sentMsgs += batch.msgs.length; sentGifts += batch.gifts.length; }
        else { msgs = batch.msgs.concat(msgs).slice(0, 2000); users = batch.users.concat(users).slice(0, 2000); gifts = batch.gifts.concat(gifts).slice(0, 500); }
        show();
      },
      onerror: () => { lastOk = false; msgs = batch.msgs.concat(msgs).slice(0, 2000); users = batch.users.concat(users).slice(0, 2000); gifts = batch.gifts.concat(gifts).slice(0, 500); show(); },
    });
  }

  // gift combos change text in place, so also watch text changes
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  setInterval(flush, 10000);
  setTimeout(() => { mount(); show(); }, 1500);
})();

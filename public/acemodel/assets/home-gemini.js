const section = document.querySelector('[data-gemini-prices]');
const table = section.querySelector('table');
const root = new URL('../../', import.meta.url);
const live = ['acecode.cc', 'acecodedownload.b-cdn.net'].includes(location.hostname);
const ids = ['gemini-4-argon', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 4 });

async function loadPrices() {
  const response = await fetch(new URL(live ? 'api/key-usage/pricing' : 'data/pricing.json', root), {
    credentials: 'omit', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) return;
  const { models } = await response.json();
  if (!Array.isArray(models)) return;
  for (const id of ids) {
    const model = models.find(item => item.model === id && ['antigravity', 'gemini'].includes(item.channel));
    if (!model || !Number.isFinite(model.pricing?.input) || !Number.isFinite(model.pricing?.output)) continue;
    const row = table.tBodies[0].insertRow();
    const name = document.createElement('th');
    name.scope = 'row';
    name.textContent = id;
    row.append(name);
    row.insertCell().textContent = dollars.format(model.pricing.input);
    row.insertCell().textContent = dollars.format(model.pricing.output);
  }
  table.hidden = !table.tBodies[0].rows.length;
}

loadPrices().catch(() => { /* The link to the full price list is always available. */ });

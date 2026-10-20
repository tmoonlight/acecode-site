'use strict';
const tabs = [...document.querySelectorAll('[data-mode]')];
function select(tab) { for (const item of tabs) { const active = item === tab; item.setAttribute('aria-selected', String(active)); item.tabIndex = active ? 0 : -1; document.getElementById(item.getAttribute('aria-controls')).hidden = !active; } }
for (const tab of tabs) { tab.addEventListener('click', () => select(tab)); tab.addEventListener('keydown', e => { if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return; e.preventDefault(); const next = e.key === 'Home' ? tabs[0] : e.key === 'End' ? tabs[tabs.length-1] : tabs[(tabs.indexOf(tab)+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length]; select(next); next.focus(); }); }
if (tabs[0]) select(tabs[0]);

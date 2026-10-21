import {getSiteLanguage} from './site-language.js';
import {interfaceCopy} from './interface-copy.js';

export function translateInterface(source, values = [], language = getSiteLanguage()) {
  const copy = interfaceCopy[source];
  const text = copy?.[language] ?? source;
  return text.replace(/\{(\d+)\}/g, (match, index) => values[index] === undefined ? match : String(values[index]));
}
export const t = translateInterface;

export function localizeTree(root) {
  const translateText = value => {
    if (interfaceCopy[value]) return t(value);
    const key = value.trim();
    return interfaceCopy[key] ? value.replace(key, t(key)) : value;
  };
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: node => node.parentElement?.closest('script,style,pre,code,textarea,select,[data-language-original]')
      ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  while (walker.nextNode()) walker.currentNode.nodeValue = translateText(walker.currentNode.nodeValue);
  for (const node of [root, ...root.querySelectorAll('[aria-label],[title],[placeholder]')]) {
    if (!node.getAttribute || node.closest('[data-language-original]')) continue;
    for (const attr of ['aria-label', 'title', 'placeholder']) {
      const value = node.getAttribute(attr);
      if (value) node.setAttribute(attr, translateText(value));
    }
  }
}

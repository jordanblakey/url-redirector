import { initializePage } from './ui.js';

const init = () => {
  const manifest = chrome.runtime.getManifest();
  const versionElement = document.getElementById('app-version');
  if (versionElement) {
    versionElement.textContent = `v${manifest.version}`;
  }

  const sourceInput = document.getElementById('sourceUrl') as HTMLInputElement;
  const targetInput = document.getElementById('targetUrl') as HTMLInputElement;
  const addBtn = document.getElementById('addRuleBtn') as HTMLButtonElement;
  const rulesList = document.getElementById('rulesList') as HTMLUListElement;

  initializePage(sourceInput, targetInput, addBtn, rulesList, true);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

import { initializePage } from './ui.js';

const init = () => {
  const sourceInput = document.getElementById('sourceUrl') as HTMLInputElement;
  const targetInput = document.getElementById('targetUrl') as HTMLInputElement;
  const addBtn = document.getElementById('addRuleBtn') as HTMLButtonElement;
  const rulesList = document.getElementById('rulesList') as HTMLUListElement;

  initializePage(sourceInput, targetInput, addBtn, rulesList);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

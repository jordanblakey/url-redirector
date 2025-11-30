import { Rule } from './types';
import { isValidUrl } from './utils.js';
import {
  renderRules,
  updatePauseButtons,
  showFlashMessage,
  setupPlaceholderButtons,
  handleAddRule,
  handleDeleteRule,
  handleToggleRule,
} from './ui.js';
import { getThematicPair } from './suggestions.js';
import { storage } from './storage.js';

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

  loadRules();

  // Listen for changes in storage and refresh the list
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.rules) {
      loadRules();
    }
  });

  // Refresh UI every second to update pause countdowns
  setInterval(() => {
    updatePauseButtons(rulesList);
  }, 1000);

  const updateButtonText = () => {
    const source = sourceInput.value.trim();
    const target = targetInput.value.trim();

    if (source && !target) {
      addBtn.textContent = 'Add Shuffle Rule';
    } else {
      addBtn.textContent = 'Add Rule';
    }
  };

  sourceInput.addEventListener('input', updateButtonText);
  targetInput.addEventListener('input', updateButtonText);

  // Call immediately to set initial state
  updateButtonText();

  addBtn.addEventListener('click', async () => {
    const source = sourceInput.value.trim();
    let target = targetInput.value.trim();

    if (!source && !target) {
      showFlashMessage('Please enter both source and target URLs', 'error');
      return;
    }

    if (!source) {
      showFlashMessage('Please enter a source URL.', 'error');
      return;
    }

    // Shuffle Mode
    if (source && !target) {
      target = ':shuffle:';
    }

    if (!isValidUrl(source)) {
      showFlashMessage('Invalid Source URL.', 'error');
      return;
    }

    if (target !== ':shuffle:' && !isValidUrl(target)) {
      showFlashMessage('Invalid Target URL.', 'error');
      return;
    }

    if (source === target) {
      showFlashMessage('Source and target cannot be the same.', 'error');
      return;
    }

    await addRule(source, target);
  });

  chrome.storage.onChanged.addListener((changes, _areaName) => {
    if (changes.rules) {
      loadRules();
    }
  });

  const handleEnter = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      addBtn.click();
    }
  };

  sourceInput.addEventListener('keypress', handleEnter);
  targetInput.addEventListener('keypress', handleEnter);

  // Initialize placeholder copy buttons
  setupPlaceholderButtons();

  setSmartPlaceholders();

  function setSmartPlaceholders(): void {
    const { source, target } = getThematicPair();
    sourceInput.placeholder = `e.g. ${source}`;
    targetInput.placeholder = `e.g. ${target}`;
  }

  async function loadRules(): Promise<void> {
    const rules = await storage.getRules();
    renderRulesList(rules);
  }

  async function addRule(source: string, target: string): Promise<void> {
    await handleAddRule(source, target, async () => {
      sourceInput.value = '';
      targetInput.value = '';
      updateButtonText();
      await loadRules();
    });
  }

  async function deleteRule(id: number): Promise<void> {
    await handleDeleteRule(id, (newRules) => {
      renderRulesList(newRules);
    });
  }

  async function toggleRule(id: number): Promise<void> {
    await handleToggleRule(id, (rules) => {
      renderRulesList(rules);
    });
  }

  function renderRulesList(rules: Rule[]): void {
    renderRules(rules, rulesList, toggleRule, deleteRule);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

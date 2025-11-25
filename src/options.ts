import { Rule, StorageResult } from './types';
import { matchAndGetTarget, isValidUrl } from './utils.js';
import { getRandomMessage } from './messages.js';
import { renderRules, updatePauseButtons, toggleRuleState, showFlashMessage, setupPlaceholderButtons } from './ui.js';
import { getThematicPair } from './suggestions.js';

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

    addBtn.addEventListener('click', () => {
        const source = sourceInput.value.trim();
        let target = targetInput.value.trim();

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

        addRule(source, target);
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

    function loadRules(): void {
        chrome.storage.local.get(['rules'], (result: StorageResult) => {
            const rules = result.rules || [];
            renderRulesList(rules);
        });
    }

    function addRule(source: string, target: string): void {
        chrome.storage.local.get(['rules'], (result: StorageResult) => {
            const rules = result.rules || [];

            // Check for duplicate source
            if (rules.some(rule => rule.source === source)) {
                showFlashMessage('Duplicate source. A rule for this source URL already exists.', 'error');
                return;
            }

            const newRule: Rule = { source, target, id: Date.now(), count: 0, active: true };
            rules.push(newRule);

            chrome.storage.local.set({ rules }, () => {
                sourceInput.value = '';
                targetInput.value = '';
                updateButtonText();
                renderRulesList(rules);
                showFlashMessage('Rule added successfully!', 'success');

                // Check existing tabs for redirect
                checkAndRedirectTabs(newRule);
            });
        });
    }

    function checkAndRedirectTabs(rule: Rule): void {
        chrome.tabs.query({}, (tabs) => {
            let matchCount = 0;

            for (const tab of tabs) {
                if (tab.id && tab.url) {
                    const targetUrl = matchAndGetTarget(tab.url, rule);
                    if (targetUrl) {
                        matchCount++;
                        // Update tab immediately
                        chrome.tabs.update(tab.id, { url: targetUrl });
                    }
                }
            }

            // Increment count in bulk if matches found
            if (matchCount > 0) {
                incrementRuleCount(rule.id, matchCount);
            }
        });
    }

    function incrementRuleCount(ruleId: number, incrementBy: number): void {
        chrome.storage.local.get(['rules'], (result: StorageResult) => {
            const rules = result.rules || [];
            const rule = rules.find(r => r.id === ruleId);
            if (rule) {
                rule.count = (rule.count || 0) + incrementBy;
                rule.lastCountMessage = getRandomMessage(rule.count);
                chrome.storage.local.set({ rules }, () => {
                    renderRulesList(rules);
                });
            }
        });
    }

    function deleteRule(id: number): void {
        chrome.storage.local.get(['rules'], (result: StorageResult) => {
            const rules = result.rules || [];
            const newRules = rules.filter((rule) => rule.id !== id);

            chrome.storage.local.set({ rules: newRules }, () => {
                renderRulesList(newRules);
                showFlashMessage('Rule deleted.', 'info');
            });
        });
    }

    function toggleRule(id: number): void {
        chrome.storage.local.get(['rules'], (result: StorageResult) => {
            const rules = result.rules || [];
            const rule = rules.find((r) => r.id === id);
            if (rule) {
                toggleRuleState(rule);

                chrome.storage.local.set({ rules }, () => {
                    renderRulesList(rules);

                    // If we just resumed (active=true, no pausedUntil), we should check for redirects
                    if (rule.active && !rule.pausedUntil) {
                        checkAndRedirectTabs(rule);
                    }
                });
            }
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

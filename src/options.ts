import { Rule, StorageResult } from './types';
import { matchAndGetTarget } from './utils.js';
import { getRandomMessage } from './messages.js';
import { renderRules } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
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

    addBtn.addEventListener('click', () => {
        const source = sourceInput.value.trim();
        const target = targetInput.value.trim();

        if (!source || !target) {
            alert('Please enter both source and target URLs.');
            return;
        }

        if (!isValidUrl(source) || !isValidUrl(target)) {
            alert('Invalid URL. Please enter a valid URL (e.g., example.com or https://example.com).');
            return;
        }

        if (source === target) {
            alert('Source and target cannot be the same.');
            return;
        }

        addRule(source, target);
    });

    function isValidUrl(string: string): boolean {
        try {
            // Check if it matches a basic domain pattern or full URL
            const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
            if (urlPattern.test(string)) {
                return true;
            }
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    const handleEnter = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            addBtn.click();
        }
    };

    sourceInput.addEventListener('keypress', handleEnter);
    targetInput.addEventListener('keypress', handleEnter);

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
                alert('Duplicate source. A rule for this source URL already exists.');
                return;
            }

            const newRule: Rule = { source, target, id: Date.now(), count: 0, active: true };
            rules.push(newRule);

            chrome.storage.local.set({ rules }, () => {
                sourceInput.value = '';
                targetInput.value = '';
                renderRulesList(rules);

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
            });
        });
    }

    function toggleRule(id: number): void {
        chrome.storage.local.get(['rules'], (result: StorageResult) => {
            const rules = result.rules || [];
            const rule = rules.find((r) => r.id === id);
            if (rule) {
                rule.active = !rule.active;
                chrome.storage.local.set({ rules }, () => {
                    renderRulesList(rules);
                });
            }
        });
    }

    function renderRulesList(rules: Rule[]): void {
        renderRules(rules, rulesList, toggleRule, deleteRule);
    }
});

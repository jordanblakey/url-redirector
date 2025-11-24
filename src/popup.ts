import { Rule } from './types';
import { renderRules, updatePauseButtons } from './ui.js';
import { getThematicPair } from './suggestions.js';

document.addEventListener('DOMContentLoaded', () => {
    const sourceInput = document.getElementById('sourceUrl') as HTMLInputElement;
    const targetInput = document.getElementById('targetUrl') as HTMLInputElement;
    const addBtn = document.getElementById('addRuleBtn') as HTMLButtonElement;
    const rulesList = document.getElementById('rulesList') as HTMLUListElement;

    loadRules();

    // Refresh UI every second to update pause countdowns
    setInterval(() => {
        updatePauseButtons(rulesList);
    }, 1000);

    addBtn.addEventListener('click', () => {
        const source = sourceInput.value.trim();
        const target = targetInput.value.trim();

        if (!source || !target) {
            alert('Please enter both source and target URLs.');
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

    setSmartPlaceholders();

    function setSmartPlaceholders(): void {
        const { source, target } = getThematicPair();

        sourceInput.placeholder = `e.g. ${source}`;
        targetInput.placeholder = `e.g. ${target}`;
    }

    function loadRules(): void {
        chrome.storage.local.get(['rules'], (result) => {
            const rules = (result.rules as Rule[]) || [];
            renderRulesList(rules);
        });
    }

    function addRule(source: string, target: string): void {
        chrome.storage.local.get(['rules'], (result) => {
            const rules = (result.rules as Rule[]) || [];
            // Simple duplicate check could be added here
            rules.push({ source, target, id: Date.now(), count: 0, active: true });

            chrome.storage.local.set({ rules }, () => {
                sourceInput.value = '';
                targetInput.value = '';
                renderRulesList(rules);
            });
        });
    }

    function deleteRule(id: number): void {
        chrome.storage.local.get(['rules'], (result) => {
            const rules = (result.rules as Rule[]) || [];
            const newRules = rules.filter((rule) => rule.id !== id);

            chrome.storage.local.set({ rules: newRules }, () => {
                renderRulesList(newRules);
            });
        });
    }

    function renderRulesList(rules: Rule[]): void {
        renderRules(rules, rulesList, togglePauseRule, deleteRule);
    }

    function togglePauseRule(id: number): void {
        chrome.storage.local.get(['rules'], (result) => {
            const rules = (result.rules as Rule[]) || [];
            const rule = rules.find((r) => r.id === id);
            if (rule) {
                const now = Date.now();
                if (rule.pausedUntil && rule.pausedUntil > now) {
                    // Already paused, so resume
                    rule.pausedUntil = undefined;
                    rule.active = true; // Ensure it's active
                } else if (!rule.active) {
                    // It was permanently disabled, enable it
                    rule.active = true;
                    rule.pausedUntil = undefined;
                } else {
                    // Active and not paused, so pause it for 5 minutes
                    rule.pausedUntil = now + 5 * 60 * 1000;
                }

                chrome.storage.local.set({ rules }, () => {
                    renderRulesList(rules);
                });
            }
        });
    }
});

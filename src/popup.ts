import { Rule } from './types';
import { getRandomMessage } from './messages.js';
import { renderRules } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    const sourceInput = document.getElementById('sourceUrl') as HTMLInputElement;
    const targetInput = document.getElementById('targetUrl') as HTMLInputElement;
    const addBtn = document.getElementById('addRuleBtn') as HTMLButtonElement;
    const rulesList = document.getElementById('rulesList') as HTMLUListElement;

    // Load rules on startup
    loadRules();

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
        renderRules(rules, rulesList, toggleRule, deleteRule);
    }

    function toggleRule(id: number): void {
        chrome.storage.local.get(['rules'], (result) => {
            const rules = (result.rules as Rule[]) || [];
            const rule = rules.find((r) => r.id === id);
            if (rule) {
                rule.active = !rule.active;
                chrome.storage.local.set({ rules }, () => {
                    renderRulesList(rules);
                });
            }
        });
    }
});

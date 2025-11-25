import { Rule } from './types';
import { renderRules, showFlashMessage, updatePauseButtons, toggleRuleState, setupPlaceholderButtons } from './ui.js';
import { getThematicPair } from './suggestions.js';
import { storage } from './storage.js';
import { isValidUrl } from './utils.js';

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

    addBtn.addEventListener('click', async () => {
        const source = sourceInput.value.trim();
        const target = targetInput.value.trim();

        if (!source || !target) {
            showFlashMessage('Please enter both source and target URLs.', 'error');
            return;
        }

        if (!isValidUrl(source) || !isValidUrl(target)) {
            showFlashMessage('Invalid URL. Please enter a valid URL (e.g., example.com or https://example.com).', 'error');
            return;
        }

        if (source === target) {
            showFlashMessage('Source and target cannot be the same.', 'error');
            return;
        }

        await addRule(source, target);
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
        try {
            await storage.addRule({ source, target, id: Date.now(), count: 0, active: true });
            sourceInput.value = '';
            targetInput.value = '';
            await loadRules();
            showFlashMessage('Rule added successfully!', 'success');
        } catch (e) {
            const error = e as Error;
            if (error.message === 'Duplicate source') {
                showFlashMessage('Duplicate source. A rule for this source URL already exists.', 'error');
            } else {
                showFlashMessage('Error adding rule.', 'error');
            }
        }
    }

    async function deleteRule(id: number): Promise<void> {
        const newRules = await storage.deleteRule(id);
        renderRulesList(newRules);
        showFlashMessage('Rule deleted.', 'info');
    }

    function renderRulesList(rules: Rule[]): void {
        renderRules(rules, rulesList, togglePauseRule, deleteRule);
    }

    async function togglePauseRule(id: number): Promise<void> {
        const rules = await storage.getRules();
        const rule = rules.find((r) => r.id === id);
        if (rule) {
            toggleRuleState(rule);
            await storage.saveRules(rules);
            renderRulesList(rules);
        }
    }
});

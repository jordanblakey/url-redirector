import { Rule } from './types';
import { renderRules, showFlashMessage, updatePauseButtons, setupSmartPlaceholders } from './ui.js';
import { isValidUrl } from './utils.js';
import { getRules, addRule, deleteRule, toggleRule } from './storage.js';

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

        try {
            await addRule(source, target);
            sourceInput.value = '';
            targetInput.value = '';
            await loadRules();
            showFlashMessage('Rule added successfully!', 'success');
        } catch (error) {
            if (error instanceof Error && error.message === 'Duplicate source') {
                showFlashMessage('Duplicate source. A rule for this source URL already exists.', 'error');
            } else {
                showFlashMessage('Error adding rule.', 'error');
            }
        }
    });

    const handleEnter = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            addBtn.click();
        }
    };

    sourceInput.addEventListener('keypress', handleEnter);
    targetInput.addEventListener('keypress', handleEnter);

    setupSmartPlaceholders(sourceInput, targetInput);

    async function loadRules(): Promise<void> {
        const rules = await getRules();
        renderRulesList(rules);
    }

    async function handleDeleteRule(id: number): Promise<void> {
        await deleteRule(id);
        await loadRules();
        showFlashMessage('Rule deleted.', 'info');
    }

    function renderRulesList(rules: Rule[]): void {
        renderRules(rules, rulesList, handleToggleRule, handleDeleteRule);
    }

    async function handleToggleRule(id: number): Promise<void> {
        await toggleRule(id);
        await loadRules();
    }
});

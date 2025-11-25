import { Rule } from './types';
import { renderRules, showFlashMessage, updatePauseButtons, toggleRuleState, setupPlaceholderButtons } from './ui.js';
import { getThematicPair } from './suggestions.js';

const init = () => {
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

    // Call immediately
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

    // Initialize placeholder copy buttons
    setupPlaceholderButtons();

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

            if (rules.some(rule => rule.source === source)) {
                showFlashMessage('Duplicate source. A rule for this source URL already exists.', 'error');
                return;
            }

            rules.push({ source, target, id: Date.now(), count: 0, active: true });

            chrome.storage.local.set({ rules }, () => {
                sourceInput.value = '';
                targetInput.value = '';
                updateButtonText();
                renderRulesList(rules);
                showFlashMessage('Rule added successfully!', 'success');
            });
        });
    }

    function deleteRule(id: number): void {
        chrome.storage.local.get(['rules'], (result) => {
            const rules = (result.rules as Rule[]) || [];
            const newRules = rules.filter((rule) => rule.id !== id);

            chrome.storage.local.set({ rules: newRules }, () => {
                renderRulesList(newRules);
                showFlashMessage('Rule deleted.', 'info');
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
                toggleRuleState(rule);

                chrome.storage.local.set({ rules }, () => {
                    renderRulesList(rules);
                });
            }
        });
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

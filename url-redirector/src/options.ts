import { Rule } from './types.js';

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

    function loadRules(): void {
        chrome.storage.local.get(['rules'], (result) => {
            const rules = (result.rules as Rule[]) || [];
            renderRules(rules);
        });
    }

    function addRule(source: string, target: string): void {
        chrome.storage.local.get(['rules'], (result) => {
            const rules = (result.rules as Rule[]) || [];
            // Simple duplicate check could be added here
            rules.push({ source, target, id: Date.now() });

            chrome.storage.local.set({ rules }, () => {
                sourceInput.value = '';
                targetInput.value = '';
                renderRules(rules);
            });
        });
    }

    function deleteRule(id: number): void {
        chrome.storage.local.get(['rules'], (result) => {
            const rules = (result.rules as Rule[]) || [];
            const newRules = rules.filter((rule) => rule.id !== id);

            chrome.storage.local.set({ rules: newRules }, () => {
                renderRules(newRules);
            });
        });
    }

    function renderRules(rules: Rule[]): void {
        rulesList.innerHTML = '';

        if (rules.length === 0) {
            const emptyState = document.createElement('li');
            emptyState.textContent = 'No rules added yet.';
            emptyState.style.textAlign = 'center';
            emptyState.style.color = 'var(--text-secondary)';
            emptyState.style.padding = '12px';
            rulesList.appendChild(emptyState);
            return;
        }

        rules.forEach((rule) => {
            const li = document.createElement('li');
            li.className = 'rule-item';

            const contentDiv = document.createElement('div');
            contentDiv.className = 'rule-content';

            const sourceSpan = document.createElement('span');
            sourceSpan.className = 'rule-source';
            sourceSpan.textContent = rule.source;

            const arrowSpan = document.createElement('span');
            arrowSpan.className = 'rule-arrow';
            arrowSpan.textContent = '➜';

            const targetSpan = document.createElement('span');
            targetSpan.className = 'rule-target';
            targetSpan.textContent = rule.target;

            contentDiv.appendChild(sourceSpan);
            contentDiv.appendChild(arrowSpan);
            contentDiv.appendChild(targetSpan);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = () => deleteRule(rule.id);

            li.appendChild(contentDiv);
            li.appendChild(deleteBtn);

            rulesList.appendChild(li);
        });
    }
});

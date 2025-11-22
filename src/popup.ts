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
            renderRules(rules);
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
            li.className = `rule-item ${!rule.active ? 'paused' : ''}`;

            const contentDiv = document.createElement('div');
            contentDiv.className = 'rule-content';

            const ruleLineDiv = document.createElement('div');
            ruleLineDiv.className = 'rule-line';

            const sourceSpan = document.createElement('span');
            sourceSpan.className = 'rule-source';
            sourceSpan.textContent = rule.source;

            const arrowSpan = document.createElement('span');
            arrowSpan.className = 'rule-arrow';
            arrowSpan.textContent = '➜';

            const targetSpan = document.createElement('span');
            targetSpan.className = 'rule-target';
            targetSpan.textContent = rule.target;

            ruleLineDiv.appendChild(sourceSpan);
            ruleLineDiv.appendChild(arrowSpan);
            ruleLineDiv.appendChild(targetSpan);

            const countSpan = document.createElement('span');
            countSpan.className = 'rule-count';
            const count = rule.count || 0;
            countSpan.textContent = `Used ${count} time${count !== 1 ? 's' : ''}`;

            contentDiv.appendChild(ruleLineDiv);
            contentDiv.appendChild(countSpan);

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'rule-actions';

            const toggleBtn = document.createElement('button');
            toggleBtn.className = `toggle-btn ${!rule.active ? 'paused' : ''}`;
            toggleBtn.textContent = rule.active ? 'Pause' : 'Resume';
            toggleBtn.onclick = () => toggleRule(rule.id);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = () => deleteRule(rule.id);

            actionsDiv.appendChild(toggleBtn);
            actionsDiv.appendChild(deleteBtn);

            li.appendChild(contentDiv);
            li.appendChild(actionsDiv);

            rulesList.appendChild(li);
        });
    }

    function toggleRule(id: number): void {
        chrome.storage.local.get(['rules'], (result) => {
            const rules = (result.rules as Rule[]) || [];
            const rule = rules.find((r) => r.id === id);
            if (rule) {
                rule.active = !rule.active;
                chrome.storage.local.set({ rules }, () => {
                    renderRules(rules);
                });
            }
        });
    }
});

import { Rule } from './types.js';
import { matchAndGetTarget } from './utils.js';

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
        chrome.storage.local.get(['rules'], (result) => {
            const rules = (result.rules as Rule[]) || [];
            renderRules(rules);
        });
    }

    function addRule(source: string, target: string): void {
        chrome.storage.local.get(['rules'], (result) => {
            const rules = (result.rules as Rule[]) || [];

            // Check for duplicate source
            if (rules.some(rule => rule.source === source)) {
                alert('Duplicate source. A rule for this source URL already exists.');
                return;
            }

            const newRule: Rule = { source, target, id: Date.now(), count: 0 };
            rules.push(newRule);

            chrome.storage.local.set({ rules }, () => {
                sourceInput.value = '';
                targetInput.value = '';
                renderRules(rules);

                // Check existing tabs for redirect
                checkAndRedirectTabs(newRule);
            });
        });
    }

    function checkAndRedirectTabs(rule: Rule): void {
        chrome.tabs.query({}, (tabs) => {
            let matchCount = 0;
            const tabsToUpdate: number[] = [];

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
        chrome.storage.local.get(['rules'], (result) => {
            const rules = (result.rules as Rule[]) || [];
            const rule = rules.find(r => r.id === ruleId);
            if (rule) {
                rule.count = (rule.count || 0) + incrementBy;
                chrome.storage.local.set({ rules }, () => {
                    renderRules(rules);
                });
            }
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

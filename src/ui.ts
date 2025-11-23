import { Rule } from './types';
import { getRandomMessage } from './messages.js';

export function renderRules(
    rules: Rule[],
    listElement: HTMLUListElement,
    onToggle: (id: number) => void,
    onDelete: (id: number) => void
): void {
    listElement.innerHTML = '';

    // Sort rules alphabetically by source URL
    rules.sort((a, b) => a.source.localeCompare(b.source));

    if (rules.length === 0) {
        const emptyState = document.createElement('li');
        emptyState.textContent = 'No rules added yet.';
        emptyState.style.textAlign = 'center';
        emptyState.style.color = 'var(--text-secondary)';
        emptyState.style.padding = '12px';
        listElement.appendChild(emptyState);
        return;
    }

    rules.forEach((rule) => {
        const li = document.createElement('li');
        li.className = `rule-item ${!rule.active ? 'paused' : ''}`;
        li.style.cursor = 'pointer'; // Indicate clickability

        // Toggle on row click
        li.onclick = (e) => {
            // Prevent triggering if clicking directly on buttons
            // (Buttons have their own handlers, but event bubbles. 
            // If we handle it here, we might double toggle or interfere.
            // Best to check target)
            const target = e.target as HTMLElement;
            if (target.closest('button')) {
                return;
            }
            onToggle(rule.id);
        };

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

        if (rule.lastCountMessage) {
            countSpan.innerHTML = rule.lastCountMessage;
        } else {
            countSpan.innerHTML = getRandomMessage(count);
        }

        contentDiv.appendChild(ruleLineDiv);
        contentDiv.appendChild(countSpan);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'rule-actions';

        const toggleBtn = document.createElement('button');
        toggleBtn.className = `toggle-btn ${!rule.active ? 'paused' : ''}`;
        toggleBtn.textContent = rule.active ? 'Pause' : 'Play';
        toggleBtn.onclick = () => onToggle(rule.id);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => onDelete(rule.id);

        actionsDiv.appendChild(toggleBtn);
        actionsDiv.appendChild(deleteBtn);

        li.appendChild(contentDiv);
        li.appendChild(actionsDiv);

        listElement.appendChild(li);
    });
}

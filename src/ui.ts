import { Rule } from './types';
import { getRandomMessage } from './messages.js';

const getFaviconUrl = (url: string) => {
    // Basic clean up to get the domain
    try {
        const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch (e) {
        return 'default-icon.png'; // Fallback
    }
};

export function renderRules(
    rules: Rule[],
    listElement: HTMLUListElement,
    onSnooze: (id: number) => void,
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
        const isSnoozed = rule.pausedUntil && rule.pausedUntil > Date.now();
        const li = document.createElement('li');
        li.className = `rule-item ${!rule.active || isSnoozed ? 'paused' : ''}`;
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
            onSnooze(rule.id);
        };

        const contentDiv = document.createElement('div');
        contentDiv.className = 'rule-content';

        const ruleLineDiv = document.createElement('div');
        ruleLineDiv.className = 'rule-line';

        const sourceFaviconSpan = document.createElement('span');
        sourceFaviconSpan.className = 'rule-favicon';
        sourceFaviconSpan.style.backgroundImage = `url(${getFaviconUrl(rule.source)})`;

        const sourceSpan = document.createElement('span');
        sourceSpan.className = 'rule-source';
        sourceSpan.textContent = rule.source;

        const arrowSpan = document.createElement('span');
        arrowSpan.className = 'rule-arrow';
        arrowSpan.textContent = '➜';

        const targetSpan = document.createElement('span');
        targetSpan.className = 'rule-target';
        targetSpan.textContent = rule.target;

        const targetFaviconSpan = document.createElement('span');
        targetFaviconSpan.className = 'rule-favicon';
        targetFaviconSpan.style.backgroundImage = `url(${getFaviconUrl(rule.target)})`;

        ruleLineDiv.appendChild(sourceFaviconSpan);
        ruleLineDiv.appendChild(sourceSpan);
        ruleLineDiv.appendChild(arrowSpan);
        ruleLineDiv.appendChild(targetFaviconSpan);
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
        toggleBtn.className = `toggle-btn ${!rule.active || isSnoozed ? 'paused' : ''}`;
        toggleBtn.dataset.id = String(rule.id);

        if (isSnoozed) {
             const remaining = Math.ceil(((rule.pausedUntil || 0) - Date.now()) / 1000);
             if (remaining > 60) {
                 toggleBtn.textContent = `Snoozed (${Math.ceil(remaining / 60)}m)`;
             } else {
                 toggleBtn.textContent = `Snoozed (${remaining}s)`;
             }
             toggleBtn.dataset.snoozedUntil = String(rule.pausedUntil);
        } else {
            toggleBtn.textContent = rule.active ? 'Snooze 5m' : 'Play';
            delete toggleBtn.dataset.snoozedUntil;
        }

        toggleBtn.onclick = () => onSnooze(rule.id);

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

export function updateSnoozeButtons(listElement: HTMLElement): void {
    const buttons = listElement.querySelectorAll('.toggle-btn');
    const now = Date.now();

    buttons.forEach((btn) => {
        const button = btn as HTMLButtonElement;
        const snoozedUntilStr = button.dataset.snoozedUntil;

        if (snoozedUntilStr) {
            const snoozedUntil = parseInt(snoozedUntilStr, 10);
            if (snoozedUntil > now) {
                const remaining = Math.ceil((snoozedUntil - now) / 1000);
                if (remaining > 60) {
                    button.textContent = `Snoozed (${Math.ceil(remaining / 60)}m)`;
                } else {
                    button.textContent = `Snoozed (${remaining}s)`;
                }
            } else {
                 // Expired, should probably reload or just show basic text,
                 // but for cleaner state we might want to trigger reload if it just expired.
                 // For now just update text.
                 button.textContent = 'Snooze 5m';
                 button.classList.remove('paused');
                 delete button.dataset.snoozedUntil;

                 // Also update parent row style
                 const row = button.closest('.rule-item');
                 if (row) {
                     row.classList.remove('paused');
                 }
            }
        }
    });
}

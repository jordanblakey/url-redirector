import { Rule } from './types';
import {
  getFaviconUrl,
  shouldShowFavicon,
  formatPauseButtonText,
  formatRemainingTime,
  isRulePaused,
  shouldDisplayAsPaused,
  getTargetDisplayText,
  getCountMessage,
  sortRulesBySource,
  extractPlaceholderValue,
  getNextRuleState,
} from './ui-logic.js';
import { storage } from './storage.js';

export async function handleAddRule(
  source: string,
  target: string,
  onSuccess: () => Promise<void>,
): Promise<void> {
  try {
    await storage.addRule({
      source,
      target,
      id: Date.now(),
      count: 0,
      active: true,
    });
    await onSuccess();
    showFlashMessage('Rule added successfully!', 'success');
  } catch (e) {
    const error = e as Error;
    if (error.message === 'Duplicate source') {
      showFlashMessage('Duplicate source. A rule for this source URL already exists.', 'error');
    } else if (error.message === 'Redirect loop detected') {
      showFlashMessage('Are you mad?! This would create an infinite loop!', 'error');
    } else {
      showFlashMessage('Error adding rule.', 'error');
    }
  }
}

export async function handleDeleteRule(
  id: number,
  onSuccess: (rules: Rule[]) => void,
): Promise<void> {
  const newRules = await storage.deleteRule(id);
  onSuccess(newRules);
  showFlashMessage('Rule deleted.', 'info');
}

export async function handleToggleRule(
  id: number,
  onSuccess: (rules: Rule[]) => void,
): Promise<void> {
  const rules = await storage.getRules();
  const rule = rules.find((r) => r.id === id);
  if (rule) {
    toggleRuleState(rule);
    await storage.saveRules(rules);
    onSuccess(rules);
  }
}

export function showFlashMessage(
  message: string,
  type: 'success' | 'error' | 'info' = 'info',
  duration = 3000,
): void {
  let flashContainer = document.getElementById('flash-container');
  if (!flashContainer) {
    flashContainer = document.createElement('div');
    flashContainer.id = 'flash-container';
    document.body.appendChild(flashContainer);
  }

  const flashMessage = document.createElement('div');
  flashMessage.className = `flash-message ${type}`;
  flashMessage.textContent = message;

  flashContainer.appendChild(flashMessage);

  // Trigger reflow to enable transition
  requestAnimationFrame(() => {
    flashMessage.classList.add('visible');
  });

  setTimeout(() => {
    flashMessage.classList.remove('visible');
    flashMessage.addEventListener('transitionend', () => {
      flashMessage.remove();
    });
  }, duration);
}

export function renderRules(
  rules: Rule[],
  listElement: HTMLUListElement,
  onPause: (id: number) => void,
  onDelete: (id: number) => void,
): void {
  listElement.innerHTML = '';

  // Sort rules alphabetically by source URL
  const sortedRules = sortRulesBySource(rules);

  if (sortedRules.length === 0) {
    const emptyState = document.createElement('li');
    emptyState.textContent = 'No rules added yet.';
    emptyState.style.textAlign = 'center';
    emptyState.style.color = 'var(--text-secondary)';
    emptyState.style.padding = '12px';
    listElement.appendChild(emptyState);
    return;
  }

  sortedRules.forEach((rule) => {
    const isPaused = isRulePaused(rule);
    const li = document.createElement('li');
    li.className = `rule-item ${shouldDisplayAsPaused(rule) ? 'paused' : ''}`;
    li.style.cursor = 'pointer';

    // Toggle on row click
    li.onclick = (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('button')) {
        return;
      }
      onPause(rule.id);
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
    targetSpan.textContent = getTargetDisplayText(rule.target);

    ruleLineDiv.appendChild(sourceFaviconSpan);
    ruleLineDiv.appendChild(sourceSpan);
    ruleLineDiv.appendChild(arrowSpan);

    if (shouldShowFavicon(rule.target)) {
      const targetFaviconSpan = document.createElement('span');
      targetFaviconSpan.className = 'rule-favicon';
      targetFaviconSpan.style.backgroundImage = `url(${getFaviconUrl(rule.target)})`;
      ruleLineDiv.appendChild(targetFaviconSpan);
    }
    ruleLineDiv.appendChild(targetSpan);

    const countSpan = document.createElement('span');
    countSpan.className = 'rule-count';
    countSpan.innerHTML = getCountMessage(rule);

    contentDiv.appendChild(ruleLineDiv);
    contentDiv.appendChild(countSpan);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'rule-actions';

    const toggleBtn = document.createElement('button');
    toggleBtn.className = `toggle-btn ${shouldDisplayAsPaused(rule) ? 'paused' : ''}`;
    toggleBtn.dataset.id = String(rule.id);
    toggleBtn.textContent = formatPauseButtonText(rule);

    if (isPaused) {
      toggleBtn.dataset.pausedUntil = String(rule.pausedUntil);
    } else {
      delete toggleBtn.dataset.pausedUntil;
    }

    toggleBtn.onclick = () => onPause(rule.id);

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

export function updatePauseButtons(listElement: HTMLElement): void {
  const buttons = listElement.querySelectorAll('.toggle-btn');
  const now = Date.now();

  buttons.forEach((btn) => {
    const button = btn as HTMLButtonElement;
    const pausedUntilStr = button.dataset.pausedUntil;

    if (pausedUntilStr) {
      const pausedUntil = parseInt(pausedUntilStr, 10);
      if (pausedUntil > now) {
        button.textContent = formatRemainingTime(pausedUntil);
      } else {
        button.textContent = 'Pause';
        button.classList.remove('paused');
        delete button.dataset.pausedUntil;

        const row = button.closest('.rule-item');
        if (row) {
          row.classList.remove('paused');
        }
      }
    }
  });
}

export function toggleRuleState(rule: Rule): void {
  const nextState = getNextRuleState(rule);
  Object.assign(rule, nextState);
}

export function setupPlaceholderButtons(): void {
  const usePlaceholderBtns = document.querySelectorAll('.use-placeholder-btn');
  usePlaceholderBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.currentTarget as HTMLButtonElement;
      const inputId = targetBtn.getAttribute('data-input-id');
      if (!inputId) return;
      const input = document.getElementById(inputId) as HTMLInputElement;
      if (!input) return;

      const placeholder = extractPlaceholderValue(input.placeholder);

      if (placeholder && placeholder.trim() !== '') {
        input.value = placeholder;
        // Trigger input event to update button text
        const event = new Event('input');
        input.dispatchEvent(event);

        input.focus();
        navigator.clipboard.writeText(placeholder).catch((err) => {
          console.error('Failed to copy to clipboard: ', err);
        });
        const originalColor = targetBtn.style.color;
        targetBtn.style.color = 'var(--success-color, #10b981)';
        setTimeout(() => {
          targetBtn.style.color = originalColor;
        }, 1000);
      }
    });
  });
}

// Re-export getFaviconUrl for backward compatibility
export { getFaviconUrl } from './ui-logic.js';

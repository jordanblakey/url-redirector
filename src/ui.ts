import { Rule } from "./types";
import { getRandomMessage } from "./messages.js";

export const getFaviconUrl = (url: string) => {
    // Basic clean up to get the domain
    try {
        const domain = new URL(url.startsWith("http") ? url : `https://${url}`)
            .hostname;
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch (e) {
        return "default-icon.png"; // Fallback
    }
};

export function showFlashMessage(
    message: string,
    type: "success" | "error" | "info" = "info",
    duration = 3000
): void {
    let flashContainer = document.getElementById("flash-container");
    if (!flashContainer) {
        flashContainer = document.createElement("div");
        flashContainer.id = "flash-container";
        document.body.appendChild(flashContainer);
    }

    const flashMessage = document.createElement("div");
    flashMessage.className = `flash-message ${type}`;
    flashMessage.textContent = message;

    flashContainer.appendChild(flashMessage);

    // Trigger reflow to enable transition
    requestAnimationFrame(() => {
        flashMessage.classList.add("visible");
    });

    setTimeout(() => {
        flashMessage.classList.remove("visible");
        flashMessage.addEventListener("transitionend", () => {
            flashMessage.remove();
        });
    }, duration);
}

export function renderRules(
    rules: Rule[],
    listElement: HTMLUListElement,
    onPause: (id: number) => void,
    onDelete: (id: number) => void
): void {
    listElement.innerHTML = "";

    // Sort rules alphabetically by source URL
    rules.sort((a, b) => a.source.localeCompare(b.source));

    if (rules.length === 0) {
        const emptyState = document.createElement("li");
        emptyState.textContent = "No rules added yet.";
        emptyState.style.textAlign = "center";
        emptyState.style.color = "var(--text-secondary)";
        emptyState.style.padding = "12px";
        listElement.appendChild(emptyState);
        return;
    }

    rules.forEach((rule) => {
        const isPaused = rule.pausedUntil && rule.pausedUntil > Date.now();
        const li = document.createElement("li");
        li.className = `rule-item ${!rule.active || isPaused ? "paused" : ""}`;
        li.style.cursor = "pointer"; // Indicate clickability

        // Toggle on row click
        li.onclick = (e) => {
            // Prevent triggering if clicking directly on buttons
            const target = e.target as HTMLElement;
            if (target.closest("button")) {
                return;
            }
            onPause(rule.id);
        };

        const contentDiv = document.createElement("div");
        contentDiv.className = "rule-content";

        const ruleLineDiv = document.createElement("div");
        ruleLineDiv.className = "rule-line";

        const sourceFaviconSpan = document.createElement("span");
        sourceFaviconSpan.className = "rule-favicon";
        sourceFaviconSpan.style.backgroundImage = `url(${getFaviconUrl(
            rule.source
        )})`;

        const sourceSpan = document.createElement("span");
        sourceSpan.className = "rule-source";
        sourceSpan.textContent = rule.source;

        const arrowSpan = document.createElement("span");
        arrowSpan.className = "rule-arrow";
        arrowSpan.textContent = "➜";

        const targetSpan = document.createElement('span');
        targetSpan.className = 'rule-target';

        const isShuffle = rule.target === ':shuffle:';
        targetSpan.textContent = isShuffle ? '🔀 shuffle' : rule.target;

        ruleLineDiv.appendChild(sourceFaviconSpan);
        ruleLineDiv.appendChild(sourceSpan);
        ruleLineDiv.appendChild(arrowSpan);

        if (!isShuffle) {
            const targetFaviconSpan = document.createElement('span');
            targetFaviconSpan.className = 'rule-favicon';
            targetFaviconSpan.style.backgroundImage = `url(${getFaviconUrl(rule.target)})`;
            ruleLineDiv.appendChild(targetFaviconSpan);
        }
        ruleLineDiv.appendChild(targetSpan);

        const countSpan = document.createElement("span");
        countSpan.className = "rule-count";
        const count = rule.count || 0;

        if (rule.lastCountMessage) {
            countSpan.innerHTML = rule.lastCountMessage;
        } else {
            countSpan.innerHTML = getRandomMessage(count);
        }

        contentDiv.appendChild(ruleLineDiv);
        contentDiv.appendChild(countSpan);

        const actionsDiv = document.createElement("div");
        actionsDiv.className = "rule-actions";

        const toggleBtn = document.createElement("button");
        toggleBtn.className = `toggle-btn ${!rule.active || isPaused ? "paused" : ""
            }`;
        toggleBtn.dataset.id = String(rule.id);

        if (isPaused) {
            const remaining = Math.ceil(
                ((rule.pausedUntil || 0) - Date.now()) / 1000
            );
            if (remaining > 60) {
                toggleBtn.textContent = `Paused (${Math.ceil(remaining / 60)}m)`;
            } else {
                toggleBtn.textContent = `Paused (${remaining}s)`;
            }
            toggleBtn.dataset.pausedUntil = String(rule.pausedUntil);
        } else {
            toggleBtn.textContent = rule.active ? "Pause" : "Play";
            delete toggleBtn.dataset.pausedUntil;
        }

        toggleBtn.onclick = () => onPause(rule.id);

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-btn";
        deleteBtn.textContent = "Delete";
        deleteBtn.onclick = () => onDelete(rule.id);

        actionsDiv.appendChild(toggleBtn);
        actionsDiv.appendChild(deleteBtn);

        li.appendChild(contentDiv);
        li.appendChild(actionsDiv);

        listElement.appendChild(li);
    });
}

export function updatePauseButtons(listElement: HTMLElement): void {
    const buttons = listElement.querySelectorAll(".toggle-btn");
    const now = Date.now();

    buttons.forEach((btn) => {
        const button = btn as HTMLButtonElement;
        const pausedUntilStr = button.dataset.pausedUntil;

        if (pausedUntilStr) {
            const pausedUntil = parseInt(pausedUntilStr, 10);
            if (pausedUntil > now) {
                const remaining = Math.ceil((pausedUntil - now) / 1000);
                if (remaining > 60) {
                    button.textContent = `Paused (${Math.ceil(remaining / 60)}m)`;
                } else {
                    button.textContent = `Paused (${remaining}s)`;
                }
            } else {
                button.textContent = "Pause";
                button.classList.remove("paused");
                delete button.dataset.pausedUntil;

                const row = button.closest(".rule-item");
                if (row) {
                    row.classList.remove("paused");
                }
            }
        }
    });
}

export function toggleRuleState(rule: Rule): void {
    const now = Date.now();
    if (rule.pausedUntil && rule.pausedUntil > now) {
        // Already paused, so resume
        rule.pausedUntil = undefined;
        rule.active = true;
    } else if (!rule.active) {
        // It was permanently disabled, enable it
        rule.active = true;
        rule.pausedUntil = undefined;
    } else {
        // Active and not paused, so pause it for 5 minutes
        rule.pausedUntil = now + 5 * 60 * 1000;
    }
}

export function setupPlaceholderButtons(): void {
    const usePlaceholderBtns = document.querySelectorAll('.use-placeholder-btn');
    usePlaceholderBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetBtn = e.currentTarget as HTMLButtonElement;
            const inputId = targetBtn.getAttribute('data-input-id');
            if (!inputId) return;
            const input = document.getElementById(inputId) as HTMLInputElement;
            if (!input) return;
            let placeholder = input.placeholder;
            if (placeholder.toLowerCase().startsWith('e.g. ')) {
                placeholder = placeholder.substring(5);
            }
            if (placeholder && placeholder.trim() !== '') {
                input.value = placeholder;
                // Trigger input event to update button text
                const event = new Event('input');
                input.dispatchEvent(event);

                input.focus();
                navigator.clipboard.writeText(placeholder).catch(err => {
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

import { Rule } from "./types";
import { isValidUrl } from "./utils.js";
import {
  renderRules,
  updatePauseButtons,
  toggleRuleState,
  showFlashMessage,
  setupPlaceholderButtons,
} from "./ui.js";
import { getThematicPair } from "./suggestions.js";
import { storage } from "./storage.js";

const init = () => {
  const manifest = chrome.runtime.getManifest();

  const versionElement = document.getElementById("app-version");
  if (versionElement) {
    versionElement.textContent = `v${manifest.version}`;
  }

  const sourceInput = document.getElementById("sourceUrl") as HTMLInputElement;
  const targetInput = document.getElementById("targetUrl") as HTMLInputElement;
  const addBtn = document.getElementById("addRuleBtn") as HTMLButtonElement;
  const rulesList = document.getElementById("rulesList") as HTMLUListElement;

  loadRules();

  // Refresh UI every second to update pause countdowns
  setInterval(() => {
    updatePauseButtons(rulesList);
  }, 1000);

  const updateButtonText = () => {
    const source = sourceInput.value.trim();
    const target = targetInput.value.trim();

    if (source && !target) {
      addBtn.textContent = "Add Shuffle Rule";
    } else {
      addBtn.textContent = "Add Rule";
    }
  };

  sourceInput.addEventListener("input", updateButtonText);
  targetInput.addEventListener("input", updateButtonText);

  // Call immediately to set initial state
  updateButtonText();

  addBtn.addEventListener("click", async () => {
    const source = sourceInput.value.trim();
    let target = targetInput.value.trim();

    if (!source) {
      showFlashMessage("Please enter a source URL.", "error");
      return;
    }

    // Shuffle Mode
    if (source && !target) {
      target = ":shuffle:";
    }

    if (!isValidUrl(source)) {
      showFlashMessage("Invalid Source URL.", "error");
      return;
    }

    if (target !== ":shuffle:" && !isValidUrl(target)) {
      showFlashMessage("Invalid Target URL.", "error");
      return;
    }

    if (source === target) {
      showFlashMessage("Source and target cannot be the same.", "error");
      return;
    }

    await addRule(source, target);
  });

  const handleEnter = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      addBtn.click();
    }
  };

  sourceInput.addEventListener("keypress", handleEnter);
  targetInput.addEventListener("keypress", handleEnter);

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
      // Note: We don't need to manually check for duplicates or redirect tabs here.
      // storage.addRule throws on duplicate source.
      // background.ts handles the redirect for new active rules via storage.onChanged.

      await storage.addRule({
        source,
        target,
        id: Date.now(),
        count: 0,
        active: true,
      });

      sourceInput.value = "";
      targetInput.value = "";
      updateButtonText(); // Update button text after clearing inputs
      await loadRules();
      showFlashMessage("Rule added successfully!", "success");
    } catch (e) {
      const error = e as Error;
      if (error.message === "Duplicate source") {
        showFlashMessage(
          "Duplicate source. A rule for this source URL already exists.",
          "error"
        );
      } else {
        showFlashMessage("Error adding rule.", "error");
      }
    }
  }

  async function deleteRule(id: number): Promise<void> {
    const newRules = await storage.deleteRule(id);
    renderRulesList(newRules);
    showFlashMessage("Rule deleted.", "info");
  }

  async function toggleRule(id: number): Promise<void> {
    const rules = await storage.getRules();
    const rule = rules.find((r) => r.id === id);
    if (rule) {
      toggleRuleState(rule);
      await storage.saveRules(rules);
      renderRulesList(rules);
    }
  }

  function renderRulesList(rules: Rule[]): void {
    renderRules(rules, rulesList, toggleRule, deleteRule);
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

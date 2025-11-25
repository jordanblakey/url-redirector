import { test, expect } from '@playwright/test';
import { storage } from '../../src/storage';
import { Rule } from '../../src/types';
import * as chrome from 'sinon-chrome';

test.describe('Storage Logic with sinon-chrome', () => {

  // Set up the sinon-chrome mock
  test.beforeAll(() => {
    global.chrome = chrome as any;
  });

  // Reset the mock before each test
  test.beforeEach(() => {
    chrome.flush();
  });

  test('should not have a race condition in incrementCount', async () => {
    const initialRule: Rule = { id: 1, source: 'example.com', target: 'google.com', count: 0, active: true };

    // Set up the initial state in the mock storage
    chrome.storage.local.get.withArgs(['rules']).yields({ rules: [] });
    chrome.storage.local.set.yields(undefined);

    await storage.addRule(initialRule);

    // After adding the rule, the storage now contains the rule.
    // We need to update the mock to reflect this.
    chrome.storage.local.get.withArgs(['rules']).yields({ rules: [initialRule] });


    // Simulate two concurrent calls to incrementCount
    const promise1 = storage.incrementCount(1);
    const promise2 = storage.incrementCount(1);

    await Promise.all([promise1, promise2]);

    const rules = await storage.getRules();
    // The count should now be 2
    expect(rules[0].count).toBe(2);
  });
});

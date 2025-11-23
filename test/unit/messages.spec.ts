
import { expect, test } from '@playwright/test';
import { getRandomMessage, MESSAGES } from '../../src/messages';

test.describe('Message Logic', () => {
    test('should return standard message for count 0', () => {
        const message = getRandomMessage(0);
        expect(message).toBe('Used <span class="count-value">0</span> times');
    });

    test('should return singular message for count 1', () => {
        // We run this multiple times to ensure various random templates work correctly
        for (let i = 0; i < 20; i++) {
            const message = getRandomMessage(1);
            expect(message).toContain('<span class="count-value">1</span>');

            // Check that we don't have the plural 's' at the end of words
            // This is a bit heuristic since we don't know exactly which message was picked
            // But we know the structure is word{s} -> word or words

            // Examples: "time", "attempt", "check"
            // We shouldn't see "times", "attempts", "checks"
            // But we might see "Used 1 time" (if that was in the list, but it's "Used {count} time{s}")

            // A better check might be to verify it matches one of the expected singular forms
            const rawMessage = message.replace(/<span class="count-value">1<\/span>/, '{count}');
            // We can reconstruct what the singular form should be for each template
            const possibleSingulars = MESSAGES.map(m =>
                m.replace('{count}', '{count}')
                    .replace('{s}', '')
            );

            expect(possibleSingulars).toContain(rawMessage);
        }
    });

    test('should return plural message for count 2', () => {
        for (let i = 0; i < 20; i++) {
            const message = getRandomMessage(2);
            expect(message).toContain('<span class="count-value">2</span>');

            const rawMessage = message.replace(/<span class="count-value">2<\/span>/, '{count}');
            const possiblePlurals = MESSAGES.map(m =>
                m.replace('{count}', '{count}')
                    .replace('{s}', 's')
            );

            expect(possiblePlurals).toContain(rawMessage);
        }
    });
});

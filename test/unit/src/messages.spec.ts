
import { test, expect, describe, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { getRandomMessage, MESSAGES } from '../../../src/messages';

describe('Message Logic', () => {
    test('should return standard message for count 0', () => {
        const message = getRandomMessage(0);
        expect(message).toBe('Used <span class="count-value">0</span> times');
    });

    test('should return singular message for count 1', () => {
        // We run this multiple times to ensure various random templates work correctly
        for (let i = 0; i < 100; i++) {
            const message = getRandomMessage(1);
            expect(message).toContain('<span class="count-value">1</span>');

            const rawMessage = message.replace(/<span class="count-value">1<\/span>/, '{count}');
            // We can reconstruct what the singular form should be for each template
            const possibleSingulars = MESSAGES.map(m =>
                m.replace('{count}', '{count}')
                    .replace('{s}', '')
                    .replace('{es}', '')
                    .replace('{ies}', 'y')
            );

            expect(possibleSingulars).toContain(rawMessage);
        }
    });

    test('should return plural message for count 2', () => {
        for (let i = 0; i < 100; i++) {
            const message = getRandomMessage(2);
            expect(message).toContain('<span class="count-value">2</span>');

            const rawMessage = message.replace(/<span class="count-value">2<\/span>/, '{count}');
            const possiblePlurals = MESSAGES.map(m =>
                m.replace('{count}', '{count}')
                    .replace('{s}', 's')
                    .replace('{es}', 'es')
                    .replace('{ies}', 'ies')
            );

            expect(possiblePlurals).toContain(rawMessage);
        }
    });
});

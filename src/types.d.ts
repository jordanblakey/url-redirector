/**
 * Shared type definitions for the URL Redirector extension
 */

export interface Rule {
    id: number;
    source: string;
    target: string;
    count: number;
    active: boolean;
    pausedUntil?: number;
    overrideUntil?: number;
    lastCountMessage?: string;
}

export interface StorageSchema {
    rules: Rule[];
}

export interface StorageResult {
    rules?: Rule[];
}

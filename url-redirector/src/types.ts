/**
 * Shared type definitions for the URL Redirector extension
 */

export interface Rule {
    id: number;
    source: string;
    target: string;
}

export interface StorageSchema {
    rules: Rule[];
}

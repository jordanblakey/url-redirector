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
}

export interface StorageSchema {
  rules: Rule[];
}

export type CompressedRule = [
  id: number,
  source: string,
  target: string,
  count: number,
  active: 0 | 1,
  pausedUntil?: number,
];

export interface StorageResult {
  rules?: Rule[];
}

export interface CompressedStorageResult {
  rules?: CompressedRule[];
  rules_0?: string;
  rules_1?: string;
  rules_2?: string;
  rules_3?: string;
  rules_4?: string;
  rules_chunk_count?: number;
}

export interface RedirectMessage {
  type: 'REDIRECT_DETECTED';
  source: string;
}

export interface CwsListing {
  items: {
    fullDescription: string;
    promotionalText: string;
  }[];
}

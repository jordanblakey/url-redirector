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
  lastCountMessage?: string;
}

export type CompressedRule = [
  number, // id
  string, // source
  string, // target
  number, // active (1 or 0)
  number, // count
  number?, // pausedUntil
  string? // lastCountMessage
];

export interface StorageSchema {
  rules: Rule[];
}

export interface StorageResult {
  rules?: Rule[];
}

export interface CompressedStorageResult {
  [key: string]: CompressedRule[];
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

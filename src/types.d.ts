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

export interface StorageSchema {
  rules: Rule[];
}

export interface StorageResult {
  rules?: Rule[];
}

export type CompressedRule = [
  number, // id
  string, // source
  string, // target
  number, // count
  boolean, // active
  number | undefined, // pausedUntil
  string | undefined // lastCountMessage
];

export interface CompressedStorageResult {
  [key: string]: string;
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

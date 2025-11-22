// Mock Chrome API for testing in a standard browser environment

// Define types for our mock
interface MockStorageArea {
    get: (keys: string | string[] | null, callback: (result: { [key: string]: any }) => void) => void;
    set: (items: { [key: string]: any }, callback?: () => void) => void;
}

interface MockChrome {
    storage?: {
        local: MockStorageArea;
    };
    runtime?: {
        getManifest: () => { version: string };
    };
    tabs?: {
        query: (queryInfo: any, callback: (tabs: any[]) => void) => void;
        update: (tabId: number, updateProperties: any, callback?: (tab?: any) => void) => void;
    };
}

// This file is transpiled to JS before being injected into the browser


if (typeof globalThis.chrome === 'undefined') {
    (globalThis as any).chrome = {};
}

const chromeMock = (globalThis as any).chrome as MockChrome;

if (!chromeMock.storage) {
    chromeMock.storage = {
        local: {
            get: (keys: string | string[] | null, callback: (result: { [key: string]: any }) => void) => {
                const result: { [key: string]: any } = {};
                // Simulate async behavior
                setTimeout(() => {
                    if (Array.isArray(keys)) {
                        keys.forEach(key => {
                            const value = localStorage.getItem(key);
                            if (value) {
                                try {
                                    result[key] = JSON.parse(value);
                                } catch (e) {
                                    result[key] = value;
                                }
                            }
                        });
                    } else if (typeof keys === 'string') {
                        const value = localStorage.getItem(keys);
                        if (value) result[keys] = JSON.parse(value);
                    }
                    if (callback) callback(result);
                }, 10);
            },
            set: (items: { [key: string]: any }, callback?: () => void) => {
                setTimeout(() => {
                    Object.keys(items).forEach(key => {
                        localStorage.setItem(key, JSON.stringify(items[key]));
                    });
                    if (callback) callback();
                }, 10);
            }
        }
    };
}

if (!chromeMock.runtime) {
    chromeMock.runtime = {
        getManifest: () => {
            return { version: '1.0.0' };
        }
    };
}

if (!chromeMock.tabs) {
    chromeMock.tabs = {
        query: (queryInfo: any, callback: (tabs: any[]) => void) => {
            // Return mock tabs that can be redirected
            setTimeout(() => {
                if (callback) {
                    callback([
                        { id: 1, url: 'https://example.com/page1' },
                        { id: 2, url: 'https://reddit.com/r/test' },
                        { id: 3, url: 'https://google.com' }
                    ]);
                }
            }, 10);
        },
        update: (tabId: number, updateProperties: any, callback?: (tab?: any) => void) => {
            setTimeout(() => {
                if (callback) callback({});
            }, 10);
        }
    };
}

// Mock Chrome API for testing in a standard browser environment

// Define types for our mock
interface MockStorageArea {
    get: (keys: string | string[] | null, callback: (result: { [key: string]: any }) => void) => void;
    set: (items: { [key: string]: any }, callback?: () => void) => void;
}

interface MockChrome {
    storage?: {
        local: MockStorageArea;
        onChanged?: {
            addListener: (callback: (changes: any, areaName: string) => void) => void;
            dispatch?: (changes: any, areaName: string) => void;
        };
    };
    runtime?: {
        getManifest: () => { version: string };
    };
    tabs?: {
        query: (queryInfo: any, callback: (tabs: any[]) => void) => void;
        update: (tabId: number, updateProperties: any, callback?: (tab?: any) => void) => void;
    };
    action?: {
        setBadgeText: (details: { text: string }) => void;
        setBadgeBackgroundColor: (details: { color: string }) => void;
        setBadgeTextColor: (details: { color: string }) => void;
        // Test helper to get last call
        getLastBadgeText?: () => string;
    };
    webNavigation?: {
        onBeforeNavigate: {
            addListener: (callback: (details: any) => void) => void;
            // Test helper to trigger event
            dispatch?: (details: any) => void;
        };
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
                    const changes: { [key: string]: { oldValue: any, newValue: any } } = {};
                    Object.keys(items).forEach(key => {
                        const oldValue = localStorage.getItem(key) ? JSON.parse(localStorage.getItem(key)!) : undefined;
                        const newValue = items[key];
                        localStorage.setItem(key, JSON.stringify(newValue));
                        changes[key] = { oldValue, newValue };
                    });

                    if (chromeMock.storage?.onChanged && (chromeMock.storage.onChanged as any).dispatch) {
                        (chromeMock.storage.onChanged as any).dispatch(changes, 'local');
                    }

                    if (callback) callback();
                }, 10);
            }
        },
        onChanged: {
            addListener: (callback: (changes: any, areaName: string) => void) => {
                if (!(chromeMock.storage as any)._listeners) {
                    (chromeMock.storage as any)._listeners = [];
                }
                (chromeMock.storage as any)._listeners.push(callback);
            },
            // Test helper to trigger event
            dispatch: (changes: any, areaName: string) => {
                if ((chromeMock.storage as any)._listeners) {
                    (chromeMock.storage as any)._listeners.forEach((l: any) => l(changes, areaName));
                }
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

if (!chromeMock.action) {
    let lastBadgeText = '';
    chromeMock.action = {
        setBadgeText: (details: { text: string }) => {
            lastBadgeText = details.text;
            console.log(`[MockChrome] setBadgeText: ${details.text}`);
        },
        setBadgeBackgroundColor: (details: { color: string }) => {
            console.log(`[MockChrome] setBadgeBackgroundColor: ${details.color}`);
        },
        setBadgeTextColor: (details: { color: string }) => {
            console.log(`[MockChrome] setBadgeTextColor: ${details.color}`);
        },
        getLastBadgeText: () => lastBadgeText
    };
}

if (!chromeMock.webNavigation) {
    const listeners: ((details: any) => void)[] = [];
    chromeMock.webNavigation = {
        onBeforeNavigate: {
            addListener: (callback: (details: any) => void) => {
                listeners.push(callback);
            },
            dispatch: (details: any) => {
                listeners.forEach(l => l(details));
            }
        }
    };
}

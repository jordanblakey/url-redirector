// Mock Chrome API for testing in a standard browser environment

// Define types for our mock
interface MockStorageArea {
    get: (keys: string | string[] | null, callback: (result: { [key: string]: unknown }) => void) => void;
    set: (items: { [key: string]: unknown }, callback?: () => void) => void;
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
        query: (queryInfo: chrome.tabs.QueryInfo, callback: (tabs: chrome.tabs.Tab[]) => void) => void;
        update: (tabId: number, updateProperties: chrome.tabs.UpdateProperties, callback?: (tab?: chrome.tabs.Tab) => void) => void;
    };
    action?: {
        setBadgeText: (details: { text: string }) => void;
        setBadgeBackgroundColor: (details: { color: string }) => void;
        setBadgeTextColor: (details: { color: string }) => void;
    };
    webNavigation?: {
        onBeforeNavigate: {
            addListener: (callback: (details: chrome.webNavigation.WebNavigationParentedCallbackDetails) => void) => void;
            // Test helper to trigger event
            dispatch?: (details: chrome.webNavigation.WebNavigationParentedCallbackDetails) => void;
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
            get: (keys: string | string[] | null, callback: (result: { [key: string]: unknown }) => void) => {
                const result: { [key: string]: unknown } = {};
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
            set: (items: { [key: string]: unknown }, callback?: () => void) => {
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
        query: (queryInfo: chrome.tabs.QueryInfo, callback: (tabs: chrome.tabs.Tab[]) => void) => {
            // Return mock tabs that can be redirected
            setTimeout(() => {
                if (callback) {
                    callback([
                        { id: 1, url: 'https://example.com/page1', index: 0, pinned: false, highlighted: false, windowId: 1, active: false, incognito: false, selected: false, discarded: false, autoDiscardable: true, groupId: -1 },
                        { id: 2, url: 'https://reddit.com/r/test', index: 1, pinned: false, highlighted: false, windowId: 1, active: false, incognito: false, selected: false, discarded: false, autoDiscardable: true, groupId: -1 },
                        { id: 3, url: 'https://google.com', index: 2, pinned: false, highlighted: false, windowId: 1, active: false, incognito: false, selected: false, discarded: false, autoDiscardable: true, groupId: -1 }
                    ]);
                }
            }, 10);
        },
        update: (tabId: number, updateProperties: chrome.tabs.UpdateProperties, callback?: (tab?: chrome.tabs.Tab) => void) => {
            setTimeout(() => {
                if (callback) callback({} as chrome.tabs.Tab);
            }, 10);
        }
    };
}

if (!chromeMock.action) {
    chromeMock.action = {
        setBadgeText: (details: { text: string }) => {
            console.log(`[MockChrome] setBadgeText: ${details.text}`);
        },
        setBadgeBackgroundColor: (details: { color: string }) => {
            console.log(`[MockChrome] setBadgeBackgroundColor: ${details.color}`);
        },
        setBadgeTextColor: (details: { color: string }) => {
            console.log(`[MockChrome] setBadgeTextColor: ${details.color}`);
        },
    };
}

if (!chromeMock.webNavigation) {
    const listeners: ((details: chrome.webNavigation.WebNavigationParentedCallbackDetails) => void)[] = [];
    chromeMock.webNavigation = {
        onBeforeNavigate: {
            addListener: (callback: (details: chrome.webNavigation.WebNavigationParentedCallbackDetails) => void) => {
                listeners.push(callback);
            },
            dispatch: (details: chrome.webNavigation.WebNavigationParentedCallbackDetails) => {
                listeners.forEach(l => l(details));
            }
        }
    };
}

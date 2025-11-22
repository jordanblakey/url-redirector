// Mock Chrome API for testing in a standard browser environment
if (typeof chrome === 'undefined') {
    window.chrome = {};
}

if (!chrome.storage) {
    chrome.storage = {
        local: {
            get: (keys, callback) => {
                const result = {};
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
            set: (items, callback) => {
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

if (!chrome.runtime) {
    chrome.runtime = {
        getManifest: () => {
            return { version: '1.0.0' };
        }
    };
}

if (!chrome.tabs) {
    chrome.tabs = {
        query: (queryInfo, callback) => {
            // Return empty list or mock tabs
            setTimeout(() => {
                if (callback) callback([]);
            }, 10);
        },
        update: (tabId, updateProperties, callback) => {
            setTimeout(() => {
                if (callback) callback({});
            }, 10);
        }
    };
}

if (!chrome.runtime) {
    chrome.runtime = {
        getManifest: () => {
            return { version: '1.0.0' };
        }
    };
}

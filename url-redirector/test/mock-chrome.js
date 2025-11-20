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
                        // Handle single string key if needed, though our code uses array
                        const value = localStorage.getItem(keys);
                        if (value) result[keys] = JSON.parse(value);
                    } else if (typeof keys === 'object') {
                        // Handle object with defaults if needed
                        // For now, our code passes ['rules']
                    }

                    // If 'rules' is requested but not in localStorage, return empty object or defaults
                    // Our code handles result.rules || [] so returning empty object is fine if key missing

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

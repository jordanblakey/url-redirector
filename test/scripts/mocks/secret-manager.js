'use strict';
const Module = require('module');
const originalRequire = Module.prototype.require;

let secretPayload = '';
let authError = false;

function setSecretPayload(payload) {
    secretPayload = payload;
    authError = false;
}

function setAuthError() {
    authError = true;
}

class MockSecretManagerServiceClient {
    accessSecretVersion() {
        if (authError) {
            return Promise.reject(new Error('Could not load the default credentials'));
        }
        return Promise.resolve([{ payload: { data: Buffer.from(secretPayload) } }]);
    }
}

const mockClient = {
    SecretManagerServiceClient: MockSecretManagerServiceClient,
    setSecretPayload,
    setAuthError,
};

// Monkey-patch require to intercept the @google-cloud/secret-manager module
Module.prototype.require = function(id) {
    if (id === '@google-cloud/secret-manager') {
        return mockClient;
    }
    return originalRequire.apply(this, arguments);
};

module.exports = mockClient;

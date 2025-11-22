## Source Maps

Sourcemaps (`.map` files) are enabled in the TypeScript compiler options (`tsconfig.json`) and are **intentionally included** in the production bundle (`extension.zip`).

**Reasoning:**
1.  **Debugging:** They allow developers to debug the extension running in production (or on a user's machine) using the original TypeScript source code, providing meaningful stack traces and a better debugging experience.
2.  **Size:** The impact on the bundle size is minimal (~4KB), which is a worthwhile trade-off for the debugging capabilities they provide.
3.  **Transparency:** As an open-source project (ISC license), there is no requirement to obfuscate the source code.

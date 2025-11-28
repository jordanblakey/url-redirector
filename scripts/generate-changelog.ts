import { execSync as realExecSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import 'dotenv/config';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { loadGcpSecrets } from './load-dotenv-from-gcp';

const rootDir = path.resolve(__dirname, '..');
const metadataDir = path.join(rootDir, 'metadata');
const outputPath = path.join(metadataDir, 'recent_updates.txt');

export interface GenerateChangelogOptions {
    deps?: {
        execSync?: typeof realExecSync;
        fs?: typeof fs;
        GoogleGenerativeAI?: typeof GoogleGenerativeAI;
        loadGcpSecrets?: typeof loadGcpSecrets;
        log?: typeof console.log;
        warn?: typeof console.warn;
        error?: typeof console.error;
        exit?: typeof process.exit;
    };
}

export async function generateChangelog(options: GenerateChangelogOptions = {}) {
    const { deps = {} } = options;
    const execSync = deps.execSync || realExecSync;
    const fsFn = deps.fs || fs;
    const GenAI = deps.GoogleGenerativeAI || GoogleGenerativeAI;
    const loadSecrets = deps.loadGcpSecrets || loadGcpSecrets;
    const log = deps.log || console.log;
    const warn = deps.warn || console.warn;
    const errorLog = deps.error || console.error;
    const exit = deps.exit || process.exit;

    try {
        // Load secrets from GCP
        await loadSecrets();

        // 1. Get the last tag
        let lastTag = '';
        try {
            // @ts-ignore
            lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf-8' }).trim();
        } catch (e) {
            log('No tags found. Using first commit.');
            // @ts-ignore
            lastTag = execSync('git rev-list --max-parents=0 HEAD', { encoding: 'utf-8' }).trim();
        }
        log(`Last tag/commit: ${lastTag}`);

        // 2. Get commits since last tag
        // Format: hash subject body
        // @ts-ignore
        const commits = execSync(`git log ${lastTag}..HEAD --pretty=format:"%h %s%n%b"`, { encoding: 'utf-8' }).trim();

        if (!commits) {
            log('No new commits since last tag.');
            return;
        }

        log('Commits found (first 500 chars):');
        log(commits.substring(0, 500) + '...');

        // 3. Call Gemini API
        if (!process.env.GEMINI_API_KEY) {
            warn('Warning: GEMINI_API_KEY not found. Skipping AI generation.');
            fsFn.ensureDirSync(metadataDir);
            fsFn.writeFileSync(outputPath, `Changes since ${lastTag}:\n\n${commits}`);
            return;
        }

        log('Calling Gemini API...');
        const genAI = new GenAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        You are a Release Note Generator.
        Analyze the following commit history and generate release notes.
        
        Output format:
        
        ## User Facing
        (List of up to 4 bullet points highlighting features or fixes relevant to users. Minimalist style. If none, state "No user-facing changes".)
        
        ## Technical Highlights
        (List of up to 4 bullet points for internal/dev changes, refactoring, CI/CD, etc. If none, state "No technical highlights".)
        
        Commits:
        ${commits}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const aiSummary = response.text();

        // 4. Write output
        fsFn.ensureDirSync(metadataDir);
        fsFn.writeFileSync(outputPath, aiSummary);
        log(`Changelog written to ${outputPath}`);
        log('--- Preview ---');
        log(aiSummary);

    } catch (error) {
        errorLog('Error generating changelog:', error);
        exit(1);
    }
}

if (require.main === module) {
    generateChangelog();
}

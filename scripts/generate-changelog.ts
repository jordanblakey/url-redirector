import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import 'dotenv/config';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { loadGcpSecrets } from './load-dotenv-from-gcp';

const rootDir = path.resolve(__dirname, '..');
const metadataDir = path.join(rootDir, 'metadata');
const outputPath = path.join(metadataDir, 'recent_updates.txt');

async function generateChangelog() {
    try {
        // Load secrets from GCP
        await loadGcpSecrets();

        // 1. Get the last tag
        let lastTag = '';
        try {
            lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf-8' }).trim();
        } catch (e) {
            console.log('No tags found. Using first commit.');
            lastTag = execSync('git rev-list --max-parents=0 HEAD', { encoding: 'utf-8' }).trim();
        }
        console.log(`Last tag/commit: ${lastTag}`);

        // 2. Get commits since last tag
        // Format: hash subject body
        const commits = execSync(`git log ${lastTag}..HEAD --pretty=format:"%h %s%n%b"`, { encoding: 'utf-8' }).trim();

        if (!commits) {
            console.log('No new commits since last tag.');
            return;
        }

        console.log('Commits found (first 500 chars):');
        console.log(commits.substring(0, 500) + '...');

        // 3. Call Gemini API
        if (!process.env.GEMINI_API_KEY) {
            console.warn('Warning: GEMINI_API_KEY not found. Skipping AI generation.');
            fs.ensureDirSync(metadataDir);
            fs.writeFileSync(outputPath, `Changes since ${lastTag}:\n\n${commits}`);
            return;
        }

        console.log('Calling Gemini API...');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
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
        fs.ensureDirSync(metadataDir);
        fs.writeFileSync(outputPath, aiSummary);
        console.log(`Changelog written to ${outputPath}`);
        console.log('--- Preview ---');
        console.log(aiSummary);

    } catch (error) {
        console.error('Error generating changelog:', error);
        process.exit(1);
    }
}

generateChangelog();

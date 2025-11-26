#!/usr/bin/env node
import { execSync } from 'child_process';
import { GoogleGenerativeAI } from '@google/genai';
import fs from 'fs-extra';
import path from 'path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not set.');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

async function generateReleaseNotes() {
    try {
        console.log('📝 Generating release notes...');

        // 1. Get commit history
        const lastTag = execSync('git describe --tags --abbrev=0').toString().trim();
        const commitLog = execSync(`git log ${lastTag}..HEAD --oneline --pretty=format:"- %s"`).toString().trim();

        if (!commitLog) {
            console.log('No new commits since last tag. Skipping release notes generation.');
            return;
        }

        console.log(`\nCommits since ${lastTag}:\n${commitLog}\n`);

        // 2. Generate release notes with Gemini
        const prompt = `
            Based on the following commit messages, generate release notes with two sections: "User-Facing Changes" and "Technical Highlights".
            Keep the tone minimalist and focus on the key changes.

            Commit messages:
            ${commitLog}
        `;

        const result = await model.generateContent(prompt);
        const releaseNotes = result.response.text();

        // 3. Save release notes to file
        const outputPath = path.resolve(__dirname, '../metadata/recent_updates.txt');
        fs.ensureDirSync(path.dirname(outputPath));
        fs.writeFileSync(outputPath, releaseNotes);

        console.log(`✅ Release notes saved to ${outputPath}`);

    } catch (error) {
        console.error('❌ Failed to generate release notes:', error);
        process.exit(1);
    }
}

generateReleaseNotes();

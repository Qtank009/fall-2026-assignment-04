#!/usr/bin/env node
import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const inputPath = process.argv[2] || path.join('docs', 'architecture', 'schema.mmd');
const outputPath = process.argv[3] || path.join('docs', 'architecture', 'erd.svg');

if (!fs.existsSync(inputPath)) {
  console.error(`SYNTAX_ERROR: Input file not found at ${inputPath}`);
  process.exit(1);
}

const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const result = spawnSync('npx', ['mmdc', '-i', inputPath, '-o', outputPath], {
  encoding: 'utf-8',
});

const succeeded = result.status === 0 && fs.existsSync(outputPath);

if (succeeded) {
  console.log('SUCCESS');
  process.exit(0);
} else {
  const trace = (result.stderr || result.stdout || 'Unknown error during Mermaid compilation.').trim();
  console.error(`SYNTAX_ERROR: ${trace}`);
  process.exit(result.status && result.status !== 0 ? result.status : 1);
}
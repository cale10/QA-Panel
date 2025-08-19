#!/usr/bin/env node
// Lightweight JS type-check gate using TypeScript in allowJs mode.
// Intentionally targeted scope to avoid noise from legacy files.
const { spawnSync } = require('node:child_process');

const globs = [
  'public/preload.js',
  'public/electron.js',
];

const args = ['--noEmit', '--allowJs', '--checkJs', ...globs];
const res = spawnSync('npx', ['tsc', ...args], { stdio: 'inherit' });
process.exit(res.status || 0);


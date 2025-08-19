module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'script',
  },
  globals: {
    window: 'readonly',
    document: 'readonly',
  },
  extends: ['eslint:recommended'],
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-constant-condition': ['warn', { checkLoops: false }],
  },
  overrides: [
    {
      files: ['public/electron.js', 'public/preload.js', 'public/services/**/*.js'],
      env: { node: true, browser: false },
      parserOptions: { sourceType: 'script' },
    },
    {
      files: ['public/**/*.js'],
      excludedFiles: ['public/electron.js', 'public/preload.js', 'public/services/**/*.js'],
      env: { browser: true, node: false },
    },
  ],
};


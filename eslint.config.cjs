module.exports = [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**'
    ],
  },
  {
    files: ['public/electron.js', 'public/preload.js', 'public/services/**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'script',
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'off',
      'no-constant-condition': ['warn', { checkLoops: false }],
    },
  },
  {
    files: ['public/**/*.js'],
    ignores: ['public/electron.js', 'public/preload.js', 'public/services/**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'script',
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'off',
      'no-constant-condition': ['warn', { checkLoops: false }],
    },
  },
];


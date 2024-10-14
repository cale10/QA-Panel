module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: [
    'react',
  ],
  rules: {
    // Add any specific rules here
    'react/prop-types': 'off', // Disable prop-types as we're not using them
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }], // Warn on unused variables
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};

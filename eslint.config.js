const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');
const prettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  // Expo 公式設定（TypeScript・React・React Hooks・React Native ルール含む）
  expo,

  // Prettier をESLint ルールとして実行（eslint-config-prettier で競合ルール無効化済み）
  prettierRecommended,

  // テストファイル用設定
  {
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', 'jest.setup.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
      },
    },
  },

  // プロジェクト固有ルール（expo config が設定済みのルールは除外）
  {
    rules: {
      // React
      'react/react-in-jsx-scope': 'off', // React 17+ 不要
      'react/prop-types': 'off', // TypeScript で代替
      'react/display-name': 'off',

      // 一般
      'no-console': 'warn',
    },
  },

  // 解析除外
  {
    ignores: ['node_modules/', 'ios/', 'android/', '.expo/', 'dist/', 'build/', '*.config.js'],
  },
]);

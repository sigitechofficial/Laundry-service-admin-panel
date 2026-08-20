import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist', 'public/**', 'scripts/**', 'laundryadmin.js'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        google: 'readonly',
        __APP_VERSION__: 'readonly',
        __DEPLOY_COMMIT__: 'readonly',
        __DEPLOY_BRANCH__: 'readonly',
        __DEPLOY_AT__: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^[A-Z_]',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@heroui/react',
              message:
                'UI kit is locked. Use src/design-system, not HeroUI.',
            },
            {
              name: '@heroui/system',
              message:
                'UI kit is locked. Use src/design-system, not HeroUI.',
            },
            {
              name: '@heroui/theme',
              message:
                'UI kit is locked. Use src/design-system, not HeroUI.',
            },
          ],
          patterns: [
            {
              regex: '^@mui(\\b|/)',
              message:
                'UI kit is locked. Use src/design-system (Button, Field, Input, Select, Modal, Table, PageHeader, Stat). No @mui.',
            },
            {
              regex: '^@material-ui(\\b|/)',
              message:
                'UI kit is locked. Use src/design-system. No @material-ui.',
            },
            {
              regex: '^@heroui(\\b|/)',
              message:
                'UI kit is locked. Use src/design-system. No @heroui.',
            },
          ],
        },
      ],
    },
  },
]

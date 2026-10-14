import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
export default tseslint.config(
    { ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', '.claude/**'] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.ts'],
        languageOptions: { globals: globals.browser },
        rules: {
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            '@typescript-eslint/no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
        },
    },
    { files: ['*.js', '*.ts', 'scripts/**/*.mjs'], languageOptions: { globals: globals.node } },
);

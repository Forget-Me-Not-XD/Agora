// @ts-check
import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default defineConfig(
    { ignores: ['dist/'] },
    js.configs.recommended,
    tseslint.configs.recommended,
    {
        rules: {
            // The code sometimes pulls a field out of an object only to keep it out of ...rest.
            // That's on purpose, so the field shouldn't be reported as unused.
            '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
        },
    },
);

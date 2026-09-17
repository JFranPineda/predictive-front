import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'src/types/api.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // A module must not reach into another module's internals; it goes
      // through the API or through @shared.
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['@modules/*/infrastructure/*', '@modules/*/ui/*'], message: 'Import a module through its index.ts' }] },
      ],
    },
  },
);

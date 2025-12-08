import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = defineConfig([
    ...nextVitals,
    {
        name: 'custom-overrides',
        files: ['**/*.{js,jsx,ts,tsx}'],
        rules: {
            // Allow state updates inside effects (legacy pattern).
            'react-hooks/set-state-in-effect': 'off',
            // Do not enforce exhaustive deps/purity for now.
            'react-hooks/exhaustive-deps': 'off',
            'react-hooks/purity': 'off',
            // Allow <img> until migrated to next/image.
            '@next/next/no-img-element': 'off',
            // Suppress quote escaping noise.
            'react/no-unescaped-entities': 'off',
        },
    },
    // Override default ignores of eslint-config-next.
    globalIgnores([
        // Default ignores of eslint-config-next:
        '.next/**',
        'out/**',
        'build/**',
        'next-env.d.ts',
    ]),
]);

export default eslintConfig;

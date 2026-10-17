// Configuración plana de ESLint para dashboards.
// Nota: ESLint se incorporó tarde al repo; las reglas nuevas de
// react-hooks (set-state-in-effect) y no-empty-object-type quedan como
// avisos porque el código existente las incumple — su corrección es una
// tarea de refactorización aparte, fuera del alcance del issue #12.
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    { ignores: ['dist', 'node_modules', 'public/mockServiceWorker.js'] },
    {
        files: ['**/*.{ts,tsx}'],
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
        plugins: { 'react-hooks': reactHooks },
        rules: {
            ...reactHooks.configs.recommended.rules,
            // Deuda técnica preexistente: ver comentario de cabecera.
            'react-hooks/set-state-in-effect': 'warn',
            '@typescript-eslint/no-empty-object-type': 'warn',
        },
    },
);

/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin');
const rotateX = plugin(function ({ addUtilities }) {
    addUtilities({
        '.rotate-y-180': {
            transform: 'rotateY(180deg)',
        },
    });
});
module.exports = {
    content: ['./App.tsx', './app/**/*.{js,ts,jsx,tsx}', './pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}', './src/**/*.{js,ts,jsx,tsx}'],
    darkMode: 'class',
    theme: {
        container: {
            center: true,
        },
        extend: {
            colors: {
                // App brand palette (kept as-is)
                primary: 'var(--color-primary, #4361ee)',
                'primary-light': '#eaf1ff',
                'primary-dark-light': 'rgba(67,97,238,.15)',
                secondary: '#805dca',
                'secondary-light': '#ebe4f7',
                'secondary-dark-light': 'rgb(128 93 202 / 15%)',
                success: '#00ab55',
                'success-light': '#ddf5f0',
                'success-dark-light': 'rgba(0,171,85,.15)',
                danger: '#e7515a',
                'danger-light': '#fff5f5',
                'danger-dark-light': 'rgba(231,81,90,.15)',
                warning: '#e2a03f',
                'warning-light': '#fff9ed',
                'warning-dark-light': 'rgba(226,160,63,.15)',
                info: '#2196f3',
                'info-light': '#e7f7ff',
                'info-dark-light': 'rgba(33,150,243,.15)',
                dark: '#3b3f5c',
                'dark-light': '#eaeaec',
                'dark-dark-light': 'rgba(59,63,92,.15)',
                black: '#0e1726',
                'black-light': '#e3e4eb',
                'black-dark-light': 'rgba(14,23,38,.15)',
                white: '#ffffff',
                'white-light': '#e0e6ed',
                'white-dark': '#888ea8',

                // shadcn/ui system tokens (read directly from CSS vars)
                background: 'var(--background)',
                foreground: 'var(--foreground)',
                card: 'var(--card)',
                'card-foreground': 'var(--card-foreground)',
                popover: 'var(--popover)',
                'popover-foreground': 'var(--popover-foreground)',
                // Keep brand primary, but also expose UI primary tokens
                'ui-primary': 'var(--primary)',
                'ui-primary-foreground': 'var(--primary-foreground)',
                secondary: '#805dca',
                'secondary-foreground': 'var(--secondary-foreground)',
                muted: 'var(--muted)',
                'muted-foreground': 'var(--muted-foreground)',
                accent: 'var(--accent)',
                'accent-foreground': 'var(--accent-foreground)',
                destructive: 'var(--destructive)',
                'destructive-foreground': 'var(--foreground)',
                border: 'var(--border)',
                input: 'var(--input)',
                ring: 'var(--ring)',
                // charts and sidebar (optional)
                'chart-1': 'var(--chart-1)',
                'chart-2': 'var(--chart-2)',
                'chart-3': 'var(--chart-3)',
                'chart-4': 'var(--chart-4)',
                'chart-5': 'var(--chart-5)',
                sidebar: 'var(--sidebar)',
                'sidebar-foreground': 'var(--sidebar-foreground)',
                'sidebar-primary': 'var(--sidebar-primary)',
                'sidebar-primary-foreground': 'var(--sidebar-primary-foreground)',
                'sidebar-accent': 'var(--sidebar-accent)',
                'sidebar-accent-foreground': 'var(--sidebar-accent-foreground)',
                'sidebar-border': 'var(--sidebar-border)',
                'sidebar-ring': 'var(--sidebar-ring)',
                // Also map primary-foreground for shadcn buttons
                'primary-foreground': 'var(--primary-foreground, #ffffff)'
            },
            fontFamily: {
                nunito: ['var(--font-nunito)'],
            },
            spacing: {
                4.5: '18px',
            },
            boxShadow: {
                '3xl': '0 2px 2px rgb(224 230 237 / 46%), 1px 6px 7px rgb(224 230 237 / 46%)',
            },
            typography: ({ theme }) => ({
                DEFAULT: {
                    css: {
                        '--tw-prose-invert-headings': theme('colors.white-dark'),
                        '--tw-prose-invert-links': theme('colors.white-dark'),
                        h1: { fontSize: '40px', marginBottom: '0.5rem', marginTop: 0 },
                        h2: { fontSize: '32px', marginBottom: '0.5rem', marginTop: 0 },
                        h3: { fontSize: '28px', marginBottom: '0.5rem', marginTop: 0 },
                        h4: { fontSize: '24px', marginBottom: '0.5rem', marginTop: 0 },
                        h5: { fontSize: '20px', marginBottom: '0.5rem', marginTop: 0 },
                        h6: { fontSize: '16px', marginBottom: '0.5rem', marginTop: 0 },
                        p: { marginBottom: '0.5rem' },
                        li: { margin: 0 },
                        img: { margin: 0 },
                    },
                },
            }),
        },
    },
    plugins: [
        /* require('@tailwindcss/forms')({
            strategy: 'class',
        }), */
        require('@tailwindcss/typography'),
        rotateX,
    ],
};

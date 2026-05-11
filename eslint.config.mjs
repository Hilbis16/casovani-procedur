// @ts-check
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// eslint-config-next ships a native flat config array
const nextConfig = require('eslint-config-next')
// eslint-config-prettier disables formatting rules that conflict with Prettier
const prettierConfig = require('eslint-config-prettier')

const config = [
  // Next.js recommended rules (React, hooks, a11y, import, @next/next)
  ...nextConfig,

  // Scheduling module cannot reach into hotel internals (cross-module boundary)
  {
    files: ['src/modules/scheduling/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/modules/hotel/*'],
              message:
                'Scheduling module cannot import hotel internals. Use @/modules/core contracts for cross-module access.',
            },
          ],
        },
      ],
    },
  },

  // Hotel module cannot reach into scheduling internals (cross-module boundary)
  {
    files: ['src/modules/hotel/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/modules/scheduling/*'],
              message:
                'Hotel module cannot import scheduling internals. Use @/modules/core contracts for cross-module access.',
            },
          ],
        },
      ],
    },
  },

  // Prettier must be last — disables any rules that conflict with formatting
  prettierConfig,
]

export default config

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

  // Project-specific rules on top
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // Module boundary enforcement — Phase 0: warn; Phase 4: flip to error
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            {
              group: ['@/modules/scheduling/*'],
              message:
                'Access scheduling internals only from src/modules/scheduling or src/app. Use @/modules/core contracts for cross-module access.',
            },
            {
              group: ['@/modules/hotel/*'],
              message:
                'Access hotel internals only from src/modules/hotel or src/app. Use @/modules/core contracts for cross-module access.',
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

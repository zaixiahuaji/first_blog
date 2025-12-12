import { defineConfig } from 'orval'

export default defineConfig({
  api: {
    output: {
      mode: 'tags-split',
      target: 'src/api/generated',
      schemas: 'src/api/generated/model',
      client: 'axios',
      prettier: true,
      override: {
        mutator: {
          path: 'src/api/axios-instance.ts',
          name: 'customInstance',
        },
      },
    },
    input: {
      target: './openapi.json',
    },
  },
})


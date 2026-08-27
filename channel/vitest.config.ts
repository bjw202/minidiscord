// 커버리지 측정 설정 — 진입점 src/index.ts 는 StdioServerTransport 를 붙이는 배선만
// 담당하므로 측정 대상에서 제외한다 (import 시 stdio 를 잡아 프로세스가 매달린다).
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/index.ts'],
    },
  },
})

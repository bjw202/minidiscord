// 커버리지 측정 설정 — src/** 전체를 측정한다. src/index.ts 의 진입점 블록(65-74행, 미커버로 잡히는 구간은 66-68·71-72)은
// process.argv[1] 가드 아래 있어 프로세스로 직접 구동될 때만 실행되므로 인프로세스 계측에 잡히지 않는다.
// 그 줄들이 미커버로 표시되는 것은 정상이며 제외하지 않고 그대로 계상한다 — 제외는 사유가 낡아도 숫자를 조용히 좋게 만든다.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      reporter: ['text', 'json-summary'],
      thresholds: {
        lines: 85,
      },
    },
  },
})

// 커버리지 측정 설정 — src/** 전체를 측정한다. src/index.ts 의 진입점 블록(97-125행, 미커버로 잡히는 구간은 98-123)은
// 자식 프로세스로 구동될 때만 실행되므로(REQ-CHANWIRE-002 진입점 가드) 인프로세스 계측에
// 잡히지 않는다. 그 줄들이 미커버로 표시되는 것은 정상이며, 자식 프로세스 기준이 따로 검증한다.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**'],
    },
  },
})

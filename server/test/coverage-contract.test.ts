import { it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
// 설정 파일을 **텍스트가 아니라 값으로** 읽는다 — 아래 사유 참조
import viteConfig from '../vitest.config.js'

const major = (range: string) => range.replace(/^[^\d]*/, '').split('.')[0]

it('coverage tooling contract holds', async () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  const cov = (viteConfig as any).test.coverage

  // 1. 의존성을 server 자신이 선언한다 (끌어올리기에 기대지 않는다)
  expect(pkg.devDependencies['@vitest/coverage-v8']).toBeTruthy()
  // 2. coverage 스크립트가 정확히 이 형태다 — 포함 검사가 아니라 완전 일치다.
  //    포함 검사(`toMatch(/--coverage/)`)로 두면 뒤에 `--coverage.exclude=src/index.ts` 를
  //    붙여도 정규식이 여전히 맞아 스위트가 초록인 채 헤드라인만 부풀고,
  //    `--coverage.thresholds.lines=0` 이면 임계 자체가 무력해진다 (sync 감사 F-01, 실측).
  expect(pkg.scripts.coverage).toBe('vitest run --coverage')
  // 3. 제공자와 측정 대상
  expect(cov.provider).toBe('v8')
  expect(cov.include).toEqual(['src/**'])
  // 3b. 리포터 — json-summary 가 없으면 AC-COVERAGE-002 가 읽을 파일이 만들어지지 않는다
  expect(cov.reporter).toContain('json-summary')
  // 4. 임계값 85 (라인) — 숫자가 계약이다
  expect(cov.thresholds.lines).toBe(85)
  // 5. 제외 없음, 전역 임계 (perFile 아님)
  expect(cov.exclude).toBeUndefined()
  expect(cov.thresholds.perFile).toBeFalsy()
  // 6. 제공자와 vitest 가 같은 메이저 대역이다 (어긋나면 제공자 적재가 실패한다)
  expect(major(pkg.devDependencies['@vitest/coverage-v8']))
    .toBe(major(pkg.devDependencies.vitest))
  // 7. 진입점을 제외하지 않은 사유가 파일 상단 주석에 남아 있다
  //    — 주석은 값으로 읽을 수 없으므로 문자열 검사 금지의 유일한 명시 예외다 (§ 검증 원칙)
  const head = readFileSync(new URL('../vitest.config.ts', import.meta.url), 'utf8')
    .split('\n').slice(0, 5).join('\n')
  expect(head).toContain('index.ts')
  expect(head).toContain('process.argv')
})

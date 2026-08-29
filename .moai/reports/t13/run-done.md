# card t13 — run 단계 종료 보고

| 항목 | 값 |
|---|---|
| 카드 | t13 — 커버리지 도구 도입 (server) |
| SPEC | **SPEC-COVERAGE-001** (version 0.1.2, status **draft → in-progress** 전이) |
| 워크트리 | `.claude/worktrees/t13`, 브랜치 `WT-coverage-tool` |
| 기준 SHA | `362d17d0d346b3631fa4c5e6868ec55e907d2939` (`.spec-base-sha` 기록) |
| 커밋 SHA | `9b86dd8963669d51cb563c1c11c46fff10b2ffda` (구현 단일 커밋. 이 표의 실제 SHA 기입은 커밋이 자기 SHA 를 모르는 물리적 한계 때문에 D3 관례대로 후속 백필 커밋에서 이뤘다) |
| 증거 원문 | `.moai/specs/SPEC-COVERAGE-001/progress.md` §E.2 (단계 0..8 전체) |

## 1. 쉬운 말 요약

server 워크스페이스에 커버리지 측정 명령이 생겼고, 라인 커버리지가 85% 아래로 떨어지면 그 명령이 실제로 실패하는 게이트가 섰다. 그 과정에서 이 카드가 노린 근본 결함 — server 가 커버리지 도구를 형제 워크스페이스 `channel` 의 선언에서 **우연히 빌려 쓰고 있던 상태** — 를 고쳤다. 이제 `@vitest/coverage-v8` 은 server 가 자기 `package.json` 에 자기 이름으로 선언하며, 누군가 선언을 지우거나 버전 대역을 어기면 `npm test -w server` 가 즉시 빨개진다(회귀 짝 테스트). 측정값은 오늘 기준 라인 **97.01%** 로 임계 85 위에 여유 있게 선다.

## 2. 착지한 것 — 코드 산출물 정확히 4 파일

| 파일 | 변경 |
|---|---|
| `server/package.json` | `coverage` 스크립트 추가 + devDependencies 에 `"@vitest/coverage-v8": "^4.1.11"` 선언 (vitest 와 같은 메이저 대역) |
| `server/vitest.config.ts` | **신규** — provider `v8` · include `src/**` · reporter `['text','json-summary']` · thresholds `lines: 85` · 제외 없음. 상단 다섯 줄 안에 진입점(`src/index.ts` 65-74행, `process.argv` 가드)을 제외하지 않는 사유 주석 |
| `server/test/coverage-contract.test.ts` | **신규** — 계약 7단언 회귀 짝 (acceptance.md 코드 블록 그대로) |
| `package-lock.json` | 선언의 귀결 — `@vitest/coverage-v8`·`vitest` 에서 `"peer": true` 제거 2곳 + server devDependencies 목록 1행 |

`channel/`·`server/src/`·루트 `package.json`·`.gitignore` 는 **무변경**이다 (AC-COVERAGE-005 관측 2·3 으로 관측).

## 3. AC 매트릭스 — 전부 PASS

| AC | 판정 | 핵심 관측 (원문은 progress.md §E.2) |
|---|---|---|
| AC-COVERAGE-001 | **PASS** | `npm ls @vitest/coverage-v8 -w server --depth=0` → 종료 0, `@minidiscord/server@ -> ./server` 의 직접 자식(`└──`)으로 `@vitest/coverage-v8@4.1.11`. channel 대조군 종료 0 |
| AC-COVERAGE-002 | **PASS** | `npm run coverage -w server` 종료 0 · `LINES_PCT=97.01` (≥ 85) · `HAS_INDEX=true` · `FILE_COUNT=11` |
| AC-COVERAGE-003 | **PASS** | 프로브 A'(설정 85→98) 종료 **1** + `does not meet global threshold (98%)` · 프로브 B' 종료 0 · 재프로브(계약 테스트 존재) 종료 1 + **실패 테스트 0** + `Lines : 97.01% (325/335)` 기준선 동일 · 되돌림 해시 대조 2회 모두 일치 |
| AC-COVERAGE-004 | **PASS** | `✓ test/coverage-contract.test.ts > coverage tooling contract holds` · 변이 셋 3회 모두 **그 테스트만** 실패 (`1 failed | 10 passed`), 되돌림 해시 전부 일치 |
| AC-COVERAGE-005 | **PASS** | 관측 1 종료 0 · 관측 2 `NONEMPTY=1` (channel+server/src 무변경) · 관측 3 정확히 네 줄 (`package-lock.json` / `server/package.json` / `server/test/coverage-contract.test.ts` / `server/vitest.config.ts`) · 관측 4 `server/coverage/` 부재 |
| AC-COVERAGE-006 | **PASS** | 전이 1 `Missing script: "coverage"` → 전이 2 (돌지만 선언 부재) → 전이 3 (AC-001..004 통과), 세 전이 원문 순서대로 §E.2 에 기록 |

## 4. 품질 게이트

| 항목 | 관측 |
|---|---|
| `npm run typecheck -w server` | 종료 `0` |
| `npm test -w server` | 종료 `0` — **11 파일 / 105 테스트** (착지 전 10/104 대비 회귀 짝 +1/+1) |
| `npm test -w channel` | 종료 `0` — 5 파일 / 70 테스트 (형제 무회귀) |
| `npm run coverage -w server` | 종료 `0`, Lines `97.01% (325/335)` ≥ 85 |

## 5. 임계 프로브 요약 (REQ-COVERAGE-004 의 근거)

- **프로브 A'** — 설정 파일의 `lines` 를 85→98 로 임시 변경, 오버라이드 없이 실행 → 종료 1, `ERROR: Coverage for lines (97.01%) does not meet global threshold (98%)`. CLI 오버라이드가 아니라 **이 카드가 심은 설정값을 직접 읽혀** 실패했다.
- **프로브 B'** — 85 로 되돌린 뒤 실행 → 종료 0.
- **재프로브** — 계약 테스트가 존재하는 상태에서 같은 형태로 재실행 → 종료 1, `Test Files 10 passed (10)` 로 **실패한 테스트 없음**(비정상 종료를 임계 미달 하나로 귀속 가능), `Lines :` 는 기준선과 동일(제외의 총계 무영향 관측).
- 되돌림 증명 — `shasum -a 256 server/vitest.config.ts` 변이 전후 `8e1d6367…7dd7ea` 로 3회(프로브·변이 3·재프로브) 모두 일치.
- **보조 관측** — `--coverage.thresholds.lines=98` CLI 오버라이드도 종료 1 이었으나 이는 «vitest 의 임계 기능이 살아 있다» 는 참고일 뿐 REQ-COVERAGE-004 의 근거가 아니다 (plan 감사 F-01).

## 6. Gaps — 이 단계가 관측하지 않은 것

1. **AC-COVERAGE-004 단언 2·3·4·5·7 은 개별 변이로 확인하지 않았다** — 변이 셋은 단언 1·6·3b 만 조준했다(계획 §F 단계 7 표의 범위). 나머지는 스위트 통과로만 덮인다.
2. **«channel 이 의존성을 빼는» 시나리오 미재현** — acceptance.md 가 처음부터 재현하지 않기로 못 박은 엣지 케이스다.
3. **`npm test -w server` 단독은 임계를 강제하지 않는다** — 설계대로(`spec.md` §4.2). 강제는 `npm run coverage -w server` 만의 역할이다.
4. **`FILE_COUNT=11` 은 착지 시점의 값** — 다음 카드가 `server/src/` 에 파일을 더하면 거짓 실패하며, 갱신 의무는 그 카드에 있다.
5. **커밋 SHA 자기 참조 불가** — 위 표의 `pending-backfill-run` 자리표시자는 커밋이 자기 SHA 를 모르는 물리적 한계다.

## 7. Residual-risk

- **임계 게이트는 `coverage` 스크립트를 부르는 사람만 지나간다.** CI 배선이 아직 없어(이 카드 범위 밖, `spec.md` §5) 로컬에서 `npm run coverage -w server` 를 습관적으로 부르지 않으면 게이트는 소리 없이 대기한다. CI 배선이 후속 카드다.
- **전역 임계의 성격상 개별 파일 악화는 총계로만 흘러든다.** `index.ts` 83.33% 가 계속 계상되는 것은 의도(진입점 미제외)이며, 총계가 85 아래로 내려가는 순간이 진짜 신호다 — 제외로 숫자를 지키는 선택은 하지 않았다.
- **계약 테스트는 내보낸 설정 객체를 읽는다** — 루트 워크스페이스 설정 등 다른 자리에서 제외가 들어오면 단언 5 는 못 잡는다. 그 실효 측면은 AC-002 의 `FILE_COUNT`·`HAS_INDEX` 가 덮는다(두 기준이 함께 있어야 닫힌다).
- **`FILE_COUNT` 거짓 실패 위험** — 위 Gaps 4 와 같다. 다음 카드가 갱신 책임을 지지 않으면 이 기준이 «환경 탓» 으로 읽히기 시작한다.

## 8. 다음 단계

sync 단계 — manager-docs 가 `implemented → completed` 전이와 문서 동기화를 맡는다. 판독 지점: 이 문서, `progress.md` §E.2·§E.3, 그리고 커밋 자체(`git log -1`).

# t8 run-done — N-07·N-09 종결 보고

card: t8 | branch: WT-attachment-guard | base: 2a19d7d (origin/main)
worktree: .claude/worktrees/t8
date: 2026-08-31

## 결과 요약

N-07·N-09 모두 종결. N-07 은 재현(RED) → 가드(GREEN) → 변이 검증까지 완료했고,
N-09 는 카드 지시 방향(시점 한정 개정)대로 4자리 개정했다. 서버 스위트 189 통과
(기준선 188 + 신규 1건), server typecheck 오류 0. 커밋은 리드 확인 후 (보고→확인→커밋 순서).

## N-07 — 파일이 사라진 첨부를 내려받으면 500 본문이 stored_path 를 노출

**변경**: `server/src/routes-messages.ts` — 읽기 시점 봉인 검사 바로 뒤에 `existsSync` 가드
1블록 추가(+ `node:fs` import). 파일이 없으면 기존 404 응답과 같은 message 형태로 404 를 돌려
ENOENT 가 Fastify 기본 500 봉투로 나가는 경로를 봉는다.

**증거 (재현 명령 + 출력)**:

- RED (가드 넣기 전) — `npx vitest run test/messages.test.ts -t "disappeared"`:
  ```
  AssertionError: expected 500 to be 404 // Object.is equality
  Tests  1 failed | 14 skipped (15)
  ```
  t3 sync-audit-3.md N-07 의 감사 재현(500 + ENOENT + 절대 경로)과 동일한 결함을 잡았다.
- GREEN (가드 후) — `npx vitest run test/messages.test.ts`: **15 passed (15)**
- 변이 검증 — 가드 블록 제거 후 동일 명령:
  ```
  AssertionError: expected 500 to be 404 // Object.is equality
  Tests  1 failed | 14 skipped (15)
  ```
  정확히 이 테스트 1건만 실패(분별력 확인) → 가드 복원 → 15 passed (15).
  테스트는 404 + 응답 본문에 `stored_path` 문자열과 `ENOENT` 가 모두 없음을 단언한다.

**테스트**: `messages.test.ts` 에 1건 추가 —
`serves 404 without leaking stored_path when the backing file has disappeared`
(정상 업로드 → `unlinkSync` 로 파일만 삭제 → GET → 404 + 경로·ENOENT 미노출).

## N-09 — SPEC-CORE-001 AC-CORE-012 시점 한정 개정

**개정 4자리** (N-04 선례 패턴 — HISTORY 버전 행 + 근거 인용; status: completed 유지):

1. `acceptance.md` AC 매트릭스 표: `ls server/src` → `git ls-tree --name-only a97d36c server/src/`
2. `acceptance.md` AC-CORE-012 본문: 시점 한정 + 형제 SPEC 의 파일 추가는 정상 범위 확장이라
   현재 트리 파일 수가 대상이 아님을 명시
3. `spec.md` frontmatter: version 0.3.0→0.4.0, updated 2026-08-31
4. `spec.md` HISTORY: 0.4.0 행 추가 (근거: `.moai/reports/t3/sync-audit-3.md` N-09)

**증거**:

- 시점 실측 — `git ls-tree --name-only a97d36c server/src/` → `config.ts db.ts index.ts`
  (정확히 3개). `8d58265`(M1) 시점은 2개라 `a97d36c`(M2, sqlite schema)가 "이 SPEC 의 구현이
  끝난" 커밋. 개정된 AC 명령을 그대로 실행해 확인.
- REQ-CORE-015 본문은 무변경 — 시점 한정 AC 가 REQ("이 SPEC의 buildServer 가 등록하는 경로는
  GET /api/health 하나뿐")와 정렬. 감사 제안 3안 중 카드 지시 방향(시점 한정) 채택.
- 회귀 스위트에 AC-CORE-012 를 재는 테스트 없음(`ls server/src|ls-tree` grep, 적중 0) —
  문서 개정만으로 닫힘.
- 개정 뒤 어간 훑기(`ls server/src|세 파일|세 항목`): 잔여 적중 전부 역사 기록
  (`SPEC-CORE-001/progress.md:196` 검증 표·형제 SPEC progress 의 N-09 발견 기록·t3 감사 보고서)
  — 그 시점엔 참이던 기록이라 유지. N-09 종결 사실은 이 보고서와 큐가 담는다.

## 리드 확인 사항

- **t26 중복 주의**: t26(N3 문서 묶음) 이관 목록에 "t8 N-09(AC-CORE-012 시점 한정 개정)" 가
  소유자로 이미 올라와 있음 — 이 카드에서 처리 완료. t26 도달 시 N-09 는 중복 처리하지 말고
  닫힘 확인만.
- 커밋 대기: 리드 확인 후 커밋 진행 (레인 순서 규칙).

## 검증 매트릭스 (이 런·이 나무, HEAD 2a19d7d)

| 항목 | 명령 | 관측 결과 |
|------|------|-----------|
| server 스위트 | `npx vitest run` (server/) | 189 passed (189) |
| 신규 테스트 RED | `npx vitest run -t disappeared` (가드 전) | 1 failed — 500≠404 |
| 신규 테스트 GREEN | `npx vitest run -t disappeared` (가드 후) | 1 passed |
| 변이 | 가드 제거 → 동일 명령 | 1 failed → 복원 후 통과 |
| server typecheck | `npm run typecheck -w server` | exit 0, 오류 0 |
| channel 빌드 | `npm run build -w channel` | exit 0 |

## Gaps (관측하지 않은 것)

- e2e 스위트 미실행 — 변경이 server 라우트라 lane-local 원칙상 server 스위트로 충분하다고
  판단함. 전체 스위트는 CI 가 돌린다.
- 커밋·푸시·CI — 리드 확인 대기(아직 실행 안 함).

## Residual-risk (잔여 위험)

- N-07 의 Low 심각도 근거(원격 공격자가 상태를 유발할 수 없음)는 변동 없음 — 이번 수정은
  정보 노출 봉쇄이지 상태 발생 원인 제거가 아니다.
- AC-CORE-012 가 고정한 커밋 SHA `a97d36c` 는 히스토리 리라이트가 일어나면 깨진다
  (시점 한정 기준의 일반적 한계).

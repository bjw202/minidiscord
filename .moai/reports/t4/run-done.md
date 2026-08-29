# t4 런 단계 완료 보고 — 채널 플러그인 4-SPEC 사슬

| 항목 | 값 |
|------|-----|
| 카드 | `t4` (마일스톤 M4) |
| 워크트리 | `.claude/worktrees/t4` (브랜치 `WT-channel-plugin`, 로컬 — 미푸시, 워크트리가 유일 사본) |
| 기준 → 종료 | `0794ecd` → `41c996f` (run 커밋 12건 + 본 보고 커밋) |
| 사슬 순서 | SPEC-CHANNEL-001 → SPEC-CHANCLIENT-001 → SPEC-CHANWIRE-001 → SPEC-CHANPERM-001 (디스패치 계약대로) |
| 완료일 | 2026-08-27 |
| 특이사항 | 이전 세션 창 포화로 M1 직후 중단 → 재개 세션이 인계·재현·완수 (각 progress.md §E.2 머리글에 기록) |

## 1. SPEC별 §E 자체검증 요약

### SPEC-CHANNEL-001 — 채널 MCP 서버 코어 (16/16 AC)

- 커밋: M1 `a5e40f1` · M2 `7b28692` (§E.3 `m2_commit_sha` 는 본 보고 커밋에서 백필 완료)
- §E.2 요약: `createChannelServer` 본체(capabilities 3종·instructions·reply/fetch_history 도구·채널 알림), stdio 진입점, 무상태·범위경계 4관측. 테스트 10개 = AC-003·006~014, 빌드·프로브·grep 관측이 나머지 AC 충당.
- 커버리지: 100% (stmts 19/19 · branch 6/6 · funcs 5/5 · lines 17/17, v8 — `src/index.ts` 제외)
- Gaps(§E.2 명시): 개별 테스트 RED 미관측(인계물 — 모듈부재 RED로 재현만 관측), 엣지 5건은 후속 SPEC 소관, typecheck가 테스트 파일 미포함.

### SPEC-CHANCLIENT-001 — 게이트웨이 클라이언트 (16/16 AC)

- 커밋: M1 `ec0faf2` · M2 `7483a3f` · 증거 `9376264`
- §E.2 요약: `gateway-client.ts` — 연결·프레임 분배·송신, 이력 요청 매칭, 재접속 백오프. 테스트 15개 신규(총 25). RED 4전이 원문 캡처.
- 커버리지: lines 100% · stmts 97.33% · branch 93.75% · funcs 89.47%
- 이탈 1건(§E.3 기록): 하네스 FakeServer.url() 교정 — `wss.address()` null 시 TypeError로 재시도 루프가 죽던 레이스. 시나리오·단언 미변경.
- Gaps: JSON 아닌 프레임·start() 중복은 계약상 수용, 실게이트웨이 결합은 Task 18 E2E 소관.

### SPEC-CHANWIRE-001 — wire() 3갈래 배선 (14/14 AC)

- 커밋: M1 `79fc17f` · M2 `4bed641` · 백필 `323df7f`
- §E.2 요약: 수신(알림)·상태(TO→working)·송신(bot_message+idle) 3갈래, 이력 렌더링·주소 해석·진입점 가드. 테스트 11개 신규(총 36). **변이 검증 4종**(A pushChatMessage / B bot_message / C 파라미터 버림 / D status working 제거) — 4변이 모두 표적 기준 붕괴, shasum 일치로 완전 되돌림 증명.
- 변이 A 표 불일치(판정 기록됨): 실제 실패 집합이 예측보다 AC-003 1개 초과 — 원인은 AC-003 테스트 본문의 이중 단언(수신 갈래 단언이 상태 갈래 테스트에도 삽입), 구현 결함 아님. 표 A행 계정은 SPEC 바디 불변으로 여기에만 기록.
- 커버리지: 측정 제외 대상(`src/index.ts` 진입점)에 wire()가 위치 — 수치는 전 단계와 동일(lines 100% 등). 변이 검증이 배선 정확성의 1차 근거.
- Gaps: JSON 아닌 프레임 등 계약상 수용 3건.

### SPEC-CHANPERM-001 — 승인 릴레이 양방향 (12/12 AC)

- 커밋: M1 `2f2c994` · M2 `72d7b1f` · 증거 `2d8ab39` · 백필 `41c996f`
- §E.2 요약: 채널 서버 승인 릴레이 진입점 + wire 승인 릴레이 양방향 배선. 테스트 10개 신규(총 46). RED 4전이 관측. `channel-server.ts` 이 SPEC 변경 파일 100%.
- 커버리지: stmts 97.46% · lines 100% · branch 93.75% · funcs 90.9%
- Gaps: 게이트웨이 끊김 중 요청 버퍼링 없음·params 누락 시 알림 소실 — 계약상 수용. **서버 쪽 request_id 결함 2건(가정-2·3)은 카드 t7 소관, 이 카드에서 미보상.**

## 2. 오케스트레이터 독립 검증 (신뢰-그러나-검증, 최종 HEAD에서 재실행)

각 SPEC 완료 시점 + 최종 HEAD `41c996f`에서 실행자가 직접 재실행한 원문:

```
$ npm test -w channel -- --coverage
 Test Files  4 passed (4)
      Tests  46 passed (46)
Statements : 97.46% ( 77/79 )
Branches   : 93.75% ( 30/32 )
Functions  : 90.9% ( 20/22 )
Lines      : 100% ( 69/69 )

$ npm run build -w channel      → build-exit=0 (channel/dist/index.js 생성)
$ npm run typecheck -w channel  → typecheck-exit=0

$ printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"probe","version":"0.0.0"}}}' \
  | node channel/dist/index.js | head -n 1 | node -e '<검사 스크립트>'
PROBE-OK serverInfo=minidiscord-channel    ← capabilities claude/channel 포함 확인
```

- 진입점 프로브는 SPEC-CHANNEL-001 §E.2 원문 프로브와 동일 취지(initialize → serverInfo·capabilities 검사)로 최종 트리에서 재관측해 통과.
- 작업나무: 코드 변경 없음(`channel/coverage/` 생성물은 본 커밋에서 `coverage/` gitignore 추가로 무시 처리).

## 3. 미검증·잔여 위험 (Gaps / Residual-risk)

- **개별 RED 미관측 범위**: SPEC-CHANNEL-001 인계 10개 테스트는 모듈부재 RED로만 재현 관측(§E.2 명시). 이후 3개 SPEC은 RED 4전이씩 원문 캡처.
- **wire() 커버리지 공백**: 진입점 배선은 커버리지 측정 제외 — 변이 검증 4종으로 보완되나 수치 근거는 아님.
- **서버 결함 2건의 현존**: CHANPERM 가정-2·3(request_id 관련)은 t7 카드에서 보상 예정. 본 카드는 미보상 — t7 디스패치 시 이 문서를 참조할 것.
- **실환경 결합 미검증**: 실제 게이트웨이·실 토큰·`MINIDISCORD_TOKEN` 미설정 경로는 Task 18 E2E 소관(전 SPEC §E.2 Gaps 일관).
- typecheck가 테스트 파일을 검사하지 않음(전 SPEC 공통 구조) — 테스트 타입 오류는 vitest 실행 시에만 드러남.

## 4. 커밋 목록 (카드 t4 런 단계 전체)

```
41c996f chore(SPEC-CHANPERM-001): run_commit_sha 백필 — 72d7b1f (card t4)
2d8ab39 chore(SPEC-CHANPERM-001): run 단계 증거 기록 — §E.2·§E.3 + REQ→AC 매핑 (card t4)
72d7b1f feat(SPEC-CHANPERM-001): wire 승인 릴레이 양방향 배선 — AC 12/12 통과 (card t4)
2f2c994 feat(SPEC-CHANPERM-001): 채널 서버 승인 릴레이 양방향 진입점 — AC 9/12 통과 (card t4)
323df7f chore(SPEC-CHANWIRE-001): run_commit_sha 백필 — 4bed641 (card t4)
4bed641 feat(SPEC-CHANWIRE-001): M2 이력 렌더링·주소 해석·진입점 가드 — AC 14/14 통과 (card t4)
79fc17f feat(SPEC-CHANWIRE-001): M1 wire() 세 갈래(수신·상태·송신) — AC 5/14 통과 (card t4)
9376264 docs(SPEC-CHANCLIENT-001): run 단계 증거 progress.md 기록 — AC 16/16, audit-ready (card t4)
7483a3f feat(SPEC-CHANCLIENT-001): M2 이력 요청 매칭과 재접속 백오프 — AC 007~015 통과 (card t4)
ec0faf2 feat(SPEC-CHANCLIENT-001): M1 게이트웨이 클라이언트 연결·분배·송신 — AC 001~006 통과 (card t4)
7b28692 feat(SPEC-CHANNEL-001): M2 stdio 진입점과 수용 기준 증거 — AC 16/16 통과 (card t4)
a5e40f1 feat(SPEC-CHANNEL-001): M1 채널 MCP 서버 본체 — reply/fetch_history 도구와 채널 알림 (card t4)
```

푸시 없음 — 통합(릴리스 브랜치 병합)은 리드 디스패치 소관.

## 5. 리드 후속 액션 참고

- 증거 원문: `.moai/specs/SPEC-{CHANNEL,CHANCLIENT,CHANWIRE,CHANPERM}-001/progress.md` §E.2/§E.3 (각 AC 판정 근거 = 원문 출력).
- t7 디스패치 시 §3 의 서버 request_id 결함 2건 인계할 것.
- sync 디스패치 시 변이 검증 기본값 유지(본 카드 3·4번 SPEC에서 변이 검증 시행·기록됨).

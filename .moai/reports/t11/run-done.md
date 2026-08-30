# t11 run-done — SPEC-ROOMAUTHZ-001 run 단계 완료 보고

- 카드: `t11` / 워크트리: `.claude/worktrees/t11` / 브랜치: `WT-room-authz`
- 작성: run 레인 세션 (2026-08-29) — 커밋별 SHA 는 이 파일이 착지한 커밋 기준 전부 확정값
- 리드 판독용 6항목 (디스패치 (a)–(f)) 순서를 따른다. 상세 원문은 `progress.md §E.2/§E.3` 과 `.moai/state/verify/t11-run1/` 이 SSOT 이고, 이 파일은 요약+경로다.

## 커밋 목록 (e)

| SHA | 내용 |
|---|---|
| `9b0e619` | M1 — room_members 표, rooms.created_by(PRAGMA 가드), 표식 기반 1회성 백필 |
| `9ace4c9` | M2 — 멤버십 술어(isRoomMember·requireRoomMember), 생성자 자동 가입(단일 트랜잭션), 초대 라우트 |
| `64c56ce` | M3 — 게이트 여덟 곳(메시지 2·스트림·목록·브로커 백스톱·초대 셋 3), registerEventRoute 추출 |
| `ec2f344` | M4 — 형제 하네스 수리, AC-014 보강, AC-MSG-012 단언 축소, §6 양방향 검증 기록 |
| (이 커밋) | run-done 보고 + §E.3 SHA 백필 |

## (a) M4 단계 1 — 실제 실패 ↔ plan §D.4 양방향 대조 (AC-ROOMAUTHZ-016 본체)

레인이 **M3 직후(하네스 교정 전)** verbose 를 직접 실행해 기록했다 (`progress.md §E.2` M3 절, 원문 `.moai/state/verify/t11-run1/m3-post-gates-verbose.txt`):

- **일치: 26건** — §D 직접 목록과 이름 단위 전건 일치 (messages 13·permissions 12·sse 1).
- **목록에 있는데 실패하지 않은 항목: 8건** — §D.3.1 «2차 효과» 묶음(sse 7 + permissions `:147` 1). 원인: 하네스 사본 라우트(`sse.test.ts:30`·`permissions.test.ts:51`)에는 게이트가 없어 아직 안 깨진 것 — 사본 교체는 M4 단계 2 의 행위. plan.md 자신이 §D.3.1 F-14 상자에서 이 26 상태를 예고해 둔 값이다.
- **목록에 없는데 실패한 항목: 0건.**
- **예측 실증:** M4 에서 사본을 교체한 순간 실패가 **정확히 34건**으로 전이(`m4-transition-34-verbose.txt`, 목록 밖 0) — §D.4 의 열거가 완전했음이 실행으로 확인됐다.
- 부기 관측: plan §D.4 표의 파일별 **분모** 합계는 102인데 실측 분모는 104(«그 외 5개 파일» 행 2 short). **분자 34 기준선엔 영향 없음.**

## (b) §G 완료 정의 — acceptance.md 전부

- **AC-ROOMAUTHZ-001..018 전부 통과** — 최종 스위트 `Tests 125 passed (125)` 종료 0 안에서 이름 단위 `✓` 관측. (AC-014 는 run 중 발견된 결함 — 테스트가 어디에도 없었음 — 이어 레인 지시로 acceptance.md 본문 그대로 `room-members.test.ts` 에 보강. 보존 판정이라 born-green 이 정상.)
- `npm run typecheck -w server` 종료 0.
- **§6 표 양방향 대조** — 파일→표: `grep -rn "SPEC-ROOMAUTHZ-001" .moai/specs/ .moai/plan/` 35 히트 전부 표 행에 사상(고아 0, 표 완결). 표→파일: 전 행 **참** 판정(아홉 술어 소비부 실측, D2 v2 문장·REQ-PERM-004 시그니처·뒤집힌 주석의 2차 반전 구조 확인). «주석의 존재»가 아니라 «참임»을 판정 — N-01 교훈 이행.
- AC-MSG-012 대조군 단언을 `!== 401` → `=== 200` 으로 축소(F-13) + 두 기준의 전제 변경 주석 착지.
- **잔여 위험 → 후속 카드 요청:** `GET /api/attachments/:id` · `POST /api/rooms/:id/archive` 는 D2 v2 범위 밖으로 계속 열려 있다(각각 requireAuth 만). **후속 카드 생성 요청**한다 — REQ-ROOMAUTHZ-013 의 «알려진 미준수» 인수 분이다.
- 보관 라우트 미준수는 `spec.md` §7·§9 에 이름으로 기재돼 있고 어느 AC 도 그것을 통과로 판정하지 않았다.

## (c) archive 무게이트·초대 셋 게이트 준수

- `routes-rooms.ts:67` `POST /api/rooms/:id/archive` — `requireAuth` 만 있고 멤버십 게이트 **없음(REQ-013 요구대로)**. 레인 grep 직접 관측.
- `routes-bots.ts:50·70·82` 초대 셋 3라우트 — `requireRoomMember` 게이트가 기존 방 조회보다 **앞**에 있음(AC-017·018 통과로 실측).
- `server/src` 에 `403` 사용 0건, 비멤버 빈 배열 응답 0건.

## (d) 최종 스위트 verbose

- `npm test -w server -- --reporter=verbose` → 종료 0, `Test Files 11 passed (11)` / `Tests 125 passed (125)`. 원문: `.moai/state/verify/t11-run1/m4-green-verbose.txt` (레인 직접 재실행).
- `npm test -w channel` → 70/70 (M3 경계 확인 시 무관계 검증).

## (e) AC 하네스 단계적 추가 추적

공통 하네스는 4단계로 완성됐다(§E.2 마일스톤별 기록 있음): M1 스키마 부분집합(memberCount) → M2 메시지 라우트+multipart+hub/gateway 데코레이트(AC-007) → M3 나머지 전부(`listen`/`port`/`cleanups`·`signUpOn`·봇/SSE 헬퍼·`routes-events` import — AC-008..013·017·018) → M4 형제 하네스 수리+`memberRoom` 신설. 근거: 리드 승인(«편차 1건 수용») + `routes-events` 모듈이 M3 에서야 생기는 구조적 이유.

## (f) 미검증·편차 명시

1. **M3 커밋 게이트 우회** — pre-commit `moai gate` 가 전체 초록을 요구해 첫 커밋이 막힘. 26건은 plan §F M3 4번의 예정 상태라 훅 안내 변수 `SKIP_MOAI_PRECOMMIT=1` 로 우회(§E.2 M3 절 기록). **M4 커밋은 우회 없이 통과** — 초록 회복이 실증됐다.
2. **attributed 관측 vs 레인 직접 관측** — RED 원문·34-moment·양방향 대조·경계 검사는 구현 에이전트 관측 인용이고, 레인은 각 마일스톤의 최종 GREEN·타입·범위·이름 단위 판정을 직접 재실행해 확인했다(§E.2 미검증 절 참조).
3. **plan §D.4 분모 부기 불일치**(102 vs 104) — 위 (a).
4. **`registerEventRoute(app)` 단일 인자** — 위임 지시 `(app, opts)` 대신 기존 등록 함수 형태에 맞춤. AC-010 의 buildServer 판이 통과로 검증.
5. **AC-014 테스트 부재 → run 중 보강** — 위 (b).
6. **범위 밖 관찰 (리드 판단 사항):** `.moai/state/verify/t4-sync-audit/probe-inject.test.ts` — t4 감사 탐침 잔재. 루트 vitest 실행 시 17번째 파일로 수집돼 로드 오류(테스트 0건). 워크스페이스 명령(`-w server/-w channel`)에는 안 잡힘. 지우는 것이 맞는지는 리드/후속 카드 판단.
7. run-done 착지 전 `/clear` 없음 — 디스패치 준수.

## 리드에게

- run 단계 완료. sync 단계(`manager-docs`) 진입은 리드 디스패치를 기다린다.
- 후속 카드 요청 1건: 첨부+보관 라우트 게이트((b) 참조).
- §E.3 audit-ready 신호 착지(`progress.md`) — sync-auditor 대상.

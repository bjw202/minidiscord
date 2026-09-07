# SPEC-BOTMODEL-001 — 진행 기록

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_authored_at: 2026-09-07
plan_revised_at: 2026-09-07      # 감사 2회차 교정 (spec.md 는 안 바뀌어 v0.2.0 유지)
plan_audit_iterations: 2
plan_audit_history:
  - iteration: 1
    verdict: FAIL
    score: 0.71                  # Tier L 통과선 0.85
    report: .moai/reports/plan-audit/SPEC-BOTMODEL-001-review-1.md
    closed: "D1~D7 (차단 전부) + D8·D9·D10 (선택 전부)"
    new_numbers_added: 0         # REQ·AC 번호를 하나도 새로 만들지 않았다
  - iteration: 2
    verdict: PASS
    score: 0.889                 # Tier L 통과선 0.85 초과
    report: .moai/reports/plan-audit/SPEC-BOTMODEL-001-review-2.md
    found: "D11·D12 (차단) + D13 (선택) — 1회차 D1~D10 은 전부 해소 확인"
    closed: "D11 (끝 조건 grep 을 네 자리 모두 «다음에 since_id 로 넘기면» 으로 좁힘) · D12 (변이 집합 판정에서 AC-025 제외 + 네 행 재도출) · D13 (변이 ㉠ 에 «전역 커서로 되돌리기» 한정 복원)"
    new_numbers_added: 0         # REQ·AC 번호를 하나도 새로 만들지 않았다 (25/25 유지)
    spec_md_changed: false       # spec.md 는 grep 을 싣지 않아 이번 회차에 바뀌지 않았다 → version·HISTORY 불변
spec_id: SPEC-BOTMODEL-001
stage: "v2 리팩토링 A 단계"
plan_head_sha: 1b4e918
branch: WT-v2-model
worktree: .claude/worktrees/v2-model
predecessor: "C1 단계 착지 2f6cd3f"
tier: L
requirements: 25        # REQ-BOTMODEL-001..025 (Tier L 상한 25)
acceptance_criteria: 25 # AC-BOTMODEL-001..025 (Tier L 상한 25)
mutations: 4            # ㉠ 재전송 JOIN room_bots 제거 · ㉡ deliver 참여 검사 제거 · ㉢ realpathSync→resolve · ㉣ "+ sep" 제거
mutation_expectation:   # 집합 일치로 판정하되 판정 대상은 개별 기준 24개(AC-001~024)다 (acceptance.md DoD 표)
  rule: "AC-BOTMODEL-025 는 전체 스위트를 재는 집계 기준이므로 변이 집합 판정에서 제외한다. 변이 판정은 기준이 적은 파일별 판정 명령으로만 재고, AC-025 는 변이를 넣지 않은 트리에서만 판정한다. 변이 중 AC-025 가 붉어지는 것은 정상이다"
  rows:
    - "㉠(전역 커서 하나로 되돌리기) → 붉음: AC-003 그리고 AC-004 갈래 ㉮ / 초록: 나머지 22 기준"
    - "㉡ → 붉음: AC-004 갈래 ㉯ 만 / 초록: AC-003 포함 나머지 23 기준"
    - "㉢ → 붉음: AC-019 만 / 초록: 나머지 23 기준"
    - "㉣ → 붉음: AC-019 만 / 초록: 나머지 23 기준"
ac004_branch_b_reachability:
  status: "확인됨"
  note: "갈래 ㉯ 는 실제 사람 라우트로는 만들 수 없다 — server/src/routes-messages.ts 의 POST 메시지 핸들러(주석 «팬아웃 — 저장이 끝나면 SSE 발행과 게이트웨이 전달을 각각 정확히 한 번»)가 message_targets 행을 루프로 INSERT 한 뒤 같은 핸들러 안에서 req.server.gateway.deliver(roomId, message, targets) 를 동기로 부르며 그 사이에 await 가 없다. 따라서 저장과 deliver 사이에 DELETE 를 끼워 넣을 틈이 없고, 테스트는 deliver 를 직접 호출해 그 순서를 만든다(acceptance.md AC-004 갈래 ㉯ 가 적은 대로)"
milestone_ac_union: 25  # M1 2 · M2 3 · M3 6 · M4 8 · M5 4 · M6 3 (016 이 M2·M3 에 겹침) — plan.md §B.7
artifacts:
  - .moai/specs/SPEC-BOTMODEL-001/spec.md
  - .moai/specs/SPEC-BOTMODEL-001/plan.md
  - .moai/specs/SPEC-BOTMODEL-001/acceptance.md
  - .moai/specs/SPEC-BOTMODEL-001/design.md
  - .moai/specs/SPEC-BOTMODEL-001/research.md
  - .moai/specs/SPEC-BOTMODEL-001/spec-compact.md
  - .moai/specs/SPEC-BOTMODEL-001/progress.md
source_materials:
  - ".moai/reports/v2-refactoring-guide.md §0 · §2 · §6"
  - ".moai/reports/v2-review.md §1 · §4 · §5 · §6(위험 1~7) · §7"
  - ".moai/state/verify/a0/result.md (결정 ② 실측)"
settled_decisions:
  - "① 권한 요청 방 — 채널이 «마지막 to 방» 을 room_id 로 싣고, 서버 대기 맵은 방:id 와 봇:id 두 색인"
  - "② chat_id — A-0 실측으로 «세션이 채움» 확정(2/2). 채널 보충·서버 거부 두 겹은 관측 한정 때문에 유지"
  - "③ 연속 봇 글 N=6 되먹임 차단은 B 단계 것 — role 열만 여기서 만들고 강제는 하지 않는다"
  - "④ 비공개 방 삭제는 C1 에서 완료 — 이 SPEC 은 전제로만 쓴다"
needs_clarification: []   # 남은 [NEEDS CLARIFICATION] 없음
sibling_breakage:
  measured_by: "미측정 — 보고서 §5 의 처분표는 읽기 판단이며 어떤 기제도 변이시켜 npm test 를 돌리지 않았다(그 보고서 «확인 못 한 것» 1번). run 단계 M6 진입 시 npm test -- --reporter=verbose 로 파일별 it( 수를 실측한다"
  rewritten: 3            # gateway.test.ts · gateway-client.test.ts · rooms-bots.test.ts
  fixed: 9
  deleted: 2              # gateway-v2.ts · gateway-mutual-auth.test.ts (+ fixtures/tls-*)
  coupled_cleanup: ".moai/state/verify/t25-plan/sibling-sweep.mjs 의 'channel/test/gateway-mutual-auth.test.ts' 줄 (직접 확인)"
carried_forward_unresolved:
  - "GET /api/attachments/:id 의 방 검사 부재 — 보류 카드 t17. C1 에서 방 검사 자체가 사라졌으므로 새 구멍이 아니다"
  - "대기 맵의 상한·만료·속도 제한 부재 — 기존 @MX:DEBT, 보류 카드 t12"
  - "web/style.css 의 죽은 규칙(#register-form 계열) — 세지 않았다"
  - "npx tsx scripts/e2e.mts 는 이 SPEC 종료 시점에 빨갛다 — C2 소유"
```

## §E.2 Run-phase Evidence

run 단계(manager-develop, cycle_type=tdd, 2026-09-07, 세션 97d0612e). 모든 증거는 워크트리 `.claude/worktrees/v2-model` 브랜치 `WT-v2-model` 에서 잰 것이고, 긴 출력은 `.moai/state/verify/a-run/` 아래 파일로 남겼다(추적 안 되는 디렉터리 — 커밋에 넣지 않는다). 귀속 커밋은 **구현 커밋 `eca2c3d`** 이며, 이 진행 기록 자체는 그 위의 문서 커밋에 실린다.

### E.2.0 기준선 (착수 전, HEAD `00e50da`)

- `npm test` → 종료 0, server **254 passed (18 files)** · channel **102 passed (7 files)** — `.moai/state/verify/a-run/00-baseline-npm-test.log`
- 파일별 `it(` 수 — `.moai/state/verify/a-run/00-it-counts-before.txt`

### E.2.1 (E1) 수용 기준 25 — PASS/FAIL 행렬

판정 명령 형태: `npm test -w server -- <파일>` · `npm test -w channel -- <파일>` (각 워크스페이스 `test` = `vitest run`). 아래 «시험 이름» 은 `npx vitest run --reporter=verbose` 의 ✓ 줄 그대로다 — `.moai/state/verify/a-run/99-verbose-server.log` · `99-verbose-channel.log` (HEAD `eca2c3d`).

| AC | 판정 | 판정 파일 · 시험 이름(verbose ✓ 줄) |
|---|---|---|
| 001 | PASS | ① `server/test/gateway.test.ts` «AC-001 ①: one connection with one token receives the to-message of each room, each carrying its own room_id» · ② `channel/test/channel-server.test.ts` «AC-021: meta carries exactly {chat_id, message_id, delivery, sender, author_type}, all pass-through» (chat_id === String(room_id)) · ③ `channel/test/index-wiring.test.ts` «AC-001 ③: the notification chat_id equals the room_id the gateway put on the message frame, room after room» |
| 002 | PASS | ① `channel/test/index-wiring.test.ts` «AC-002 ①: reply{chat_id: "2"} becomes exactly one bot_message carrying room_id 2» · ② `server/test/gateway.test.ts` «AC-002 ②: bot_message{room_id} stores one bot row in that room only and publishes to that room only» |
| 003 | PASS | `server/test/gateway.test.ts` «AC-003: replays each room past its own cursor, in global id order, and advances each room cursor separately» — 변이 ㉠ 에서 붉어짐 (E.2.5) |
| 004 | PASS | `server/test/gateway.test.ts` «AC-004 ㉮: after the room participation is deleted, replay carries nothing from that room — not even a local_path» · «AC-004 ㉯: deliver sends nothing to a bot whose participation in that room was deleted just before» — ㉮ 는 변이 ㉠, ㉯ 는 변이 ㉡ 에서 붉어짐 |
| 005 | PASS | `server/test/permissions.test.ts` «AC-005: the request lands in the room named by the frame, and that room yes goes back to the requesting connection» |
| 006 | PASS | `server/test/permissions.test.ts` «AC-006: a yes from another room the same bot participates in closes the same request, exactly once» |
| 007 | PASS | 셸: `grep -rn "verifier_pub\|server_confirm_key\|handshakeTranscript\|'env'\|bot_tokens\|revoked_at" server/src channel/src` → 출력 0건, 종료 1 · 인프로세스 짝: `server/test/db.test.ts` «creates all tables — bots and room_bots, never bot_tokens» |
| 008 | PASS | 셸: `grep -rn "다음에 since_id 로 넘기면" channel/src` → 0건, 종료 1 · 인프로세스 짝: `channel/test/channel-server.test.ts` «AC-008: INSTRUCTIONS carries the new cursor sentence verbatim and no longer the old since_id sentence» (양성·음성 문자열 일치) |
| 009 | PASS | `server/test/db.test.ts` «AC-BOTMODEL-009: bots carries token UNIQUE NOT NULL and role DEFAULT worker; room_bots keys (room_id, bot_id) with a cursor» |
| 010 | PASS | `server/test/db.test.ts` «AC-BOTMODEL-010: refuses a v1 file that carries bot_tokens and a token-less bots table» (`toContain('개발용 DB 파일을 지우고 새로 만드세요')`) |
| 011 | PASS | `server/test/rooms-bots.test.ts` «AC-011: registration answers 201 {id, name, token, command}; the token matches bots.token and never shows again» |
| 012 | PASS | `server/test/rooms-bots.test.ts` «AC-012: POST is idempotent, GET lists {bot_id, bot_name, online:boolean}, DELETE removes only that room row» |
| 013 | PASS | `server/test/rooms-bots.test.ts` «AC-013: the three /invites routes are gone — 404 each» · «AC-013: archiving calls the closeRoom hook once and revokes nothing — the bot token and its participations stay» |
| 014 | PASS | `server/test/gateway.test.ts` «AC-014: answers hello{token} with one bare welcome listing the bot active rooms» · «AC-014: an unknown token gets no frame and a closed socket; unauthenticated and malformed frames close too» |
| 015 | PASS | `server/test/gateway.test.ts` «AC-015: frames without room_id are dropped silently — no row, no response, no system message, socket stays open» |
| 016 | PASS | `server/test/gateway.test.ts` «AC-016: history_response goes only to the requesting connection of the two sharing one token, with room_id» |
| 017 | PASS | 서버: `server/test/gateway.test.ts` «AC-017: status{room_id} publishes bot_status to that room only, for working and idle only» · 채널: `channel/test/index-wiring.test.ts` «AC-017: status{working} carries the to-message room and status{idle} carries the reply room» |
| 018 | PASS | `server/test/gateway.test.ts` «AC-018: isOnline is per bot — both rooms report online with one connection, and offline right after it closes» |
| 019 | PASS | `server/test/gateway.test.ts` «AC-019: of [outside, inside, symlink-out, sibling-prefix, missing] only the inside file is attached and the message proceeds» (+ 이관된 형제 «refuses a symlink…»·«refuses a sibling directory…») — 변이 ㉢·㉣ 에서 붉어짐 |
| 020 | PASS | `server/test/gateway.test.ts` «AC-020: never publishes stored_path on the hub frame for a bot attachment» (+ `server/test/messages.test.ts` 의 기존 F-02 두 건) |
| 021 | PASS | `channel/test/channel-server.test.ts` «AC-021: meta carries exactly {chat_id, message_id, delivery, sender, author_type}, all pass-through» |
| 022 | PASS | `channel/test/index-wiring.test.ts` «AC-022: chat_id from the session wins, the last to-room fills in when absent, and a channel that never saw a to sends no room_id» |
| 023 | PASS | `channel/test/index-wiring.test.ts` «AC-023: fetch_history{chat_id} still returns {cursor, messages} with cursor = max message id, null when empty» |
| 024 | PASS | `server/test/messages.test.ts` «AC-024: a mention resolves only in rooms the bot participates in — 200 + one target row in R1, 400 and no rows in R2» |
| 025 | PASS | §D 끝 조건 넷 — E.2.4 에 명령과 출력 그대로 |

**25/25 PASS.** plan.md §B.7 합집합(M1 2·M2 3·M3 6·M4 8·M5 4·M6 3, 016 겹침)과 1:1 이다.

### E.2.2 (E2) 빌드·타입 검사

- `npm run build -w channel` → 종료 0 — `.moai/state/verify/a-run/M6-channel-build.log`. `channel/dist/gateway-client.js` 에 `{ type: 'hello', token: opts.token }` 가 있음을 grep 으로 확인(줄 32).
- 서버 pretest(`server/package.json` `"pretest": "npm run typecheck"` = `tsc --noEmit`)는 아래 `npm test` 안에서 돌았다 — `99-final-npm-test.log` 에 `error TS` 0건.

### E.2.3 (E3) 전체 스위트와 sibling_breakage 실측

```
$ npm test > .moai/state/verify/a-run/99-final-npm-test.log 2>&1; echo exit=$?
exit=0
 Test Files  18 passed (18)      ← server
      Tests  248 passed (248)
 Test Files  6 passed (6)        ← channel
      Tests  103 passed (103)
```

`it(` 수 실측 (`grep -c "^\s*it(" server/test/*.test.ts channel/test/*.test.ts`) — 전: `00-it-counts-before.txt`, 후: `99-it-counts-after.txt`. 달라진 파일만:

| 파일 | 전 | 후 | 처분 |
|---|---|---|---|
| server/test/gateway.test.ts | 39 | 34 | 다시 씀 — GWAUTH2 절 9건 삭제, v2 기준 6건 신설, closeRoom 1건 신설 |
| channel/test/gateway-client.test.ts | 20 | 19 | 다시 씀 — welcome 통과 2건 → «welcome 은 콜백에 안 감» 1건 |
| server/test/rooms-bots.test.ts | 21 | 15 | 다시 씀 — invites 절 11건 → 참여 절 4건 + 등록 2건 |
| server/test/db.test.ts | 2 | 4 | AC-009·010 신설 |
| server/test/messages.test.ts | 15 | 16 | AC-024 신설 |
| server/test/permissions.test.ts | 27 | 29 | AC-005·006 신설, 본체 27건 그대로 |
| channel/test/channel-server.test.ts | 25 | 27 | AC-021·008 신설 |
| channel/test/index-wiring.test.ts | 22 | 27 | AC-001③·002①·022·023·017 신설 |
| channel/test/gateway-mutual-auth.test.ts | 5 | — | 삭제 |
| 그 밖의 16 파일 | 같음 | 같음 | (web-chat 23·web-rich 11·restart 2·wpc 5 는 하네스/fixture 만 고침) |

합계: server 254 → 248 (−6), channel 102 → 103 (+1). 보고서 §5 처분표 대비 실측 차이 하나 — `server/test/web-chat.test.ts` 는 §C 「그대로」 줄이었으나 fixture 의 URL 문자열(`/api/rooms/1/invites` → `/bots`, `url.includes('/invites')` → 정규식) 14자리를 고쳤다. 이유: REQ-007 이 봇 칩을 `GET /api/rooms/:id/bots` 로 읽게 하고 REQ-009 가 `/invites` 를 404 로 만들므로 `web/app.js` 가 URL 을 바꿔야 했고, 그 mock 이 옛 URL 에 결합돼 있었다(고치지 않으면 22/23 붉음 — `M4M5-red-server.log`). it 블록 본체는 손대지 않았다.

### E.2.4 (E4) §D 끝 조건 네 명령 — 명령과 출력 그대로 (HEAD `eca2c3d`)

```
$ npm test                                                                                   → 종료 0 (위 E.2.3)
$ grep -rn "verifier_pub\|server_confirm_key\|handshakeTranscript\|bot_tokens\|revoked_at" server/src channel/src
(출력 없음) → 종료 1 = 0건
$ grep -rn "다음에 since_id 로 넘기면" channel/src
(출력 없음) → 종료 1 = 0건
$ npx tsx scripts/e2e.mts; echo "exit=$?"
의존성이 해소되지 않습니다 — 먼저 `npm install` 을 돌리세요.
exit=1                                                                                       → 종료 ≠ 0 (기대대로 빨강)
```

넷째의 빨간 이유: 러너의 `checkDependencies` 가 `../server/test/gateway-v2.ts` 를 동적 import 하는데 그 하네스가 이 SPEC 에서 삭제됐다(문구 «npm install» 은 러너 자신의 진단이지 원인이 아니다). 재작성은 C2 소유. 로그 `.moai/state/verify/a-run/99-e2e.log`.

삭제 목록 D9 전수 grep(`channelBinding|SPKI_ED25519_PREFIX|deriveBotKeys|sha256Hex|'env'|lastSeq|sessKey|last_seen_at|missed_after_id|onWelcome|onConnection|sendToBot|challenge|node:tls|\bseq\b` over `server/src channel/src`) → 0건. `/api/rooms/:id/invites` 셋 → AC-013 404 실측.

### E.2.5 (E5) 변이 넷 — 집합 판정 (구현 커밋 `eca2c3d` 의 깨끗한 트리, 각 변이 뒤 `git show HEAD:server/src/gateway.ts > server/src/gateway.ts` 로 복원)

기준선 blob: `git rev-parse HEAD:server/src/gateway.ts` = `6ac872141293643bc8aad0c14fdaaf9c87b2ad61` (`E5-baseline-blob.txt`). 네 변이 모두 복원 뒤 `git hash-object server/src/gateway.ts` 가 같은 값이고 `git status --short` 가 비었다(각 로그 끝 줄). 판정은 `npm test -w server -- gateway.test.ts`(파일별) + `npm test`(집합 관측) 둘 다 돌렸다.

| 변이 | 적용 diff | 붉어진 것 (파일별 판정) | 전체 스위트 | 표와 일치 |
|---|---|---|---|---|
| ㉠ 재전송 `JOIN room_bots` 제거 → `MAX(last_delivered_id)` 전역 커서 하나 (`E5-mutation-A.diff`, 7줄) | `E5-A-gateway.log` | **AC-003 · AC-004 ㉮** 둘만 (2 failed / 32) | server 246/248 · channel 103/103 (`E5-A-npm.log`) | 일치 |
| ㉡ `deliver` 의 `isMember` 검사 한 줄 삭제 (`E5-mutation-B.diff`) | `E5-B-gateway.log` | **AC-004 ㉯** 만 (1 / 33) | 247/248 · 103/103 | 일치 |
| ㉢ `realpathSync` → `resolve` (**두 자리 모두**: 뿌리·원본, `E5-mutation-C2-both.diff`) | `E5-C2-gateway.log` | **AC-019** + 이관 «refuses a symlink inside botFilesDir…» (AC-019 가문) (2 / 32) | 246/248 · 103/103 | 일치 |
| ㉣ `startsWith(filesRoot + sep)` 의 `+ sep` 제거 (`E5-mutation-D.diff`) | `E5-D-gateway.log` | **AC-019** + 이관 «refuses a sibling directory…» (AC-019 가문) (2 / 32) | 246/248 · 103/103 | 일치 |

관측 하나 더 (기록만): ㉢ 를 **원본 줄 하나만** 바꾸면(`E5-mutation-C.diff`, `E5-C-gateway.log`) 이 기계에서는 7건이 붉어진다 — AC-019·AC-020 과 첨부 양성 다섯. 원인은 macOS 의 `tmpdir()` 이 심볼릭 링크(`/var` → `/private/var`)라 realpath 된 뿌리와 어휘적 원본 경로가 접두 일치를 못 해 첨부 전부가 거부되는 것이다. 표의 「AC-019 만」은 기제 교체(두 자리) 기준으로 성립한다.

### E.2.6 (E6) 커밋

```
$ git log --oneline 00e50da..HEAD
eca2c3d feat(v2-a): SPEC-BOTMODEL-001 M1~M6 — 봇 단위 신원·room_bots 참여·방 명시 프레임, 핸드셰이크·전선 봉투·방별 토큰 삭제
```

**계획과의 차이 — 마일스톤별 커밋 대신 한 커밋.** pre-commit 훅이 `moai gate`(vet·lint·test, 테스트 120초 예산)를 돌리고, 이 SPEC 은 spec.md §1 이 적은 대로 삭제와 모델 변경이 같은 줄에 얽혀 있어 M1~M5 어느 중간 상태에서도 스위트가 초록이 되지 않는다(`bot_tokens` 를 지우는 순간 옛 하네스 전부가 붉다). `--no-verify`·`SKIP_MOAI_PRECOMMIT` 는 쓰지 않았으므로 초록이 되는 첫 지점(M6 뒤)에서 한 번 커밋했다. 마일스톤 경계의 RED/GREEN 증거는 E.2.8 의 로그가 대신 진다. 이 진행 기록과 spec.md 상태 전이는 그 위의 문서 커밋이다. 푸시하지 않았다.

### E.2.7 (E7) 블로커

없음. 기계적으로 정한 가정 셋 — 감사가 계약 질문으로 본다면 되돌릴 수 있게 적어 둔다.

1. `closeRoom(roomId)` 은 소켓을 닫지 않는다(빈 몸체). 접속이 봇 단위라 방 하나를 보관해도 닫을 소켓이 없고, 보관된 방은 다음 welcome 의 `rooms` 에서 빠진다. 훅 계약(보관 → 1회 호출)은 그대로다 — AC-013 뒷절·gateway.test «closeRoom leaves the bot connection open…».
2. `chat_id` 가 있으나 정수로 읽히지 않으면 채널은 «마지막 to 방» 으로 떨어진다(`channel/src/index.ts` `roomOf`). spec 은 «없으면» 만 적었고 형식 위반은 적지 않았다.
3. 봇:id 둘째 색인의 대체 조회는 **답한 방에 그 봇이 참여해 있을 때만** 성립한다(`permissions.ts` `findByBot`). 결정 ① 의 «같은 봇의 다른 방» 을 그렇게 읽었고, 그래서 기존 «다른 방의 답은 놓친다» 시험(봇이 없는 방)이 그대로 초록이다.

### E.2.8 (E8) RED 증거 — 마일스톤별 pre-GREEN 출력

| M | RED 로그 | 발췌 (그대로) |
|---|---|---|
| M1 | `M1-red.log` — `npx vitest run test/db.test.ts` (db.ts 는 v1) | `× creates all tables — bots and room_bots, never bot_tokens` / `AssertionError: expected [ 'attachments', 'bot_tokens', …(7) ] to include 'room_bots'` / `× AC-BOTMODEL-010: … expected null not to be null` / `Tests  3 failed \| 1 passed (4)` |
| M2 | `M2-red-gateway.log` — 새 gateway.test.ts 대 v1 gateway.ts | `× AC-014: answers hello{token} with one bare welcome…` … `Tests  34 failed (34)` |
| M2 | `M2-red-client.log` — 새 gateway-client.test.ts 대 v1 클라이언트 | `× sends bare hello{token} as the very first frame 5012ms` … `Tests  18 failed \| 1 passed (19)` (초록 하나는 죽은 주소 백오프 — v1/v2 를 가르지 못하는 기준) |
| M2·M3 GREEN | `M2-green-gateway.log` · `M2-green-client.log` | gateway 30/34 (남은 4 는 M5 라우트 의존: AC-004 ㉮㉯·AC-018·buildServer) · client 19/19 |
| M4·M5 | `M4M5-red-server.log` — 고친 서버 시험 7 파일 대 v1 permissions/routes/web | `Tests  44 failed \| 57 passed (101)` — rooms-bots 11/15 · web-chat 22/23 · messages 5/16 · restart 2/2 · permissions 2/29 · wpc 1/5 · web-rich 1/11 |
| M4 채널 | `M4-red-channel.log` — 고친 채널 시험 3 파일 대 v1 채널 소스 | `Tests  32 failed \| 36 passed (68)` — channel-server 20/27 · index-wiring 11/27 · permission-relay 1/14 |
| M4·M5 GREEN | `M4M5-green-server.log` · `M4-green-channel.log` | server 246/248(남은 둘: 하네스 토큰 누락 1줄 → 고침, 옛 개발 DB 거절 → 아래) · channel 99/108(남은 9: dist 미빌드·삭제 대상 mutual-auth 5·sweep 1·fixture 2 → M6) |
| M6 GREEN | `M6-green-npm-test.log` → `99-final-npm-test.log` | 248/248 · 103/103, 종료 0 |

M4·M5 GREEN 단계에서 잡힌 것 하나: `server/test/health.test.ts`(그대로 파일)가 `buildServer()` 기본 경로 `server/data/minidiscord.db`(gitignore 된 개발 DB, v1 스키마)를 열다가 새 거절 검사에 걸렸다(«bots 가 옛 스키마…»). REQ-003 이 정한 그 동작이므로 그 개발 DB 파일을 지웠다(추적 안 되는 파일, 커밋 무관). 다음 실행이 새 파일을 만든다.

## §E.3 Run-phase Audit-Ready Signal

```yaml
run_status: audit-ready
run_complete_at: 2026-09-07
run_head_sha: eca2c3d          # 구현 커밋 (M1~M6 한 커밋) — 이 진행 기록·spec.md 상태 전이는 그 위의 문서 커밋
run_commit_sha: eca2c3d
branch: WT-v2-model
worktree: .claude/worktrees/v2-model
predecessor: 00e50da            # plan 종결 HEAD
milestones: 6/6                 # M1 db · M2 frame contract · M3 delivery/cursor · M4 permission/channel · M5 http/web · M6 tests
ac_pass: 25/25
ac_pass_count: 25
ac_fail_count: 0
mutations: 4/4 as-expected      # ㉠ {003, 004㉮} · ㉡ {004㉯} · ㉢ {019 + symlink 가문} · ㉣ {019 + sibling 가문}; 한 자리만 바꾼 ㉢ 는 macOS tmpdir 링크 때문에 7건 — 기록만
end_conditions: 4/4             # npm test 0 · grep 0건 · grep 0건 · e2e exit=1
full_suite: "server 248/248 · channel 103/103 (기준선 254/102)"
sibling_breakage:
  measured_by: "grep -c '^\\s*it(' 전후 실측 (00-it-counts-before.txt → 99-it-counts-after.txt): server 254→248 (gateway 39→34 · rooms-bots 21→15 · db 2→4 · messages 15→16 · permissions 27→29), channel 102→103 (gateway-client 20→19 · channel-server 25→27 · index-wiring 22→27 · mutual-auth 5→삭제). «그대로» 표 밖의 실측 차이: web-chat.test.ts fixture URL 14자리 (it 본체 불변)"
  rewritten: 3
  fixed: 9
  fixed_beyond_plan: 1          # server/test/web-chat.test.ts — fixture URL 만
  deleted: 2
  coupled_cleanup: "sibling-sweep.mjs 의 gateway-mutual-auth 줄 삭제 (커밋에 포함)"
commit_strategy: "한 커밋 — pre-commit moai gate 가 전체 스위트를 돌려 중간 상태 커밋 불가; --no-verify 미사용"
new_warnings_or_lints_introduced: 0   # server tsc --noEmit 0건 · channel tsc 0건 (99-final-npm-test.log)
preserve_list_post_run_count: "§C 「그대로」 소스 7 파일 diff 0 (sse·mention·truncate·style.css·design-tokens.css·auth.ts·config.ts) — git diff --stat 에 없음"
evidence_dir: .moai/state/verify/a-run/
open_for_audit:
  - "closeRoom 빈 몸체 (E.2.7 가정 1)"
  - "chat_id 형식 위반 시 마지막 to 방으로 대체 (가정 2)"
  - "봇:id 색인 대체 조회는 참여한 방의 답만 (가정 3)"
  - "scripts/live-dryrun.mts 가 삭제된 server/test/gateway-v2.ts 를 import — C2 보관 대상, 이 SPEC 은 손대지 않음"
```

## §E.4 Sync-phase Audit-Ready Signal

```yaml
sync_status: audit-ready
sync_complete_at: 2026-09-07
sync_head_sha: 0ab8d13           # sync 편집의 기준 HEAD (run 종결 문서 커밋). 이 sync 커밋 자신의 SHA 는 아래
sync_commit_sha: 5b123a2         # 감사 1회차 뒤 리드가 채움 (이 줄과 아래 sync_audit 는 후속 문서 커밋)
sync_audit:
  iterations: 1                  # 상한 2 (plan.md §E) — 1회차 PASS 라 2회차 없음
  verdict: PASS
  score: 0.893                   # 조화평균 F 0.96 · S 0.85 · C 0.92 · Cs 0.85, Tier L 통과선 0.85
  report: .moai/reports/sync-audit/SPEC-BOTMODEL-001-sync-audit-1.md
  blocking: 0
  fixed_after_audit: "F2 ROADMAP.md:53 — C1 이 지운 방 구성원 인가를 살아 있는 문장으로 적었던 것을 한 줄 교정"
  carried_forward: "F1 인바운드 프레임의 room_bots 참여 검사 부재(SPEC 요구 아님, Medium) → B 단계 후보 · F3 POST /messages→deliver→ws 인프로세스 시험 부재 → B 단계 후보 · F6 C1 잔존 README/ROADMAP 문장 → C2"
branch: WT-v2-model
worktree: .claude/worktrees/v2-model
pr: none                          # v2 브랜치는 B·C2 단계로 이어진다 — 이 단계는 로컬 커밋만, 푸시 없음
docs_touched:
  - README.md                     # 첫 문단 · 설정 절 토큰 문구 · 웹 화면 항목 · API 표 봇 행 넷+보관 행 · «봇 등록 토큰» · «봇 게이트웨이» 통째 · «붙이기 전에» F-01/F-07/[배포 경계] · DB 표 bots 행 · 헤딩 포인터 둘
  - ROADMAP.md                    # M2 · M3 «지금» 문단만
  - .moai/project/codemaps/entry-points.md   # §6 통째(접속 mermaid · 프레임 표 둘) · §7 meta 다섯 키 · reply/fetch_history chat_id · INSTRUCTIONS 문장
  - CHANGELOG.md                  # [Unreleased] 맨 위 한 항목
  - .moai/specs/SPEC-BOTMODEL-001/spec.md      # frontmatter status/updated 만
  - .moai/specs/SPEC-BOTMODEL-001/progress.md  # 이 절
scope_beyond_plan_E:
  - "README «봇 게이트웨이 (WebSocket)» 절 — plan §E 3번(«봇 초대» → «봇 등록·방 참여»)의 짝. 지워진 핸드셰이크 1~5단계·봉투·프레임 표를 spec-compact 프레임 표로 교체"
  - "README «채널 플러그인을 붙이기 전에» — plan §E 1번의 확장. 지워진 기제(F-01 갈래 둘·봉투 억제·bot_tokens 검증자·타이밍 상수성)를 서술하는 불릿만 교체, t10·t11·t38 항목과 sender 사칭 수용·방 경계 절은 그대로"
  - "README API 표 `POST /api/rooms/:id/archive` 행의 «봇 토큰 철회» 한 구절, 데이터베이스 표 `bots`/`bot_tokens` 행, «봇 초대 토큰» 헤딩을 가리키던 포인터 둘(명령어 절·폴더 구조 절) — 지시가 허용한 최소 교정"
  - "codemaps §7 — meta 키가 나열돼 있어 다섯 키로 갱신 (지시의 조건부 허용)"
plan_E_item_2_check: "MINIDISCORD_HOST 행 — server/src/config.ts 기본값 127.0.0.1 과 일치, 문구 «다른 PC 에서 붙으려면 0.0.0.0 …» 은 C1 커밋 2f6cd3f 이 넣은 것 그대로. 변경 없음"
changelog_entry: true
changelog_position: "[Unreleased] 첫 항목 (t35 위)"
b12_self_test_a: "grep -c 'BOTMODEL' CHANGELOG.md → 0 (발행 전) → 1 (발행 후)"
b12_self_test_b: "grep -oE 'AC-BOTMODEL-[0-9]+' acceptance.md | sort -u | wc -l → 25 (전체 패턴 36 은 같은 AC 의 단축 표기 AC-0NN 11건이 겹친 것)"
b12_self_test_c: "CHANGELOG 에 적은 경로 22 건 ls 로 실재 확인"
frontmatter_status_transitions:
  spec.md: "in-progress → completed (updated 2026-09-07) — 이 sync 커밋에서. plan.md·acceptance.md 에는 status 필드가 없어 손대지 않음"
stale_term_sweep: "E2 결과는 sync 보고서에 — README 의 남은 적중은 sender 사칭 수용 줄(t23 언급, 지시로 보존)뿐이고, ROADMAP 의 «지금 어디까지 왔나»·카드 표·codemaps §5 초대 라우트 셋·§8 MINIDISCORD_TOKEN 행은 C2 소유"
left_for_C2:
  - "README: «방 구성원» 절·API 표의 구성원 열·«방 사이의 경계» 절·전송 스킴 안내(ws/wss 가드) — C1 이 지운 기제를 아직 서술"
  - "README 폴더 구조 표의 routes-bots.ts 설명(«방 초대 발급·목록·철회») · scripts/live-env.sh invite 언급"
  - "codemaps/entry-points.md §5 /invites 라우트 행 셋 · §8 MINIDISCORD_TOKEN «초대 토큰, v2 키 유도의 원천»"
  - "ROADMAP «지금 어디까지 왔나» 서비스화 불릿(unbound 채널 바인딩) · M2 헤딩 «봇 초대» · 카드 표"
```

## §F Phase 4 Mode Selection

### §F.1 모드 판정

| 항목 | 값 |
|------|-----|
| 기록 시점 | 2026-09-07 — plan 작성 (v2 리팩토링 A 단계) |
| 티어 | L |
| scope (파일 수) | 소스 14 (새로 씀 4 · 조금 고침 10) + 테스트 14 (다시 씀 3 · 고침 9 · 삭제 2) |
| 도메인 수 | 3 (server/ · channel/ · web/) |
| 언어 혼합 | TypeScript + JavaScript + Markdown |
| 동시성 이득 | 낮음 — coding-heavy 이고 세 파일이 **같은 프레임 계약 위에 서야 한다** |
| Kickoff 승인 | **승인됨 (2026-09-07, 세션 4489b66a, AskUserQuestion «승인 — 자율 진행») — 감사 3회차 PASS 0.940 뒤** |

| 모드 | 선택 | 근거 |
|------|------|------|
| `direct` | 미선택 | 25 REQ · 6 마일스톤 · 파일 28개 — 한 줄 수정이 아니다 |
| `serial` | **선택됨** | 게이트웨이·클라이언트·채널 셋이 같은 프레임 모양 위에 서야 하고, M2(계약)가 M3~M5 의 전제다. 프레임 계약이 확정되기 전에 소비자를 병렬로 고치면 세 파일이 서로 다른 모양을 가정한다 |
| `fanout` | 미선택 | 병렬 스폰이 «같은 프레임 계약» 이라는 이 SPEC 의 축을 깬다. 조사 단계(읽기 전용)는 이미 끝났다 |
| `sweep` | 미선택 | 균일 기계 변형이 아니다 — `gateway.ts` 는 빈 파일에서 다시 쓴다 |

**Decision: serial**

근거: 이 SPEC 을 하나로 묶은 이유 자체가 «세 파일이 같은 프레임 모양 위에 서야 한다» 는 것이다(가이드 §2 도입부). M2 가 계약을 확정하기 전에는 M3~M5 를 시작할 수 없고, M1(표)은 그보다도 앞선다. 병렬화 이득이 있는 자리는 M6(테스트 정리)뿐인데 그 자리는 앞 마일스톤 전부의 착지 뒤에 온다.

### §F.2 감사 상한

- **plan 감사**: 통과까지. FAIL 이면 차단 항목만 고쳐 재감사.
- **sync 감사**: **2회차 상한** (가이드 §2 A-3). FAIL 이면 차단 항목만 고치고 2회차에서 닫는다 — 3회차 이상 돌리지 않는다.

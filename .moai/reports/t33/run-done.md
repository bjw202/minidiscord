# t33 run 완료 보고 — 사용자 이름 상한 + 흡수 문서 정정

- 카드: t33 (B급 — plan 없음)
- 나무: `.claude/worktrees/t33`, 브랜치 `WT-username-length`, 기준선 `f5cb336` (origin/main)
- 리드 판정: **PASS** (2026-09-03, §5)
- 커밋: **`5b9a276`** — 22파일, +363/-38 (2026-09-03, 리드 승인 후). 부모 `f5cb336`, 푸시 없음 — **이 나무가 유일 사본이다.**
- 커밋 직전 검증(§6): build exit 0 · typecheck exit 0 · `Tests  192 passed (192)` · `Tests  123 passed (123)`
- 이 줄의 SHA 는 커밋 뒤에야 존재하므로 **후속 커밋으로 기록**했다. `5b9a276` 자체에는 이 줄이 없다

---

## 1. 결함 원인 확립 (RED)

`server/src/auth.ts` 가입 라우트는 `username === ''` 만 걸렀고 길이·글자 상한이 없었다.

**재현 명령**

```
npx vitest run server/test/t33-red.test.ts     # 2만 글자 이름으로 POST /api/auth/register
```

**관측 원문 (수리 전)**

```
[RED] status = 201 | body = {"ok":true}
[RED] stored username length = 20000
AssertionError: expected 201 to be 400
```

2만 글자 이름이 `201` 로 통과했고 DB `users.username` 에 20000 글자가 그대로 저장됐다. 원인은 추론이 아니라 이 실행이다.

## 2. 수리 (GREEN)

`server/src/auth.ts` — 타입·빈문자 검사 뒤에 두 검사를 더했다.

| 상한 | 값 | 근거 |
|---|---|---|
| 길이 | `USERNAME_MAX_LENGTH = 32` (코드 포인트) | 저장소에 기존 이름 상한이 하나도 없어 참조할 값이 없었다. 실사용 이름(`alice`·`e2e-user`·`restart-user`)을 모두 담고, `content` 조립(`[이름] 본문`)에서 이름이 본문을 밀어내지 않는 크기 |
| 글자 | 제어문자 C0/C1(`\u0000-\u001f`·`\u007f-\u009f`) 금지, 앞뒤 공백 금지 | 제어문자는 표시·로그를 깨뜨리고, 앞뒤 공백은 닮은꼴 중복 계정을 만든다. **문자 집합 허용 목록은 두지 않았다** — 한글·비ASCII 이름을 막는 것은 이 카드가 요청받지 않은 축소다 |

**관측 원문 (수리 후)**

```
[RED] status = 400 | body = {"error":"username은 32자 이하여야 합니다"}
[RED] stored username length = NONE
```

**테스트 1건 추가** — `server/test/auth.test.ts` `rejects over-long and malformed usernames, accepts a normal one`
거절 6건(2만 글자 · 경계+1 · NUL · C1 · 앞공백 · 뒷공백, `users` 0행)과 통과 3건(경계값 32자 · `alice` · `홍길동`, `users` 3행)을 한 자리에서 잰다.

임시 재현 파일 `server/test/t33-red.test.ts` 는 증거 확보 후 삭제했다 — 영구 기준은 위 한 건이다.

## 3. 흡수 항목 처리

| 항목 | 처리 | 비고 |
|---|---|---|
| `routes-rooms.ts:13` «아홉 호출부» 거짓 주석 | **정정 — 단 한 자리가 아니라 여덟 자리** | §4-A |
| t8 N-09 닫힘 확인 | **닫힘 확인만, 편집 없음** | `git ls-tree --name-only a97d36c server/src/` → `config.ts`·`db.ts`·`index.ts` 정확히 셋. AC-CORE-012 통과 |
| t4(카드가 «t20» 이라 적음) F-12 | **정정 + 변이 검증** | §4-B |
| t4 F-13 | **정정** | §4-C |
| t4 CD-3 | **정정** | §4-D |
| t4 CD-1 | **이 카드에서 제외 — ROADMAP 보류 등재** (운영자 결정) | §5-④ |
| 「t14 한 줄」 | **미처리 유지 — 대상이 이 트리에 없음** (리드 확인) | §5 |
| SPEC-CHANINJECT-001 수용 기준 정렬 | **정정 — 8자리가 아니라 9자리** | §4-E |

## 4. 정정 내역

### A. 술어 호출부 문언 정정 (여덟 자리)

**실측**: `grep -rn "requireRoomMember\|isRoomMember" server/src/`

술어 호출부는 **여덟**이다 — preHandler 일곱(`routes-messages.ts:32`·`:128`, `routes-events.ts:13`, `routes-rooms.ts:47`, `routes-bots.ts:75`·`:96`·`:108`) + 브로커 하나(`permissions.ts:93`).
목록 `GET /api/rooms` 는 술어를 부르지 않고 인라인 SQL 로 같은 조건을 적으므로 호출부가 아니다.

고친 자리 여덟 — 카드는 한 자리만 지목했다. 1~7 은 «아홉» 이라는 **같은 거짓 문언**이고, 8 은 수는 맞으나 **열거가 틀린 다른 형태**다:

1. `server/src/room-members.ts:2`
2. `server/src/room-members.ts:7` (`@MX:ANCHOR` — 목록을 «호출한다» 고 적고 있었다)
3. `server/src/routes-messages.ts:31`
4. `server/src/routes-rooms.ts:13`
5. `server/src/routes-rooms.ts:46`
6. `.moai/specs/SPEC-ROOMAUTHZ-001/plan.md:379`
7. `.moai/specs/SPEC-ROOMAUTHZ-001/spec.md:277`
8. `.moai/specs/SPEC-PERM-001/spec.md` — 훑기로 새로 찾은 자리. 수 «여덟» 은 맞으나 **열거가 틀렸다**(목록을 넣고 `POST /api/rooms/:id/members` 를 빠뜨림). 이 저장소 관행대로 앞 주석을 지우지 않고 «3차 정정» 을 덧붙였다

**고치지 않은 자리**: `CHANGELOG.md:271` 「강제 지점 아홉」은 **참**이다 — 강제 지점은 호출부 여덟 + 목록의 인라인 SQL 하나로 아홉이며, 그 줄은 변이 실행 기록이다.
`.moai/specs/SPEC-ROOMAUTHZ-001/progress.md:153`·`:254` 는 이 결함을 스스로 기록한 역사라 세지도 고치지도 않았다(그 기록이 참값 여덟을 이미 적어 두었고, 이 정정은 그 기록의 이행이다).

### B. F-12 — 동어반복 단언 (`channel/test/index-wiring.test.ts`)

옛 단언은 `state === 'working'` 으로 찾은 자리에 다시 `state === 'working'` 을 물어 **항상 참**이었다.
새 단언: 첫 상태 프레임이 `working` 이고, TO 한 건에 `working` 이 정확히 한 번.

**변이 검증** — `channel/src/index.ts` 가 TO 에서 `idle` 을 먼저 보내도록 변이:

```
AssertionError: expected 'idle' to be 'working'
Tests  1 failed | 18 passed (19)
```

옛 단언이었다면 통과했을 변이다. 변이는 되돌렸고(`git checkout` 이 함께 지운 `@MX:ANCHOR` 는 다시 붙였다) 최종 트리에서 123 전건 통과.

### C. F-13 — 세 팩토리 `@MX:ANCHOR` 부재

`createGatewayClient`·`createChannelServer`·`wire` 셋 다 `@MX:ANCHOR` 0건이었다.
**fan_in 실측** 후 붙였다 — 정의 줄을 뺀 참조 줄 수(`grep -rc`, `channel/src` + `channel/test`): `createChannelServer` 7(index 2 · channel-server 0 · permission-relay.test 3 · channel-server.test 2), `createGatewayClient` 11(index 2 · gateway-client 0 · gateway-client.test 9), `wire(` 10(index 2 · permission-relay.test 1 · index-wiring.test 2 · gateway-client.test 1 · gateway-mutual-auth.test 2 · transport-auth.test 2). 셋 다 임계값 3 이상이다.
셋 다 `@MX:REASON` 동반. 파일당 ANCHOR 상한 3 이내(각 1~2).

### D. CD-3 — `SPEC-CHANPERM-001/spec.md` 가정-1 「깨지면」 열

채널이 형식을 검증하지 않는 것은 참이지만, **서버가 등록 단계에서 `/^[a-km-z]{5}$/` 를 강제**해(`server/src/permissions.ts:14`) 형식 밖 id 는 대기 항목조차 만들지 않고 세션 도구 호출이 **영구 대기**한다(`:62-67` — 이 트리에서 직접 읽어 확인).
「깨지면」 열이 이 두 번째 방향을 기술하지 않던 공백을 메웠다. 새 사전 조건(«Claude Code 의 id 가 서버 문자셋 안에 있다»)이 **이 환경에서 관측 불가**임도 함께 적었다.

### E. SPEC-CHANINJECT-001 — 좁혀진 조건으로 정렬 (9자리)

t25 가 `spec.md` 본문 두 자리(`:312` REQ-002, `:334` §4.2)를 «중화 단계 한정 + 시길 없음 + 렌더 상한 이하» 로 좁혔으나, **수용 기준 쪽은 옛 무조건 문언 그대로**였다.
카드가 지목한 자리를 좁혀진 조건에 맞췄다: `spec.md:123`·`:292`, `acceptance.md:116`·`:118`·`:287`·`:308`·`:724`·`:734`, `plan.md:115`.
**카드는 «8자리» 라 했으나 열거된 줄 번호는 아홉이다** — 아홉 전부 처리했다.

### F. 이 카드의 수리가 낡게 만든 자리 (다섯)

상한을 세운 결과 «사용자 이름에는 길이 제한이 없다» 를 전제로 쓴 형제 문장이 낡았다. 다만 **완전히 거짓이 되지는 않는다**:

- 상한은 **새 가입에만** 걸린다 (기존 `users` 행은 그대로)
- **봇 이름은 여전히 무제한** (`routes-bots.ts:59` 는 비어 있지 않은지만 본다)
- `author_name` 은 사용자 이름 **또는 봇 이름**이다 (`gateway.ts` `authorName`, `routes-messages.ts` `displayName`)

그래서 지우지 않고 «좁아졌을 뿐 닫히지 않았다» 를 덧붙였다:
`SPEC-CHANINJECT-001/spec.md:469`, `SPEC-BOTSTAB-001/spec.md:83`·`:304`, `SPEC-BOTSTAB-001/plan.md:191`·`:237`.

## 5. 리드 판정과 처분 (2026-09-03)

**리드 판정: PASS.** 근거로 리드가 직접 실행한 것 — `auth.ts` diff 직독, `auth.test.ts` 12/12 재실행, 상한 검사를 `if (false)` 로 만든 변이가 **1 failed** 로 포착된 뒤 복원 확인.
전제 오류 넷(§3·§4-A·§4-E)은 **리드가 카드 본문을 옮기는 과정에서 생긴 것**으로 판정됐고, 받아 적지 않고 검증해 잡은 처리가 옳다고 확인받았다.

운영자 결정 넷:

| # | 항목 | 처분 |
|---|---|---|
| ① | 상한 값 32 | **확정.** `USERNAME_MAX_LENGTH = 32` 로 간다 |
| ② | 형제 다섯 자리 «좁아졌을 뿐 닫히지 않았다» 덧붙임 (§4-F) | **수용.** 지우지 않고 덧붙인 처리가 맞다 |
| ③ | SPEC-AUTH-001 이 상한을 기술하지 않음 | **REQ + AC 신설로 종결.** 리드가 manager-spec 역할 에이전트를 이 나무의 `.moai/specs/SPEC-AUTH-001/` 에서 실행 중이다 — **run 레인은 그 디렉터리를 건드리지 않는다** |
| ④ | CD-1 (범위 경계 기준 4건) | **이 카드에서 제외.** ROADMAP 보류 표에 등재(리드 완료). 끝 SHA 미기록 둘(SPEC-CHANNEL-001·SPEC-CHANCLIENT-001)의 결정이 선행 조건이다 |

추가 처분 둘:

- **플레이크 → 카드 `t36` 발급 완료** (리드). `channel/test/transport-auth.test.ts` 의 `both nonces are regenerated per socket and a replayed challenge is refused` — 이 세션 3회 + t25 2회 = **누적 5회** 실패·전부 재실행 자가소멸. 이 카드 범위 밖.
- **「t14 한 줄」은 미처리 유지** (리드 확인). `grep -rln "t14" .moai/` 0건으로 대상이 이 트리에 없다.

### 남은 절차 — 커밋 보류 중

리드 지시로 **커밋 보류.** SPEC-AUTH-001 개정이 착지하면 리드가 읽고 「커밋 승인」을 따로 보낸다. 그때의 커밋 조건:

- 명시 pathspec = **현재 18파일 + SPEC-AUTH-001 변경분**
- 커밋 메시지에 `(card t33)`
- 일괄 스테이징 플래그 **금지**(pathspec 로만 지정), **푸시 없음**

## 6. 검증 (커밋 직전 재실행, 2026-09-03)

SPEC-AUTH-001 v0.6.0 착지 후 네 검사를 다시 돌렸다. 아래는 이 실행의 관측 원문이다.

| 검사 | 명령 | 종료 코드 | 관측 |
|---|---|---|---|
| 채널 빌드 | `npm run build -w channel` | **0** | — |
| 타입 | `npm run typecheck -w server` | **0** | — |
| 서버 스위트 | `npm test -w server -- --reporter=verbose` | **0** | `Tests  192 passed (192)` |
| 채널 스위트 | `npm test -w channel` | **0** | `Tests  123 passed (123)` |

**AC-AUTH-015 의 관측 조건을 직접 확인했다.** 그 기준은 verbose 출력에 특정 줄이 나타나는가 하나로 판정하는데, 이번 실행에서 그 줄이 실제로 나왔다:

```
 ✓ test/auth.test.ts > auth > rejects over-long and malformed usernames, accepts a normal one 114ms
```

기준이 요구하는 형태(`✓ test/auth.test.ts > ` 로 시작해 기준이 지정한 이름으로 끝남)와 일치한다.

**플레이크.** `channel/test/transport-auth.test.ts` 의 `both nonces are regenerated per socket and a replayed challenge is refused` 는 이 세션 앞선 실행에서 **3회** 실패했고 **3회 모두 재실행에서 자가소멸**했다(실패 단언은 매번 `expect(nonce2).not.toBe(nonce1)`). t25 의 2회와 합쳐 누적 5회다. **이번 커밋 직전 실행에서는 재발하지 않았다** — 123 전건이 1회 실행으로 통과했다. 내 변경과 무관한 파일이고, 리드가 **카드 `t36`** 을 발급해 이 카드 범위 밖이다.

## 7. 변경 파일 (22)

**run 레인이 쓴 것 (18)**

```
server/src/auth.ts                        상한 코드 (+12)
server/test/auth.test.ts                  테스트 1건 (+27/-1)
server/src/room-members.ts                주석 정정 (§4-A)
server/src/routes-messages.ts             주석 정정 (§4-A)
server/src/routes-rooms.ts                주석 정정 (§4-A)
channel/src/index.ts                      @MX:ANCHOR (F-13)
channel/src/channel-server.ts             @MX:ANCHOR (F-13)
channel/src/gateway-client.ts             @MX:ANCHOR (F-13)
channel/test/index-wiring.test.ts         동어반복 단언 교체 (F-12)
.moai/specs/SPEC-ROOMAUTHZ-001/spec.md    문언 정정 (§4-A)
.moai/specs/SPEC-ROOMAUTHZ-001/plan.md    문언 정정 (§4-A)
.moai/specs/SPEC-PERM-001/spec.md         3차 정정 덧붙임 (§4-A)
.moai/specs/SPEC-CHANPERM-001/spec.md     CD-3 공백 보완 (§4-D)
.moai/specs/SPEC-CHANINJECT-001/spec.md   좁혀진 조건 정렬 + t33 낡음 표시 (§4-E·§4-F)
.moai/specs/SPEC-CHANINJECT-001/acceptance.md  좁혀진 조건 정렬, 6자리 (§4-E)
.moai/specs/SPEC-CHANINJECT-001/plan.md   좁혀진 조건 정렬 (§4-E)
.moai/specs/SPEC-BOTSTAB-001/spec.md      t33 낡음 표시, 2자리 (§4-F)
.moai/specs/SPEC-BOTSTAB-001/plan.md      t33 낡음 표시, 2자리 (§4-F)
```

코드 변경은 `server/src/auth.ts` 하나뿐이고 나머지는 주석·문서·테스트다.

**manager-spec 역할 에이전트가 쓴 것 (3, +54/-11)** — §5-③ 처분. run 레인은 이 디렉터리를 건드리지 않았다.

```
.moai/specs/SPEC-AUTH-001/spec.md         v0.6.0 · REQ-AUTH-016 신설 + REQ-AUTH-006 연결절
.moai/specs/SPEC-AUTH-001/acceptance.md   AC-AUTH-015 신설 + AC-AUTH-002 경계 명시
.moai/specs/SPEC-AUTH-001/plan.md         §C·§F·§G·§I 반영
```

**증거 문서 (1)**

```
.moai/reports/t33/run-done.md             이 보고서
```

### manager-spec 개정의 미결 6건 (이 카드에서 닫지 않음)

리드가 개정을 직독하며 남긴 미결이다. 이 카드는 이월만 하고 처리하지 않는다.

| # | 미결 | 성격 |
|---|---|---|
| 1 | `status` 전이 미적용 — `completed` 유지 | 의도된 선택. t8 N-09 선례를 따라 사후 개정(amendment)은 상태를 전이시키지 않는다 |
| 2 | 오류 메시지 본문을 기준이 단언하지 않음 | AC-AUTH-015 가 상태 코드와 행 수만 잰다. 메시지 규범은 REQ-AUTH-016 에만 있다 |
| 3 | 상한 값 32 의 근거가 문서화되지 않음 | 운영자가 값은 확정했으나(§5-①) 왜 32인지는 SPEC 에 적히지 않았다 |
| 4 | REQ 배치 — 상한을 REQ-AUTH-006 에 합치지 않고 별도 REQ-AUTH-016 으로 둠 | 설계 선택. 검사 순서 계약이 두 REQ 에 걸친다 |
| 5 | 봇 이름 무상한이 남음 | REQ-AUTH-016 범위 절이 명시적으로 배제. `SPEC-ROOM-001` 소관 |
| 6 | DoD 체크박스 미체크 | `progress.md` §E.2 기록이 선행 조건이다 |

---

## 8. sync 단계 — 리드 확인 대기 (2026-09-03)

sync 레인이 수행한 것과 그 판정이다. **커밋·스테이징·푸시 어느 것도 하지 않았다.**

### 판정

| 항목 | 값 |
|---|---|
| 감사 | 1회 (`sync-auditor`, 렌즈 `--security`) |
| **판정** | **PASS** |
| 점수 | **0.891** (가중 조화평균, 평면 백분율 모드) |
| 통과선 | **0.80** |
| 통과선 출처 | `SPEC-AUTH-001/spec.md:15` → `tier: M` × `.claude/rules/moai/workflow/spec-workflow.md:141` → Tier M `0.80`. 감사관이 SSOT 를 직독했고 디스패치 값과 대조해 일치를 명시했다 |
| 차단 결함 | **1건 — 닫음** (아래 F1) |
| 선택 결함 | 7건 — 리드 처분 대기 |
| 보고서 | `.moai/reports/t33/sync-audit.md` |

**귀속 [HARD]**: 0.891 은 `9f15d96` + F1 수리 **이전**의 미커밋 두 문서 시점 값이다. F1 을 닫은 뒤 재채점하지 않았다.

### 차원 점수

| 차원 | 점수 | 판정 |
|---|---|---|
| Functionality (40%) | 92 | PASS |
| Security (25%) | 84 | PASS |
| Craft (20%) | 88 | PASS |
| Consistency (15%) | 92 | PASS |

must-pass 두 축(Functionality·Security) 모두 독립 통과.

### F1 — 차단 결함, 이 단계에서 닫음

`CHANGELOG.md:322` (카드 `t10` 절)이 현재형으로 「사용자 이름에 글자 종류·길이 제한이 없어서(`server/src/auth.ts`)」라고 단언하고 있었다. 이번 수리로 거짓이 됐다.

`README.md:232` 와 **같은 방식**으로 좁혔다 — 지우지 않고, 당시 서술임을 밝힌 뒤 t33 이 좁혔으나 닫지는 못했음을 세 이유와 함께 덧붙였다(짧은 페이로드가 32자 안에 든다 / 봇 이름 무상한 / `author_name` 은 둘 중 어느 쪽도). 어간 훑기(`무제한`·`제한이 없`·`상한이 없`·`제한 없`·`길이 제한`) 재실행 결과 두 문서에 낡은 단언 **0건**.

### run 레인이 놓친 자리 하나 — sync 가 찾음

`README.md:232` 는 run-done §4-F 「이 카드의 수리가 낡게 만든 자리 (다섯)」 표에 **없었다**. 다섯 자리는 전부 `.moai/specs/` 안이고, 훑기가 `.moai/specs/` 밖으로 나가지 않은 것이 원인으로 보인다. sync 가 문서 작업 중 발견해 좁혔고, 감사관이 어간 훑기로 형제 자리 `CHANGELOG.md:322`(F1)를 하나 더 찾았다.

### sync 레인의 직접 관측 (감사관과 별개)

| 검사 | 명령 | 종료 코드 | 관측 |
|---|---|---|---|
| 채널 빌드 | `npm run build -w channel` | **0** | — |
| 서버 스위트 | `npm test -w server` | **0** | `Tests  192 passed (192)` |
| 채널 스위트 | `npm test -w channel` | **0** | `Tests  123 passed (123)` |
| 타입 (server) | `npm run typecheck -w server` | **0** | — |
| 타입 (channel) | `npm run typecheck -w channel` | **0** | — |

로그 원문: `.moai/reports/t33/verify-server.txt`, `.moai/reports/t33/verify-channel.txt`.

**플레이크**: `channel/test/transport-auth.test.ts` 논스 기준(t25 2회 + t32 3회 = 누적 5회 자가소멸)은 이번 실행에서 **재발하지 않았다** — 123 전건이 1회 실행으로 통과. 카드 `t36` 소관, 이 카드 범위 밖.

**감사 변이 오염 없음**: 감사관이 `server/src/auth.ts` 를 다섯 번 변이했다 복원했다고 보고했다. 받아 적지 않고 확인했다 — `git diff --stat HEAD -- server/ channel/` 빈 출력. 코드 파일 무변경.

### 리드 처분 대기 — 선택 결함 7건

| # | 심각도 | 요지 |
|---|---|---|
| F2 | Medium | `auth.ts:30` 정규식이 C0/C1 만 덮어, 이름 **내부**의 U+202E(방향 뒤집기)·U+2028·U+200B·U+00A0·U+3000 이 저장까지 도달. 가드 자신의 근거가 「표시·로그를 깨뜨린다」인데 실제로 표시를 깨뜨리는 것들이 통과한다. 처방 `/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u` |
| F3 | Low | 유니코드 정규화 없음 — `café` NFC/NFD 가 별개 행, 키릴 `аlice` 등록됨. 변경의 자기 근거가 「닮은꼴 중복 계정」인데 더 큰 부류가 문서에 없다. 처방: CHANGELOG 「닫지 못하는 것」에 한 줄 |
| F4 | Low | `auth.test.ts:90-113` 이 두 가드의 서로 다른 오류 **메시지**를 단언하지 않아, 메시지를 뒤바꾸는 변이를 스위트가 못 죽인다 |
| F5 | Low | `USERNAME_MAX_LENGTH` 에 `@MX` 주석 없음 (같은 파일 다른 export 셋은 전부 있음) |
| F6 | Info | `README.md:41` 「가입 자체에는 아무 제한이 없고」 — 감사관이 **수정 불필요**로 판정 (가입 *자격*을 뜻하고 그 뜻이면 참) |
| F7 | Low | 워크스페이스에 린터 없음 — 정적 게이트는 `tsc --noEmit` 하나. **이 카드가 만든 문제 아님** |
| F8 | Info | 로그인 길이 비대칭 — 결함 아님, `spec.md:93` 명시. 오독 방지용 기록 |

**F2·F3 는 코드/문서 변경을 부르므로 sync 레인이 임의로 하지 않았다.** `acceptance.md`·`spec.md` 편집 금지 제약도 지켰다 — F4 가 `acceptance.md:295` 를 지목하지만 권고로만 남겼다.

### 감사관이 확인하지 **않은** 것 (Gaps)

- **원 RED 실행 재현 불가** — run 레인이 `server/test/t33-red.test.ts` 를 삭제했다. CHANGELOG 의 `[RED] status = 201` 원문은 run-done §1 **귀속**이고, 감사관은 변이 M1 로 **등가**만 세웠다
- `npm run e2e` 미실행 — `e2e-user` 가 32자 이하라는 것은 원문 판독으로만 확인
- CI 미관측 — 브랜치 미푸시라 원격 실행 자체가 없다. 모든 측정이 이 나무의 로컬 값
- 커버리지를 `channel` 워크스페이스에서는 재지 않음 — Craft 판정은 `server` 수치 귀속
- SQLite 내부 저장 형태 미측정 — 바이트 수는 `Buffer.byteLength(…, 'utf8')` 값
- 기존 DB 의 32자 초과 행 개수 미집계 — 코드·마이그레이션 부재로만 확인

### 스테이징 목록 (초안 — §8.1 로 대체됨, 커밋 보류)

명시 pathspec 으로만 지정한다. 일괄 스테이징 플래그 **금지**, 푸시 **없음**.

```
CHANGELOG.md
README.md
.moai/reports/t33/sync-audit.md
.moai/reports/t33/run-done.md
```

**리드 판정 대기 둘**:

1. `.moai/reports/t33/verify-server.txt`·`verify-channel.txt` — 감사 보고서가 이 두 경로를 증거로 인용한다. 넣으면 인용이 나중에도 해소되고, 빼면 인용 경로가 끊긴다. 넣을지 뺄지는 리드 결정
2. `run-done.md` 는 이미 `9f15d96` 에 커밋돼 있고 이 §8 은 그 위의 추가분이다 — 같은 커밋에 함께 넣는 것으로 적었으나 별도 커밋을 원하면 그렇게 한다

**스테이징하지 않는 것**: `.moai/logs/trace-*.jsonl`, `.moai/state/**`, `.claude/agent-memory/**`.

---

## 8.1 리드 처분 — 커밋 보류 (2026-09-03)

리드가 `0.891 PASS` 판독 일치를 확인했고(보고서 `:51`·스테이징 대상·F2 재현으로 U+202E·U+2028·U+200B 통과 직접 확인), **운영자 결정 넷**이 내려왔다.

| # | 항목 | 처분 |
|---|---|---|
| ① | F2 (내부 제어문자 통과) | **이 카드 안에서 고친다.** run 레인에 디스패치됨 — 정규식 `/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u` + 테스트 3건 + 저장소 전체 훑기 |
| ② | F3 (유니코드 정규화 없음) | **ROADMAP 보류 등재** (리드 완료) |
| ③ | `verify-server.txt`·`verify-channel.txt` | **커밋에 포함** |
| ④ | 귀속 | 코드가 바뀌므로 `0.891` 은 이전 트리 값. **수리 착지 후 재감사 1회** |

### 현재 상태 — 보류

[HARD] **지금은 스테이징도 커밋도 하지 않는다.** sync 가 만든 변경(`CHANGELOG.md`·`README.md`·`sync-audit.md`·이 `run-done.md` §8·`verify-*.txt`)은 **그대로 둔다** — 되돌리지도, 스테이징하지도 않는다.

다음 순서:

1. run 레인의 F2 수리 착지
2. 리드 판독
3. 리드의 「재감사」 메시지 도착
4. sync 가 재채점 — F2 닫힘 확인 · 훑기 잔여 · 게이트 재실행
5. `sync-audit.md` 에 **재판정 절** 추가
6. 그때 스테이징 목록(기존 6 + run 변경분)을 새 「리드 확인 대기」 절에 기록

§8 의 「스테이징 목록」은 이 처분 이전의 **초안**이며, ③에 따라 `verify-*.txt` 두 건이 더해져 여섯이 된다. 최종 목록은 6단계에서 확정한다.

---

## 9. F2 수리 — run 재진입 (2026-09-03, 리드 판정 PASS)

sync 감사가 선택 결함으로 올린 **F2** 를 운영자 결정으로 이 카드 안에서 닫았다. 리드가 먼저 재현했고(`U+202E`·`U+2028`·`U+200B` 가 당시 정규식을 통과), run 레인이 재현 → 수리 → 훑기를 이어받았다.

이 절은 **run 레인이 쓴다.** §8·§8.1 은 sync 레인의 기록이므로 건드리지 않았다.

### 9.1 결함 — 부류를 절반만 막았다

내가 처음 세운 검사는 `/[\u0000-\u001f\u007f-\u009f]/` 로 **제어문자(Cc)만** 걸렀다. 그런데 「보이지 않으면서 표시를 흔드는 문자」는 Cc 하나가 아니다 — 유니코드 **형식 문자(Cf)** 와 **줄/문단 구분자(Zl·Zp)** 가 같은 성질을 갖는다. 앞뒤 공백 검사도 이름 **안쪽**에 박힌 문자는 잡지 못한다.

부류의 이름을 「제어문자」로 좁게 잡은 탓에 방어가 그 이름만큼만 넓어졌다. 실제로 막아야 했던 것은 「보이지 않으면서 표시를 흔드는 문자」였다.

### 9.2 RED — 셋 다 통과했다

임시 프로브 `server/test/t33-f2-probe.test.ts` 로 세 이름을 각각 `POST /api/auth/register` 에 보냈다(모두 이름 **내부** 위치, `ali<문자>ce` 꼴).

```
[F2] U+202E RLO  -> status 201 | body {"ok":true}
[F2] U+200B ZWSP -> status 201 | body {"ok":true}
[F2] U+2028 LS   -> status 201 | body {"ok":true}
[F2] stored rows = 3
```

셋 다 `201` 로 통과했고 계정이 **3개** 만들어졌다. 특히 `U+200B`(폭 0 공백)가 든 `alice` 는 화면에서 진짜 `alice` 와 구분되지 않는 별개 계정이다.

### 9.3 수리

`server/src/auth.ts` 의 검사 한 줄을 유니코드 속성 이스케이프로 교체했다.

```
- const USERNAME_FORBIDDEN = /[\u0000-\u001f\u007f-\u009f]/      (Cc 만)
+ const USERNAME_FORBIDDEN = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u
```

주석의 근거도 「제어문자(C0/C1)」에서 「제어(Cc)·형식(Cf)·줄/문단 구분(Zl/Zp)」으로 갱신하고, 왜 Cc 만으로 부족한지를 세 문자의 이름과 함께 적었다.

### 9.4 GREEN — 같은 프로브, 같은 입력

```
[F2] U+202E RLO  -> status 400 | body {"error":"username에 제어문자나 앞뒤 공백을 쓸 수 없습니다"}
[F2] U+200B ZWSP -> status 400 | body {"error":"username에 제어문자나 앞뒤 공백을 쓸 수 없습니다"}
[F2] U+2028 LS   -> status 400 | body {"error":"username에 제어문자나 앞뒤 공백을 쓸 수 없습니다"}
[F2] stored rows = 0
```

프로브는 증거 확보 후 삭제했다. **영구 기준**은 `server/test/auth.test.ts` 의 새 테스트 1건 — `rejects invisible format and line-separator characters inside the name`. 세 문자를 이름 안쪽에 넣은 거절 3건과 `users` 0행을 잰다. 소스에는 리터럴이 아니라 `\u202E`·`\u200B`·`\u2028` 이스케이프로 적어 파일을 읽는 사람이 눈으로 확인할 수 있게 했다.

### 9.5 훑기 — `.moai/specs/` 밖 (지시: [HARD])

앞선 훑기가 `.moai/specs/` 안에만 머물러 감사관이 `README.md:232` 를 따로 잡았다. 이번에는 어간(`C0/C1` · `제어문자` · `32자` · `USERNAME_MAX` · `앞뒤 공백`)으로 README·CHANGELOG·docs·소스 주석 전체를 훑었다. 적중 10건의 분류표:

| # | 자리 | 지금 참인가 | 조치 |
|---|---|---|---|
| 1 | `README.md:74` (API 표 — 「32자 이하」) | 참 | 손대지 않음 |
| 2 | `README.md:232` (「32자 이하·제어문자 금지로 좁혔지만」) | **좁음** — 이제 형식·줄 구분자도 막는다 | 「보이지 않는 문자(제어·형식·줄/문단 구분) 금지」로 갱신 |
| 3 | `CHANGELOG.md:15` (길이 행) | 참 | 손대지 않음 |
| 4 | `CHANGELOG.md:16` (글자 행 — 「제어문자(C0·C1) 금지」) | **거짓** | `\p{Cc}`·`\p{Cf}`·`\p{Zl}`·`\p{Zp}` 로 갱신 |
| 5 | `CHANGELOG.md:28` (「주입 통로가 닫히지 않습니다」) | 참 — 짧은 페이로드·봇 이름은 그대로 | 손대지 않음 |
| 6 | `CHANGELOG.md:30` (「기준은 한 건」·「거절 6가지」) | **거짓** — 이제 두 건 | 두 건으로 갱신하고 둘째 건의 내용을 적음 |
| 7 | `CHANGELOG.md:322` (「32자 이하·제어문자 금지로 좁혔지만」) | **좁음** | #2 와 같은 문언으로 갱신 |
| 8 | `server/test/auth.test.ts:96·:97` (「제어문자 NUL (C0)」·「(C1)」) | 참 — 그 두 문자는 실제로 C0·C1 이다 | 손대지 않음 |
| 9 | `server/test/auth.test.ts:115` (「C0/C1 만 막으면 …」) | 참 — **과거의 결함**을 서술한 새 주석이다 | 손대지 않음 |
| 10 | `web/rich.js:75` (「앞뒤 공백 없이」) | 무관 — 토큰 렌더링 이야기 | 손대지 않음 |

정정 후 같은 어간으로 다시 훑어 옛 서술 잔존 **0건**을 확인했다(남은 적중은 #9 하나이며 위 판정대로 참이다).

`README.md`·`CHANGELOG.md` 는 sync 레인이 이미 고쳐 둔 파일이라 **덮어쓰지 않고 그 위에 얹었다**(지시대로).

### 9.6 잔여 — 오류 메시지가 행동보다 좁다 (이 카드에서 닫지 않음, 리드 결정)

거절 메시지가 아직 `username에 제어문자나 앞뒤 공백을 쓸 수 없습니다` 다. 이제 형식 문자·줄 구분자도 거절하므로 **메시지가 실제 규칙보다 좁게 읽힌다.**

내가 임의로 바꾸지 않은 이유: 이 문자열은 `REQ-AUTH-016` 이 규범으로 못 박은 값이고, 리드가 **바로 그 조항의 2항 문언을 manager-spec 역할 에이전트로 지금 고치는 중**이다. 내가 코드 쪽 문자열만 바꾸면 동시에 쓰이는 SPEC 과 어긋날 수 있다. 개정된 조항이 새 문언을 정하면 그때 한 자리(`server/src/auth.ts:47`)만 맞추면 된다.

**처분 (2026-09-03, 리드 결정): 이 카드에서 닫지 않고 이월한다.** 코드는 무변경으로 남긴다 — `server/src/auth.ts:47` 의 문자열은 지금 값 그대로다. 남는 상태를 정확히 적어 두면: **행동은 옳고 문언만 좁다.** `\p{Cc}`·`\p{Cf}`·`\p{Zl}`·`\p{Zp}` 와 앞뒤 공백을 모두 거절하는 것은 맞으나, 거절을 받은 사람이 읽는 문장은 그중 제어문자와 앞뒤 공백만 이름 붙인다. 형식 문자나 줄 구분자로 거절당한 사람은 **왜 거절됐는지 메시지만 보고는 알 수 없다.** 닫으려면 `REQ-AUTH-016` 2항의 개정 문언이 먼저 정해져야 하고(그 개정은 이 카드 밖에서 진행 중), 그다음 코드 한 자리와 그 문자열을 인용하는 문서 자리를 함께 맞춰야 한다.

### 9.7 검증 (F2 수리 후 재실행)

| 검사 | 명령 | 종료 코드 | 관측 |
|---|---|---|---|
| 타입 | `npm run typecheck -w server` | **0** | — |
| 서버 스위트 | `npm test -w server -- --reporter=verbose` | **0** | `Tests  193 passed (193)` — 기존 192 + 새 1 |
| 채널 스위트 | `npm test -w channel` | **0** | `Tests  123 passed (123)` |

새 기준이 실제로 출력에 나타나는 것도 확인했다:

```
 ✓ test/auth.test.ts > auth > rejects invisible format and line-separator characters inside the name 33ms
```

논스 플레이크는 이번 실행에서도 재발하지 않았다.

### 9.8 이 수리의 부수 효과 (의도됨)

`\p{Cf}` 는 형식 문자 전체를 막으므로 **ZWJ(`U+200D`)와 소프트 하이픈(`U+00AD`)도 거절**된다. 사용자 이름에서는 이것이 의도한 결과다 — 둘 다 보이지 않으면서 닮은꼴 이름을 만들 수 있다. 다만 「이모지 조합(ZWJ 시퀀스)을 이름에 쓸 수 없다」는 뜻이기도 하므로 여기 적어 둔다. 한글·비ASCII 이름은 영향이 없다(`홍길동` 통과 기준이 그대로 초록이다).

### 9.9 변경 파일 (run 레인, 5)

```
server/src/auth.ts                 USERNAME_FORBIDDEN 교체 + 주석 근거 갱신
server/test/auth.test.ts           새 기준 1건 (보이지 않는 문자 3종)
CHANGELOG.md                       훑기 #4·#6 갱신 (sync 변경 위에 얹음)
README.md                          훑기 #2 갱신 (sync 변경 위에 얹음)
.moai/reports/t33/run-done.md      이 §9 절 (sync 의 §8·§8.1 은 그대로)
```

**run 레인은 커밋하지 않는다 (2026-09-03, 리드 결정).**

리드 판정은 **PASS** 다 — 정규식·13/13·재현을 리드가 직접 확인했고 §9.5 훑기 분류표를 판독했다.

커밋 주체를 sync 로 넘긴 이유는 이 절을 처음 쓸 때 run 이 올린 **스테이징 충돌** 때문이다. 버전 관리 도구는 파일 단위로만 스테이징하는데 `run-done.md` 한 파일에 sync 의 §8·§8.1 과 이 §9 가 함께 들어 있어, run 이 그 파일을 담으면 sync 의 미커밋 작업이 run 커밋에 섞인다. 조각 단위로 고르는 대화형 방식은 이 환경에서 쓸 수 없다.

그래서 **sync 재감사 PASS 뒤 sync 레인이 11파일을 명시 pathspec 단일 커밋으로 담는다** — run 5(`server/src/auth.ts`·`server/test/auth.test.ts`·`CHANGELOG.md`·`README.md`·`run-done.md`) + SPEC 3(`.moai/specs/SPEC-AUTH-001/` 의 `spec.md`·`acceptance.md`·`plan.md`) + sync 3(`sync-audit.md`·`verify-server.txt`·`verify-channel.txt`).

**이 절 이후 run 레인은 이 나무에 쓰지 않는다.** sync 커밋이 착지하면 리드가 `/clear` 를 안내한다.

---

## 10. sync 재감사 — 리드 확인 대기 (2026-09-03)

리드의 「재감사」 지시를 수행했다. **스테이징·커밋 하지 않았다.**

### 재판정

| 항목 | 값 |
|---|---|
| **판정** | **PASS** |
| 점수 | **0.911** (1차 0.891 → F2 수리 후) |
| 통과선 | **0.80** — `SPEC-AUTH-001/spec.md` `tier: M` × `spec-workflow.md:141`. v0.6.1 로 올랐어도 tier 는 `M` 그대로 |
| 차원 | F 93 · S 90 · C 88 · Cons 92 — must-pass 두 축 독립 통과 |
| 차단 | 1건 (R1) → **닫음** |
| 보고서 | `.moai/reports/t33/sync-audit.md` § 재판정 |

**귀속 [HARD]**: `0.911` 은 **현재 트리**(HEAD `9f15d96` + 미커밋 8파일) 값이다. 1차 `0.891` 은 F2 수리 **이전** 트리 값이며 폐기하지 않는다 — 서로 다른 트리를 잰 두 수다.

**성격 공시 [HARD]**: 1차는 독립 `sync-auditor` 판정, 이 재판정은 **sync 레인의 자기 채점**이다. 자기 산출물(CHANGELOG·README)을 자기가 채점하는 축이 섞여 있어 1차보다 약한 증거다. Craft 88 은 재측정 없이 1차 귀속. 독립 재감사를 원하면 그 편이 낫다.

### 게이트 재실행 (이전 192/123 폐기)

`build 0` · `typecheck server 0` · `typecheck channel 0` · `server` **`Tests 193 passed (193)`** exit 0 · `channel` **`Tests 123 passed (123)`** exit 0. `192 → 193` 증가분은 run 이 더한 「이름 안쪽 보이지 않는 문자」 테스트다. 로그는 `verify-*.txt` 를 이 실행으로 덮어썼다.

### F2 닫힘 — 자체 재현

리드 관측을 받아 적지 않고 임시 프로브로 13입력을 실제 라우트에 보냈다. `U+202E`·`U+2028`·`U+2029`·`U+200B`·`U+FEFF`·`U+0000`·`U+0085` 일곱 종 전부 **`400`·미저장**. 경계 32자 `201` / 33자 `400`. **F2 닫힘 확인.**

`U+00A0`·`U+3000`(내부 Zs)은 여전히 `201`·저장되지만 **결함이 아니다** — `acceptance.md:316` 이 「Zs 는 금지 근거 밖」으로 의도를 명시하고 같은 줄이 「검증 없음」이라 적었다. 이 프로브가 그 관측을 처음 제공했고 결과가 의도와 일치한다. 잔여로만 기재.

**프로브 삭제 완료** — `server/test/zz-t33-sync-probe.test.ts` 제거, `git status` 적중 0건. 리드가 물은 `channel/test/zz-ac17-*` 둘은 **sync 것이 아니며** 이 나무·원 체크아웃·t7·t32 어디에도 없다(전 나무 탐색 확인).

### 이번 라운드 결함

- **R1** [Low] [차단] [**닫음**] `CHANGELOG.md` 마무리 줄이 `v0.6.0` 만 인용. SPEC 은 `0.6.1` 로 올랐고 같은 문단의 표·기준 서술은 run 이 갱신했으나 판번호만 남았다 → `v0.6.0 + v0.6.1` 로 정정. **정정이 스스로 낡은 기록을 남기는** 부류의 재현
- **R2** [Info] [리드 처분 대기] CHANGELOG 「닫지 못하는 것」에 내부 Zs 통과가 없다. `acceptance.md:316` 이 SPEC 쪽에서 덮어 거짓은 아니나, 그 절 선언이 「경계를 넓혀 적지 않겠습니다」라 한 줄 더할 값은 있다. **sync 가 임의로 더하지 않았다** — F3·거절 메시지 문언과 같은 잔여 묶음

### 어간 훑기

패턴 `무제한`·`제한이 없`·`상한이 없`·`제한 없`·`길이 제한`·`글자 제한`, 범위 `README.md`·`CHANGELOG.md`·`server/src`·`channel/src`. 적중 6건 전수 판독 → **낡은 단언 0건**. `channel-server.ts:174` 「이름에는 원래 길이 제한이 없어」는 「원래」로 과거를 지시하고 `author_name` 이 봇 이름일 수 있어 절단이 여전히 하중을 받으므로 **참**.

### 잔여 (결함으로 재지적하지 않음 — 리드 이월/처분)

| 항목 | 상태 |
|---|---|
| 거절 메시지 문언(「제어문자나 앞뒤 공백」이 동작보다 좁음) | **리드 결정으로 이번 카드 이월** |
| F3 유니코드 정규화 | ROADMAP 보류 등재 (리드 완료) |
| 내부 Zs(`U+00A0`·`U+3000`) 통과 | `acceptance.md:316` 이 의도로 명시 — R2 는 문서 한 줄 여부만 |
| 봇 이름 무상한 | 범위 밖 · `SPEC-ROOM-001` 소관 · 문서 3자리에 기재됨 |
| 린터 부재(F7) | 이 카드가 만든 문제 아님 |
| 원 RED 재현 불가 | `t33-red.test.ts` 삭제됨 — `[RED] status = 201` 은 §1 귀속 |
| CI 미관측 | 브랜치 미푸시 |

### 스테이징 목록 — 확정 11파일

리드 `commit-plan` 그대로. `git status --short` 를 이 절 작성 직전 재판독해 전 항목 존재를 확인했다.

```
server/src/auth.ts
server/test/auth.test.ts
.moai/specs/SPEC-AUTH-001/spec.md
.moai/specs/SPEC-AUTH-001/acceptance.md
.moai/specs/SPEC-AUTH-001/plan.md
CHANGELOG.md
README.md
.moai/reports/t33/run-done.md
.moai/reports/t33/sync-audit.md
.moai/reports/t33/verify-server.txt
.moai/reports/t33/verify-channel.txt
```

추적 상태: 앞 8개는 ` M`, 뒤 3개(`sync-audit.md`·`verify-server.txt`·`verify-channel.txt`)는 `??` 신규.

**제외**: `.claude/agent-memory/**` · `.moai/logs/**`(trace 3건) · `.moai/state/**`(`config-cache.json`·`context-usage.json`·`github/`).

**[HARD] `git add -A` / `git add .` / `git commit -a` 금지.** 명시 pathspec 으로만 지정하고, 스테이징 직전 `git status --short` 를 한 번 더 읽는다.

**커밋은 리드 승인 뒤 sync 가 단일 커밋으로 수행한다. 지금은 대기.**

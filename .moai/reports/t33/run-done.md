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

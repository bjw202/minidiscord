# SPEC-BOTSTAB-001 M4a 증거 — 훑기가 내는 형제 자리 전부 갱신 (2026-09-01)

실행 주체: manager-develop (card t25, run 레인). 브랜치 WT-bot-stability, 착수 시점 HEAD 7c9958b.

## §0. 판정 요약

| 항목 | 값 |
|---|---|
| 갱신 대상 | **라이브 훑기 출력 33블록 전부** (스냅숏 21 아님 — «출력이 이긴다») |
| 신규 경계 단언 착지 | **23블록** (기존 단언 일 글자도 미변경 — 순수 추가) |
| 이미 상수 단언 보유(무변경) | **10블록** (M3 신설 8 + M4 신설 2) |
| AC-BOTSTAB-013 테스트 | channel/test/truncate.test.ts (일곱째 파일, FILES 밖 [HARD]) — **PASS** |
| 배치 프로브 | **PLACEMENT=OK** (exit 0) |
| 스위트 | **120 passed / 7 files** (직전 119 + 신설 1 — 블록 단언 추가는 케이스 수 0) |
| 타입 검사 | **exit 0** (`tsc --noEmit`) |
| 편집 후 훑기 재실행 | **33블록 불변** (제목 동일, 줄번호만 이동 — 후보 집합 무손상) |

## E1 — 라이브 훑기 출력과 스냅숏 델타

- 갱신 전 라이브 출력 전문: `.moai/state/verify/t25-run/sibling-sweep-run.md` (명령·종료 코드 0·시각 기록)
- 블록 총수 **33** = 스냅숏 21 + **12**(델타 전부 M3 신설 9[channel-server] + M4 신설 3[index-wiring])
- 파일별: channel-server 19 · index-wiring 9 · gateway-mutual-auth 3 · transport-auth 2 ·
  gateway-client/permission-relay 0 — 구 21의 파일별 구성은 §3.3 관측과 문자 그대로 동일
- 편집 후 재실행 출력: `.moai/state/verify/t25-run/sibling-sweep-run-after.txt` — 블록 33 불변,
  동일 제목, 줄번호만 이동(추가 줄 때문). AC-013 테스트는 실행 시점에 훑기를 다시 돌려 스스로
  일관을 유지한다.

## E2 — 블록별 착지 표 (sync §M 입력)

줄번호는 **갱신 전 라이브 출력 기준**이다(편집 뒤 이동 — `sibling-sweep-run-after.txt` 대조).
경계 유형: [상한]=MAX_* 파생 바이트 경계 · [시길]=SIGIL_* 날것 시길 부재 · [전제]=상한 이하
fixture 전제 관측(표면이 예산 대상이 아닌 자리) · [커서]=실린 원소 id 최댓값.

### channel-server.test.ts (19블록 = 신규 11 + 보유 8)

| 줄 | 블록 제목 | 착지 내용 | 유형 | ㉡ 적중 |
|---|---|---|---|---|
| 95 | exposes exactly the reply and fetch_history tools | `JSON.stringify(listed.tools)` 이 `SIGIL_OPEN` 을 담지 않음 단언 추가 | 시길 | SIGIL_OPEN |
| 115 | reply forwards text and files to sendToChat and answers | 전달 텍스트 바이트 `≤ MAX_BODY_BYTES` 전제 관측 추가(방향은 절단 대상 아님 — §3.3 무영향) | 전제 | MAX_BODY_BYTES |
| 123 | declares all five optional fetch_history parameters | 입력 스키마 JSON 의 `SIGIL_OPEN` 부재 단언 추가 | 시길 | SIGIL_OPEN |
| 139 | points the cursor at the JSON field | 도구 설명문 `d`+`sinceIdParam` 의 `SIGIL_OPEN` 부재 단언 추가 | 시길 | SIGIL_OPEN |
| 153 | passes fetch_history arguments through | stub 반환 바이트 `≤ MAX_HISTORY_BYTES` 전제 관측 추가(조건부 무영향 — plan §I) | 전제 | MAX_HISTORY_BYTES |
| 173 | pushChatMessage notifies with TO meta and the attachment local path | content 바이트 `≤ MAX_NAME+MAX_BODY+MAX_ATTACHMENTS×MAX_PATH+ASSEMBLY_BYTES` 추가 — 기존 toContain 등식 전부 보존 | 상한 | MAX_* 4종 |
| 211 | carries the load-bearing instruction literals | `s` 의 `SIGIL_OPEN` 부재 단언 추가 | 시길 | SIGIL_OPEN |
| 225 | carries cc as cc and omits the attachment note | content 바이트 `≤ 파생 총상한` 추가 — not.toContain 부정 단언 보존 | 상한 | MAX_* 4종 |
| 239 | neutralizes channel envelope sequences (AM-1 자리) | content 바이트 `≤ 파생 총상한` 추가 — toBe 전체 등식 보존 | 상한 | MAX_* 4종 |
| 271 | leaves a body without envelope sequences byte-identical (AM-2 자리) | content 바이트 `≤ 파생 총상한` 추가 — toBe 등식 보존 | 상한 | MAX_* 4종 |
| 335 | AC-BOTSTAB-004 (가) | **이미 보유** — MAX_BODY_BYTES·CONTENT_TOTAL_LIMIT·rawOpens | 상한 | (기존) |
| 354 | AC-BOTSTAB-004 (나) ㉣ | **이미 보유** — MAX_NAME_BYTES | 상한 | (기존) |
| 375 | AC-BOTSTAB-005 (가) | `body` 바이트 `≤ MAX_BODY_BYTES` 전제 단언 추가(블록에 식별자가 0 — REQ-012 의 조건 명시) | 전제 | MAX_BODY_BYTES |
| 390 | AC-BOTSTAB-005 (나) | **이미 보유** — SIGIL_OPEN/CLOSE·ESCAPE | 시길 | (기존) |
| 411 | AC-BOTSTAB-006 (가) | **이미 보유** — MAX_ATTACHMENTS | 상한 | (기존) |
| 435 | AC-BOTSTAB-006 (나) | **이미 보유** — MAX_PATH_BYTES | 상한 | (기존) |
| 460 | E-9 | **이미 보유** — MAX_NAME_BYTES | 상한 | (기존) |
| 474 | E-10 | **이미 보유** — MAX_NAME/BODY_BYTES·CONTENT_TOTAL_LIMIT | 상한 | (기존) |
| 488 | E-11 | **이미 보유** — SIGIL_OPEN/CLOSE·ESCAPE | 시길 | (기존) |

### gateway-mutual-auth.test.ts (3블록 = 신규 3)

| 줄 | 블록 제목 | 착지 내용 | 유형 | ㉡ 적중 |
|---|---|---|---|---|
| 212 | the real server and the real channel agree end to end | content 바이트 `≤ MAX_NAME+MAX_BODY+'[] '` 인라인 단언 추가 — toBe 등식 보존 | 상한 | MAX_NAME/BODY_BYTES |
| 231 | a relaying man in the middle passes the handshake | content 배열 등식 옆 동일 파생 경계 추가 | 상한 | MAX_NAME/BODY_BYTES |
| 404 | on an unbound transport the same relay does take over | 동일 파생 경계 추가 | 상한 | MAX_NAME/BODY_BYTES |

### index-wiring.test.ts (9블록 = 신규 7 + 보유 2)

| 줄 | 블록 제목 | 착지 내용 | 유형 | ㉡ 적중 |
|---|---|---|---|---|
| 179 | gateway message becomes exactly one session notification | content 바이트 `≤ MAX_NAME+MAX_BODY+'[] '` 추가 — toContain 보존 | 상한 | MAX_NAME/BODY_BYTES |
| 241 | fetch_history forwards since_id and limit verbatim | 요청 프레임 JSON 의 `SIGIL_OPEN` 부재 단언 추가(나가는 프레임은 렌더 표면 아님) | 시길 | SIGIL_OPEN |
| 254 | history renders as one structured JSON document | 결과 문자열 바이트 `≤ MAX_HISTORY_BYTES` 추가 — toEqual 전체 등식 보존 | 상한 | MAX_HISTORY_BYTES |
| 268 | empty history renders the same JSON shape with a null cursor | 빈 문서도 `≤ MAX_HISTORY_BYTES` 추가 | 상한 | MAX_HISTORY_BYTES |
| 279 | a single poisoned message stays a single element | 결과 문자열 바이트 `≤ MAX_HISTORY_BYTES` 추가 — (a)~(d) 단언 전부 보존 | 상한 | MAX_HISTORY_BYTES |
| 322 | derives the cursor from ids only | `cursor == kept-id 최댓값` 단언 + 결과 바이트 `≤ MAX_HISTORY_BYTES` 추가. 캡처 한 줄을 `res` 이름 붙임 두 줄로 분리(의미 동일, 기존 단언 무변경) | 커서+상한 | MAX_HISTORY_BYTES |
| 423 | AC-BOTSTAB-007 | **이미 보유** — MAX_HISTORY_BYTES·MAX_BODY_BYTES·TRUNC_* | 상한 | (기존) |
| 455 | AC-BOTSTAB-008 | **이미 보유** — MAX_HISTORY/BODY_BYTES + kept-id 커서 단언 | 상한·커서 | (기존) |
| 492 | empty history passes through untouched (E-1) | 결과 바이트 `≤ MAX_HISTORY_BYTES` 추가 | 상한 | MAX_HISTORY_BYTES |

### transport-auth.test.ts (2블록 = 신규 2)

| 줄 | 블록 제목 | 착지 내용 | 유형 | ㉡ 적중 |
|---|---|---|---|---|
| 410 | after welcome, the same two frames reach the session exactly once each | content 바이트 `≤ MAX_NAME+MAX_BODY+'[] '` 추가 — toBe 등식 보존(형제 증인 자리) | 상한 | MAX_NAME/BODY_BYTES |
| 769 | an envelope with a broken mac … are both dropped | 수복 관측 content 에 동일 파생 경계 추가 | 상한 | MAX_NAME/BODY_BYTES |

### 설계 노트 — 왜 이 형태인가

- **상수 식별자 직접 인라인**: ㉡ 정규식(`SIBLING_SWEEP_ASSERT_REGEX`)은 `\bMAX_[A-Z0-9_]+ |`
  `\bTRUNC_[A-Z0-9_]+ | \bSIGIL[A-Z0-9_]*` 에만 적중한다. `CONTENT_TOTAL_LIMIT` 같은 파생 헬퍼
  이름은 적중하지 않으므로, 신규 단언은 상수 식별자를 블록 안에 직접 거치게 썼다(숫자 복제 0).
- **기존 단언 무손상**: 33블록 모두 기존 단언 일 글자도 지우거나 약화하지 않았다. 유일한 구조
  변경은 index-wiring :322 의 캡처 줄 분리(`const h = parsedHistory(await obs.callTool(…))` →
  `res` 를 이름 붙여 잡는 두 줄)이며 단언은 그대로다.
- **무영향 블록의 처리**: 스냅숏 «무영향 8» 은 갱신 제외가 아니라 **경계 유형 선택**의 문제로
  대응했다 — 개발자가 쓴 렌더 문자(도구·스키마·설명·지시문)에는 «날것 시길은 시스템이 붙인
  것뿔»(plan §C-4)의 시길 경계를, 절단 대상이 아닌 방향(reply 전달·통과)에는 «상한 이하 fixture
  전제 관측»을 두었다. 이는 §3.3 의 무영향 판정을 반박하는 것이 아니라 그 조건을 실행으로
  못 박는 것이다.

## E3 — AC-BOTSTAB-013 테스트

- 위치: `channel/test/truncate.test.ts` 말미 — **훑기 FILES 밖 일곱째 파일** ([HARD] 배치 제약).
- 반복 원천(iteration source): 테스트가 `spawnSync(process.execPath, [sibling-sweep.mjs], {cwd: 루트})`
  로 **훑기를 직접 돌려** 그 stdout 을 파싱한다 — 고정 목록 없음(R-9). 블록 경계도 재유도하지
  않는다: 훑기가 준 시작 줄만 모아 «다음 블록 시작 직전»을 잘라 ㉡ 을 적용한다.
- 빈 출력 가드: `expect(blocks.length, '훑기가 블록을 하나도 내지 않았다 — 하네스 고장이다')
  .toBeGreaterThan(0)` — 출력이 비면 **실패**(G-06 «UNDECIDED 는 통과가 아니다»의 거울). 훑기
  실행 자체의 실패(`run.status !== 0`)도 실패로 본다.
- verbatim 출력 (verbose reporter):

```
 ✓ test/truncate.test.ts > AC-BOTSTAB-013 — 형제 블록 상수 적중 (SPEC-BOTSTAB-001 M4a) > ㉡ 훑기 출력의 모든 형제 블록 소스에 상한·시길 상수 식별자가 최소 1회 등장한다 34ms
 Test Files  1 passed (1)
      Tests  10 passed (10)
```

- 같은 파일의 기존 결합 기준도 통과: `[HARD] ㉡ 결합 — 파생 정규식이 모듈이 수출한 모든 상수
  식별자에 적중한다 (plan.md M2)` ✓ (§J 6c 이행)
- ㉣: 스위트 초록 — 아래 E5.

## E4 — 배치 프로브 (PLACEMENT)

```
$ node .moai/state/verify/t25-plan/self-reference-probe.mjs channel/test/truncate.test.ts
sweep FILES (하드코딩된 대상): 6 개
channel/test 실재 파일: 7 개
훑기가 보지 않는 실재 파일: channel/test/truncate.test.ts
A) 상수만 단언 — 표면 낱말 없음	SURFACE=false	ASSERT=false	→ 후보가 되지 않는다
B) 주석에 렌더 표면을 설명	SURFACE=true	ASSERT=false	→ 후보가 되지 않는다
C) 표면 이름을 문자열로 들고 있음	SURFACE=true	ASSERT=true	→ 후보가 된다
PLACEMENT=OK	channel/test/truncate.test.ts 은 훑기 FILES 밖이다 — ㉡ 의 주어에 자기 파일이 들어올 경로가 없다
```
종료 코드: **0**.

## E5 — 스위트와 타입 검사

```
$ npm test -w channel
 Test Files  7 passed (7)
      Tests  120 passed (120)
   Start at  16:13:41
   Duration  65.31s
```
산술: 직전 기준 **119**(M1~M4 후) + AC-013 신설 **1** = **120**. 블록별 단언 추가는 신규 it()
케이스를 만들지 않으므로(23블록 전부 기존 블록 안 추가) 케이스 수 기여는 정확히 +1 이다.

```
$ npm run typecheck -w channel   →   tsc --noEmit
TYPECHECK_EXIT=0
```

기존 기준 회귀: **0건** — 120 전부 통과라 «빨개지는 것 0건» 이 예측이 아니라 이번 실행의 관측이다.

## E6 — 범위 경계

`git diff --stat` (M1~M4a 누적 — 트리는 미커밋이므로 이전 마일스톤분을 포함한다):

```
 .moai/specs/SPEC-BOTSTAB-001/progress.md |  12 ++
 channel/src/channel-server.ts            |  48 +++++-   ← M3
 channel/src/index.ts                     |  38 +++--    ← M4
 channel/test/channel-server.test.ts      | 253 +++++   ← M3 + M4a
 channel/test/gateway-client.test.ts      | 125 ++++    ← M1 만 (M4a 손대지 않음)
 channel/test/gateway-mutual-auth.test.ts |  15 ++      ← M4a
 channel/test/index-wiring.test.ts        | 117 ++++    ← M4 + M4a
 channel/test/transport-auth.test.ts      |  12 ++      ← M4a
 8 files changed, 603 insertions(+), 17 deletions(-)
```

- `channel/src/gateway-client.ts` — diff 에 **없음** ✓ (M1 경계)
- `.moai/specs/SPEC-CHANINJECT-001/` 아래 — 변경 **0건** ✓ (AM 실행은 sync 몫)
- 신규(untracked): `channel/src/truncate.ts`(M2) · `channel/test/truncate.test.ts`(M2+M4a) ·
  `.moai/state/verify/t25-run/`(증거) · 로그/상태 파일
- 커밋·푸시 없음(지시 준수).

## E7 — Gaps와 잔여 위험

**Gaps (이번 실행에서 관측하지 않은 것)**

1. **§3.3 표의 재도출은 하지 않았다** — 지시대로 SPEC 본문을 손대지 않았다. 라이브 33블록과
   스냅숏 21블록의 델타(+12, 전부 M3/M4 신설)와 파일별 구성 대조는 `sibling-sweep-run.md` 에
   기록했다. **리드에게**: spec.md §3.3 의 «21/13/8/19» 는 이제 M3·M4 신설 12블록을 덮지 못하는
   낡은 스냅숏이다 — §3.3 재도출을 manager-spec 에 회부할 것(plan M4a «그때 §3.3 표를 새 출력으로
   다시 도출한다» 조항의 후속).
2. **AC-013 이 재지 못하는 것**은 acceptance.md 본문이 공시한 그대로다 — ① 단언의 «존재»(주석·
   문자열 적중도 통과), ①' 그 단언이 경계를 옳게 재는가, ② 훑기가 실제로 돌았는가(단, 본 테스트는
   스스로 돌리므로 ② 의 «안 돌림» 부류는 이 파일 안에서 닫힌다), ③ 기존 단언 삭제(㉢ 삭제됨 —
   기제는 t28 소유). ③ 에 대한 run 의 보완 관측: 본 마일스톤 편집은 전부 순수 추가이며 위 표가
   그 근거다(사람 판독 — 기계 방어 없음은 t28 이 공시된 대로).
3. **빈 출력 가드의 발화는 시연하지 않았다** — 가드 코드와 의미를 기록했으나, 실제로 훑기를
   깨서 빨간 걸 보이지는 않았다(계획 단계 증거물을 변이하지 않기 위함). 코드 인용이 그 증거다.

**잔여 위험**

- index-wiring :322 의 캡처 분리는 의미 동일임을 눈으로 대조했고 스위트가 초록이지만, «단언 무
  변경» 의 기계 증거는 없다(㉢ 부재 — t28 회부 사항과 같은 부류).
- «'[] ' 3바이트» 조립 상수는 문자열 리터럴을 그 자리에서 재는 값이다 — channel-server 의 조립
  문언이 바뀌면 이 파생 경계도 따라 고쳐야 한다(훑기 ㉡ 은 식별자 적중만 재므로 이 드리프트는
  못 잡는다 — §M 사람 판정 항목).
- gateway-mutual-auth 의 세 블록은 «진짜 서버+진짜 채널» 통합 시험이라 실행이 느리다 — 전체
  스위트 65s 의 지배 항목이며 이번 추가 단언은 영향이 없다(바이트 재기 1회씩).

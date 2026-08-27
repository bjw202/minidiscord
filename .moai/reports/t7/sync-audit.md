# 카드 t7 sync 감사 보고 — 권한 릴레이 request_id 결함 수정

| 항목 | 값 |
|------|-----|
| 감사 대상 | 카드 `t7` / `SPEC-PERM-001` |
| 트리 | `.claude/worktrees/t7`, 브랜치 `WT-perm-request-id`, HEAD `85c44bb` |
| 변경 범위 | `b9eed4b..HEAD` — `server/src/permissions.ts`(+7/−4), `server/test/permissions.test.ts`(+35), `.moai/reports/t7/run-done.md`(신규) |
| 렌즈 | `--security` (리드 디스패치 지정) |
| 평가 프로파일 | `.moai/config/evaluator-profiles/default.md` (SPEC 프론트매터에 `evaluator_profile` 없음) |
| 채점 모드 | flat weighted |
| 감사일 | 2026-08-27 |
| 증거 디렉터리 | `.moai/state/verify/t7/` (`test-full.txt`, `typecheck.txt`, `probe.txt`, `probe-permissions.snippet.ts`) |

> **발견 번호는 이 보고서 안에서만 유효하다.** 아래 `T7-F-01`…은 `.moai/reports/t3/sync-audit.md` 의 `F-04`·`F-05` 나 `.moai/reports/t4/sync-audit.md` 의 `F-01`…과 **다른 항목**이다. 카드 원문이 인용한 `F-04`·`F-05` 는 t3 보고서 번호이며, 이 보고서에서는 항상 「t3 F-04」처럼 출처를 붙여 쓴다.

---

## 1. 종합 판정

**판정: FAIL**

**가중 조화평균: 68.0 / 100**

판정 근거는 점수가 아니라 must-pass 방화벽이다. `default.md` §Must-Pass Criteria 는 **Security: No Critical or High severity findings (FAIL overrides overall score)** 를 걸어 두었고, 본 감사는 **High 1건을 실행으로 재현**했다(`T7-F-01`). 따라서 Functionality 80 점과 무관하게 전체 판정은 FAIL 이다. 조화평균 68.0 은 그 판정을 뒤집지도 완화하지도 않는 부가 정보다.

**한 문장 요약**: 런 단계가 **실제로 고친 두 결함은 옳고, 최소이며, 회귀 방어까지 붙어 있다**(106/106 통과·typecheck 0 — 감사자 직접 재실행). 그런데 카드 원문이 요구한 두 항목 중 **「request_id 형식 검증 + 안내 문구 일치」쪽 절반이 이행되지 않은 채 남았고**, 그 자리에 High 등급의 승인 안내문 위조 경로가 실재한다(재현 완료).

### 1.1 차원별 점수

| 차원 | 가중치 | 점수 | 판정 | 근거(기계 검증 원문 위치) |
|------|--------|------|------|--------------------------|
| Functionality | 40% | 80 | PASS | `npm test -w server` → `Test Files 10 passed (10) / Tests 106 passed (106)`, `TEST_EXIT=0` (§5.1). `npm run typecheck -w server` → `TYPECHECK_EXIT=0`. `AC-PERM-001..014` 는 이 수정으로 하나도 깨지지 않았다. 감점: 카드 원문 범위의 절반(형식 검증) 미이행 — §4.2 |
| **Security (must-pass)** | 25% | **45** | **FAIL** | High 1(`T7-F-01`, 실행 재현) + Medium 1(`T7-F-02`, 실행 재현) + Low 3. §2 참조 |
| Craft | 20% | 82 | PASS | 재현 테스트 2건을 수정보다 **먼저** 넣고 RED 를 관측한 순서가 커밋에 남아 있다. 구조적으로 죽은 방 가드 라인을 지우고 의도를 `keyOf` 주석으로 옮긴 판단이 옳다. 감점: typecheck 가 테스트 파일 0개 검사(구조적, 전 카드 공통), 이 카드에서 커버리지 미측정 |
| Consistency | 15% | 88 | PASS | 형제 파일과 주석 언어·`@MX` 관용구·REQ 역참조 형식 일치. 새 이벤트·스키마·엔드포인트 없음 — `REQ-PERM-013`·`REQ-PERM-014` 유지 확인 |

가중 조화평균: `1 / (0.40/80 + 0.25/45 + 0.20/82 + 0.15/88) = 1 / 0.0146991 = 68.03`

### 1.2 must-pass 방화벽 적용

- **Functionality (must-pass)**: 통과. `SPEC-PERM-001` 의 수용 기준 14건은 그대로 성립한다(전체 스위트 통과로 재관측).
- **Security (must-pass)**: **미달**. High 존재 → `default.md` §Hard Thresholds "Security FAIL = Overall FAIL" 발동.

---

## 2. 발견 사항

심각도는 Critical / High / Medium / Low. `blocking` 은 정정 전에는 판정을 다시 묻지 않는 항목, `optional` 은 보고하되 자동으로 수정 경로에 태우지 않는 항목이다. 프로파일 §Finding-Stage Reporting 에 따라 확신이 낮은 것도 확신도를 붙여 함께 싣는다.

| # | 심각도 | 구분 | 확신도 | 위치 | 요약 |
|---|--------|------|--------|------|------|
| `T7-F-01` | **High** | blocking | 실행 재현 | `permissions.ts:36-43`, `gateway.ts:78-80` | 봇이 보낸 문자열이 검증 없이 승인 안내 system 메시지에 삽입돼 **가짜 승인 안내 줄을 위조**할 수 있다 |
| `T7-F-02` | Medium | blocking | 실행 재현 | `permissions.ts:36-43` | 판정 정규식과 맞지 않는 `request_id` 도 그대로 등록·안내돼, 사람이 안내대로 쳐도 **아무 일도 일어나지 않고** 대기 항목이 영구히 남는다 |
| `T7-F-03` | Low | optional | 실행 재현 | `permissions.ts:24` | 이번 수정이 **새 충돌 부류를 만들었다** — 같은 방에서 대소문자만 다른 두 id 가 한 키로 뭉개져 먼저 등록한 요청이 조용히 사라진다 |
| `T7-F-04` | Low | optional | **미재현(설계 검토)** | `permissions.ts:22,36` | 대기 맵과 system 메시지 행에 상한도 만료도 없다 — 봇이 `permission_request` 를 반복하면 메모리·DB 가 무제한 증가한다 |
| `T7-F-05` | Low | optional | 문서 대조 | `.moai/reports/t7/run-done.md` §5 | 카드 원문 범위의 절반을 이행하지 않았다는 사실이 완료 보고의 Gaps 절에 **명시되지 않았다**(대체 근거는 §머리표에 있으나 잔여 범위는 없음) |

### 2.1 `T7-F-01` — 승인 안내문 위조 (High, blocking)

**주장**: 봇이 보낸 `request_id`·`description`·`input_preview` 는 어떤 검증도 거치지 않고 사람이 읽는 승인 안내 system 메시지 본문에 그대로 이어붙는다. 줄바꿈을 섞으면 **서버가 쓴 것처럼 보이는 가짜 승인 안내 줄**을 만들 수 있다.

**경로**: `gateway.ts:78-80` 이 WS 프레임 `msg` 를 통째로(`params: any`) 핸들러에 넘기고, `permissions.ts:36-43` 이 그 필드들을 `join('\n')` 으로 본문에 넣는다. 중간에 형식·길이·문자 검사가 없다.

**증거** (`.moai/state/verify/t7/probe.txt`, 탐침 P2 — 파괴적 도구를 요청한 봇이 만든 본문 원문):

```
🔒 봇이 도구 사용 승인을 요청합니다: Bash
DESTRUCTIVE
DESTRUCTIVE
승인하려면 "yes zzzzz"
봇이 도구 사용 승인을 요청합니다: Read
HARMLESS_FILE_READ
cat README
승인하려면 "yes abcde", 거절하려면 "no zzzzz"
...
```

한 건의 승인 요청이 **두 건처럼 보이는 본문**을 만들어 냈고, 그중 뒤쪽 블록은 전적으로 봇이 쓴 것이다. 사람에게는 서버 문구와 봇 문구를 가릴 방법이 없다.

**영향**: 이 메시지는 사람이 파괴적 도구를 승인할지 말지 판단하는 **유일한 근거 화면**이다. 봇이 무해해 보이는 블록을 붙이고 다른 대기 id 를 승인하도록 유도하면, 사람은 자기가 무엇을 승인하는지 모른 채 승인한다. 이 저장소는 이미 「봇 토큰 하나를 가진 상대」를 적대자로 취급하기로 한 전례가 있다(t3 sync 의 봇 첨부 경로 유출 — 차단 판정).

**신규 도입 여부**: 아니다. 이번 수정이 만든 결함이 **아니라** 원래 있던 것이다. 다만 **카드 t7 원문이 명시적으로 이 항목을 겨눴다** — 「request_id 형식 검증+안내 문구 일치」. 범위 안에서 남은 결함이므로 blocking 으로 올린다.

**권고 수정**: `onGatewayRequest` 진입부에서 `request_id` 를 `PERMISSION_REPLY_RE` 가 인정하는 형식(`/^[a-km-z]{5}$/i`)으로 검사하고, 어긋나면 등록하지 않고 그 사실을 알리는 system 메시지를 띄운다. `description`·`input_preview` 는 줄바꿈을 제거하거나 인용 블록으로 감싸 서버 문구와 시각적으로 분리한다.

### 2.2 `T7-F-02` — 판정 불가능한 요청 (Medium, blocking)

**주장**: 정규식이 인정하지 않는 `request_id`(예: `l` 포함, 길이 ≠ 5)도 등록되고, 안내문은 그 id 로 답하라고 시킨다. 사람이 안내대로 치면 브로커가 `false` 를 돌려주므로 그 문장은 **평범한 대화 메시지로 저장**되고, `✅`·`⚠️` 어느 안내도 뜨지 않으며, 대기 항목은 영원히 남는다.

**증거** (탐침 P1):

```
FAIL  P1 unvalidated request_id yields an instruction the reply parser can never match
AssertionError: expected undefined to be 'permission'
- Expected: "permission"
+ Received: undefined
```

`yes hello` 는 안내문이 시킨 그대로인데도 `consumed_by` 가 붙지 않았다 — 소비되지 않았다는 뜻이다.

**카드 대조**: 이것이 카드 원문의 **「봇이 보낸 불가능한 ID로 사람이 절대 승인 못 하는 요청 방지 (t3 F-04)」** 바로 그 항목이다. 이번 수정은 이 절반을 다루지 않았다.

**권고 수정**: `T7-F-01` 과 같은 검사 한 곳으로 함께 닫힌다.

### 2.3 `T7-F-03` — 이번 수정이 만든 새 충돌 부류 (Low, optional)

**주장**: `keyOf` 가 id 를 소문자로 낮추므로, 같은 방에서 `abcde` 와 `ABCDE` 는 이제 **같은 키**다. 먼저 등록한 요청이 조용히 덮여 사라진다. 수정 이전에는 두 키가 달라 둘 다 맵에 남아 있었다(앞의 것은 판정 가능, 뒤의 것은 조회 미스).

**증거** (탐침 P3): 먼저 등록한 `pm` 봇이 `yes abcde` 에 대해 판정을 **받지 못했다**(`expected null not to be null`).

**평가**: 이번 수정이 없앤 결함(방 간 유실)에 비하면 훨씬 좁고, 실제 Claude Code 는 소문자 id 만 보내므로 실현 가능성이 낮다. 그래도 **고친 것과 같은 부류(조용한 덮어쓰기)** 가 다른 축에서 새로 생겼다는 사실은 기록되어야 한다. `T7-F-01` 의 형식 검사가 들어가면 이 부류도 함께 사라진다(대문자 id 자체가 등록되지 않으므로).

### 2.4 `T7-F-04` — 대기 맵 무한 증가 (Low, optional, **미재현**)

**주장(가설)**: `open` 맵에도, 그 요청이 만드는 system 메시지 행에도 상한·만료·속도 제한이 없다. 봇 하나가 `permission_request` 를 반복하면 프로세스 메모리와 `messages` 테이블이 무제한 증가한다.

**미검증 표기**: 부하 재현을 **실행하지 않았다**. 코드 검토만으로 세운 가설이며, 확인된 결함이 아니다.

**SPEC 대조**: `spec.md` §범위 경계는 「봇 연결 해제 시 대기 항목 정리」만 범위 밖으로 명시했고, **요청 홍수는 다루지 않는다**. 즉 문서화된 유예가 이 항목을 덮지는 못한다. 후속 카드 후보로 남긴다.

### 2.5 `T7-F-05` — 잔여 범위 미보고 (Low, optional)

**주장**: `run-done.md` 는 머리표에서 「카드 원문의 F-04 기술이 아니라 t4 교정 기술을 따랐다」고 밝혔고 그 근거는 실재한다(§4.2 확인). 그러나 §5 Gaps 절에는 **카드가 요구한 형식 검증이 이행되지 않았다는 사실이 없다**. 리드가 §5 만 읽으면 카드가 통째로 닫힌 것으로 읽힌다.

---

## 3. 실제로 고친 것 — 재검증 (합격)

카드가 **실행한** 두 수정은 옳다. 감사자가 코드 원문과 대조해 확인했다.

| 항목 | 확인 |
|------|------|
| 결함-1 (방 간 키 충돌 유실) | `keyOf` 에 방 번호가 들어가 다른 방의 같은 id 가 서로를 덮지 않는다. `permissions.ts:24,36,50,52` — 등록·조회·삭제 세 곳이 모두 같은 함수를 경유한다 |
| 결함-2 (등록 원본 / 조회 소문자 불일치) | 등록도 `keyOf` 를 지나므로 양쪽 기준이 하나가 됐다 |
| `REQ-PERM-011` (방 격리) 유지 | 방 가드 라인(`if (info.roomId !== roomId)`)을 지운 판단이 옳다 — 키에 방이 박혀 있어 다른 방의 답은 조회 자체가 빗나가고, 대기 항목은 남는다. 기존 테스트 `never resolves a request from a different room` 통과로 유지 확인 |
| `REQ-PERM-006` (판정 id 소문자 정규화) | `sendToBot` 에 넘기는 `requestId` 는 여전히 소문자 — 계약 유지 |
| `REQ-PERM-008` (1회용) | 삭제도 같은 합성키로 — 같은 답의 두 번째 시도는 조회 미스 |
| `REQ-PERM-013`·`REQ-PERM-014` | 새 엔드포인트·이벤트·WS 타입 없음, `db.ts` `SCHEMA` 무변경 (`git diff --stat` 로 확인 — 변경 파일 3개뿐) |
| 회귀 방어 | 재현 테스트 2건이 수정 **이전에** 들어갔고 RED 를 관측한 순서가 남아 있다. 기존 `permissions.test.ts` 17건이 방어막 |

---

## 4. 카드 범위 대조

### 4.1 대체 근거는 실재한다

런 단계가 카드 원문의 기술 대신 t4 교정 기술을 따른 근거를 **원문에서 직접 확인**했다.

`.claude/worktrees/t4/.moai/specs/SPEC-CHANPERM-001/spec.md:124`:

> **v0.2.0 교정 기록 (M2·M3).** v0.1.0 은 가정-2 의 고장을 "다른 방의 판정이 섞여 들어온다", 가정-3 의 고장을 "돌아온 id 가 원본과 달라 짝을 못 찾는다"로 적었다. 감사자가 `server/src/permissions.ts` 원문과 대조해 **둘 다 실제 코드와 어긋남**을 지적했다 (…) 잘못된 기술을 근거로 카드 `t7` 이 수정 범위를 잡으면 존재하지 않는 누출을 막느라 방별 라우팅을 다시 짜고 실재하는 키 충돌은 그대로 남는다.

**판정: 대체는 정당하다.** 카드 원문의 t3 F-05 기술("다른 방 봇의 같은 request_id 덮어쓰기로 승인 굶김")은 실제 코드와 어긋났고, 런 단계가 교정본을 따른 것은 옳다.

### 4.2 그러나 대체가 덮지 못한 절반이 있다

교정 기록이 바로잡은 것은 **가정-2·가정-3 두 건의 고장 기술**이다. 카드 원문의 두 항목과 겹쳐 보면:

| 카드 원문 항목 | 대응 | 상태 |
|---|---|---|
| t3 F-05 「대기 맵 방 단위 네임스페이스화」 | 가정-2 (전역 키 충돌) | **이행됨** |
| t3 F-04 前반 「대소문자 등록/조회 불일치」 | 가정-3 | **이행됨** |
| t3 F-04 後반 「request_id **형식 검증** + 안내 **문구 일치**」 | **대응 없음** — 교정 기록은 이 항목을 다루지 않았다 | **미이행 → `T7-F-01`·`T7-F-02` 로 실재 확인** |

교정 기록은 가정-2·3 의 *기술*을 고쳤을 뿐, 카드 원문이 별도로 요구한 *형식 검증* 을 철회하지 않았다. 그 절반은 지금도 살아 있고, 재현된다.

---

## 5. Evidence — 감사자가 직접 실행한 원문

### 5.1 전체 스위트 (`.moai/state/verify/t7/test-full.txt`)

```
$ unset MOAI_KANBAN … && npm test -w server
 RUN  v4.1.11 /Users/…/.claude/worktrees/t7/server
 Test Files  10 passed (10)
      Tests  106 passed (106)
   Duration  7.74s
TEST_EXIT=0
```

### 5.2 타입 검사 (`.moai/state/verify/t7/typecheck.txt`)

```
$ npm run typecheck -w server
> tsc --noEmit
TYPECHECK_EXIT=0
```

### 5.3 보안 탐침 (`.moai/state/verify/t7/probe.txt`, 재현 코드 `probe-permissions.snippet.ts`)

```
 ❯ test/_audit_t7_probe.test.ts (3 tests | 3 failed)
   × P1 unvalidated request_id yields an instruction the reply parser can never match
   × P2 request_id can forge an extra instruction line in the system message
   × P3 same-room case variants collapse and silently drop the first request
PROBE_EXIT=1
```

세 탐침 모두 **결함이 있을 때 실패하도록** 썼고, 셋 다 실패했다. 탐침 파일은 감사 종료 시 작업나무에서 삭제했고(`git status` 로 확인), 재현 코드는 증거 디렉터리에 보존했다.

### 5.4 Baseline-attribution

| 항목 | 값 |
|------|-----|
| 트리 | `.claude/worktrees/t7`, HEAD `85c44bb` (`git rev-parse HEAD` 로 확인) |
| 비교 기준 | `b9eed4b` (t3 사슬 마지막 커밋) |
| 실행 시점 | 2026-08-27, 이 감사 세션 안에서 직접 실행 |
| 스위트 규모 | 106건 — 런 단계 보고의 106건과 일치 (t7 이전 기준선 104건 + 신규 2건) |

---

## 6. Gaps — 이번 감사가 관측하지 않은 것

- **커버리지 미측정** — `--coverage` 를 실행하지 않았다. Craft 의 커버리지 하드 임계(85%) 저촉 여부는 이 감사로 판정하지 않았다.
- **변이 검증 미실시** — 새 테스트 2건이 수정을 되돌렸을 때만 실패하는지는 런 단계 보고의 RED 관측(`.moai/reports/t7/run-done.md` §2)에 의존한다. 감사자는 그 RED 를 **재관측하지 않았다** — 관측한 것은 GREEN 쪽뿐이다.
- **`T7-F-04` 부하 재현 없음** — §2.4 참조. 가설이며 확인된 결함이 아니다.
- **실환경 결합 미검증** — 실 게이트웨이·실 토큰 경로는 t6 E2E 카드 소관.
- **린터 부재** — 이 저장소에는 린터가 없다. 도구가 없으므로 판정하지 않는다(Gap).
- **문서 동기화 미실시** — CHANGELOG·README 갱신은 **의도적으로 하지 않았다**. 판정이 FAIL 인 상태에서 변경 내역을 확정하면 되돌릴 문서가 늘어난다. 정정 라운드 뒤에 함께 처리하기를 권한다.

## 7. Residual-risk — 관측했는데도 남는 위험

- **봇을 적대자로 볼 것인가**는 이 저장소가 아직 한 번도 명시적으로 결정하지 않은 전제다. t3 sync 는 사실상 「본다」고 판단해 첨부 경로를 봉인했고, 이 감사는 같은 전제 위에서 `T7-F-01` 을 High 로 매겼다. 운영자가 「봇은 신뢰한다」로 전제를 확정하면 `T7-F-01`·`T7-F-02` 의 등급은 내려간다 — **판정을 바꿀 수 있는 유일한 지점**이라 명시한다.
- **`t9`·`t10`·`t11` 과의 관계**: 셋 다 채널(클라이언트) 쪽 또는 서버 인가 항목이며, `T7-F-01` 은 **서버가 사람에게 보여 주는 승인 화면의 위조**로 셋 중 어디에도 속하지 않는다. 새 카드가 필요하다.
- **미푸시**: 브랜치 `WT-perm-request-id` 는 로컬에만 있고 워크트리가 유일 사본이다. 이 나무를 없애면 수정도 사라진다.

---

## 8. 리드 결정이 필요한 지점

| 선택지 | 내용 |
|---|---|
| A | 이 카드 안에서 `T7-F-01`·`T7-F-02` 를 닫는다 — 검사 한 곳(`onGatewayRequest` 진입부 형식 검증 + 본문 줄바꿈 중화)으로 둘 다 닫히고, `T7-F-03` 도 함께 사라진다. 재감사 후 PASS 재판정 |
| B | 카드 t7 을 **실행된 범위 기준으로** 닫고, `T7-F-01`·`T7-F-02` 를 새 카드로 분리한다. 이 경우 카드 제목의 「F-04」 표기를 「F-05 + F-04 대소문자 절반」으로 정정해야 한다 — 그러지 않으면 닫힌 카드가 닫지 않은 것을 닫았다고 기록한다 |
| C | 「봇은 신뢰한다」를 프로젝트 전제로 확정하고 `T7-F-01` 을 Low 로 재평가한다. 그 경우 t3 sync 가 봇 첨부 경로를 봉인한 판단과의 정합성을 함께 정리해야 한다 |

`T7-F-04`(대기 맵 무한 증가)는 어느 선택지에서도 별도 후속 카드 후보다.

---

_감사자: sync 세션 (카드 t7). 이 보고의 모든 PASS 는 §5 의 실행 원문에 귀속된다._

---

# 재감사 (정정 라운드 후) — 2026-08-28

| 항목 | 값 |
|------|-----|
| 대상 | 정정 커밋 `5afcd38` → `0e24196` → `18bcc2d`, 보고 `1ce4973` |
| 트리 | `.claude/worktrees/t7`, HEAD `1ce4973` (감사 실행은 `18bcc2d` 상태의 소스에 대해 수행) |
| 렌즈 | `--security` (유지) |
| 증거 | `.moai/state/verify/t7/reaudit-{test-full,typecheck,probe,mutation}.txt` |

## R1. 재판정

**판정: FAIL (유지)** — **가중 조화평균 76.7 / 100** (라운드 1: 62.1… 아니고 68.0 → 76.7)

판정이 유지되는 이유는 하나다. `T7-F-02`·`T7-F-03` 은 **완전히 닫혔고**(감사자 직접 재현·재관측), `T7-F-01` 도 **크게 줄었지만 여전히 실행으로 재현된다**. `default.md` §Hard Thresholds 의 "Security FAIL = Overall FAIL" 은 High 잔존만으로 발동한다.

정정 라운드의 작업 품질 자체는 높다 — RED 선행 순서가 커밋에 남아 있고, 변이 감별력을 감사자가 직접 재관측했으며, 남는 위험을 §7.6 에 **스스로 공개**했다. 점수가 68.0 → 76.7 로 오른 것이 그 반영이다.

| 차원 | 가중치 | 라운드1 | 재감사 | 근거 |
|------|--------|--------|--------|------|
| Functionality | 40% | 80 | **88** | `npm test -w server` → `Tests 109 passed (109)`, `TEST_EXIT=0` (감사자 실행). 카드 범위의 미이행 절반이 착수됨 |
| **Security (must-pass)** | 25% | 38→45 | **55** | Medium·Low 2건 종결. High 1건은 축소됐으나 잔존(§R3) |
| Craft | 20% | 82 | **88** | 변이 감별력 재관측(4건 정확히 실패), 잔여 위험 자기 공개 |
| Consistency | 15% | 88 | **90** | `PERMISSION_REPLY_RE`·브로커 계약·스키마 무변경 확인 |

`1 / (0.40/88 + 0.25/55 + 0.20/88 + 0.15/90) = 1 / 0.0130303 = 76.75`

## R2. 종결 확인 — 감사자가 직접 재현한 것

| 항목 | 판정 | 감사자 관측 |
|---|---|---|
| `T7-F-02` 판정 불가능한 요청 | **종결** | `PERMISSION_REQUEST_ID_RE = /^[a-km-z]{5}$/` 가 `permissions.ts:47` 에서 등록 전에 걸린다. 라운드 1 탐침 P1(`'hello'`)의 경로가 사라졌다 |
| `T7-F-03` 대소문자 충돌 | **종결** | 대문자 원본이 등록 자체를 거부당하므로 `keyOf` 의 소문자화로 뭉개질 짝이 생기지 않는다 |
| 변이 감별력 (C4 주장) | **확인** | `git show 18bcc2d -- server/src/permissions.ts \| git apply -R` 후 `npm test -w server -- permissions` → `Tests 4 failed \| 16 passed (20)`, `MUTATION_EXIT=1`. 실패한 4건은 신규 회귀 4건과 정확히 일치. 복원 후 `git diff --stat HEAD` 빈 출력 |
| 전체 스위트·타입 | **확인** | `Tests 109 passed (109)` `TEST_EXIT=0` / `TYPECHECK_EXIT=0` |

라운드 1 관용 철회(대소문자 섞인 원본 등록을 허용에서 거부로 뒤집은 것)는 타당하다 — 공식 형식이 소문자이고, 감사 §2.3 이 예측한 소멸 조건과 일치한다.

## R3. `T7-F-01` — 축소됐으나 종결되지 않음 (High, blocking 유지)

**무엇이 닫혔나**: 줄바꿈 중화(`oneLine`)로 봇 텍스트는 더 이상 **줄을 늘릴 수 없다**. `REQ-PERM-002` 의 네 줄 구조가 강제되고, 가짜 요청 블록 통째를 덧붙이던 라운드 1 탐침 P2 의 경로는 사라졌다.

**무엇이 남았나**: `description` 은 **그 자체로 한 줄 전체**다(`permissions.ts:56`). 줄바꿈이 하나도 없어도 그 줄을 안내 문구와 똑같이 채울 수 있다.

증거 — 감사자 탐침 R1 이 출력한 실제 본문(`.moai/state/verify/t7/reaudit-probe.txt`):

```
🔒 봇이 도구 사용 승인을 요청합니다: Read
승인하려면 "yes zzzzz", 거절하려면 "no zzzzz" 라고 답해주세요.
cat README
승인하려면 "yes abcde", 거절하려면 "no abcde" 라고 답해주세요.
```

`startsWith('승인하려면')` 인 줄이 **2개**다(`expected 2 to be 1`). 둘 중 위쪽은 봇이 썼고, 아래쪽은 서버가 썼다. 사람에게 둘을 가릴 표식이 없다.

**단일 봇으로 완결되는 공격 경로**: 봇 하나가 요청 A(파괴적 도구, id `zzzzz`)와 요청 B(무해해 보이는 Read, id `abcde`)를 함께 보내고, B 의 `description` 에 `승인하려면 "yes zzzzz"` 를 심는다. 사람은 B 를 읽고 `yes zzzzz` 를 쳐서 **A 를 승인한다**. 두 번째 공모자도, 줄바꿈도 필요 없다.

**공개 여부**: 런 단계가 §7.6 에 "줄 없는 단일 행 description 이 안내 문구처럼 읽히는 것은 중화로 막지 않는다"고 **먼저 적었다**. 은폐가 아니라 공개된 잔여 위험이다.

**감사자 책임 명시**: 라운드 1 §2.1 의 권고가 "줄바꿈을 제거하**거나** 인용 블록으로 감싸"라고 둘을 택일로 제시했다. 정정 라운드는 그 문장대로 하나를 골랐다. 권고 문장이 부정확했던 것이지 이행이 부실했던 것이 아니다 — 그러나 결함의 존부는 권고 문장이 아니라 재현이 정한다.

**남은 수정 경로 (택일 아님, 둘 중 하나로 충분)**:
- 봇 텍스트를 서버 문구와 **시각적으로 분리**한다 — 각 줄에 고정 접두(예: `│ `)를 붙여, 접두 없는 줄만 서버가 쓴 줄이 되게 한다. 접두 자체도 봇 텍스트에서 중화한다.
- 안내 문구를 **본문 밖으로** 옮긴다 — 판정 안내를 봇이 채울 수 없는 별도 필드나 고정 위치로 뺀다(단 `REQ-PERM-013` 의 "새 이벤트 타입 금지"와 `REQ-PERM-002` 의 네 줄 구조 개정을 수반하므로 SPEC 개정 필요).

## R4. 신규 관측

| # | 심각도 | 확신도 | 내용 |
|---|---|---|---|
| `T7-F-06` | Low | **미검증(소비자 부재)** | `oneLine` 이 중화하는 것은 `\r\n?\|\n` 뿐이다. 유니코드 줄 구분자 U+2028·U+2029 는 본문에 그대로 남는다(탐침 R2 로 잔존 확인). 이것이 실제 줄바꿈으로 **보이는지**는 렌더러가 정하는데, 웹 UI 는 이 나무에 아직 없다(카드 `t5` 소관) — 따라서 **결함으로 판정하지 않는다**. t5 착수 시 확인 대상으로 넘긴다 |
| `T7-F-07` | Low | 문서 대조 | 테스트 주석(`permissions.test.ts`, 커밋 `0e24196`)이 "안내 문구로 시작하는 줄은 서버가 쓴 한 줄뿐이어야 한다"고 적었으나, R1 이 그 명제를 반증했다. 테스트가 **실제로 재는 것**은 "줄바꿈으로는 안내 줄을 만들 수 없다"이며 이것은 구현과 정확히 맞다. 주석이 구현보다 강한 보증을 주장하는 것이 문제다 — 다음 독자가 그 문장을 믿는다 |

`0e24196`(테스트 판정을 `includes` → `startsWith` 로 좁힌 것)이 **구현에 맞춘 약화인가**는 따로 확인했다. 중화 설계상 갇힌 봇 텍스트가 ` ⏎ ` 와 함께 한 줄 안에 남으므로 `includes` 는 올바른 구현도 실패시킨다 — 측정 도구 교정이 맞다. 다만 그 교정으로 얻은 명제는 §R3 이 반증한 것보다 약하다(위 `T7-F-07`).

## R5. 재감사 Evidence

```
$ unset MOAI_KANBAN … && npm test -w server
 Test Files  10 passed (10)
      Tests  109 passed (109)
TEST_EXIT=0

$ npm run typecheck -w server
TYPECHECK_EXIT=0

$ (수정 되돌림) npm test -w server -- permissions
     × refuses a mixed-case request_id and registers nothing
     × refuses to register an id the reply format can never match
     × flattens newlines in bot-supplied text so no forged instruction line appears
     × same-room case variants cannot collide because non-lowercase ids are refused
      Tests  4 failed | 16 passed (20)
MUTATION_EXIT=1
   → 복원 후 git diff --stat HEAD -- server/src/permissions.ts : 빈 출력

$ (감사 탐침 3건) npm test -w server -- _audit_t7_probe2
     × R1 a newline-free description still forges a guidance line   ← expected 2 to be 1
     × R2 unicode line separators survive the oneLine neutralizer
     × R3 malformed requests still write a system row each time     ← 50행
PROBE2_EXIT=1
   → 탐침 파일은 삭제, 재현 코드는 .moai/state/verify/t7/probe-permissions.snippet.ts 및 본 절에 보존
```

## R6. Gaps — 이번 재감사가 관측하지 않은 것

- 커버리지 미측정(라운드 1과 동일).
- `T7-F-06` 의 렌더링 영향 — 소비자(웹 UI)가 이 나무에 없어 판정 불가.
- `T7-F-04`(대기 맵 무한 증가)는 여전히 부하 재현 없음. 탐침 R3 에서 형식 밖 요청 50건이 system 행 50건을 만드는 것은 관측했으나(거부 안내도 행을 쓴다), 이는 큐 카드 `t12` 범위이며 이번 정정이 악화시키지도 개선하지도 않았다.
- 실환경 결합은 t6 E2E 소관.

## R7. 리드 결정이 필요한 지점 (갱신)

| 선택지 | 내용 |
|---|---|
| A' | `T7-F-01` 잔여를 이 카드에서 마저 닫는다 — §R3 의 두 경로 중 접두 분리 쪽은 SPEC 개정 없이 `permissions.ts` 안에서 끝난다. 재감사 후 PASS 재판정 |
| B' | 여기서 카드를 닫고 잔여 High 를 새 카드로 분리한다. 이 경우 카드 t7 은 **F-04 를 절반만 닫은 채 닫힌 카드**로 기록되므로, 제목과 큐 항목에 그 사실을 남겨야 한다 |
| C' | 「봇은 신뢰한다」를 프로젝트 전제로 확정하고 잔여를 Low 로 재평가한다 — 라운드 1 §7 과 동일한 미결 전제이며, t3 sync 가 봇 첨부를 봉인한 판단과의 정합성을 함께 정리해야 한다 |

`T7-F-07`(테스트 주석이 구현보다 강한 주장)은 어느 선택지에서도 한 줄 수정으로 끝난다.

---

_재감사자: sync 세션 (카드 t7). §R2·§R5 의 모든 관측은 이 세션이 이 트리에서 직접 실행한 것이다._

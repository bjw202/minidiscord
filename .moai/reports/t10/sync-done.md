# 카드 `t10` sync 완료 신호 — 판정 **FAIL**

| 항목 | 값 |
|------|-----|
| 카드 | `t10` |
| SPEC | `SPEC-CHANINJECT-001` — 채널 주입 방어 |
| 워크트리 | `.claude/worktrees/t10` (브랜치 `WT-injection-hardening`) |
| sync 문서 커밋 | `beb726c` (문서 동기화) · `ad88606` (§E.4 `sync_commit_sha` 백필) |
| 감사 시점 HEAD | `ad88606` |
| **판정** | **FAIL** — 가중 조화평균 **79.7** (Tier M 임계 0.80), **Security 72 must-pass 미달** |
| 감사 보고서 | `.moai/reports/t10/sync-audit.md` |
| 감사 증거 | `.moai/state/verify/t10-sync-audit/` |
| sync 검증 증거 | `.moai/state/verify/t10-sync/` |
| 푸시 | **안 함** — 원격 자체가 없다(`git ls-remote origin` → `fatal: 'origin' does not appear to be a git repository`). 이 워크트리가 브랜치의 유일 사본이다 |

---

## 1. 차원별 점수

| 차원 | 가중 | 점수 | 판정 |
|---|---|---|---|
| Functionality | 40% | 82 | PASS |
| Security | 25% | **72** | **FAIL (must-pass)** |
| Craft | 20% | 86 | PASS — 커버리지 **VERIFIED** (이전 라운드들의 UNVERIFIED 해소) |
| Consistency | 15% | 80 | PASS |

가중 조화평균 79.7 < 0.80, 그리고 Security must-pass 미달. 두 사유가 각각 독립으로 FAIL을 만든다.

---

## 2. 차단 발견 2건 — 리드 재검증 완료

두 건 다 **sync 레인 오케스트레이터가 감사자 주장을 받아 쓰지 않고 소스 원문으로 직접 재확인**했다.

### F-01 [High · 차단] — 이력 통로가 위조 봉투를 중화 없이 넘긴다

- **위치**: `channel/src/index.ts:73-81` (`fetchHistory`)
- **기제**: 중화 함수 `neutralizeEnvelope`(`channel/src/channel-server.ts:26-27`)는 **알림 경로에만** 걸려 있다 — `channel-server.ts:136`이 본문·이름·첨부 경로 셋을 중화한다. 이력 경로는 `index.ts:78`이 `author: m.author_name`·`body: m.body`를 **원문 그대로** 싣는다.
- **오케스트레이터 직접 관측**: `sed -n '60,90p' channel/src/index.ts` → 78행 `body: m.body` 무변형 확인. `grep -n "neutral" channel/src/channel-server.ts` → 중화 호출은 136행(알림) 한 곳뿐, `index.ts`에 호출 없음.
- **도달성**: 채널 instructions가 모델에게 «답하기 전에 `fetch_history`로 놓친 대화를 먼저 확인하라»고 적극 지시하므로, 이 통로는 예외 경로가 아니라 **정상 경로**다.
- **문서 결함이 동반된다**: `spec.md` · `CHANGELOG.md` · `README.md` · 형제 `SPEC-CHANNEL-001/progress.md` **네 곳이 모두 «F-02를 닫았다»고 적고 이 통로를 한 줄도 언급하지 않는다.**

### F-02 [Medium · 차단] — 이 카드가 새로 만든 거부 갈래가 반대 조치를 안내한다

- **위치**: `channel/src/index.ts:101-108`
- **기제**: 사유 문자열이 두 갈래뿐이다 — `new URL()` 성공 시 «비루프백 호스트에는 wss:// 를 쓴다», 실패 시 «주소를 해석하지 못했다». `http://127.0.0.1:3000/bot`은 **루프백이면서 URL 해석에 성공**하므로 첫 갈래로 떨어져 **사실과 어긋난 조치**를 안내한다. SPEC `REQ-CHANINJECT-013`과 CHANGELOG가 적은 실제 조치는 «스킴을 `ws://`로 바꾸라»다.
- **오케스트레이터 직접 관측**: `sed -n '99,110p' channel/src/index.ts` → 갈래가 정확히 둘, 루프백+스킴오류 조합을 가르는 분기 없음.
- **회귀**: 이 카드가 닫으려던 t9 이월 F-A10(«거부 사유가 사실과 다르다»)이 **이 카드가 새로 만든 갈래에서 재발**했고, 그 갈래를 재는 기준이 없다(비차단 F-07).

---

## 3. 조치 분류 — 리드 판단에 필요한 분할

| 발견 | 닫는 방법 | 비용 |
|---|---|---|
| **F-01** | **문서로 닫을 수 있다** — 네 곳 문언을 «알림 경로에 한해»로 좁히고 이력 통로를 후속 카드로 인계. **코드로 닫으려면** `AC-CHANINJECT-004`의 «무변형» 단언이 깨져 **SPEC 개정 + run 재진입**이 필요하다 | 문서: 낮음 / 코드: 높음 |
| **F-02** | **코드** — stderr 사유 분기를 3갈래로 가르는 문자열 한 줄 + AC 1건 | 낮음 (`acceptance.md` 본문 개정 수반 → manager-spec 소관) |
| F-03~F-07 (비차단 5건) | 전부 문서·테스트 | 낮음 |

**`channel/src`의 동작 로직을 고쳐야 하는 것은 F-02의 문자열 하나뿐**이며, 세 방어(봉투 중화·구조화 이력·신뢰 경계)의 구현 자체에서는 결함이 나오지 않았다.

---

## 4. 재현·재검증된 것 (감사자 + 오케스트레이터 이중)

| 항목 | 관측 |
|---|---|
| 테스트 | `npm test -w channel` → `Test Files 5 passed (5)` / `Tests 70 passed (70)`, 종료 코드 0 — **오케스트레이터가 독립 재실행** |
| 커버리지 | `channel/src` stmts **91.11%** ≥ 85% — 감사자 재측정, §E.3 run 실측과 동일값. **Craft 임계 4라운드 만에 VERIFIED** |
| 변이 표본 | 감사자가 15종 중 4종을 git 객체 기준선으로 직접 적용·실행·복원 → 예고된 기준이 정확히 하나씩만 실패. M-K의 «새 기준 실패 / 옛 기준 통과» 비대칭까지 재현 |
| 커밋 착지 | `git log --oneline` → `ad88606` · `beb726c` 존재 — 오케스트레이터 직접 확인 |
| 못 박은 두 문언 | `CHANGELOG.md:13`(`http://` 접속 거부) · `:19`(`{cursor, messages}` + `'(기록 없음)'` 소멸) 실재 — 오케스트레이터 직접 확인 |
| 형제 소유권 정정 | `SPEC-CHANNEL-001/progress.md:250-251`(F-02·F-04) · `SPEC-CHANWIRE-001/progress.md:231`(F-03) 전부 착지 — 오케스트레이터 직접 확인 |
| §E.4 | `sync_status: audit-ready`, `sync_commit_sha: beb726c` 백필 완료. 감사자가 값이 실제 문서 커밋과 일치함을 확인 |
| 상태 전이 | `spec.md` frontmatter `status: completed`. `plan.md`·`acceptance.md`·`progress.md`는 이 프로젝트 관례상 frontmatter 블록 자체가 없다(형제 `SPEC-CHANAUTH-001` 동일) |
| 작업 트리 | 감사 종료 시 `git status --short --untracked-files=no` 빈 출력 — 변이 전량 복원됨 |

---

## 5. 리드가 물은 두 판단 건 — 감사자 판정

- **README F-07 기제 서술을 고친 것 — 옳다.** 같은 sync가 `README.md:43`에 새로 쓴 «스킴은 ws/wss만 받는다»와 정면으로 모순했다.
- **README F-01 기제 서술을 남긴 것 — 옳지 않다.** 남긴 근거(«정정 소유자는 t9다»)가 F-07에도 똑같이 성립하므로 **한 목록의 두 항목에 서로 다른 잣대가 적용됐다.** 다만 위험을 실제보다 크게 적은 방향이라 사용자를 위험에 빠뜨리지는 않는다. (비차단 F-03)

## 6. 범위 판정

- **증거 로그 34건 커밋은 범위 밖이 아니다.** `.gitignore`에 «`!/.moai/state/` — 검증 증거가 여기 커밋된다» 예외가 있고 형제 카드들도 같은 처리를 했다.
- `REQ-CHANINJECT-015`의 `server/` 금지: 위반 없음.

---

## 7. 감사가 검증하지 **못한** 것

- Claude Code 호스트의 실제 봉투 처리 — 트리에 호스트가 없다
- 모델의 지시문 순종 — 원리적으로 관측 불가 (`spec.md` §5가 명시)
- **변이 15종 중 11종** — 4종만 표본 재현
- 전이 다섯 건의 RED 원문 — run 단계 기록 인용
- 린트 — `channel` 워크스페이스에 lint 스크립트 없음
- 카드 `t4` 재감사 — 이 카드 범위 밖
- 자식 프로세스 커버리지 — 분리 집계 공구 없음

---

## 8. 다음 결정 — 리드 소관

카드는 **`sync`에 머문다.** 판정을 뒤집으려면 차단 2건을 닫고 재감사해야 한다. 선택지는 둘이고, 어느 쪽도 이 레인이 단독으로 정할 일이 아니다.

1. **문서 축소 + 코드 한 줄** — F-01을 «알림 경로에 한해»로 좁혀 후속 카드 인계, F-02는 stderr 3갈래 분기 + AC 1건. 카드 `t9`의 전례(FAIL 78 → 대응 → PASS 87.3)와 같은 형태.
2. **F-01을 코드로 닫기** — 이력 통로에도 중화를 넣는다. `AC-CHANINJECT-004`의 «무변형» 단언이 깨지므로 **SPEC 개정 + run 재진입**을 수반한다.

**푸시·워크트리 처분은 재감사 PASS 전까지 금지된다** — 이 워크트리가 브랜치의 유일 사본이다.

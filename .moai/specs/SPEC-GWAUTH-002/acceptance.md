# SPEC-GWAUTH-002 수용 기준

각 기준은 **명령 하나 + 관측 가능한 결과 하나**로 이루어진다. 판정은 이분법이다 — 통과 아니면 실패이고, 그 사이는 없다.

모든 명령은 별도 언급이 없는 한 워크스페이스 루트에서 실행한다. 채널 자식 프로세스를 띄우는 기준(AC-GWAUTH2-019)은 **`npm run build -w channel` 이 선행되어야 한다** — `channel/dist/` 가 없으면 방어와 무관하게 거짓 실패한다.

---

## 이 문서가 지키는 검증 원칙

이 SPEC 의 기준은 **자기가 재기로 한 상대에 대해서는, 방어를 통째로 지워도 통과하는 기준을 하나도 두지 않는다.**

### 0) [HARD] 이 기준들이 재지 않는 상대를 **먼저** 적는다

`SPEC-GWAUTH-001` 은 열다섯 기준 중 **0개**가 자기가 명명한 위협 모형의 상대를 쟀고, 그 사실이 sync 감사(F-02·§7-3)로 드러날 때까지 문서 어디에도 적혀 있지 않았다. 부정 기준 다섯의 위조자는 전부 «받은 토큰을 읽지 않기로 한» 상대였다 — 쓸 수 없는 상대가 아니라 쓰지 않기로 정해 둔 상대다. 같은 실패를 반복하지 않기 위해, 이 문서는 성과보다 **공백을 먼저** 적는다.

**이 기준들이 재지 않는 상대와 성질 — 여덟.**

1. **`server_confirm_key` 를 읽어 간 상대 (읽기 전용 DB 유출의 절반).** 그 상대는 `challenge` 도 봉투도 만들 수 있으므로 **AC-GWAUTH2-006 · 013 · 014 · 015 를 전부 통과한다.** **이 문서의 기준 전건 중 그 상대를 막는 것은 0개**다(개수를 적지 않는다 — 기준이 늘면 낡는다) — 막을 방어가 없기 때문이며, `spec.md` §5 표 `DB읽기만` 행이 그것을 «게이트웨이 사칭은 여전히 가능하다» 로 적는다. **통과 개수를 방어의 넓이로 읽어서는 안 된다.**
2. **평문 토큰 T 를 얻은 상대, 그리고 장악된 서버.** 정의상 모든 열쇠를 갖는다.
3. **타이밍 상수성.** REQ-GWAUTH2-016 이 요구하지만 이 문서는 재지 않는다 — 테스트 환경에서 신뢰할 수 있게 측정할 수 없다. AC-GWAUTH2-012 가 재는 것은 **무예외**이지 무의존이 아니며, `===` 로 대조한 구현은 그 기준을 통과한다. 그 자리는 코드 리뷰가 지킨다(`plan.md` §G).
4. **채널 → 서버 방향의 프레임 무결성.** 봉투는 서버→채널 한 방향뿐이다(`spec.md` §5). 중계형 중간자가 채널이 보낸 프레임의 내용을 바꾸는 것을 재는 기준은 없다.
5. **발신 집합 128 축출(F-A8) 자체.** 도달 범위가 좁아짐은 설계의 귀결이지 이 기준들이 재는 성질이 아니다.
6. **[HARD] 바인딩이 서지 않는 배치에서 중계자가 가져가는 봇 세션.** `spec.md` §2.8.4 가 실측한 대로 **오늘 이 저장소의 서버는 TLS 를 종단하지 않으므로**, 실제 배치에서 중계자는 배제되지 않는다. AC-GWAUTH2-022 는 **시험 안에서 TLS 를 종단하는 서버**를 세워 방어가 실재함을 재고, AC-GWAUTH2-024 는 **평문 연결에서 같은 중계자가 이긴다는 것**을 잰다 — 즉 이 문서는 그 공백을 «재지 않는다» 가 아니라 **«이긴다는 사실을 매 실행마다 기록한다»** 로 다룬다. 그러나 **어떤 기준도 실제 운영 배치를 재지 않는다** — 배치는 이 저장소 밖의 값이다.
7. **선택적 억제.** 경로에 선 상대가 유효한 봉투를 **흔적 없이 삼키는 것**을 재는 기준은 없다(`spec.md` §5). `seq` 는 재생을 막지만 삭제를 탐지하지 못한다. **그리고 이 패스는 억제된 `permission_verdict`·`history_response` 가 채널 쪽에서 어떤 기본 동작으로 귀결되는지 확인하지 않았다** — 확인하지 않았다는 사실 자체를 여기 적는다.
8. **`pub` 존재 확인 오라클.** 아무나 `hello` 를 보내 «이 `pub` 이 등록되어 있는가» 를 알아내는 것, 그리고 유량 제한의 부재. 채널 바인딩은 `challenge` 의 **전달 가치**만 없앤다(`spec.md` §5).

#### 0-1) [HARD] 공허성 집계 — 이 문서가 자기 값을 적는다

**판정 축**: 하네스가 그 상대에게 무엇을 쥐여 주는가. `spec.md` §1.1 이 명명한 상대와 **같은 능력**이면 **A**, **엄격히 약하면 B**, 상대를 재는 기준이 아니면(구조·양성·관측) **C**.

**A = 9 · B = 1 · C = 14** (합 24).

- **A (명명된 상대를 온전한 능력으로 잰다) — 9**: 006 · 009 · 010 · 011 · 013 · 014 · 015 · 022 · 024
- **B (엄격히 약한 상대를 잰다) — 1**: 012
- **C (상대 기준이 아니다) — 14**: 001 · 002 · 003 · 004 · 005 · 007 · 008 · 016 · 017 · 018 · 019 · 020 · 021 · 023

**[HARD] B 는 1이며 0이 아니다.** AC-GWAUTH2-012 의 위조자 여섯은 전부 «만들 수 있는 것을 만들지 않기로 한» 상대이고, **그 기준 자신의 [HARD] 문단이 «§1.1 이 명명한 상대보다 엄격히 약하다» 고 적는다.** 그 기준이 판정 축을 «강건성» 으로 선언한 것은 **공허성을 정직하게 중화하는 조치이지 분류를 C 로 바꾸는 조치가 아니다** — 배제 주장은 명시적으로 AC-GWAUTH2-006 에 넘겼고, 그것으로 중화는 성립한다. **문서 자신이 «약하다» 고 적은 기준을 집계에서 0으로 세는 것은, 이 카드가 고치러 온 과장과 같은 형태다.** 2회차 작성자는 B=0 을 주장했고 2회차 감사(G-14)가 그것을 반증했다. 이 집계는 그 반증을 수용한 값이다.

**v1 과의 비교**: `SPEC-GWAUTH-001` 은 열다섯 기준 중 A 가 **0**이었다. 축 자체가 다르다.

### 1) 한 기준은 변이 하나로 무너져야 한다

각 기준 끝에 **「이 기준을 무너뜨리는 변이」** 를 한 줄로 적었다. 그 변이를 구현에 넣었을 때 그 기준이 실패하지 않으면, 실패한 것은 구현이 아니라 기준이다.

| 위험한 자리 | 순진한 기준이 왜 무의미한가 | 이 문서가 대신 관측하는 것 |
|---|---|---|
| 서버 증명 대조 | "위조된 challenge 가 막혔다"만 재면 **모든 challenge 를 거절하는 구현**이 통과한다 — 봇이 영원히 붙지 못하는 상태와 구분되지 않는다 | 위조자는 0건, 진짜 열쇠를 쥔 스텁은 각 1건 — 두 기준이 짝이다 (006 · 007) |
| **위조자의 능력** | `proof:'omit'` 처럼 **만들 수 있는 것을 만들지 않기로 한** 위조자를 세우면, 실제 상대가 통과해도 초록이다 (`SPEC-GWAUTH-001` 의 실패) | 위조자가 `hello` 의 `pub`·`client_nonce` 를 **실제로 읽었음을 단언한 뒤**, 그것으로 만들 수 있는 최선의 증명 넷을 전부 시도한다 (006) |
| 검증자 저장 | "컬럼 이름이 바뀌었다"만 재면 저장 값이 여전히 사칭에 충분해도 통과한다 | DB 에서 읽을 수 있는 값만 쥔 클라이언트가 진짜 서버에 붙어 **등록되지 못함**을 잰다 (009) |
| 확립 후 프레임 인증 | "봉투를 붙였다"만 재면 **중계형 중간자**를 재지 못한다 — 그 상대는 핸드셰이크를 위조하지 않는다 | 진짜 서버·진짜 채널 사이에 서서 핸드셰이크를 **그대로 중계한 뒤** 세 프레임을 밀어 넣는다 (013) |
| 순번 | "seq 필드가 있다"만 재면 **검사하지 않는 구현**이 통과한다 | 유효한 봉투를 **그대로 다시** 보내면 두 번째가 버려지는가 (015) |
| 열쇠 유출 | 받은 프레임만 재면 **나가는** 방향이 비밀을 흘려도 통과한다 — `SPEC-GWAUTH-001` 이 정확히 그렇게 실패했다 (sync 보고 S-01) | 소켓을 **오간 모든** 프레임을 이어 붙여 세 비밀의 부재를 잰다 (004) |
| 하위 호환 | 새 경로만 재면 **옛 경로가 살아 있어도** 통과한다 — 하향 협상이 열린다 | v1 형태 `hello` 가 환영받지 못하고 닫히는가 (018) |
| 강제 지점 분리 | 굵은 변이는 **세 방어 중 어느 것이 측정되는지** 가르지 못한다 | 세 게이트를 각각 지우는 세 변이가 서로 다른 기준 집합을 무너뜨리는가 (017 + 변이표 N1·N2·N3·O) |

### 2) 모든 기준이 회귀 스위트 안에 있다

`.moai/reports/t4/sync-audit.md` §3.2 가 이 프로젝트의 결함 부류를 지목했다 — **기준 자체는 제대로 재지만, 그 기준이 다시 실행되는 곳이 어디에도 없는 경우**다. 그래서 이 문서는 **셸 명령으로만 관측하는 기준을 하나도 두지 않는다.** 진입점 관측(AC-GWAUTH2-019)조차 vitest 안에서 자식 프로세스를 띄우는 형태이고, 범위 경계(AC-GWAUTH2-021)만이 git·파일 검사이며 그것은 회귀 대상이 아니라 이 카드 한 번의 경계 확인이다.

`.moai/state/verify/t15-sync/probe-token-echo.mts` 는 **이미 거의 테스트다.** AC-GWAUTH2-006 의 하네스가 그 프로브를 vitest 형태로 옮긴 것이며, 그렇게 옮기는 것 자체가 이 카드의 값싼 개선이다 — sync 단계가 한 번 관측한 것을 앞으로 매번 관측한다.

### 3) 접두로 만족되는 단언을 쓰지 않는다

`toContain`·`toMatch` 같은 포함 단언은 접두만 맞아도 참이 된다. 이 문서는 **정확한 값과 부재**를 단언한다 — 배열은 `toEqual` 로 통째로, 없음은 `toEqual([])` 로 잰다. `not.toContain` 도 쓰지 않는다: 무엇이 없는지가 아니라 **무엇만 있는지**를 재야 "그 밖에는 아무것도 없다"가 성립한다. 예외는 AC-GWAUTH2-004 하나이며 그 자리는 «부재» 자체를 재므로 포함 검사가 정확하다.

### 4) 굵은 변이는 세 방어를 가른다 — 강제 지점을 셋으로 분리해서

`SPEC-GWAUTH-001` 은 게이트가 둘일 때 이 문제를 겪었다(1회차 감사 C-02). v2 는 셋이므로 위험이 커진다.

**[HARD] 세 강제 지점은 구조적으로 분리되고 이 순서로 검사되어야 한다** (REQ-GWAUTH2-015, 구조 처방은 `plan.md` §D-8).

```
if (frameRejected) return          // ① 이 SPEC 의 프레임 인증 강제 지점
if (proofRejected) return          // ② 이 SPEC 의 핸드셰이크 강제 지점
if (msg.type === 'challenge') { … }
if (msg.type === 'env')       { … }   // 여기서 mac·seq 를 검사하고 실패 시 ①을 세운다
else if (!established) { }         // ③ SPEC-CHANAUTH-001 의 강제 지점
```

이 구조에서 각 변이가 재는 것 — **아래 값은 예측이며, run 단계가 실측으로 교체한다**(§「변이표」서문).

| 변이 | 무엇을 지우는가 | 예측: 무너지는 이 SPEC 의 기준 | 예측: 형제 |
|---|---|---|---|
| **N1** — `frameRejected` 검사를 `if (false)` 로 | ① | 013 · 014 · 015 | 영향 없음 |
| **N2** — 서버 증명 대조를 `if (false)` 로 | ② | 006 · 008 · 011 · 012 · 019 | 영향 없음 |
| **N3** — `!established` → `false` | ③ | **하나도 무너지지 않는다** — ①·②가 먼저 반환한다 | `AC-CHANAUTH-001·003·004·005` |
| **O** — ①·② 를 ③ 뒤로 옮긴다 (체인 밖 독립 문장을 체인 뒤로) | 구조 | **N3 의 기대값이 뒤집힌다** | — |

셋을 하나로 합치거나 순서를 바꾸면 이 표의 행들이 같아지고, **실패가 어느 방어의 부재를 뜻하는지 귀속할 수 없다.**

**[HARD] 변이 O 의 형태를 한 문장으로 못 박는다**: ①·②를 **체인 밖 독립 문장으로 if/else 체인 뒤에** 옮긴다 — `else if (frameRejected) return` 로 **체인 분기에 끼우는 형태가 아니다.** 후자로 구현하면 프레임이 ③을 지운 뒤 그 분기에 걸려 O 가 지목한 기준들이 무너지지 않고, run 이 «구조가 틀렸다» 로 오진한다(`SPEC-GWAUTH-001` 2회차 감사 N-03 이 같은 자리에서 같은 오진을 겪었다).

### 5) 반대 방향의 결함도 함께 막는다 — 정상 구현을 거짓 실패시키지 않는다

`SPEC-GWAUTH-001` 이 1회차 감사에서 가장 크게 실패한 자리다(C-01 — 네 기준이 정상 구현에서 통과 불가였다). 그 교훈을 그대로 옮긴다.

- **이력 축을 `await` 로 재지 않는다.** `HISTORY_TIMEOUT_MS = 10_000`(`channel/src/gateway-client.ts:27`)이 vitest 기본 `testTimeout` 5,000ms 를 넘으므로, `rejects.toThrow(/timed out/)` 는 정상 구현을 타임아웃으로 죽인다. 모든 이력 축 관측은 아래 §「이력 축 관측의 표준 형태」를 쓴다.
- **부정 관측의 대기 시간.** "오지 않았음"을 재는 기준은 `settle()`(400ms)로 **양성 신호가 실제로 도착하는 데 걸리는 시간의 여러 배**를 기다린 뒤에 잰다. 짝이 되는 양성 기준이 같은 하네스에서 `waitFor` 로 통과하므로, 대기가 모자란 경우는 그쪽이 먼저 드러난다.
- **닫힌 소켓으로는 프레임이 나가지 않는다.** 거절 직후 소켓이 닫히므로 요청 프레임은 **소켓이 열려 있는 동안** 나가야 한다. `deferChallenge` 손잡이가 그 순서를 성립시킨다.
- **`wire()` 는 `onWelcome` 을 배선하지 않는다**(`channel/src/index.ts` 의 `wire()`). 그러므로 `wire()` 하네스 위에서 `onWelcome` 을 단언하지 않는다 — 확립은 **그 귀결**(채팅 도달·판정 중계·이력 해소)로 재고, 통과 충실성은 `createGatewayClient` 를 직접 쓰는 형제 하네스에서 잰다(AC-GWAUTH2-020 의 (나) 갈래).
- **재접속을 기다리는 기준의 타임아웃.** 실제 백오프 1,000ms 를 두 번 이상 지나는 기준(011 · 015)만 `it(..., { timeout: 20000 })` 로 둔다. 방어와 무관한 하네스 상수다.
- **자식 프로세스가 남으면 뒤따르는 기준이 오염된다.** `spawnChild()` 가 `spawn` **직후** `SIGKILL` 정리를 등록한다 — 명령 끝의 `kill` 한 줄은 일찍 끝나는 경로에 닿지 않으므로 쓰지 않는다.
- **`channel/dist` 가 없으면 자식 기준이 거짓 실패한다.** 문서 상단의 선행 명령이 그 조건이다.
- **양쪽 열쇠 유도 규칙이 갈라지면 단위 기준만으로는 드러나지 않는다.** AC-GWAUTH2-020 이 그 어긋남을 잡는 유일한 기준이다(`plan.md` §D-9).

`spec_base_sha` 는 이 SPEC 의 run 단계 진입 시점 커밋이다. **`plan.md` §C 사전 점검**에서 `git rev-parse HEAD` 로 기록하며, 범위 경계 검사(AC-GWAUTH2-021)는 `HEAD` 가 아니라 그 값과 **구현이 착지한 커밋**을 양 끝으로 비교한다. 기준 SHA 가 없으면 범위 경계 기준은 통과가 아니라 **실패**다.

---

## 공통 테스트 하네스

다섯 파일이 이 SPEC 을 관측한다.

| 파일 | 무엇을 재는가 | 성격 |
|---|---|---|
| `server/test/gateway.test.ts` | 서버 쪽 (001·002·004·005·009·010·016·018) | **기존 파일을 고쳐 잇는다.** `wsConnect` 계열이 전부 봉투를 풀어야 한다 |
| `channel/test/transport-auth.test.ts` | 채널 쪽 거절·양성 (003·006·007·008·011·012·014·015·017·019) | **기존 파일을 고쳐 잇는다.** `rogueGateway` 를 v2 로 확장한다 |
| `channel/test/gateway-client.test.ts` | 통과 충실성 (020 (나)) | **기존 파일을 고쳐 잇는다.** 이 파일만이 `createGatewayClient` 를 직접 쓰고 콜백을 노출한다 |
| `channel/test/gateway-mutual-auth.test.ts` | 왕복 (020 (가)) · 중계형 중간자 (013 · **022** · **024**) · 이력 봉투 (**023**) | **기존 파일을 고쳐 잇는다.** 진짜 서버와 진짜 채널을 한 테스트에서 붙인다. **022 는 여기에 TLS 종단 서버와 `tlsRelayMitm` 을 더한다** |
| (경계 확인) | 021 | vitest 밖. 이 카드 한 번의 확인 |

### 열쇠 유도 헬퍼 (양쪽에서 **각각** 정의한다 — 공유하지 않는다)

```ts
import { createHmac, createPrivateKey, createPublicKey, sign } from 'node:crypto'

// 구현이 쓰는 코드를 부르지 않고 기준이 스스로 계산한다. 공유하면 규칙이 함께 틀려도
// 기준이 그것을 알아채지 못한다 (plan.md §D-9 — 사본은 의도된 것이다).
const skOf   = (t: string) => createPrivateKey({
  key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'),
                      createHmac('sha256', t).update('minidiscord/v2/sign').digest()]),
  format: 'der', type: 'pkcs8',
})
const pubOf  = (t: string) => createPublicKey(skOf(t)).export({ format: 'der', type: 'spki' })
                                .subarray(-32).toString('hex')
const ksrvOf = (t: string) => createHmac('sha256', t).update('minidiscord/v2/server-confirm').digest()

// [HARD] cb 는 인자다 — 기본값으로 숨기지 않는다.
// 2회차는 이 헬퍼 셋에서 cb 를 통째로 빠뜨렸고, 그래서 요소 ④(채널 바인딩)가
// 이 문서의 기준 어디에서도 계산되지 않았다 (2회차 감사 G-03, Critical).
// (개수를 적지 않는다 — 4회차 훑기가 여기 있던 「스물네」를 개수 서술 부류로 잡았다.)
// 귀결이 두 방향이었다: §2.5 를 따른 정상 구현은 AC-005 에서 거짓 실패하고,
// 세 전사에서 cb 를 통째로 뺀 구현은 열한 기준을 초록으로 지났다 — 기준이 결함 있는
// 구현에 상을 주고 옳은 구현에 벌을 주는 역전이었다.
// 기본값 `= 'unbound'` 를 쓰지 않는 이유: 숨기면 다음 라운드가 다시 「cb 가 없다」로 읽는다.
const challengeProof = (t, cn, sn, room, bot, cb) =>
  createHmac('sha256', ksrvOf(t)).update(`challenge|${cn}|${sn}|${room}|${bot}|${pubOf(t)}|${cb}`).digest('hex')
const authSig = (t, cn, sn, room, bot, cb) =>
  sign(null, Buffer.from(`auth|${cn}|${sn}|${room}|${bot}|${pubOf(t)}|${cb}`), skOf(t)).toString('hex')
const sessKey = (t, cn, sn, room, bot, cb) =>
  createHmac('sha256', ksrvOf(t)).update(`session|${cn}|${sn}|${room}|${bot}|${cb}`).digest()
const envOf = (t, cn, sn, room, bot, cb, seq, inner) => {
  const payload = JSON.stringify(inner)
  return { type: 'env', seq, payload,
           mac: createHmac('sha256', sessKey(t, cn, sn, room, bot, cb)).update(`${seq}|${payload}`).digest('hex') }
}
```

> **[HARD] 평문 하네스에서 `cb` 인자는 리터럴 `'unbound'` 이며, 하네스가 그 상수를 명시적으로 넘긴다.** `rogueGateway`·`relayMitm`·서버 쪽 `wsConnect` 계열은 전부 평문 `ws://` 이므로 소켓이 `TLSSocket` 이 아니고, 구현이 계산하는 값도 `'unbound'` 다(`spec.md` §2.8.2, REQ-GWAUTH2-020). **그러므로 «헬퍼에 `cb` 를 넣으면 정상 구현이 거짓 실패한다» 는 성립하지 않는다** — 양쪽이 같은 `'unbound'` 를 쓴다. 값이 실제로 갈리는 것은 AC-GWAUTH2-022 의 TLS 하네스뿐이고, 그 기준은 증명을 재계산하지 않고 **두 바인딩 값의 상이함**을 직접 잰다.
>
> **[HARD] 헬퍼가 명세와 일치한다는 것은 이 결함의 종결 증거가 아니다.** G-03 이 지목한 것은 문서 사이의 불일치가 아니라 **«어느 구현이 통과하는가» 의 역전**이며, 역전이 사라졌는지는 **변이로만 관측된다.** 그래서 이 개정은 헬퍼 수정과 함께 변이 **Z1**(`challenge` 전사에서만 `cb` 제거) · **Z2**(`auth` 전사에서만 제거) · **V**(세션 유도에서만 제거)를 세우고, **각 변이가 어느 기준을 붉히는지를 이름으로 적었다**(변이표). **run 이 그 셋의 「실측」 열을 채우기 전까지 G-03 은 닫힌 것이 아니다.** 셋 중 어느 것도 어떤 기준도 붉히지 못한다면, 고칠 대상은 헬퍼가 아니라 **기준 집합**이다 — 그때는 기준을 하나 더 세운다.

### `rogueGateway` v2 확장 (channel 쪽)

기존 `rogueGateway(opts: { welcome: boolean })` 를 v2 핸드셰이크로 옮기고 손잡이를 더한다.

```ts
// challenge: 서버 증명 갈래
//   'valid'   유효 (스텁이 k_srv 를 안다 — 즉 진짜 서버와 같은 능력)
//   'omit'    server_proof 필드 없음
//   'wrong'   64자 hex 인데 값이 틀림
//   'short'   길이가 틀림
//   'other-room'  유효한 증명 + room_id 만 다른 값
//   'echoed'  ★ 받은 hello 의 pub·client_nonce 로 만들 수 있는 최선을 시도한다.
//             이 갈래가 §1.1 의 상대다 — 나머지 다섯과 달리 «만들 수 있는 것을 만든다».
//             AC-GWAUTH2-006 이 네 변형(HMAC(pub,·) · HMAC(client_nonce,·) · sha256(pub) · pub 자신)을 돈다.
// deferChallenge: true 이면 hello 에 즉시 답하지 않는다. 테스트가 pushChallenge() 로 시점을 고른다.
function rogueGateway(opts: {
  challenge?: 'valid' | 'omit' | 'wrong' | 'short' | 'other-room' | 'echoed'
  echoVariant?: 'hmac-pub' | 'hmac-nonce' | 'sha256-pub' | 'pub'
  deferChallenge?: boolean
  welcome?: boolean
})
// 접근자 (AC 가 실제로 쓰는 것 전부):
//   readHello()      — hello 에서 읽은 { pub, client_nonce }. AC-006 이 «위조자가 실제로 읽었다» 를 단언한다
//   authSeen()       — 채널이 보낸 auth 프레임들. AC-008 이 «증명 전에는 비어 있다» 를 단언한다
//   pushChallenge()  — 지금 challenge 를 보낸다 (deferChallenge 짝)
//   pushEnv(inner)   — 자기가 아는 열쇠로 봉투를 만들어 보낸다 (valid 갈래에서만 유효하다).
//                      내부적으로 envOf(…, cb='unbound', seq, inner) 를 쓴다 — 이 스텁은 평문이므로
//                      cb 가 'unbound' 이고, 그래서 세션 유도에서 cb 를 뺀 구현(변이 V)이 여기서 갈린다
//   pushRaw(frame)   — 봉투 없이 그대로 보낸다. AC-014 의 «봉투 아님» 갈래
//   readIds()        — 나가는 permission_request 에서 읽은 request_id 들
//   set challenge(v) — 접속 도중에 갈래를 바꾼다 (AC-011 이 1단계 → 2단계 전환에 쓴다)
```

`challengeProof`/`authSig` 의 토큰은 하네스 상수 `'tok'`, 방·봇은 기존 스텁과 같은 `1`·`2`, **`cb` 는 리터럴 `'unbound'`** 다. `gateway-client.test.ts` 쪽 하네스의 토큰 상수는 `'tok123'` 이며 **두 하네스는 이름도 상수도 공유하지 않는다**.

### `relayMitm` 하네스 (신규 — **AC-GWAUTH2-013 · 024** 가 쓴다)

**[HARD] 이 귀속은 3회차에 정정됐다.** 2회차는 이 머리글을 «013 만 쓴다» 로, `tlsRelayMitm` 머리글을 «022·024 가 쓴다» 로 적었는데, AC-024 의 본문은 **평문 전송**이므로 실제로 쓰는 것은 이 하네스다(2회차 감사 G-06). **본문이 옳고 두 머리글이 낡아 있었다.**

```ts
// 진짜 서버 앞에 서서 채널의 접속을 받아 진짜 서버로 이어 붙인다. 전송은 평문 ws:// 다.
// 핸드셰이크 프레임(hello · challenge · auth · welcome 봉투)은 양방향으로 글자 그대로 중계한다 —
// 고치지 않는다. 그래서 양쪽 모두 정상적으로 확립된다.
// inject(frame) 이 호출되면 채널 쪽 소켓으로 그 프레임을 밀어 넣는다 (봉투 없이, 또는 자기가 지어낸 봉투로).
function relayMitm(upstreamPort: number): {
  port(): number
  relayedFrames(): unknown[]      // 중계한 프레임 — «고치지 않고 흘렸다» 를 단언하는 데 쓴다
  inject(frame: unknown): void
  injectForgedEnv(seq: number, inner: unknown): void   // 아무 열쇠로나 만든 mac 을 실은 봉투
  readIds(): string[]             // 중계한 나가는 permission_request 에서 읽은 request_id 들 (AC-013)
  // ↓ AC-024 의 관측 표면. 평문이므로 양쪽 소켓 모두 TLSSocket 이 아니고 둘 다 'unbound' 를 돌려준다.
  //   두 함수를 하네스가 지는 이유: 「양쪽 다 바인딩을 얻지 못했다」가 AC-024 의 전제이므로,
  //   그 전제 자체가 관측되지 않으면 «상대가 이겼다» 의 원인을 다른 것으로 오독할 수 있다.
  channelBinding(): string        // 채널↔중계자 연결에 대해 채널이 계산한 cb
  serverBinding(): string         // 중계자↔서버 연결에 대해 서버가 계산한 cb
  // 채널이 REQ-GWAUTH2-020 의 공시를 낸 stderr 줄. 채널은 이 하네스에서 프로세스 안에 있으므로
  // 자식 프로세스 파이프가 아니라 process.stderr.write 를 vitest 스파이로 가로채 모은다.
  stderrLines(): string[]
}
```

**[HARD] 이 절이 정의하는 접근자가 AC 가 실제로 쓰는 것 전부다.** 2회차는 AC-024 가 `channelBinding()`·`serverBinding()`·`stderrLines` 를 쓰면서 어느 하네스에도 정의하지 않았고, AC-013 은 `relay.readIds()` 를 부르면서 `readIds()` 를 `rogueGateway` 에만 정의해 두었다. **관측 표면이 미정의면 구현자가 임의로 정하고, 그러면 이 절의 자기 선언이 거짓이 된다.**

### `tlsRelayMitm` 하네스 (신규 — **AC-GWAUTH2-022 만** 쓴다)

**[HARD] 이 상대는 «약화된 대역» 이 아니라 진짜 중계자다.** 무엇을 빠뜨리지도, 망가뜨리지도, 흉내내지도 않는다 — **진짜 채널과 진짜 서버 사이에서 진짜 전사를 글자 그대로 전달한다.** `SPEC-GWAUTH-001` 을 무너뜨린 것이 그 반대(필요한 것을 다 쥐고도 쓰지 않기로 한 위조자)였으므로, «닫혔다» 를 주장하는 이 자리에서는 능력을 깎지 않는다.

```ts
// TLS 를 양쪽에서 종단하는 중계자. 연결이 둘이므로 채널 바인딩 값도 둘이다 — 그것이 관측 대상이다.
//   C ──TLS 연결 1── relay ──TLS 연결 2── S
// 핸드셰이크 네 프레임(hello · challenge · auth · welcome 봉투)을 양방향으로 그대로 흘린다.
// 고치는 것이 하나도 없다는 사실을 relayedFrames() 로 단언한다.
function tlsRelayMitm(upstream: { host: string; port: number }): {
  port(): number
  relayedFrames(): { dir: 'up' | 'down'; frame: unknown }[]
  // 두 연결의 바인딩 값. 다르다는 것이 이 방어의 뿌리이므로 하네스가 노출해 단언한다
  bindingToChannel(): string
  bindingToServer(): string
  close(): Promise<void>
}
```

**TLS 종단 서버를 시험 안에서 세운다.** `Fastify({ https: { key, cert } })` 로 앱을 만들고 그 위에 `createGateway` 를 얹으면 `app.server` 가 `https.Server` 가 되어 업그레이드된 소켓이 TLS 소켓이 된다 — **생산 코드를 고치지 않고** `cb` 가 실재하는 조건을 만들 수 있다(Fastify 5.12.1, 이 나무에서 확인). 인증서는 `server/test/fixtures/` 의 자체 서명 쌍을 쓰고, 채널 쪽은 그 인증서를 신뢰 목록에 넣어 붙는다.

> **[HARD] 그 fixture 는 시험 전용 폐기 열쇠다.** 파일 머리에 `@MX:WARN` 으로 그 사실을 적고, 어떤 생산 경로도 그것을 읽지 않는다. **fixture 가 없으면 이 기준들은 건너뛰지 않고 실패한다** — 건너뛰기는 이 프로젝트가 금지한 형태다(방어를 지워도 초록인 자리를 만든다).
>
> **[HARD] 자체 서명 쌍을 버전 관리에 커밋하는 것은 운영자가 승인했다** (3회차 결정). `@MX:WARN` 과 «없으면 실패» 설계는 그대로 둔다. 승인과 함께 **위험 경계 넷을 여기 적는다** — 2회차 감사 G-13 이 «적혀 있지 않다» 로 잡은 자리이며, **적으라는 것이지 닫으라는 것이 아니다.**
>
> 1. **«어떤 생산 경로도 읽지 않는다» 는 지금 강제되지 않는 가정이다.** AC-GWAUTH2-021 ②는 `channel/src` 의 `node:fs` import 만 재고, `server/src` 쪽은 재지 않는다. 이 SPEC 의 자기 기준(«방어를 지워도 통과하는 기준을 두지 않는다»)으로는 미달이며, **그 미달을 닫지 않고 적는다** — 재는 기준을 새로 세우면 이 라운드가 또 형제를 낳는다(2회차 감사 §9-5). `t23` 이 서버 쪽 인증서 경로를 열 때 함께 세울 자리다.
> 2. **생성 파라미터가 정해져 있지 않다.** 알고리즘·유효기간·SAN 가운데 무엇도 적혀 있지 않은데, **채널이 그 인증서를 신뢰 목록에 넣어 붙어야 하므로 SAN 이 어긋나면 AC-022·024 가 방어와 무관하게 거짓 실패한다.** run 착수 시 `plan.md` §D-10 이 값을 정하고 그 값을 fixture 머리 주석에 적는다. **SAN 에 `localhost` 와 `127.0.0.1` 둘 다 필요하다** — 하네스가 어느 이름으로 붙을지 이 문서가 고정하지 않았기 때문이다.
> 3. **개인키 커밋에 대한 비밀 스캐너·리뷰 봇의 반응이 정해져 있지 않다.** 경보가 뜨면 무엇으로 잠재울지(경로 예외 등록인지, 경보를 남긴 채 `@MX:WARN` 을 근거로 넘길지)를 run 이 겪는 자리에서 정하고 `progress.md` §E.2 에 적는다. **미리 정하지 않는 이유: 어느 도구가 무엇을 볼지 이 패스가 확인하지 않았고, 확인하지 않은 것으로 처방을 쓰지 않는다.**
> 4. **재생성 시점이 없다.** 만료되면 AC-022·024 가 방어와 무관하게 붉어진다. 유효기간을 길게 잡는 것이 완화이지 해소가 아니며, **만료 시 무엇이 붉어지는지를 아는 것 자체가 이 항목의 값어치다.**

### 서버 소켓 프레임 기록 (신규 — **AC-GWAUTH2-004** 가 쓴다)

**[HARD] AC-004 의 Given 이 부르는 «양방향 프레임 기록» 의 관측 표면이다** — 4회차 감사 J-02 가 «부르는 자리만 있고 정의가 없다» 고 잡은 자리이며, 3회차가 닫은 G-06(미정의 관측 표면)의 재발을 닫는다. **이 절이 정의하는 것은 표면이고, 그것을 만드는 것은 `plan.md` §F M4 다.**

```ts
// 하네스가 소유한 진짜 서버의 소켓 하나를 관측한다. 기록하는 끝은 서버 쪽이다 —
// 채널은 자기 소켓을 하네스에 내주지 않으므로(channel/src/index.ts 의 wire() 는 PRESERVE 다),
// 서버가 받는 것과 서버가 보내는 것이 곧 «그 소켓을 오간 프레임» 전부다.
function recordSocket(socket: WebSocket): {
  sentFrames(): unknown[]      // 서버 → 채널 — 파싱한 프레임, 전선에 나간 순서 그대로
  receivedFrames(): unknown[]  // 채널 → 서버 — 같은 형태
  rawSent(): string[]          // 같은 두 방향의 전선 원문 — JSON 으로 파싱되지 않은 전송까지 놓치지 않는다
  rawReceived(): string[]      //   (파싱분만 두면 프레임 «밖» 실림 — 비(非)JSON 프레임 — 이 관측에서 빠진다)
}
```

- **무엇을 기록하는가**: 두 방향 전부, **전선 순서대로**, 파싱한 프레임과 전선 원문 **둘 다**. 원문을 함께 두는 이유는 ㉠ 의 «그 소켓을 오간 것» 이 파싱 성공분만을 뜻하지 않기 때문이다.
- **붙는 곳**: 하네스가 소유한 진짜 서버(`createGateway`)가 받은 연결의 소켓. 그 지점을 여는 기계적 방법(게이트웨이가 접속을 노출할지, 시험이 그 위에 관측층을 얹을지)은 M4 가 고른다 — **이 절이 고정하는 것은 무엇을 기록하는가와 어느 끝에서 기록하는가다.** **[M4 이행 기록] M4 가 고른 방법은 `createGateway` opts 의 `onConnection?` 콜백이다** — 생산 경로는 넘기지 않고(옵션 없으면 무동작), 하네스가 그 콜백으로 받은 소켓에 `recordSocket()` 을 붙인다(server/test/gateway-v2.ts).
- **누가 쓰는가**: AC-GWAUTH2-004 하나다. `relayMitm` 의 `relayedFrames()` 는 중계자가 본 흐름이므로 대체가 아니다 — AC-004 는 중계자 없는 소켓을 재고, 그 차이가 S-01 의 «양방향» 논거다.
- **[HARD] 이 절이 정의하는 접근자가 AC-004 가 실제로 쓰는 것 전부다.** 구현 도중 AC 가 여기 없는 접근자를 부르기 시작하면 이 절에 먼저 정의한다 — 관측 표면이 미정의면 구현자가 임의로 정의하고, 그러면 이 절의 자기 선언이 거짓이 된다(2회차 감사 G-06, 4회차 감사 J-02).

### 이력 축 관측의 표준 형태 (모든 부정 기준이 이 형태를 쓴다)

```ts
let settled: 'pending' | 'resolved' | 'rejected' = 'pending'
const p = gw.requestHistory({ limit: 10 })
p.then(() => { settled = 'resolved' }, () => { settled = 'rejected' })
await waitFor(() => stub.sent.some(m => m.type === 'history_request'), 'history_request 도착')
const rid = () => (stub.sent.find(m => m.type === 'history_request') as { rid: string }).rid
// … 위조 프레임을 민다 …
await settle()
expect(settled).toBe('pending')      // 해소되지도 거부되지도 않았다
```

**`'pending'` 을 재는 것이 핵심이다.** `'rejected'` 를 기대하면 «연결 없음» 거부와 «게이트가 막았다» 를 구분하지 못한다.

---

## 수용 기준 매트릭스

| 기준 | 요구사항 | 파일 | `it()` 이름 |
|---|---|---|---|
| AC-GWAUTH2-001 | REQ-GWAUTH2-003 | `server/test/gateway.test.ts` | `an invite stores only a verifier and a confirm key, never the token or its hash` |
| AC-GWAUTH2-002 | REQ-GWAUTH2-005 | 같음 | `the server looks the bot up by its verifier and closes on an unknown pub` |
| AC-GWAUTH2-003 | REQ-GWAUTH2-004 | `channel/test/transport-auth.test.ts` | `hello carries exactly a pub and a client nonce, and no plaintext token` |
| AC-GWAUTH2-004 | REQ-GWAUTH2-011 | `server/test/gateway.test.ts` | `no frame in either direction carries the token, the private key or the confirm key` |
| AC-GWAUTH2-005 | REQ-GWAUTH2-005 | 같음 | `the challenge proof is bound to both nonces, the room, the bot and the pub` |
| AC-GWAUTH2-006 | REQ-GWAUTH2-006 | `channel/test/transport-auth.test.ts` | `a rogue that reads the hello cannot forge a challenge from what it read` |
| AC-GWAUTH2-007 | REQ-GWAUTH2-007 | 같음 | `a challenge from a stub that holds the confirm key establishes the session` |
| AC-GWAUTH2-008 | REQ-GWAUTH2-008 | 같음 | `no auth signature leaves the channel before the server has proved itself` |
| AC-GWAUTH2-009 | REQ-GWAUTH2-009 | `server/test/gateway.test.ts` | `a client holding only what the database stores cannot register as the bot` |
| AC-GWAUTH2-010 | REQ-GWAUTH2-009, 010 | 같음 | `a signature made for another handshake is refused` |
| AC-GWAUTH2-011 | REQ-GWAUTH2-010 | `channel/test/transport-auth.test.ts` | `both nonces are regenerated per socket and a replayed challenge is refused` |
| AC-GWAUTH2-012 | REQ-GWAUTH2-006, 016 | 같음 | `a malformed or wrong-length proof is refused without throwing` |
| AC-GWAUTH2-013 | REQ-GWAUTH2-012, 014 | `channel/test/gateway-mutual-auth.test.ts` | `a relaying man in the middle passes the handshake and still injects nothing` |
| AC-GWAUTH2-014 | REQ-GWAUTH2-014 | `channel/test/transport-auth.test.ts` | `an envelope with a broken mac, and a frame with no envelope, are both dropped` |
| AC-GWAUTH2-015 | REQ-GWAUTH2-013, 014 | 같음 | `a replayed envelope is dropped because its sequence has already been used` |
| AC-GWAUTH2-016 | REQ-GWAUTH2-013 | `server/test/gateway.test.ts` | `the sequence starts at one per socket and rises by exactly one per frame` |
| AC-GWAUTH2-017 | REQ-GWAUTH2-015 | `channel/test/transport-auth.test.ts` | `the three gates are separate: each mutation breaks a different set` |
| AC-GWAUTH2-018 | REQ-GWAUTH2-017 | `server/test/gateway.test.ts` | `a v1 hello carrying a plaintext token is not welcomed and the socket closes` |
| AC-GWAUTH2-019 | REQ-GWAUTH2-006, 016 | `channel/test/transport-auth.test.ts` | `the entry point closes a rejected socket, says one line on stderr and nothing on stdout` |
| AC-GWAUTH2-020 | REQ-GWAUTH2-001, 002, 012 | `channel/test/gateway-mutual-auth.test.ts` · `gateway-client.test.ts` | `the real server and the real channel agree end to end, envelope included` |
| AC-GWAUTH2-021 | REQ-GWAUTH2-018 | (경계 확인) | — |
| AC-GWAUTH2-022 | REQ-GWAUTH2-019, 021 | `channel/test/gateway-mutual-auth.test.ts` | `a real relay terminating tls on both sides cannot take over the bot session` |
| AC-GWAUTH2-023 | REQ-GWAUTH2-012, 014 | 같음 | `a history response from the real server arrives inside an envelope and resolves` |
| AC-GWAUTH2-024 | REQ-GWAUTH2-020 | 같음 | `on an unbound transport the same relay does take over, and the channel says so` |

---

## AC-GWAUTH2-001 — 초대는 검증자와 확인 열쇠만 저장한다

**Given** 서버를 띄우고 `seedRoom()`·`seedBot()` 으로 방과 봇을 만든다.
**When** `POST /api/rooms/:id/invites` 로 초대를 발급하고, 응답의 평문 토큰 `T` 와 저장된 `bot_tokens` 행을 함께 읽는다.
**Then** 넷이 동시에 성립한다.

```
expect(Object.keys(row).sort()).not.toContain('token_hash')   // 컬럼 자체가 없다 (PRAGMA table_info 로 잰다)
expect(row.verifier_pub).toBe(pubOf(T))                        // 저장된 검증자가 T 에서 유도한 pub 과 정확히 같다
expect(row.server_confirm_key).toBe(ksrvOf(T).toString('hex')) // 확인 열쇠도 마찬가지
const dump = JSON.stringify(row)
expect(dump.includes(T)).toBe(false)                           // 평문 토큰이 없다
expect(dump.includes(createHash('sha256').update(T).digest('hex'))).toBe(false)  // v1 해시도 없다
```

`token_hash` 의 부재는 **행의 키가 아니라 스키마**로 잰다(`PRAGMA table_info(bot_tokens)`) — 행에 값이 없는 것과 컬럼이 없는 것은 다르고, REQ-GWAUTH2-003 이 요구하는 것은 후자다.

**이 기준을 무너뜨리는 변이**: `token_hash` 컬럼을 남긴다 / 검증자 대신 `sha256(T)` 를 새 컬럼 이름으로 저장한다 / 개인키 씨앗을 함께 저장한다 / 평문 토큰을 저장한다.

## AC-GWAUTH2-002 — 서버는 검증자로 조회하고, 모르는 `pub` 에는 닫는다

**Given** 서로 다른 두 방·봇 짝의 토큰 `T1`·`T2` 를 발급하고 서버를 띄운다.
**When** ① `pubOf(T1)` 으로 `hello` 를 보낸다 ② `pubOf(T2)` 로 보낸다 ③ 발급된 적 없는 64자 hex 로 보낸다.
**Then** ①·②는 각각 자기 방·봇의 `challenge` 를 받고 그 `room_id`·`bot_id` 가 **서로 다르며**, ③은 어떤 프레임도 받지 못하고 소켓이 닫힌다.

두 토큰을 한 테스트에서 대조하는 것이 이 기준의 핵심이다 — 방·봇을 상수로 답하는 구현은 한 토큰만 볼 때 통과한다. **`room_id`·`bot_id` 가 조회 결과에서 온다는 것**을 재려면 두 짝이 필요하다.

**이 기준을 무너뜨리는 변이**: 조회를 건너뛰고 `hello` 가 실어 보낸 값으로 답한다 / 모르는 `pub` 에도 `challenge` 를 보낸다 / 조회 실패에 소켓을 열어 둔다.

## AC-GWAUTH2-003 — 나가는 `hello` 에 평문 토큰이 없다

**Given** `rogueGateway({ deferChallenge: true })` 를 띄우고 `wire()` 로 붙인다.
**When** `hello` 가 스텁에 도착한다.
**Then** `Object.keys(hello).sort()` 가 `['client_nonce','pub','type']` 과 `toEqual` 로 같고, `hello.client_nonce` 가 `/^[0-9a-f]{64}$/` 를, `hello.pub` 이 `/^[0-9a-f]{64}$/` 를 만족하며, `hello.pub` 이 `pubOf('tok')` 과 `toBe` 로 같다.

**키 집합 전체를 `toEqual` 로 재는 것이 이 기준의 본체다.** `hello.token === undefined` 만 재면 다른 이름의 필드로 토큰이 실려도 통과한다 — v1 이 정확히 그 자리에서 눈을 감았다(§「검증 원칙」 3번).

**[HARD] 이 기준이 재는 것은 `hello` 한 종류뿐이다.** `challenge`·`auth`·`env` 의 키 집합은 **AC-GWAUTH2-004 ㉡** 이 잰다 — 이 하네스는 `deferChallenge: true` 라 그 세 종류가 아예 존재하지 않으므로 여기서는 잴 수 없다. **두 자리의 `hello` 기대 키 집합이 갈리면 그것 자체가 결함이므로 한쪽을 고칠 때 다른 쪽을 함께 본다.** 3회차까지 `design.md` 는 이 기준 하나가 세 프레임의 `cb` 부재까지 지킨다고 적었고 그 문장은 거짓이었다(3회차 감사 H-02).

**이 기준을 무너뜨리는 변이**: `hello` 에 `token` 을 남긴다 / 진단용으로 토큰 앞 8자를 싣는다 / `pub` 대신 `sha256(T)` 를 보낸다(64자라 정규식은 통과하지만 `pubOf` 대조가 잡는다).

## AC-GWAUTH2-004 — **양방향** 어떤 프레임도 세 비밀을 싣지 않고, **프레임 키 집합이 고정된다**

**[HARD] 이 기준이 `SPEC-GWAUTH-001` 의 S-01 을 종결한다.** 그 SPEC 의 AC-GWAUTH-003 은 제목이 «어떤 프레임도» 였으나 본문은 **받은** 프레임만 쟀고, 그 차이가 «나가는 `hello` 가 평문 토큰을 싣는다» 는 구멍을 가렸다(sync 보고 S-01, High). 여기서는 제목을 좁히는 대신 **본문을 양방향으로 넓힌다** — v2 에서는 나가는 방향도 실제로 비밀을 싣지 않기 때문이다.

**Given** 서버를 띄우고 유효한 토큰 `T` 로 접속해 핸드셰이크를 마치고 재전송 메시지까지 받는다. **`recordSocket()` 하네스(§「공통 테스트 하네스」)가 그 소켓을 오간 프레임을 양방향 모두 기록한다.**
**When** 보낸 프레임과 받은 프레임을 **모두** `JSON.stringify` 로 이어 붙인다. 봉투의 `payload` 는 이미 문자열이므로 그 내용도 함께 검사된다. **그리고 기록된 프레임 목록에서 `hello`·`challenge`·`auth`·`env` 를 종류별로 하나씩 꺼낸다.**
**Then** ㉠ 그 문자열이 아래 목록 가운데 어느 것도 포함하지 않고, ㉡ `hello`·`challenge`·`auth`·`env` 의 키 집합이 각각 아래와 정확히 같다.

```
// ㉠ 비밀 부재 — 포함 검사
expect(all.includes(T)).toBe(false)                                  // 평문 토큰
expect(all.includes(ksrvOf(T).toString('hex'))).toBe(false)          // 서버 확인 열쇠
expect(all.includes(skSeedHex(T))).toBe(false)                       // 서명 개인키 씨앗
expect(all.includes(createHash('sha256').update(T).digest('hex'))).toBe(false)  // v1 해시

// ㉡ 키 집합 고정 — REQ-GWAUTH2-021 («cb 를 프레임에 실어서는 안 된다») 을 재는 자리
expect(Object.keys(helloFrame).sort()).toEqual(['client_nonce','pub','type'])
expect(Object.keys(challengeFrame).sort()).toEqual(['bot_id','room_id','server_nonce','server_proof','type'])
expect(Object.keys(authFrame).sort()).toEqual(['signature','type'])
expect(Object.keys(envFrame).sort()).toEqual(['mac','payload','seq','type'])
```

**[HARD] ㉡ 이 REQ-GWAUTH2-021 을 전선 위 네 종류에 대해 재는 자리다.** AC-GWAUTH2-003 도 같은 성질을 재지만 **`hello` 한 종류에 대해서만** 잰다 — 그 한정을 여기 적는 것이 이 문단의 절반이다. 3회차까지 이 문서의 키 집합 단언은 AC-GWAUTH2-003 의 `hello` 하나뿐이었고, `design.md` 는 그 하나가 «세 프레임 어디에도 `cb` 가 없다» 를 함께 지킨다고 적고 있었다 — **재는 것보다 넓게 말하는 문장**이었으며 3회차 감사 H-02 가 그것을 반증했다. 여기서 좁히는 대신 **재는 범위를 문장에 맞춘다.**

**[HARD] 봉투 `payload` 안의 내부 프레임은 이 기준이 재지 않는다.** ㉡ 의 `envFrame` 기대값은 `['mac','payload','seq','type']` 이고 `payload` 는 **문자열 한 칸**이므로(`design.md` §B.2), 그 문자열이 직렬화한 내부 프레임 — `welcome`·`message`·`permission_verdict`·`history_response` 등 — 이 어떤 키를 갖든 이 단언은 무관하다. **㉠ 도 이 자리를 메우지 못한다** — ㉠ 의 포함 목록은 네 비밀뿐이고 `cb` 는 그 목록에 **일부러 없다**(`spec.md` §2.8 — `cb` 를 싣지 않는 이유는 기밀이 아니라 **대체 가능성**이다). 그러므로 서버가 내부 프레임에 `cb` 필드를 붙이면 REQ-GWAUTH2-021 의 문언을 위반하는데 **㉠ 도 ㉡ 도 붉지 않는다 — 이 라운드는 그 층을 재지 않으며, 그 사실을 숨기지 않고 여기 적는다.**

**내부 프레임 종류별 키 집합 단언을 세우지 않은 것은 의도된 선택이다.** 기대값이 종류 수만큼 생기고, 그 벌들은 한쪽만 고쳐질 때 낡는다 — 이 카드가 네 라운드 겪은 형태다. 실질 위험이 작다는 근거는 `cb` 대체가 쓸모 있으려면 핸드셰이크 시점에 전달돼야 하는데 내부 프레임은 확립 **이후**라는 것이다. **그러나 그것은 재지 않는 이유이지, 재지 않은 것을 재었다고 말해도 되는 이유가 아니다.**

**[HARD] 이 「네 종류」 목록은 `welcome` 을 봉투에 넣는다는 결정에 걸려 있다.** `design.md` §B.2 가 `welcome` 을 봉투 안에 두므로 전선 위 종류는 `hello`·`challenge`·`auth`·`env` 넷이다. `design.md` §G 2번이 그 결정을 M2 에서 되돌릴 수 있다고 적으므로, 되돌리면 `welcome` 이 **다섯째 바깥 종류**가 되고 이 목록과 AC-GWAUTH2-016 의 `[1,2,3,4]` 가 **함께 낡는다.** 되돌림의 결합 자리 셋은 `design.md` §G 2번에 적혀 있다.

**[HARD] `toEqual` 이라는 것이 이 단언의 본체다 — «`cb` 가 없다» 를 직접 재지 않는다.** `expect(frame.cb).toBeUndefined()` 는 `cb_hint`·`binding` 같은 다른 이름으로 실린 값을 놓친다. 키 집합 전체를 고정하면 **이름을 무엇으로 붙이든 여분의 필드가 하나라도 있으면 붉어진다.** 그래서 이 단언은 «`cb` 를 실어 보내고 **받은 값을 쓰는**» 구현(변이 U)뿐 아니라 «**실어 보내되 자기 값을 쓰는**» 구현(변이 U2 — 오늘 당장은 기능이 같아서 어떤 기능 기준도 잡지 못하지만 대체 통로를 열어 둔다)도 잡는다. **후자를 잡는 기준이 이 문서에 없었다는 것이 3회차 감사 H-02 의 절반이다.**

**왜 새 기준을 세우지 않고 이 기준을 넓혔는가.** `challenge`·`auth`·`env` 의 키 집합을 재려면 **핸드셰이크를 끝까지 돌고 봉투까지 오간 소켓의 프레임 기록**이 필요한데, AC-GWAUTH2-003 의 하네스는 `rogueGateway({ deferChallenge: true })` 라 `challenge` 를 보내지 않는다 — 그래서 `auth` 도 `env` 도 존재하지 않고, **AC-003 은 넓힐 수 없다.** 반면 이 기준의 Given 은 이미 진짜 서버에 붙어 재전송까지 받고 **양방향 프레임을 전부 기록**하므로, 필요한 관측 대상의 표면은 **하네스 절이 정의한다**(`recordSocket()` — 만드는 것은 M4 다). 새 기준을 세우면 그 Given 을 글자 그대로 한 벌 더 두게 되고, **같은 하네스의 두 벌은 한쪽만 고쳐질 때 낡는다** — 이 카드가 세 라운드 겪은 형태다. 하나의 관측(«전선 위에 무엇이 있는가»)을 두 방향(부재·집합)으로 재는 것이므로 Given 과 When 도 갈리지 않는다.

**`hello` 를 여기서도 재는 것은 중복이 아니라 자족이다.** AC-GWAUTH2-003 은 `hello` 하나를 **아무 답도 오지 않은 상태에서** 재고 — 그래서 «서버가 무엇을 보내든 무관하게 첫 프레임이 이미 안전한가» 를 잰다 — 이 기준은 위 네 종류를 **핸드셰이크가 끝까지 돈 소켓의 전체 수명에서** 잰다. 다만 두 자리의 `hello` 키 집합이 갈리면 그것 자체가 결함이므로, 한쪽을 고칠 때 다른 쪽을 함께 본다.

이 자리의 ㉠ 은 예외적으로 포함 검사를 쓴다 — 재는 것이 «없음» 이고, 부재를 재는 데는 포함 검사가 정확하다. 네 값 모두 64자 이상 hex 또는 그에 준하는 길이라 우연 일치는 실질적으로 없다.

**`pub` 은 이 목록에 없다.** 공개값이며 `hello` 가 싣는 것이 설계다(§2.3). 그것을 비밀 목록에 넣으면 이 기준이 정상 구현에서 실패한다.

**이 기준을 무너뜨리는 변이**: `hello` 에 토큰을 되돌린다(변이 S) / `challenge` 에 확인 열쇠를 진단용으로 붙인다 / 봉투의 `payload` 에 열쇠를 넣는다 / 서명 대신 개인키 씨앗을 보낸다 / **`cb` 를 프레임에 실어 보내고 받은 값을 쓴다(변이 U)** / **`cb` 를 프레임에 실어 보내되 자기 값을 쓴다(변이 U2 — 전선 위 네 종류에 실었을 때 ㉡ 만이 잡는다)** / **`challenge` 에 진단용 필드를 하나 더 붙인다(㉡ 의 `toEqual` 이 잡는다)**.

## AC-GWAUTH2-005 — `challenge` 증명은 두 논스·방·봇·`pub`·`cb` 에 묶인다

**Given** 두 토큰 `T1`·`T2` 로 서버를 띄운다.
**When** 각각으로 접속해 `challenge` 를 받는다. 이어서 `T1` 으로 **`client_nonce` 만 바꿔** 한 번 더 접속한다.
**Then** 각 `challenge.server_proof` 가 테스트가 독립 계산한 `challengeProof(T, client_nonce, server_nonce, room_id, bot_id, 'unbound')` 와 **정확히 같고**(`toBe`), 두 접속의 증명이 서로 다르며, **같은 토큰·방·봇이라도 `client_nonce` 가 바뀌면 증명이 달라진다.** 그리고 두 접속의 `server_nonce` 가 서로 다르다.

`client_nonce` 만 바꿔 한 번 더 재는 것이 이 기준의 본체다 — **채널의 논스가 전사에 실제로 들어가는가**를 재며, 서버 논스만 서명하는 구현이 여기서 잡힌다.

**[HARD] 여섯째 인자 `'unbound'` 가 이 기준을 요소 ④의 측정 지점으로 만든다.** 이 하네스의 서버는 평문 `ws://` 이므로 구현이 계산하는 `cb` 도 `'unbound'` 이고, 따라서 **§2.5 를 따른 정상 구현은 `toBe` 를 통과한다.** 반대로 **`challenge` 전사에서 `cb` 를 빼는 구현은 `|unbound` 접미가 없는 문자열을 HMAC 하므로 여기서 붉어진다**(변이 Z1). 2회차는 이 인자가 없어 정반대였다 — 정상 구현이 거짓 실패하고 `cb` 없는 구현이 통과했다(2회차 감사 G-03).

**이 기준을 무너뜨리는 변이**: 전사에서 `client_nonce` 를 뺀다 / `pub` 을 뺀다 / **`cb` 를 뺀다(변이 Z1)** / `room_id`·`bot_id` 를 뺀다 / 열쇠를 `server_confirm_key` 가 아닌 값으로 바꾼다 / 상수 문자열을 싣는다 / `server_nonce` 를 소켓 밖 클로저에서 재사용한다.

## AC-GWAUTH2-006 — **`hello` 를 받는 자리의 상대는 자기가 읽은 것으로 증명을 만들지 못한다**

**[HARD] 이것이 이 SPEC 의 중심 기준이다.** `SPEC-GWAUTH-001` 이 열다섯 기준으로 재지 못한 바로 그 상대이고, `.moai/state/verify/t15-sync/probe-token-echo.mts` 를 vitest 로 옮긴 것이다. **위조자는 «만들 수 있는 것을 만들지 않기로 한» 상대가 아니라, 자기가 실제로 읽은 값으로 만들 수 있는 최선을 시도하는 상대다.**

**Given** `rogueGateway({ challenge: 'echoed', echoVariant: V, deferChallenge: true })` 를 띄우고 `wire()` 로 붙인다. `V` 는 아래 **다섯**을 순회한다 — `it.each` 로 **다섯 번 돈다.**

| `echoVariant` | 위조자가 만드는 `server_proof` | 왜 이것을 시도하는가 |
|---|---|---|
| `hmac-pub` | `HMAC(pub, 전사)` | `pub` 은 `hello` 에서 받은 값이다. v1 이라면 이것이 통했다 |
| `hmac-nonce` | `HMAC(client_nonce, 전사)` | 받은 다른 값을 열쇠로 시도 |
| `sha256-pub` | `sha256(전사 \|\| pub)` | 해시 기반 시도 |
| `pub` | `pub` 자신 (64자 hex 라 형식 검사를 통과한다) | 형식만 맞으면 통과하는 구현을 잡는다 |
| **`oracle`** ★ | **계산하지 않는다 — 진짜 서버에 물어본다.** 하네스가 뒤에 진짜 `createGateway` 를 세우고, 위조자가 읽은 `pub`·`client_nonce` 를 그대로 실어 그 서버에 `hello` 를 보낸 뒤 **돌아온 `challenge` 를 글자 그대로 채널에 넘긴다** | **[HARD] 1회차 감사 F-02 가 잡은 공백이다.** 앞의 넷은 전부 **지역 계산**이며, 그것만 두면 이 기준의 상대는 «네트워크가 닿는데 쓰지 않기로 한» 위조자가 된다 — `SPEC-GWAUTH-001` 을 무너뜨린 바로 그 형태다. **네트워크가 닿는 위조 종단의 최선은 서버에 물어보는 것**이고, 그 갈래는 `k_srv` 를 끝까지 필요로 하지 않는다 |

**[HARD] `oracle` 갈래의 기대 관측은 나머지 넷과 다르다.** 이 갈래에서 채널이 받는 `server_proof` 는 **진짜**이므로, 바인딩이 서지 않는 연결(시험 하네스는 평문 `ws://` 다)에서는 **② 게이트를 통과한다.** 그것이 이 갈래가 문서화하는 사실이다 — 주입 0건을 세우는 것은 ②가 아니라 **③(봉투 `mac`)** 이며, 위조자는 `k_srv` 가 없어 봉투를 만들지 못한다. `spec.md` §5 표 `오라클중계·평문` 행의 근거가 그것과 일치한다 — **그 행의 게이트웨이 사칭 칸이 «아니다 — 봉투는 `k_srv` 를 요구한다» 이다.** (2회차는 여기에 «셋째 행» 을 적었고, 표가 8행이 된 뒤 그 서수는 우연히 참으로 남아 있었다. 우연을 의도로 두지 않는다.)

**When** 아래 순서로 진행한다. **순서가 하네스의 본체다** — 요청 프레임은 소켓이 열려 있는 동안 나가야 스텁이 읽을 수 있다.

1. `expect(stub.readHello()).toEqual({ pub: pubOf('tok'), client_nonce: expect.stringMatching(/^[0-9a-f]{64}$/) })` — **위조자가 hello 를 실제로 읽었음을 먼저 단언한다.** 이 단언이 없으면 이 기준은 다시 «읽지 않기로 한 위조자» 를 재게 된다.
2. 세션이 `sendRequest(client, REQ)` 로 승인 요청을 발신한다 → 스텁이 그 프레임에서 진짜 `request_id` 를 읽는다.
3. `gw.requestHistory({ limit: 10 })` 를 표준 형태대로 걸고 `history_request` 도착까지 기다려 스텁이 `rid` 를 읽는다.
4. 스텁이 `pushChallenge()` 로 **위조 `challenge`** 를 보내고, 이어서 ① 사칭 채팅 ② 2번에서 읽은 진짜 id 의 `permission_verdict` ③ 3번에서 읽은 `rid` 의 `history_response` 를 민다 — **봉투 없이 그대로**(위조자는 `k_sess` 를 유도하지 못하므로 봉투를 만들 수 없다. 그 사실 자체가 관측이다).
5. `await settle()`.

**Then** **다섯 갈래 모두**에서 주입 셋이 0건이다.

```
expect(notes).toEqual([])          // 사칭 채팅 주입 0건
expect(verdicts).toEqual([])       // 판정 주입 0건
expect(settled).toBe('pending')    // 이력 오염 0건
```

그리고 **서명 축은 갈래에 따라 기대값이 갈린다.** 이 분기 자체가 이 기준의 관측이다 — 어느 게이트가 무엇을 막았는지를 매 실행마다 기록한다.

```
// 지역 계산 넷 — ② 가 막았으므로 서명이 나가지 않았다
expect(stub.authSeen()).toEqual([])            // hmac-pub · hmac-nonce · sha256-pub · pub

// oracle — 증명이 진짜이므로 ② 를 통과했고, 서명이 나갔다.
// 주입 0건을 세운 것은 ② 가 아니라 ③ 이라는 사실이 이 한 줄에 기록된다.
expect(stub.authSeen().length).toBe(1)         // oracle
```

**[HARD] `oracle` 갈래의 마지막 줄을 «`toEqual([])` 이어야 한다» 로 고쳐서는 안 된다.** 그렇게 고치면 이 기준은 다시 «약한 위조자만 재는» 자리로 돌아가고, `spec.md` §5 1행의 근거(«②가 막는다»)가 거짓인 채로 초록이 된다. 이 갈래는 **방어가 없다는 것을 재는 것이 아니라 어느 방어가 일했는지를 재는 것**이다.

**이 기준이 재는 것은 이 SPEC 의 ②·③ 두 게이트이며, 갈래가 그 둘을 가른다.** ③(`!established`)을 지워도(변이 N3) ①·②가 먼저 반환하므로 이 기준은 통과한다 — §「검증 원칙」 4번의 표가 그 분리다.

**이 기준을 무너뜨리는 변이**: 서버 증명 대조를 `if (false)` 로 바꾼다 / 증명이 없으면 통과시키는 하위 호환 갈래를 넣는다 / 열쇠를 `k_srv` 대신 `pub` 으로 유도한다(**`hmac-pub` 갈래가 정확히 이것을 잡는다**) / 형식 확인만 하고 값을 대조하지 않는다(`pub` 갈래가 잡는다).

## AC-GWAUTH2-007 — 확인 열쇠를 쥔 스텁의 `challenge` 는 세션을 확립한다

**AC-GWAUTH2-006 의 짝이다.** 이 기준이 없으면 «모든 challenge 를 거절하는 구현» 이 006 의 네 갈래를 전부 통과한다.

**Given** `rogueGateway({ challenge: 'valid', deferChallenge: true })` — 스텁은 `readHello()` 의 값과 자기 `k_srv`(= `ksrvOf('tok')`)로 `challengeProof(…, 'unbound')` 를 계산해 싣고, 그 뒤 프레임을 **`envOf(…, 'unbound', seq, inner)` 봉투로** 보낸다.

**[HARD] 이 기준이 세션 열쇠 축에서 요소 ④를 잰다.** 스텁의 `sessKey` 는 `cb` 를 담으므로, **세션 열쇠 유도에서만 `cb` 를 빼는 구현**(변이 V)은 스텁과 다른 `k_sess` 를 얻고 그 봉투의 `mac` 대조에 실패한다 — 아래 Then 의 네 줄이 전부 붉어진다. **2회차의 V 예측 «하나도 없다» 는 헬퍼에 `cb` 가 없었기 때문에 성립한 값이었고, 헬퍼가 고쳐진 지금은 성립하지 않는다**(변이표 V 행이 재도출됐다).
**When** 006 과 **완전히 같은 5단계**를 밟는다(같은 순서, 같은 세 프레임).
**Then** **확립의 귀결**을 잰다.

```
expect(stub.authSeen().length).toBe(1)             // 증명이 통과했으므로 서명이 나갔다
expect(notes.length).toBe(1)
expect(verdicts.map(v => v.params)).toEqual([{ request_id: REQ.request_id, behavior: 'allow' }])
await waitFor(() => settled !== 'pending', '이력 해소')
expect(settled).toBe('resolved')
```

006 과 007 이 **같은 5단계를 쓰는 것**이 이 짝의 핵심이다. 다른 순서를 쓰면 두 결과의 차이가 증명 때문인지 순서 때문인지 가를 수 없다.

**`onWelcome` 을 단언하지 않는다** — 이 하네스는 `wire()` 이고 `wire()` 는 `onWelcome` 을 배선하지 않는다. 통과 충실성은 AC-GWAUTH2-020 (나) 가 잰다.

**이 기준을 무너뜨리는 변이**: 모든 `challenge` 를 거절한다 / 유효한 증명에도 거절 플래그를 세운다 / 전사의 순서를 바꾼다 / 봉투를 통과시키지 않는다.

## AC-GWAUTH2-008 — 서버가 자신을 증명하기 전에는 서명이 나가지 않는다

**Given** `rogueGateway({ challenge: 'omit', deferChallenge: false })` 와, 별도로 `rogueGateway({ deferChallenge: true })`(아무 답도 하지 않는 스텁).
**When** 각각에 붙고 `settle()` 을 기다린다.
**Then** 두 경우 모두 `expect(stub.authSeen()).toEqual([])` 이고, 스텁이 받은 프레임 종류가 `['hello']` 뿐이다(`expect([...new Set(stub.sent.map(m => m.type))]).toEqual(['hello'])`).

**두 번째 스텁(아무 답도 하지 않는다)이 이 기준의 절반이다.** 첫 번째만 두면 «거절 갈래에서 서명을 안 보낸다» 만 재고, «아직 답이 오지 않은 동안에도 안 보낸다» 를 재지 못한다.

**이 기준을 무너뜨리는 변이**: `open` 직후 `hello` 와 `auth` 를 함께 보낸다 / 증명 대조 결과와 무관하게 서명을 보낸 뒤 나중에 소켓을 닫는다.

## AC-GWAUTH2-009 — **DB 가 저장한 것만 쥔 클라이언트는 봇으로 등록되지 못한다**

**[HARD] 이 기준이 검증자 저장(요소 ②)을 잰다.** 컬럼 이름이 바뀌었는지가 아니라 **저장된 값이 사칭에 충분한지**를 잰다.

**Given** 진짜 서버를 띄우고 초대를 발급한다. 테스트는 `bot_tokens` 행을 읽어 `verifier_pub` 과 `server_confirm_key` 만 손에 넣는다 — **평문 토큰 `T` 는 이 하네스가 쓰지 않는다**(읽기 전용 유출 상대를 흉내낸다).
**When** 그 두 값만으로 만든 클라이언트가 서버에 붙어 ① 올바른 `hello`(`pub` 은 알고 있다)를 보내고 ② `challenge` 를 받아 `server_proof` 를 **검증에 성공**한 뒤(확인 열쇠를 갖고 있으므로 성공한다 — 그 사실 자체를 단언한다) ③ `auth` 서명을 만들려 시도한다. 시도할 수 있는 최선은 `pub` 자신, `server_confirm_key` 로 만든 HMAC, 그리고 128자 난수 hex 셋이다.
**Then** 세 시도 모두에서 서버가 그 소켓을 등록하지 않는다.

```
expect(gw.isOnline(roomId, botId)).toBe(false)     // 등록되지 않았다
expect(framesFromServer).toEqual([challengeFrame]) // welcome 도 재전송도 오지 않았다
await waitFor(() => sock.readyState === WebSocket.CLOSED, '소켓 닫힘')
// 그리고 이 상대가 서버 증명 검증에는 성공한다 — 절반의 능력을 갖고 있음을 명시적으로 관측한다
expect(verifiedServerProof).toBe(true)
```

**마지막 줄이 이 기준을 정직하게 만든다.** 그 상대가 «아무것도 못 한다» 가 아니라 «게이트웨이 방향은 되고 봇 방향은 안 된다» 를 기준이 매 실행마다 문서화한다(`spec.md` §5 표 `DB읽기만` 행). **이 한 줄을 지우면 이 기준은 §5 를 다시 과장하게 된다.**

**[HARD] 이 기준이 REQ-GWAUTH2-002(«`k_srv` 와 서명 키쌍은 서로를 복원할 수 없는 독립 유도여야 한다»)도 함께 잰다 — 그 연결을 여기 적는다.** 이 하네스가 상대에게 쥐여 주는 것이 정확히 `verifier_pub` 과 `server_confirm_key` 둘뿐이므로, **한쪽에서 다른 쪽을 유도할 수 있는 구현이면 그 상대가 `auth` 서명을 만들어 내고 이 기준의 첫 줄이 붉어진다.** 즉 REQ-002 는 별도의 기준이 아니라 **이 상대의 무능력으로 관측된다**(변이 AA). 3회차까지 이 연결이 어느 문서에도 적혀 있지 않아 REQ-002 는 이름으로 잡는 기준이 0개였고, 3회차 감사 H-02 가 그것을 들었다. **관측이 전이적이라는 사실 자체를 적는 것이 처방이다** — 전이적 관측을 적지 않으면 다음 라운드는 그것을 미측정으로 읽는다.

**이 기준을 무너뜨리는 변이**: 서명 검증을 건너뛰고 `hello` 조회만으로 등록한다(v1 의 구조다) / 검증자 대신 대칭 비밀을 저장하고 그것으로 서명을 흉내낸다 / `auth` 없이도 `welcome` 을 보낸다 / **`sk` 씨앗을 `k_srv` 에서 유도한다(변이 AA — REQ-GWAUTH2-002 위반)**.

## AC-GWAUTH2-010 — 다른 핸드셰이크의 서명은 거절된다

**Given** 진짜 서버를 띄우고 유효한 토큰 `T` 로 **두 번** 접속한다. 첫 접속의 전사에 대한 유효한 서명 `sig1` 을 기록한다.
**When** 두 번째 접속에서 `sig1` 을 그대로 재생해 `auth` 로 보낸다.
**Then** 서버가 등록하지 않고 소켓을 닫는다(`isOnline` 이 `false`, `welcome` 없음). 그리고 같은 두 번째 접속에서 **그 접속의 전사로 새로 만든 서명**(`authSig(T, cn2, sn2, room, bot, 'unbound')`)을 보내면 정상적으로 등록된다(양성 짝을 같은 테스트에서 잰다).

양성 짝을 같은 테스트에 두는 이유는 §「검증 원칙」 1번이다 — 없으면 «모든 서명을 거절하는 구현» 이 통과한다.

**[HARD] 그 양성 짝이 `auth` 전사 축에서 요소 ④를 잰다.** 하네스가 `cb` 를 담아 서명하므로, **`auth` 전사에서 `cb` 를 빼는 서버**(변이 Z2)는 `auth|…|pub` 을 검증 메시지로 쓰고 하네스의 `auth|…|pub|unbound` 서명을 거절한다 — **양성 짝이 붉어진다.** 같은 변이를 AC-GWAUTH2-022 가 «중계자가 이긴다» 쪽에서 잡으므로 **Z2 는 두 기준에 걸린다**(변이표).

**이 기준을 무너뜨리는 변이**: 전사에서 `server_nonce` 를 뺀다 / **`cb` 를 뺀다(변이 Z2 — 양성 짝이 붉어진다)** / `server_nonce` 를 소켓 밖 클로저에 보관해 재사용한다 / 서명 검증을 형식 확인으로 바꾼다.

## AC-GWAUTH2-011 — 두 논스가 소켓마다 새로 만들어지고, 재생된 `challenge` 는 거절된다

`it(..., { timeout: 20000 })`.

**Given** `rogueGateway({ challenge: 'valid' })` 를 띄우고 붙여 확립한다. 첫 소켓의 `client_nonce1`·`server_nonce1` 과 그 소켓에 보낸 `proof1` 을 기록한다. 확립 뒤 채팅·판정 프레임을 봉투로 하나씩 밀어 `notes`·`verdicts` 가 각 1건이 되게 한다(양성 기준선).
**When** 스텁이 그 소켓을 `terminate()` 하고, 채널이 백오프 뒤 다시 붙는다. 스텁은 **두 번째 소켓에 `proof1` 을 그대로 재생한다**(새 논스로 다시 계산하지 않는다). 그 뒤 채팅 프레임과 판정 프레임을 하나씩 민다.
**Then** 두 번째 `hello` 의 `client_nonce2` 가 `client_nonce1` 과 다르고, `settle()` 뒤 `notes.length` 와 `verdicts.length` 가 **재접속 이전 값 그대로 각 1**이다 — 즉 두 번째 소켓은 확립되지 않았다.

`notes` 를 함께 재는 이유: 판정 축만 재면 발신 집합 대조가 먼저 버려서 이 게이트의 유무를 구분하지 못한다. 채팅 축에는 그 대조가 걸리지 않으므로 **이 게이트만이 막을 수 있는 값**이다.

**이 기준을 무너뜨리는 변이**: `client_nonce` 를 `connect()` 바깥 클로저 변수로 올린다(그러면 두 값이 2로 는다) / 서버 논스를 프로세스 지역으로 올린다.

## AC-GWAUTH2-012 — 형식이 어긋난 증명은 예외 없이 거절된다

**[HARD] 이 기준의 판정 축은 «상대» 가 아니라 «강건성» 이다 — 그 사실을 먼저 적는다.** 아래 갈래들의 위조자는 **§1.1 이 명명한 상대보다 엄격히 약하다**: 전부 «만들 수 있는 것을 만들지 않기로 한» 형태이며, 그것이 `SPEC-GWAUTH-001` 을 무너뜨린 부류다. **그러므로 이 기준은 배제 주장을 지지 않는다.** 이 상대 부류에 대한 배제 주장은 AC-GWAUTH2-006 의 `echoed`·`oracle` 갈래가 진다. 여기서 재는 것은 **형식이 어긋난 입력에 대해 구현이 예외 없이 판정을 내리고 살아남는가**이며, 주입 0건 단언은 그 강건성의 부수 관측이지 배제의 증거가 아니다. **이 문단을 지우면 이 기준은 즉시 공허해진다** — 약한 상대를 재면서 강한 상대를 배제했다고 읽히기 때문이다.

**Given** `rogueGateway` 를 여섯으로 순회한다(`it.each`) — `challenge: 'wrong'`(64자, 첫 글자만 뒤집음) · `'short'`(`'ab'` 두 글자) · `'omit'`(필드 없음) · `'other-room'`(유효한 증명 + `room_id` 만 `9`) · **`'bad-nonce'`**(유효한 증명 + `server_nonce` 가 `'zz'` — hex 가 아니다) · **`'pipe-nonce'`**(유효한 증명 + `server_nonce` 가 `` `${sn}|9|9` `` — **구분자를 값에 넣는다**). `collectUnhandled()` 와 `collectUncaught()` 를 건다.
**When** 006 과 같은 5단계.
**Then** 여섯 갈래 모두 `notes` `[]` · `verdicts` `[]` · `settled === 'pending'` 이고, **처리되지 않은 거부가 `[]`, 잡히지 않은 예외가 `[]`** 이며, 클라이언트가 계속 살아 재접속한다.

`'short'` 갈래가 재는 것은 **길이 가드가 대조보다 먼저 있는가**이다 — `timingSafeEqual` 은 길이가 다르면 예외를 던진다. `'wrong'` 이 첫 글자만 뒤집는 것은 접두 비교로 구현된 대조를 잡기 위해서다. `'other-room'` 은 증명이 «어떤 challenge 가 왔다» 만 인증하고 «그 challenge 가 무엇을 말하는가» 는 인증하지 않는 구현을 잡는다.

**뒤의 두 갈래가 1회차 감사 F-08 을 닫는다.** `'bad-nonce'` 는 REQ-GWAUTH2-006 의 형식 조항이 실재하는지를 재고, `'pipe-nonce'` 는 **`spec.md` §2.5 의 구분자 단일성 논증을 직접 잰다** — 형식 검사가 없으면 `server_nonce` 에 `|` 를 넣어 전사를 다시 쪼갤 여지가 생기고, 그 논증은 강제되지 않는 가정 위에 서게 된다. 두 갈래 모두 **거절되고 예외를 던지지 않아야** 한다.

**`===` 로 대조한 구현은 이 기준을 통과한다** — 예외를 던지지 않기 때문이다. 그 한계는 §0-3 에 적었고 그 자리는 코드 리뷰가 지킨다.

**이 기준을 무너뜨리는 변이**: 길이 확인 없이 `timingSafeEqual` 을 부른다 / 대조를 존재 확인으로 바꾼다 / 채널이 프레임의 `room_id` 대신 자기가 기대하는 상수로 다시 계산한다.

## AC-GWAUTH2-013 — **중계형 중간자는 핸드셰이크를 통과시키고도 아무것도 주입하지 못한다**

**[HARD] 이것이 확립 후 프레임 인증(요소 ③)을 재는 기준이며, 「핸드셰이크만 고치면 된다」를 반증한다.** 이 상대는 위조하지 않는다 — **중계한다.**

**Given** 진짜 서버(`createGateway`)를 띄우고, 그 앞에 `relayMitm(realPort)` 를 세운다. 진짜 채널(`wire()`)을 **중간자의 포트**에 붙인다. 중간자는 `hello`·`challenge`·`auth`·`welcome` 을 **글자 그대로** 양방향 중계한다.
**When** 아래 순서로 진행한다.

1. 핸드셰이크가 중계로 완료된다. **`expect(relay.relayedFrames().map(f => f.type))` 이 `['hello','challenge','auth','env']` 를 포함한다** — 중간자가 프레임을 고치지 않고 흘렸음을 단언한다.
2. 진짜 서버가 그 방에 그 봇을 타깃으로 하는 메시지를 하나 넣는다 → 정상 경로가 산다(양성 기준선).
3. 세션이 승인 요청을 발신하고, 중간자가 나가는 프레임에서 진짜 `request_id` 를 읽는다.
4. 중간자가 셋을 밀어 넣는다 — ① `inject()` 로 **봉투 없는** 사칭 채팅 ② `injectForgedEnv(seq, …)` 로 **자기가 지어낸 mac 을 실은 봉투**에 담은 그 id 의 `permission_verdict{behavior:'allow'}` ③ 같은 형태의 `history_response`.
5. `await settle()`.

**Then** 다섯 관측이 동시에 성립한다.

```
expect(notes.map(n => n.content)).toEqual([진짜 서버가 넣은 본문])   // 2번은 살고 4번-①은 죽었다
expect(verdicts).toEqual([])                                       // 위조 판정 0건
expect(settled).toBe('pending')                                    // 이력 오염 0건
expect(relay.readIds()).toEqual([REQ.request_id])                  // 중간자가 진짜로 id 를 읽었다
// 그리고 위조가 id 를 소진하지 않았다 — 진짜 판정이 뒤이어 도착하면 중계된다
expect(verdictsAfterRealDeny.map(v => v.params)).toEqual([{ request_id: REQ.request_id, behavior: 'deny' }])
```

그리고 **이력 축의 양성 짝을 같은 소켓에서 이어 잰다** — 부정 단언 `settled === 'pending'` 은 «프레임이 아예 오지 않아도» 초록이므로, 그것만으로는 **`history_response` 경로에 봉투가 씌워졌는지를 전혀 재지 못한다**(1회차 감사 F-03).

```
// 4번의 위조 시도 뒤, 진짜 서버가 그 rid 에 대한 history_response 를 봉투에 담아 보내게 한다
await waitFor(() => settled !== 'pending', '진짜 이력 응답 해소')
expect(settled).toBe('resolved')
```

**이 두 줄이 없으면 `sendToConn` 경로가 봉투를 빠뜨려도 이 기준은 초록이다.**

**첫 줄과 마지막 줄이 이 기준을 짝 없이 완결시킨다.** 첫 줄은 «정상 경로를 통째로 끊은 구현» 을 배제하고(진짜 메시지는 도착해야 한다), 마지막 줄은 «위조가 먼저 도착해 id 를 소진하는» 선착 판정 승리(`SPEC-GWAUTH-001` §1.1 세 번째 갈래)가 닫혔음을 잰다.

**중간자가 `k_sess` 를 유도하지 못하는 것이 이 방어의 뿌리다** — 두 논스는 보지만 `k_srv` 를 모른다(§2.5).

**이 기준을 무너뜨리는 변이**: 봉투 검사를 지운다 / `mac` 검사를 존재 확인으로 바꾼다 / 봉투 아닌 프레임도 받아들인다 / `k_sess` 를 두 논스만으로 유도한다(**중간자가 두 논스를 알므로 이 변이에서 주입이 성공한다 — 이 기준의 가장 값어치 있는 갈래다**).

## AC-GWAUTH2-014 — mac 이 어긋난 봉투와, 봉투 아닌 프레임이 모두 버려진다

**Given** `rogueGateway({ challenge: 'valid' })` 로 확립한다(스텁은 `k_srv` 를 안다).
**When** 확립 후 셋을 순회한다(`it.each`) — ① `payload` 문자열의 **한 글자만** 바꾼 봉투 ② `mac` 을 지운 봉투 ③ `pushRaw()` 로 **봉투 없이** 보낸 `message`·`permission_verdict`·`history_response`.
**Then** 세 갈래 모두 `notes` `[]` · `verdicts` `[]` · `settled === 'pending'` 이고, 그 직후 **유효한 봉투를 보내면 정상 도착한다**(같은 소켓에서 양성을 이어 잰다).

한 글자만 바꾸는 것이 의도적이다 — 접두 비교나 길이 비교로 구현된 대조를 잡는다. **③이 «봉투 아님» 을 재는 유일한 자리이며**, 그것이 없으면 «봉투가 오면 검사하고 안 오면 그냥 통과» 하는 구현이 나머지를 전부 통과한다.

**이 기준을 무너뜨리는 변이**: `mac` 을 파싱된 객체를 다시 직렬화한 문자열로 계산한다(정규화 어긋남 — §2.6) / 봉투가 아닌 프레임에 예전 경로를 남긴다 / `mac` 비교를 접두 n자로 한다.

## AC-GWAUTH2-015 — 재생된 봉투는 순번이 이미 쓰였기 때문에 버려진다

`it(..., { timeout: 20000 })`.

**Given** `rogueGateway({ challenge: 'valid' })` 로 확립하고, 유효한 봉투로 판정 프레임 하나를 보내 `verdicts` 가 1건이 되게 한다. 그 봉투 원문을 기록한다.
**When** ① 같은 봉투를 **글자 그대로** 다시 보낸다 ② `seq` 를 직전 값보다 하나 작게 만든 유효한 봉투를 보낸다 ③ 그 뒤 `seq` 를 정상적으로 증가시킨 유효한 봉투를 보낸다.
**Then** `settle()` 뒤 ①·② 뒤의 `verdicts.length` 가 **1 그대로**이고, ③ 뒤에 2 가 된다.

③이 없으면 «모든 봉투를 두 번째부터 버리는 구현» 이 통과한다. **세 단계가 한 기준인 이유**는 «재생 거절» 과 «정상 진행» 이 같은 검사의 두 면이기 때문이다.

**이 기준을 무너뜨리는 변이**: `seq` 를 싣기만 하고 검사하지 않는다 / 비교를 `!==` 로 해서 되돌아간 값을 받아들인다 / `seq` 상태를 소켓 밖 클로저에 올린다(그러면 재접속 후 정상 프레임이 버려져 다른 기준이 먼저 붉어진다).

## AC-GWAUTH2-016 — 순번은 소켓마다 1 에서 시작해 프레임마다 정확히 1 증가한다

**Given** 진짜 서버를 띄우고, 재전송 대상 메시지 셋을 미리 심어 둔 방에 유효한 토큰으로 접속한다.
**When** 핸드셰이크 후 도착하는 봉투를 전부 모은다. 그 뒤 소켓을 끊고 **다시** 붙어 같은 관측을 반복한다.
**Then** 첫 접속의 `seq` 배열이 `[1,2,3,4]` 와 `toEqual` 로 같고(`welcome` + 재전송 3), **두 번째 접속의 배열도 `[1,2,3,4]`** 다 — 즉 소켓 사이에서 이어지지 않는다.

배열 전체를 `toEqual` 로 재는 이유는 §「검증 원칙」 3번이다. `seq > 0` 만 재면 상수 1 을 싣는 구현이 통과한다.

**이 기준을 무너뜨리는 변이**: `seq` 를 상수로 만든다 / 2 씩 증가시킨다 / 카운터를 서버 프로세스 지역으로 올린다(두 번째 배열이 `[5,6,7,8]` 이 된다) / 0 에서 시작한다.

## AC-GWAUTH2-017 — 세 게이트는 분리되어 있다

**Given** §「검증 원칙」 4번의 구조가 구현에 있다.
**When** run 단계가 변이 **N1 · N2 · N3 · O** 를 하나씩 넣고 스위트를 돌린 뒤 되돌린다. 되돌린 뒤 `git diff` 가 비어 있음을 매번 확인한다.
**Then** 네 변이가 **서로 다른 `AC-GWAUTH2-*` 집합**을 무너뜨리고, 특히 **N3 은 이 SPEC 의 기준을 하나도 무너뜨리지 않으며**, **O 를 넣은 뒤 N3 을 다시 넣으면 그 기대값이 뒤집힌다.**

**[HARD] 이 기준의 통과 조건은 위 Then 의 세 단언뿐이다** — 집합 상이 · N3 공집합 · O 반전. 아래 「변이표」의 예측 열은 run 단계가 실측 열로 **교체**하며, **교체 후의 표는 기록이지 통과 조건이 아니다.** `SPEC-GWAUTH-001` 이 예측을 통과 조건으로 삼았다가 13행 중 7행이 어긋났고(sync 감사 F-03), 이 문서의 초판은 그 결함을 없앤 자리에 «교체 후의 표가 통과 조건이다» 를 넣어 **자기충족적 조건으로 옮겨 놓았다**(1회차 감사 F-06) — 실측이 실측과 어긋날 방법은 없다. 표가 채워졌는지는 Definition of Done 이 별도 항목으로 지고, 이 기준은 **반증 가능한 세 구조 단언만** 진다.

**이 기준을 무너뜨리는 변이**: 세 플래그를 하나로 합친다 / 검사 순서를 바꾼다 / ①·②를 `else if` 로 체인 안에 끼운다.

## AC-GWAUTH2-018 — v1 형태의 `hello` 는 환영받지 못한다

**Given** 진짜 서버를 띄우고 유효한 토큰 `T` 를 발급한다.
**When** ① `{ type:'hello', token: T }` 를 보낸다(v1 형태) ② `{ type:'hello', token: T, nonce: <64자 hex> }` 를 보낸다(v1 최종 형태) ③ `{ type:'hello', pub: pubOf(T) }` 를 보낸다(`client_nonce` 없음).
**Then** 세 경우 모두 어떤 프레임도 오지 않고 소켓이 닫히며, `gw.isOnline(roomId, botId)` 가 `false` 다.

**이 기준이 하향 협상을 막는다.** 옛 경로가 살아 있으면 공격자는 v1 채널을 흉내내 평문 토큰을 되받는 경로로 내려가면 되고, v2 의 요소 ①이 무의미해진다(REQ-GWAUTH2-017).

**이미 발급된 토큰의 무효화도 이 기준이 함께 문서화한다** — `bot_tokens` 에 `verifier_pub` 이 없는(= v1 시절에 발급된) 행은 조회 자체가 성립하지 않으므로 어떤 형태의 `hello` 로도 붙지 못한다.

**이 기준을 무너뜨리는 변이**: 옛 `hello` 갈래를 «호환을 위해» 남긴다 / `pub` 이 없으면 `token` 으로 대체 조회한다 / `client_nonce` 없이도 `challenge` 를 보낸다.

## AC-GWAUTH2-019 — 거절은 소켓을 닫고 stderr 한 줄만 낸다

**Given** `rogueGateway({ challenge: 'omit' })`(지연 없음 — 붙는 즉시 거절당해야 한다)를 띄우고, `spawnChild([DIST], { MINIDISCORD_TOKEN: 'tok', MINIDISCORD_SERVER: 'ws://127.0.0.1:<port>/bot' })` 로 자식 프로세스를 띄운다.
**When** 자식이 붙어 거절당하고 백오프 뒤 다시 붙기를 두 번 이상 반복할 만큼 기다린다(`waitFor(() => stub.connections() >= 2, …)`).
**Then** ① 스텁이 관측한 접속 수가 2 이상이다 ② 자식의 **stdout 이 빈 문자열**이다 ③ stderr 의 비어 있지 않은 줄 수가 **접속 수와 같다** ④ 자식 프로세스가 살아 있다(`proc.exitCode === null`).

③이 «정확히 한 줄» 이 아니라 «접속당 한 줄» 인 이유: 거절은 소켓마다 일어나고 재접속은 정상 동작이므로, 총량을 상수로 못 박으면 정상 구현이 타이밍에 따라 거짓 실패한다.

**이 기준을 무너뜨리는 변이**: 거절 시 `process.exit` 한다(④가 잡는다) / 진단을 `console.log` 로 낸다(②가 잡는다 — MCP 전송 통로가 깨진다) / 거절 후 소켓을 닫지 않는다(①이 잡는다) / 예외를 던진다(④가 잡는다).

## AC-GWAUTH2-020 — 진짜 서버와 진짜 채널이 종단간에 합의한다

**(가) 왕복** — `channel/test/gateway-mutual-auth.test.ts`.

**Given** `server/src/gateway.ts` 의 `createGateway` 로 실제 서버를 띄우고 `invite()` 로 실제 토큰을 발급한 뒤, `channel/src/index.ts` 의 `wire()` 로 실제 채널을 그 주소에 붙인다. **스텁도 흉내도 없다.**
**When** 핸드셰이크가 돌고, 서버가 그 방에 그 봇을 타깃으로 하는 메시지를 하나 넣는다.
**Then** 그 메시지가 **세션 알림으로 도착하고**(`waitFor(() => notes.length === 1)`), 알림의 `content` 가 서버가 넣은 본문을 담는다.

**확립되지 않으면 그 메시지가 도착할 수 없으므로**(REQ-GWAUTH2-014 가 미확립 소켓의 프레임을 버린다), 「메시지가 도착했다」가 「양쪽이 열쇠 유도·전사·봉투 규칙 전부에 합의했다」의 충분한 관측이다.

**(나) 통과 충실성** — `channel/test/gateway-client.test.ts`.

**Given** 그 파일의 `startServer()` 하네스와 `connected(srv, { onWelcome: w => got.push(w) })` — 이 파일만이 `createGatewayClient` 를 직접 쓰고 콜백을 노출한다. 토큰 상수는 `'tok123'` 이다.
**When** 서버 스텁이 v2 핸드셰이크를 마치고 `welcome` 프레임을 **봉투에 담아** 보낸다.
**Then** `got.length === 1` 이고 `expect(got[0]).toEqual(inner)` — **봉투가 벗겨진 내부 프레임이 통째로 그대로** 넘어간다.

**(가)가 §「검증 원칙」 5번의 마지막 항목이 말한 유일한 기준이다.** 열쇠 유도·전사·MAC 규칙이 서버와 채널에 **각각** 존재하므로, 한쪽이 규칙을 바꾸면 단위 기준들은 **각자의 규칙 안에서 전부 초록으로 남는다.**

**이 기준을 무너뜨리는 변이**: 한쪽의 유도 라벨을 바꾼다(`'minidiscord/v2/sign'` → 다른 문자열) / 한쪽의 구분자를 `\|` 에서 `:` 로 바꾼다 / 한쪽의 전사 순서를 바꾼다 / `onWelcome` 에 봉투를 그대로 넘긴다 / 내부 프레임의 필드를 골라 새 객체로 넘긴다. **다섯 다 단위 기준은 전부 통과하고 이 기준만 실패한다.**

## AC-GWAUTH2-021 — 범위 경계

**Given** `plan.md` §C 사전 점검이 기록한 `spec_base_sha`, 그리고 구현이 착지한 커밋 `impl_head`(run 단계가 `progress.md` §E.2 에 기록한다).
**When** `git diff --name-only <spec_base_sha>..<impl_head>` 를 낸다.
**Then** 목록이 아래 집합 안에 든다.

```
server/src/gateway.ts
server/src/routes-bots.ts
server/src/db.ts
channel/src/gateway-client.ts
server/test/gateway.test.ts
server/test/gateway-v2.ts                     ← M6 실측 개정 — 리드 승인(2026-08-30) — M4 가 신설한 공용 v2 하네스(skOf·connectV2·innerOf·recordSocket)
server/test/web-permission-contract.test.ts   ← 봉투로 깨지는 형제 하네스
server/test/permissions.test.ts               ← M1 실측 개정 — 리드 승인(2026-08-30)
server/test/messages.test.ts                  ← M1 실측 개정 — 리드 승인(2026-08-30)
server/test/room-members.test.ts              ← M1 실측 개정 — 리드 승인(2026-08-30)
server/test/rooms-bots.test.ts                ← M1 실측 개정 — 리드 승인(2026-08-30)
channel/test/transport-auth.test.ts
channel/test/gateway-client.test.ts
channel/test/gateway-mutual-auth.test.ts
channel/test/permission-relay.test.ts
channel/test/index-wiring.test.ts
channel/test/channel-server.test.ts
server/test/fixtures/**                       ← 이 SPEC 이 생성을 처방한 TLS 자체 서명 쌍
.moai/specs/**
.moai/reports/**
.moai/state/verify/**
README.md
CHANGELOG.md
```

**[HARD] 측정 끝점을 `HEAD` 가 아니라 `impl_head` 에 고정한다.** 이 기준은 회귀 대상이 아니라 **이 카드 한 번의 경계 확인**이므로, 끝점을 움직이는 `HEAD` 로 두면 경계와 무관한 뒤 커밋(sync 단계의 증거·보고서 커밋, 이 문서 자신의 개정)이 들어올 때마다 이미 통과한 판정이 다시 붉어진다. `SPEC-GWAUTH-001` 이 그 어긋남을 겪고 AC-GWAUTH-014 를 같은 형태로 고쳤다(v0.5.0, sync 2차 감사 G-02).

**형제 테스트 파일 일곱을 미리 넣어 둔 이유**: v2 는 프레임 형식을 세 군데에서 바꾸므로 그 하네스들이 **반드시** 깨진다. 허용 집합에 없으면 지시받은 작업을 수행하는 순간 이 기준이 붉어진다 — `SPEC-GWAUTH-001` 이 증거 커밋에서 겪은 모순과 같은 부류이며, 미리 넣어 없앤다. **다만 이 일곱은 `plan.md` §C 사전 점검의 실측으로 확정되며, 지금 값은 §3.3 의 판독에서 온 예상이다.**

**M1 실측 개정(2026-08-30, 리드 승인)**: §C 실측이 v1 저장 계약·프로토콜을 재는 넷(`permissions`·`messages`·`room-members`·`rooms-bots`)이 허용 집합 **밖**에서 붕괴분으로 깨지는 것을 관측했고(`progress.md` §E.2.3 귀속표가 근거 원문), 리드가 그 넷의 추가를 승인했다. **이 넷 밖의 추가 넓힘은 다시 요청으로 온다** — 몰래 넓히지 않는다.

**[HARD] `server/test/fixtures/**` 는 실측으로 확정되는 항목이 아니라 이 SPEC 이 «만들라» 고 처방한 항목이다.** §C 사전 점검의 실측은 **깨지는 것**을 찾지 **만들 것**을 찾지 않으므로, 그 실측이 아무리 정확해도 이 경로는 목록에 나타나지 않는다. **두 종류를 가르지 않으면 이 기준은 자기가 막겠다고 선언한 모순을 자기가 재현한다** — 2회차가 정확히 그랬다(`plan.md` §D-10 과 위 하네스 절이 fixture 생성을 처방해 놓고 허용 집합에 넣지 않아, **지시받은 작업을 수행하는 순간 이 기준이 붉어지는** 상태였다. 2회차 감사 G-02). **그러므로 이 문서가 생성을 처방하는 경로는 처방과 같은 라운드에 허용 집합에 들어간다.**

그리고 ① `server/package.json`·`channel/package.json` 의 `dependencies` 블록이 base 와 동일하다(새 의존성 없음) ② `channel/src` 아래 어떤 파일도 `node:fs` 를 import 하지 않는다 ③ `bot_tokens` 스키마 변경이 `verifier_pub`·`server_confirm_key` 추가와 `token_hash` 제거 셋뿐이다.

**이 기준은 회귀 대상이 아니다** — 이 문서에서 유일하게 vitest 밖에 있다. ②만은 vitest 안의 형제 기준이 이미 매번 재고 있다.

## AC-GWAUTH2-022 — **TLS 를 종단하는 진짜 중계자는 봇 세션을 가져가지 못한다**

**[HARD] 이것이 채널 바인딩(요소 ④)을 재는 기준이며, 1회차 감사 F-01 을 종결한다.** 상대는 위조자가 아니라 **중계자**다 — 진짜 채널과 진짜 서버 사이에서 진짜 전사를 그대로 전달한다. 그 상대가 이기는 것이 F-01 이었다.

**Given** `Fastify({ https: … })` 위에 `createGateway` 로 **TLS 를 종단하는** 진짜 서버를 띄우고 `invite()` 로 진짜 토큰을 발급한다. 그 앞에 `tlsRelayMitm({ host, port })` 를 세운다. 진짜 채널(`wire()`)을 **중계자의 포트**에 `wss://` 로 붙인다.
**When** 핸드셰이크가 중계로 진행된다. 중계자는 `hello`·`challenge`·`auth` 를 **글자 그대로** 전달한다.
**Then** 다섯이 동시에 성립한다.

```
// ① 중계자가 정말로 전달만 했다 — 능력을 깎지 않았음을 단언한다
//    (본문 개정 — 리드 승인 2026-08-30: REQ-GWAUTH2-006 에 따라 클라이언트가 relayed challenge 를
//     거절하므로 auth 는 나가지 않는다. 초안의 ['hello','auth'] 는 ② 와 자기 모순이었다)
expect(relay.relayedFrames().filter(f => f.dir === 'up').map(f => f.frame.type))
  .toEqual(['hello'])
expect(relay.relayedFrames().filter(f => f.dir === 'down').map(f => f.frame.type))
  .toEqual(['challenge'])          // welcome 은 오지 않는다 — 등록이 거절되기 때문이다

// ② 두 연결의 바인딩 값이 다르다 — 이 방어의 뿌리
expect(relay.bindingToChannel()).not.toBe(relay.bindingToServer())
expect(relay.bindingToChannel()).toMatch(/^[0-9a-f]{64}$/)
expect(relay.bindingToServer()).toMatch(/^[0-9a-f]{64}$/)

// ③ 서버가 그 소켓을 봇으로 등록하지 않았다 — 클라이언트가 relayed challenge 를 거절해 auth 가 나가지 않았다
expect(gw.isOnline(roomId, botId)).toBe(false)

// ④ 채널도 확립하지 않았다 — 중계된 challenge 가 채널 쪽 cb 로 대조에 실패한다
expect(notes).toEqual([])

// ⑤ 양성 짝: 같은 TLS 서버에 중계자 없이 직접 붙으면 정상 확립된다
//    이것이 없으면 «모든 TLS 접속을 거절하는 구현» 이 통과한다
await waitFor(() => directNotes.length === 1, '직접 접속의 정상 경로')
expect(gw.isOnline(roomId, botId)).toBe(true)
```

**⑤가 이 기준의 절반이다.** 중계자가 막히는 것과 아무도 못 붙는 것은 관측이 같으므로, 양성 짝을 **같은 테스트에서** 재지 않으면 이 기준은 «TLS 에서 전부 실패하는 구현» 에 초록이다.

**②를 단언하는 이유**: ③·④만 재면 «중계자가 막혔다» 는 관측하지만 **왜 막혔는지**는 관측하지 않는다. 두 바인딩 값이 실제로 다르다는 것을 함께 재야, 나중에 다른 이유(예: 프록시가 프레임을 변형)로 막히기 시작해도 이 기준이 그것을 바인딩의 효력으로 오독하지 않는다.

**이 기준을 무너뜨리는 변이**: 전사에서 `cb` 를 뺀다(**중계자가 이긴다 — 이 기준의 존재 이유다**) / `cb` 를 프레임에 실어 보낸다(중계자가 채널의 값을 서버 쪽으로 전달해 통과한다) / `cb` 를 양쪽에서 상수로 만든다 / 서버가 서명 검증 시 자기 `cb` 대신 프레임이 주장하는 값을 쓴다.

## AC-GWAUTH2-023 — **진짜 서버의 `history_response` 가 봉투로 도착해 해소된다**

**[HARD] 이 기준이 1회차 감사 F-03 을 닫는다.** 서버의 발신 경로는 **다섯**이고(`spec.md` §8), 그중 `sendToConn`(`history_response`)은 **어떤 부정 기준도 잡지 못한다** — 부정 기준들은 `settled === 'pending'` 을 단언하는데 **프레임이 아예 오지 않아도 `pending`** 이기 때문이다. 누락은 그 단언을 초록으로 만든다. **양성 단언만이 이 경로를 잰다.**

> 2026-09-04 개정 — `SPEC-PERMROUTE-001` 이후 `sendToOrigin` 이 여섯째 발신 지점이다.

**Given** 진짜 서버(`createGateway`)를 띄우고 재전송 대상 메시지를 미리 심어 둔 방에 진짜 채널(`wire()`)을 붙여 확립한다.
**When** `gw.requestHistory({ limit: 10 })` 를 걸고, 진짜 서버가 `handleHistory` 경로로 응답하게 한다.
**Then** 셋이 동시에 성립한다.

```
expect(settled).toBe('resolved')                      // 해소됐다 — 봉투가 씌워졌고 대조를 통과했다
expect(received.messages.length).toBeGreaterThan(0)   // 내용이 실제로 넘어왔다
// 그리고 그 프레임이 봉투로 왔다 — 하네스가 전선에서 읽은 원문으로 잰다
expect(wireFrames.filter(f => f.type === 'env').length).toBeGreaterThan(0)
expect(wireFrames.some(f => f.type === 'history_response')).toBe(false)   // 맨몸으로 온 것이 없다
```

**마지막 두 줄이 «다섯 번째 경로» 를 직접 잰다.** `settled === 'resolved'` 만 재면 봉투 없이 보내고 채널이 그것을 받아 주는 구현(즉 REQ-GWAUTH2-014 가 깨진 구현)에서도 초록이다.

**이 기준을 무너뜨리는 변이**: **`sendToConn` 만 봉투를 씌우지 않는다** / `handleHistory` 를 봉투 함수 밖에서 부른다 / 봉투를 씌우되 `seq` 를 증가시키지 않는다.

## AC-GWAUTH2-024 — **경계 기준: 바인딩이 서지 않는 연결에서는 같은 중계자가 이긴다**

**[HARD] 이 기준은 방어를 재지 않는다 — 공백을 잰다.** `spec.md` §2.8.4 가 실측한 대로 오늘 이 저장소의 서버는 TLS 를 종단하지 않으므로, 실제 배치에서 중계자는 **배제되지 않는다.** 그 사실을 문서에만 적으면 다음 라운드가 그것을 잊는다. **매 실행마다 기록하게 만드는 것이 이 기준의 목적이다.**

**Given** 평문 `ws://` 로 진짜 서버를 띄우고, `relayMitm(realPort)` 를 세우고, 진짜 채널을 중계자의 포트에 붙인다. (AC-GWAUTH2-022 와 **같은 중계자 능력**, 전송만 다르다. **이 기준이 쓰는 하네스는 `relayMitm` 이며 `tlsRelayMitm` 이 아니다** — 두 하네스 절의 머리글이 3회차에 그렇게 정정됐다.)
**When** 핸드셰이크가 중계로 완료된다.
**Then** 넷이 동시에 성립한다.

```
expect(relay.channelBinding()).toBe('unbound')   // 양쪽 모두 바인딩을 얻지 못했다
expect(relay.serverBinding()).toBe('unbound')
expect(gw.isOnline(roomId, botId)).toBe(true) // ★ 중계자의 소켓이 봇으로 등록됐다 — 상대가 이겼다
expect(relay.stderrLines().filter(l => /중계|바인딩|unbound/.test(l)).length).toBeGreaterThan(0)
                                              // 채널이 그 사실을 공시했다 (REQ-GWAUTH2-020)
```

**셋째 줄이 «이겼다» 를 단언하는 것이 의도적이다.** 이 SPEC 은 그 자리를 닫지 못하며, 닫지 못한 것을 초록으로 위장하지 않는다. **이 줄이 붉어지는 날은 결함이 생긴 날이 아니라 방어가 늘어난 날이며**, 그때는 이 기준과 `spec.md` §5 표를 **함께** 고쳐야 한다 — 기준만 고치면 표가 낡고, 표만 고치면 기준이 낡는다.

넷째 줄이 REQ-GWAUTH2-020 의 공시를 잰다. 공시가 없으면 운영자는 바인딩이 서 있다고 믿는다.

**이 기준을 무너뜨리는 변이**: 바인딩을 얻지 못할 때 접속을 거절한다(셋째 줄이 붉어진다 — **그리고 그것은 올바른 변경이므로 문서와 함께 고친다**) / 공시를 stdout 으로 낸다 / 공시를 하지 않는다 / `unbound` 대신 임의의 상수 hex 를 쓴다(**두 연결에서 같아지므로 방어가 조용히 사라진다** — 첫 두 줄이 잡는다).

---

## 품질 게이트

run 단계는 아래를 모두 관측해야 한다.

| 항목 | 명령 | 통과 조건 |
|---|---|---|
| 전체 스위트 | `npm test` | base 대비 **신규 실패 0**. base 실측은 `plan.md` §C 사전 점검이 낸다 — **이 문서는 base 개수를 적지 않는다**(`SPEC-GWAUTH-001` 이 «250» 을 적었다가 착지 후 «264» 로 바뀌어 형제 문서 다수가 함께 낡았다) |
| 타입 검사 | `npm run typecheck --workspaces` | 오류 0 |
| 채널 빌드 | `npm run build -w channel` | 종료 코드 0 (AC-GWAUTH2-019 의 선행 조건) |
| 신규 기준 | `npm test` 출력에 **`AC-GWAUTH2` 기준 전건에서 021 을 뺀 것**의 `it()` 이름 (021 은 vitest 밖이므로 이 행의 대상이 아니다) | 전건 `✓` |
| 형제 비회귀 | 개정된 형제 기준이 **개정 후 본문**으로 초록 | `plan.md` §F 가 목록을 진다 |
| 범위 경계 | AC-GWAUTH2-021 | 목록이 집합 안 |

> **[HARD] ID 범위를 손으로 열거하지 않는다.** 2회차는 이 행을 `001~020`, `plan.md` §E 를 `001~021`, `plan.md` §F M5 를 `001~020, 022~024` 로 적어 **한 라운드 안에 세 벌의 철자와 하나의 누락**을 만들었다(2회차 감사 G-05 — 그리고 M5 의 철자는 **021 을 통째로 빠뜨렸는데, 021 은 같은 라운드에 다른 결함(G-02)이 고치라고 지목한 바로 그 기준이었다**). **손으로 유지하는 열거는 기준이 하나 늘 때마다 낡는다.** 그래서 세 자리 전부를 «**전건**에서 **이름 붙은 예외**를 뺀 것» 형태로 바꿨다 — 전체는 파생되고 예외만 손으로 적으므로, 기준이 늘어도 낡지 않는다.

### 변이표 — **아래 값은 예측이다. run 단계가 실측으로 교체한다**

**[HARD] `SPEC-GWAUTH-001` 이 이 자리에서 실패했다.** 그 SPEC 의 Definition of Done 은 «변이표와 정확히 일치» 를 요구했고, run 이 15개를 실제로 넣어 재자 **13행 중 7행이 어긋났다**(sync 감사 F-03). 원인은 표가 **예측이면서 통과 조건이었던 것**이다. 이 문서는 그 둘을 갈라 놓는다.

- **plan 단계의 표는 예측이며 통과 조건이 아니다.** 아래 「예측」 열은 run 이 무엇을 관측해야 하는지의 지도일 뿐이다.
- **run 단계가 각 변이를 실제로 넣고 「실측」 열을 채운다.** 실측이 예측과 다르면 **표를 실측으로 고치고 왜 달랐는지를 한 줄 적는다** — 예측에 맞추려 구현이나 기준을 고치지 않는다.
- **Definition of Done 이 요구하는 것은 「실측 열이 채워졌고 그 근거 원문이 있다」이지 「예측과 일치한다」가 아니다.**
- **형제 기준의 연쇄 붕괴는 «총 실패 수» 로만 잰다.** 확립을 막는 변이는 확립에 기대는 형제 기준을 무더기로 무너뜨리므로, 목록을 행마다 옮겨 적으면 표가 형제 SPEC 의 변경마다 거짓이 된다.

| # | 변이 | 예측: 무너지는 `AC-GWAUTH2-*` | 실측 | 실측이 예측과 다른 이유 |
|---|---|---|---|---|
| A | `challenge` 에서 `server_proof` 를 뺀다 (서버) | 005 · 020 | 002·004·005·006·009·010·013·016·020·022·023·024 (연쇄 총계 52 — 형제 40) | 어긋남(연쇄) — 증명 부재는 실제 서버 경로의 확립을 전부 깬다; 예측(005·020)은 실측에 포함되지만 연쇄를 세지 않았다 (m6-A) |
| B | `server_proof` 를 상수 문자열로 만든다 (서버) | 005 · 020 | 002·004·005·006·009·010·011·013·016·020·022·023·024 (연쇄 총계 53 — 형제 40) | 어긋남(연쇄) — 상수 증명도 같은 부류다; A 와의 차이는 011(stub 짝) 하나 (m6-B) |
| C | 전사에서 `client_nonce` 를 뺀다 (양쪽 동시) | 005 | 002·004·005·007·009·010·011·014·015·016·017·020(나)·022 (연쇄 총계 80 — 형제 67) | 어긋남(연쇄) — 양쪽이 함께 빠지면 구현끼리는 합의하지만 측정 헬퍼가 여전히 cn 을 계산해 헬퍼 교차 전반이 붉는다; stub 확립 기반 007·011·014·015 연쇄 (m6-C) |
| D | 전사에서 `pub` 을 뺀다 (양쪽 동시) | 005 | 002·004·005·007·009·010·011·014·015·016·017·020(나)·022 (연쇄 총계 80 — 형제 67) | 어긋남(연쇄) — C 와 같은 부류다; pub 탈락도 헬퍼 교차 연쇄를 낳는다 (m6-D) |
| E | 열쇠를 `k_srv` 대신 `pub` 으로 유도한다 (양쪽 동시) | **006 (`hmac-pub` 갈래)** · 005 | 002·004·005·006·007·009·010·011·014·015·016·017·020(나)·022 (연쇄 총계 81 — 형제 67) | 부분 일치 — 006(hmac-pub 갈래)·005 실측됨(예측대로) + 007 이하 stub 연쇄 (m6-E) |
| F | 서명 검증을 건너뛰고 `hello` 조회만으로 등록한다 (서버) | **009** · 010 · 018 | 009 (총계 1) | 어긋남 — hello 시점 등록은 auth 실패 시 dropConn 로 회수된다; 접속이 열려 있는 동안 관측하는 009 만 잡는다. 010 은 관측 창이 닫힌 뒤 판정하고 018 은 형식 검사가 여전히 거절한다 (m6-F) |
| G | 검증자 대신 `sha256(T)` 를 저장한다 (서버) | 001 · 009 · 020 | 001 (총계 3 — 형제 2) | 어긋남 — 왕복 하네스의 invite() 는 토큰 행을 자체 시드한다(API 를 거치지 않음, gateway-mutual-auth.test.ts :40-46) — 저장 계약 변이는 API 발급을 거치는 001·형제 2 에만 닿는다. 009 는 저장 값을 곧바로 pub 로 쓰므로 통과한다 (m6-G) |
| H | `token_hash` 컬럼을 남기고 함께 저장한다 (서버) | 001 | 001 (총계 2 — 형제 1) | 부분 일치 — 001 외에 같은 저장 계약을 재는 형제 1건이 함께 붉었다 (m6-H) |
| I | 옛 `hello` 갈래를 남긴다 (서버) | **018** | 018 (총계 1) | 일치 — 재측정값이다. 초안 적용은 client_nonce 요구가 남아 옛 갈래가 실제로 열리지 않았고(그 측정은 전건 초록이었다), v1-final nonce 필드를 받는 형태로 재적용해 측정했다 (m6-I) |
| J | 봉투를 씌우지 않고 그대로 보낸다 (서버) | **013** · 014 · 016 · 020 | 002·004·005·010·013·016·020·022·023·024 (연쇄 총계 50 — 형제 40) | 어긋남(연쇄) — 014 는 stub 기반이라 무관하고, 봉투 부재는 양성 경로 전반(002·004·005·010·016·022·023·024)을 깬다 (m6-J) |
| K | `seq` 를 상수 1 로 만든다 (서버) | 016 · **015** | 013·016·020·022·023·024 (연쇄 총계 31 — 형제 25) | 어긋남 — 015 는 stub 기반이라 서버 변이와 무관했다; seq 상수화는 실제 서버의 복수 프레임을 채널 seq 가드가 버려 013·020·022·023·024 로 연쇄한다 (m6-K) |
| L | `mac` 대조를 존재 확인으로 바꾼다 (채널) | **013** · 014 | 014·017 (총계 2) | 어긋남(013 불가) — 013 의 관측면(notes·readIds)이 판정 «수용» 을 관측하지 않는다; 위조 봉투가 수용돼도 그 it 은 초록이다 — M5 본문의 관측 한계(§E.2.19 발견 ③) (m6-L) |
| M | `seq` 검사를 지운다 (채널) | **015** | 없음 (총계 0 — 스위트 전건 초록) | 어긋남(무붉힘) — 프레임 게이트를 지나도 세션 층(channel-server.ts 의 emitted 집합 :170-181)이 소비·미발급 id 의 판정을 흡수한다. 판정 봉투 재생은 게이트와 무관하게 초록이고 message 봉투 재생을 재는 갈래가 이 문서에 없다 (m6-M — §E.2.19 발견 ①) |
| N1 | 프레임 인증 강제 지점을 `if (false)` 로 (채널) | 013 · 014 · 015 | 014·017 (총계 2) | 어긋남 — L·M 과 같은 관측면 사유다; ① 이 죽어도 013·015 의 본문은 수용을 관측하지 않는다 (m6-N1) |
| N2 | 서버 증명 대조를 `if (false)` 로 (채널) | 006 · 008 · 011 · 012 · 019 | 006·011·012·017 (총계 7) | 부분 일치 — 006·011·012 실측. 008·019 는 형식 갈래(omit·무응답)라 값 대조 제거와 무관했다 (m6-N2) |
| N3 | `!established` → `false` (`SPEC-CHANAUTH-001` 의 게이트) | **하나도 없다.** `AC-CHANAUTH-001·003·004·005` 만 무너진다 | 017 하나 — 러너의 O 앵커 기계 실패 (실질 붕괴 0 — 형제 0) | 실질 기대 유지 — 이 SPEC 기준 실질 붕괴 0·형제 0. 017 의 실패는 러너가 O 적용에 ③ 앵커 문자열을 필요로 하기 때문의 기계 실패다(mutation-N3.txt :31). 형제 예측(AC-CHANAUTH 4건)은 미관측 — 형제 하네스도 v2 봉투로 전환해 ③ 이 가리는 맨몸 교통량이 스위트에 남지 않았다 (m6-N3) |
| O | ①·②를 ③ 뒤로 옮긴다 (체인 밖 독립 문장을 체인 뒤로 — §「검증 원칙」 4번의 [HARD] 형태) | **N3 의 기대값이 뒤집힌다** | 006·007·011·012·013·014·015·017·020·020(나)·023·024 (총계 42 — 형제 21 · 서버 전건 통과 · 022 는 dist 자식이라 불변) | 본문 예측의 전제 실측 — 블록이 ③ 뒤로 옮겨져 확립 전 challenge 가 ③ 에 먹혀 채널 확립 의존 전반이 붉는다. 022 의 채널은 dist 자식(미변이)이라 변이가 도달하지 않았다 (m6-O) |
| P | `k_sess` 를 두 논스만으로 유도한다 (양쪽 동시) | **013** (중간자가 두 논스를 안다) | 004·005·007·010·011·014·015·016·017·020(나)·022 (연쇄 총계 71 — 형제 60 · 013 은 불가) | 어긋남(013 불가) — injectForgedEnv 는 지어낸 mac('f'×64)을 실으므로 주입은 열쇠 유도와 무관하게 mac 에서 거절된다; 이 하네스로는 013 이 P 를 재지 못한다. k_sess 의 공개값 유도는 헬퍼·dist 교차 연쇄로만 관측됐다 (m6-P — §E.2.19 발견 ②) |
| Q | 길이 확인 없이 `timingSafeEqual` 을 부른다 (채널) | 012 | 없음 (총계 0 — 스위트 전건 초록) | 어긋남(무붉힘) — 형식 검사(REQ-GWAUTH2-006)가 이미 64-hex 를 보장한다; 길이 가드는 도달 불가능한 이중 방어다 (m6-Q) |
| R | 거절 시 `console.log` 로 진단을 낸다 (채널) | 019 | 019 (총계 3 — 형제 2) | 일치 — 같은 stdout 계약을 재는 형제 2건이 연쇄로 붉었다. dist 재빌드를 수반(적용·복원 양쪽)하며 재빌드 사고는 §E.2.19 에 기록 (m6-R) |
| S | `hello` 에 `token` 을 되돌린다 (채널) | **003 · 004** | 003 (총계 3 — 형제 2) | 어긋남(004 불가) — 004 의 클라이언트는 서버 쪽 하네스(connectV2)라 구현의 hello 를 관측하지 않는다; 실제 채널 hello 키 집합은 003 만 잰다 (m6-S) |
| T | **전사 셋 전부에서 `cb` 를 뺀다** (양쪽 동시) | **005 · 007 · 010(양성 짝) · 022.** Z1·Z2·V 의 합집합이며, 확립을 막으므로 형제 기준이 연쇄로 무너진다 — **연쇄는 «총 실패 수» 로만 잰다**(위 [HARD]) | 002·004·005·007·009·010·011·014·015·016·017·020(나)·022 (연쇄 총계 80 — 형제 67) | 부분 일치 — 예측 부류(005·007·010·022) 전부 실측 + 헬퍼·dist 교차 연쇄. 양쪽이 함께 빠지면 구현끼리는 합의하지만 측정자와 갈린다 (m6-T) |
| **Z1** | **`challenge` 전사에서만 `cb` 를 뺀다** (양쪽 동시) | **005**(독립 재계산 `toBe` 가 어긋난다) · **007**(`valid` 스텁의 증명을 채널이 거절한다). `valid` 스텁에 기대는 형제 기준이 연쇄 | 002·004·005·007·009·010·011·014·015·016·017·020(나)·022 (연쇄 총계 80 — 형제 67) | 부분 일치 — 예측(005·007 + 연쇄) 실측. 챌린지 전사만 열려도 헬퍼·dist 교차가 전부 붉는다 (m6-Z1) |
| **Z2** | **`auth` 전사에서만 `cb` 를 뺀다** (양쪽 동시) | **010 의 양성 짝**(하네스가 서명한 `auth` 를 서버가 거절한다) · **022**(중계자가 등록에 성공한다 — 봇 세션을 가져간다) | 004·005·010·016·022 (연쇄 총계 45 — 형제 40) | 부분 일치 — 010 양성 짝 실측. 022 의 붉힘은 «중계자가 이긴다» 가 아니라 ⑤ 직접 접속 양성 짝의 실패다 — dist 자식은 cb 를 싣고 변이 서버가 받지 않는다 (m6-Z2) |
| U | `cb` 를 프레임에 실어 보내고 **받은 값을 쓴다** (양쪽 동시) | **022**(중계자가 채널의 값을 전달해 통과한다) · **004 ㉡**(키 집합에 여분 필드가 생긴다). **4회차에 004 가 더해졌다** — 3회차까지 이 행은 022 하나였고, 그것은 키 집합을 재는 자리가 `hello` 뿐이어서 성립한 예측이었다 | 003·004 (총계 4 — 형제 2 · 022 불가) | 어긋남(022 불가) — 022 의 채널은 dist 자식(미변이)이라 채널 측 절반이 도달하지 않고, 서버 측 절반만으로는 클라이언트 대조가 실패한다 — 이 스위트 구성에서 U 의 022 관측은 불가하다 (m6-U) |
| **U2** | `cb` 를 프레임에 실어 보내되 **자기 값을 쓴다** (양쪽 동시) | **004 ㉡ 만 — 전선 위 네 종류에 실었을 때.** 봉투 `payload` 안 내부 프레임에 실으면 **어느 기준도 붉지 않는다**(4회차 감사 J-01). 오늘 당장은 기능이 U 와 다르게 정상이므로 **어떤 기능 기준도 잡지 못한다** — 그러나 REQ-GWAUTH2-021 의 문언을 위반하고 대체 통로를 열어 둔다. **이 행이 붉히는 기준이 004 하나뿐이라는 사실이 그 기준을 지우면 안 되는 이유다** | 003·004 (총계 4 — 형제 2) | 어긋남(003 추가) — hello 키 집합은 003 이 잰다; 예측이 «전선 위 네 종류» 를 실을 때 hello 종류를 세지 않았다 (m6-U2) |
| **AA** | `sk` 씨앗을 `T` 가 아니라 `k_srv` 에서 유도한다 (양쪽 동시) — REQ-GWAUTH2-002 위반 | **009**(`server_confirm_key` 만 쥔 상대가 그 값에서 `sk` 를 얻어 `auth` 서명을 만들고 등록에 성공한다 — 첫 줄이 붉어진다) · **001**(저장된 `verifier_pub` 이 하네스의 `pubOf(T)` 와 갈린다). **009 가 이 변이의 측정 지점이고 001 은 부수 효과다** | 001·003·006·022 (총계 8 — 형제 4 · 009 불가) | 어긋남(009 불가) — 009 의 상대는 본문이 고정한 세 시도만 한다; k_srv 에서 Ed25519 키를 유도하는 시도가 그 세트에 없어 측정점이 발화하지 않는다. 유도 위반은 구현끼리의 일치로 숨고 헬퍼 교차(001·003·006·022)로만 드러났다 (m6-AA) |
| V | 세션 열쇠 유도에서만 `cb` 를 뺀다 (`auth` 전사에는 남긴다) | **007** — 스텁의 `sessKey` 가 `cb` 를 담으므로 구현의 `k_sess` 와 갈리고 봉투 `mac` 대조가 실패한다. **2회차 예측은 «하나도 없다» 였고, 그것은 헬퍼에 `cb` 가 없어서 성립한 값이었다**(2회차 감사 G-03) — 헬퍼가 고쳐지면서 이 행이 관측 가능해졌다 | 004·005·007·010·011·014·015·016·017·020(나)·022 (연쇄 총계 71 — 형제 60) | 부분 일치 — 예측 007 실측(스텁 sessKey 헬퍼와 구현이 갈려 봉투 전부 거절) + 세션 일치 붕괴의 헬퍼·dist 교차 연쇄 (m6-V) |
| W | 바인딩을 얻지 못할 때 `unbound` 대신 상수 hex 를 쓴다 (양쪽 동시) | **024** (두 연결에서 같아져 공백이 조용히 사라진다) | 002·004·005·007·009·010·011·014·015·016·017·020(나)·024 (연쇄 총계 80 — 형제 66 · 013·020·022·023 통과) | 부분 일치 — 024 실측. 단 relayMitm 의 cb 관측자는 소켓을 재므로(구현 값을 재지 않음) 첫 두 줄이 아니라 넷째 줄(공시 소멸)이 잡았다 + 헬퍼 'unbound' 리터럴과의 교차 연쇄 (m6-W) |
| X | **`sendToConn` 만 봉투를 씌우지 않는다** (서버) | **023** | 023 (총계 7 — 형제 6) | 일치 — 013 은 본문이 이력 양성 짝을 단언하지 않아 X 를 잡지 못한다; 023 만이 다섯째 발신 경로를 잰다 (m6-X) |

> 2026-09-04 개정 — 위 변이표 X 행의 «다섯째 발신 경로»: `SPEC-PERMROUTE-001` 이후 `sendToOrigin` 이 여섯째다.
| Y | REQ-GWAUTH2-006 의 형식 검사를 지운다 (채널) | **012** (`bad-nonce`·`pipe-nonce` 갈래) | 012 (총계 3) | 일치 — omit 갈래의 TypeError 로 관측됐다; bad-nonce·pipe-nonce 갈래는 값 대조 실패로 같은 거절 경로에 떨어진다 (m6-Y) |

**[M6 실측 귀속 — 2026-08-30, run 단계가 이 표의 「실측」 열을 채웠다.]** 측정 방법: 각 변이를 작업 트리 소스에 하나씩 적용하고 `npm test`(전체 스위트, 당시 283 초록)를 돌려 실패 기준을 관측한 뒤 git 객체(HEAD blob)로 복원하고 매 행마다 hash-object 대조로 오염 0을 확인했다. 드라이버 원문 `.moai/state/verify/t22-run/m6-mutate.py`, 결과 원문 `mutation-<ID>.txt`(31행 + `mutation-O+N3.txt`)·`m6-mutation-results.jsonl`·요약 `m6-extract.py`. 실측 셀의 «연쇄 총계» 는 이 SPEC 기준과 형제 기준을 합친 실패 수며, 형제 연쇄는 위 [HARD] 규약대로 총계로만 잰다. 세 가지 측정 사고와 처분: **(가)** I 행의 첫 적용은 client_nonce 요구가 남아 옛 갈래가 실제로 열리지 않는 «죽은 변이» 였다 — v1-final `nonce` 필드를 받는 형태로 재적용해 재측정했다(표의 I 값이 재측정값이다). **(나)** R 행의 dist 재빌드가 복원보다 먼저 실행되는 드라이버 결함으로 변이 dist 가 S·T 행에 남았다 — 소스 복원 후 재빌드하도록 고치고 S·T 를 재측정했다(두 행의 019 관측은 재측정값이다). **(다)** O+N3 는 표의 행이 아니라 DoD 의 «O 아래에서 N3 반전» 을 위한 M6 추가 측정이다. «어긋남(불가)» 로 표기된 넷(L·M·P·U의 013/022, AA의 009, S의 004)은 예측이 틀린 것이 아니라 **현 스위트 구성(하네스가 관측하는 면)이 그 판정을 관측할 수 없다** 는 뜻이다 — 그 넷은 기준 집합에 대한 관측이지 구현 결함이 아니다.

**[HARD] 4회차가 더한 세 자리를 적는다 — U 의 예측 갱신 · U2 · AA.** 이름은 형태를 따른다: `U2` 는 `U` 의 갈래이므로 `Z1`·`Z2` 와 같은 숫자 접미를 쓰고, `AA` 는 독립 변이이므로 다음 이름을 받는다(`Z` 는 `Z1`·`Z2` 와 혼동되므로 건너뛴다). **U 의 예측을 함께 고친 것이 이 갱신의 절반이다** — AC-GWAUTH2-004 가 키 집합을 재게 된 순간 U 가 붉히는 기준이 늘었고, **기준을 넓히면서 그 기준을 예측하는 변이 행을 안 고치면 그것이 이 카드가 네 라운드 겪은 결함의 다음 인스턴스다**(3회차 감사 §9 회귀 항목이 미리 지목했다).

**[HARD] 변이 J 는 굵은 변이이므로 X 를 대신하지 못한다.** J(«봉투를 씌우지 않고 그대로 보낸다»)는 발신 경로 **다섯을 한꺼번에** 지우므로 «어느 경로가 봉투를 빠뜨렸는가» 를 가르지 못한다 — 이 문서가 §「검증 원칙」 4번에서 스스로 금지한 형태다. X 가 다섯째 경로 하나만 지운다.

> 2026-09-04 개정 — `SPEC-PERMROUTE-001` 이후 `sendToOrigin` 이 여섯째 발신 지점이다.

**[HARD] Z1 · Z2 · V 셋이 G-03 의 종결을 관측하는 자리다.** 2회차 감사가 지목한 결함은 문서 사이의 불일치가 아니라 **«어느 구현이 통과하는가» 의 역전**이었고 — `cb` 를 담은 정상 구현이 AC-005 에서 붉어지고, `cb` 를 통째로 뺀 구현이 열한 기준을 초록으로 지났다 — 역전이 사라졌는지는 **변이로만 관측된다.** 그래서 이 세 행은 「어느 전사에서 `cb` 를 빼면 어느 기준이 붉어지는가」를 **이름으로** 적는다.

**[HARD] 그러므로 G-03 의 종결 조건은 헬퍼가 아니라 실측이다.** run 이 Z1·Z2·V 의 「실측」 열을 채우고, **셋 각각이 위에 이름 붙은 기준을 실제로 붉히는 것을 관측하기 전까지 이 결함은 닫힌 것이 아니다.** 셋 중 어느 하나라도 **어떤 기준도 붉히지 못하면**, 그것은 예측이 틀린 것이 아니라 **기준 집합이 여전히 요소 ④를 재지 못한다는 뜻이다** — 그때 고칠 것은 헬퍼가 아니라 기준이며, **그 전사를 재는 기준을 하나 새로 세운다.** 「헬퍼가 명세와 일치한다」는 문서에 대한 증거이지 구현에 대한 증거가 아니다.

**[HARD] V 의 예측이 바뀐 것 자체가 이 SPEC 이 세 라운드 겪은 결함 부류의 실례다.** 2회차는 이 행에 «하나도 없다» 를 적고 그 아래에 «근거는 «층의 독립» 이지 «오늘의 관측» 이 아님을 이 행이 기록한다» 를 [HARD] 로 붙였다. **그 기록은 헬퍼가 `cb` 를 빠뜨린 상태에서만 참이었다** — 헬퍼를 고치자 같은 문장이 거짓이 됐다. 한 자리를 고치면 그 일을 «안 했다» 고 적은 다른 자리가 거짓이 되는 형태이며, 3회차는 그것을 **전역 훑기**로 잡았다(`plan.md` §B-0). **`cb` 를 세션 유도에 넣는 근거가 여전히 «층의 독립» 이라는 §2.8.3 의 판단은 바뀌지 않는다** — 바뀐 것은 그 결정이 이제 **관측 가능하다**는 사실뿐이다.

**변이 P 가 이 표에서 가장 값어치 있다.** 세션 열쇠를 «양쪽이 아는 값» 이 아니라 «전선 위에 있는 값» 으로 유도하는 실수는 코드만 읽어서는 옳아 보이고, **중계형 중간자만이 그것을 드러낸다.**

---

## Definition of Done

- [ ] **`spec.md` §4 의 `REQ-GWAUTH2` 요구사항 전건**이 구현됐다 (범위를 손 열거로 적지 않는다 — 요구사항이 늘면 열거가 낡는다)
- [ ] **이 문서의 `AC-GWAUTH2` 기준 전건**이 통과한다 (021 은 vitest 밖 절차로 관측하되 이 항목의 대상이다)
- [ ] **변이표 전건(위 표의 모든 행)의 「실측」 열이 채워졌고**, 각 행의 근거 원문 경로가 `progress.md` §E.2 에 있다. **예측과의 일치는 통과 조건이 아니다** — 다른 행은 실측으로 고치고 이유를 적는다. (범위를 «A~Y» 같은 손 열거로 적지 않는다 — 3회차가 Z1·Z2 를, 4회차가 U2·AA 를 더했고 손 열거였다면 두 라운드 모두 낡았을 것이다)
- [ ] **[HARD] G-03 의 종결 관측** — 변이 **Z1 · Z2 · V** 각각이 변이표에 이름 붙은 기준을 **실제로 붉혔다.** 셋 중 어느 하나라도 어떤 기준도 붉히지 못하면 **미충족이며, 그 전사를 재는 기준을 새로 세운다** — 헬퍼를 다시 고치는 것은 답이 아니다(«헬퍼가 명세와 일치한다» 는 문서에 대한 증거이고, 결함은 «어느 구현이 통과하는가» 에 있다)
- [ ] **[HARD] REQ→기준 포섭이 비어 있지 않다 — 대응표가 아니라 명령으로 잰다.** 아래가 **아무것도 출력하지 않아야 한다**. 출력이 있으면 그 요구사항은 이름으로 잡는 기준이 0개이며, 그것이 3회차 감사 H-02 의 형태다(REQ-GWAUTH2-002·021 둘이 걸렸다).

      ```
      $ cd .moai/specs/SPEC-GWAUTH-002
      $ grep -o 'REQ-GWAUTH2-[0-9]\{3\}' spec.md | sort -u > /tmp/reqs
      $ grep -o 'REQ-GWAUTH2-[0-9]\{3\}' acceptance.md | sort -u > /tmp/acs
      $ comm -23 /tmp/reqs /tmp/acs
      ```

      **손으로 유지하는 REQ→AC 대응표를 두지 않는 이유**: 표는 요구사항이나 기준이 하나 늘 때마다 낡고, **낡은 표는 «포섭돼 있다» 고 거짓으로 적는다** — 이 카드가 네 라운드 겪은 형태다. 위 명령은 파생값이므로 낡지 않는다. **다만 이 명령이 재는 것은 «이름이 등장하는가» 이지 «실제로 재는가» 가 아니다** — 후자는 각 기준 본문의 [HARD] 대응 문장이 지며, 그 문장들이 참인지는 아래 항목이 잰다.
- [ ] **[HARD] 「A 가 B 를 지킨다」 형태의 대응 주장이 전부 참이다.** `plan.md` §B-0d 의 대응 주장 부류를 다시 훑어, 각 주장이 지목한 기준의 **본문이 실제로 그것을 단언하는지** 대조한다. 3회차는 `design.md:53` 이 «AC-003 이 세 프레임의 `cb` 부재를 지킨다» 고 적었고 AC-003 은 `hello` 하나만 쟀다 — **재는 것보다 넓게 말하는 문장**이며, 이 SPEC 이 존재하는 이유가 된 결함 형태의 4세대 인스턴스였다
- [ ] **변이 N3 이 `AC-GWAUTH2-*` 를 하나도 무너뜨리지 않는다** — 세 게이트의 분리가 실측으로 확인됐다
- [ ] **변이 O 를 넣으면 N3 의 기대값이 뒤집힌다** — 분리가 구조에서 나온다는 것이 확인됐다
- [ ] `npm test` 가 base 대비 신규 실패 0 이다 (base 는 `plan.md` §C 가 실측한다)
- [ ] **`plan.md` §B-2 의 형제 SPEC 통독이 수행됐고, 그 결과로 §B-1 의 목록이 재도출됐다** — 재도출된 목록과 초판 목록의 차이(추가·삭제·변경 없음)가 `progress.md` §E.2 에 적혔다. **이 항목이 없으면 아래 항목은 스스로 하한이라고 밝힌 목록에 대한 약속일 뿐이다**(1회차 감사 F-07; `spec.md` §3.2 가 «grep 이 잡는 것은 하한이지 개수가 아니다» 를, `plan.md` §B-2 가 «B-1 의 목록을 «전부» 라고 읽어서는 안 된다» 를 적는다)
- [ ] **재도출된** 형제 계약 개정이 **run 진입 전에** 닫혔다
- [ ] **경계 진술이 `progress.md` §E.2 에 그대로 남았다** — «위조 종단은 배제했다. **중계형 중간자의 배제는 양쪽이 같은 TLS 연결을 종단하는 배치에서만 서며, 이 저장소의 서버는 오늘 TLS 를 종단하지 않으므로 실제 배치에서는 배제되지 않는다.** 읽기 전용 DB 유출은 **봇 사칭 방향만** 닫혔고 게이트웨이 사칭은 여전히 가능하다. 평문 토큰 유출과 장악된 서버는 닫지 않는다.» **줄여 적으면 완료가 아니다** — 특히 «중계형 중간자를 배제했다» 로 줄이면 배치 조건이 사라지고, «검증자 저장으로 DB 유출을 닫았다» 로 줄이면 §5 표의 오른쪽 절반이 사라진다
- [ ] **채널 바인딩의 배치 조건이 `README.md`·`CHANGELOG.md` 에 적혔다** — «서버가 TLS 를 종단하지 않는 배치에서는 중계자가 배제되지 않는다». 적지 않으면 운영자는 v2 가 그 상대를 닫았다고 읽는다
- [ ] **[HARD] 배포 경계가 `t23` 기준으로 적혔다** — «이 SPEC 이 착지해도 **생산 배치에서 중계형 중간자는 배제되지 않으며**, 그 자리를 닫는 것은 후속 카드 `t23`(서버 TLS 종단)이다». **«t22 가 닫히면 배포할 수 있다» 로 읽히는 문장이 어느 문서에도 없다**(운영자 결정, 3회차 — 배포를 막는 조건은 이 카드가 아니라 `t23` 이다)
- [ ] **F-A8 의 처분이 `progress.md` 에 기록됐다** — «도달 범위가 좁아졌고 기각하지 않았으며 128 상한 자체는 별도 카드가 필요하다». **«도달 불가» 로 적으면 미충족이다**
- [ ] `README.md`·`CHANGELOG.md` 의 문안이 위 경계 진술을 **그대로** 옮겼다 — «상호 인증 완성» 으로만 적으면 미충족이다
- [ ] `spec.md` §3.2 의 C 부류 형제 문장들을 **고치지 않았다**(`git diff` 로 확인)
- [ ] `server/test/gateway.test.ts:897` 의 옛 제목 주석이 해소됐다 (`plan.md` §F M5)

---

## 잔여 위험

- **[HARD] 채널 바인딩은 오늘 어떤 실제 배치에서도 서지 않는다.** `spec.md` §2.8.4 가 실측했다 — 서버는 TLS 를 종단하지 않는다. AC-GWAUTH2-022 는 **시험 안에서** TLS 종단 서버를 세워 방어가 실재함을 재고, AC-GWAUTH2-024 는 평문 연결에서 **같은 중계자가 이긴다는 것**을 잰다. **이 SPEC 이 착지해도 중계형 중간자는 실제 배치에서 배제되지 않으며**, 그것을 바꾸는 것은 `server/src/index.ts` 를 여는 후속 카드 **`t23`**(«서버 TLS 종단 · §1.1 무조건 종결»)이다(`spec.md` §5). **v2 의 가장 큰 잔여는 이것과 아래 항목 둘이다.**
- **선택적 억제는 재지 않는다.** 경로에 선 상대는 유효한 봉투를 흔적 없이 삼킬 수 있고 `seq` 는 삭제를 탐지하지 못한다. **그리고 이 패스는 억제된 `permission_verdict`·`history_response` 가 채널 쪽에서 어떤 기본 동작으로 귀결되는지 확인하지 않았다** — 그 확인 없이는 심각도를 판정할 근거가 없으므로, 심각도를 주장하지 않고 미확인 사실만 적는다.
- **`pub` 존재 확인 오라클과 유량 제한 부재.** 아무나 `hello` 를 보내 등록 여부를 알아낼 수 있다. 채널 바인딩은 `challenge` 의 전달 가치만 없앤다.
- **`server_confirm_key` 를 쥔 상대는 게이트웨이를 사칭한다.** 이 문서의 기준 전건 중 그 상대를 막는 것은 0개이며, 막을 방어가 이 SPEC 에 없다. **채널 바인딩도 이 상대에게는 아무것도 보태지 않는다** — 그 상대가 중계 위치에 서면 채널과의 연결을 자기가 종단하므로 채널의 `cb` 를 자기 값으로 알고 있고, `k_srv` 도 갖고 있어 세션 열쇠를 그대로 유도한다(`spec.md` §2.8.3). 완전한 해소는 서버 키쌍 + 공개키 고정이고 그 범위는 `spec.md` §5 가 밖에 두었다. **이 항목이 v2 의 가장 큰 잔여다.**
- **상수 시간 성질을 완전히 재는 기준이 없다.** AC-GWAUTH2-012 는 길이 가드의 존재를 동작으로 잰다. `===` 로 바꾼 구현은 통과한다 — 타이밍 측정은 테스트 환경에서 신뢰할 수 없어 기준으로 두지 않았다. 코드 리뷰가 지킨다(`plan.md` §G).
- **봉투가 서버의 모든 발신 경로를 지나야 한다.** 한 자리라도 빠뜨리면 그 프레임은 채널에서 **조용히** 버려진다 — 진단이 어려운 실패 형태다. `plan.md` §D 가 발신 지점을 한 함수로 모으도록 처방하고, **다섯 경로 각각에 양성 기준이 걸린다**(`welcome`·재전송 → 016, `deliver` → 020(가), `sendToBot` → 007·013, `sendToConn` → **023**). 초판은 경로를 **넷으로 열거했고 다섯째(`sendToConn` → `history_response`)가 어떤 기준에도 걸리지 않았다**(1회차 감사 F-03) — 부정 기준들이 `settled === 'pending'` 을 단언하는데 프레임이 오지 않아도 `pending` 이기 때문이다. **그러나 앞으로 새로 생기는 발신 경로를 자동으로 감지하는 기준은 여전히 없다** — `plan.md` §C 의 발신 지점 실측 명령이 run 착수 시점에 목록을 다시 뽑는 것이 그 자리를 대신한다.
  > 2026-09-04 개정 — 위 «다섯 경로 각각에 양성 기준» 의 다섯은 여섯이다 — `SPEC-PERMROUTE-001` 이후 `sendToOrigin` 이 여섯째 발신 지점이며, 그 경로의 양성 기준은 이 SPEC 밖에 있다.
- **결정적 키 유도는 토큰이 곧 개인키임을 뜻한다.** 토큰이 유출되면 서명 능력까지 함께 유출되며, 회전 없이 되돌릴 방법이 없다. 토큰 회전은 `spec.md` §5 가 밖에 두었다.
- **모든 기존 초대가 무효가 된다.** 마이그레이션 경로가 없다 — 서버는 평문 토큰을 저장한 적이 없으므로 `token_hash` 에서 `verifier_pub` 을 유도할 수 없다. 운영 중인 배치가 있다면 **모든 봇을 다시 초대해야 하며**, 그 안내를 만드는 것은 이 SPEC 범위 밖이다(`spec.md` §5).
- **AC-GWAUTH2-011·015 는 실제 시간 1,000ms 를 두 번 이상 기다린다.** 부하 걸린 기계에서 20초 타임아웃이 모자랄 여지가 있다. `sleep` 주입이 `wire()` 를 통해 노출되지 않아 가짜 타이머를 쓸 수 없으며, 그 노출은 `SPEC-CHANWIRE-001` 계약 변경이라 이 카드 범위 밖이다.
- **붕괴 규모가 실측되지 않았다**(`spec.md` §3.3). 형제 하네스 여섯·상한 55·서버 쪽 미측정 전부 `plan.md` §C 가 run 착수 시점에 다시 잰다. **이 문서의 AC-GWAUTH2-021 허용 집합도 그 실측으로 확정된다.**
- **`plan.md` §D-8 의 구조 처방은 SPEC 이 HOW 를 규정하는 자리다.** 구현 자유도를 좁히는 대가를 치른다. 처방된 것은 구조의 문자가 아니라 «세 강제 지점이 분리되고 순서가 이 SPEC → t9 다» 라는 성질이며, 더 나은 분리 구조를 찾으면 변이 N3 의 기대값이 유지되는 한 그것을 택해도 된다.

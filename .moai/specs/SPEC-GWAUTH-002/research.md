# SPEC-GWAUTH-002 조사

> Tier L 의 다섯째 산출물. **이 문서가 지는 것은 «무엇을 열어 보았고, 무엇을 쟀고, 어떤 대안을 왜 기각했는가» 다.** 무엇을 세우는지는 `spec.md`, 왜 그 결정인지의 요약은 `plan.md` §D, 어떤 모양인지는 `design.md` 가 진다.
>
> **초판(v0.1.0)에는 이 파일이 없었다.** 1회차 계획 감사가 F-10 으로 «Tier L 산출물 다섯 중 넷» 을 들었고, 2회차 개정에서 신설했다(`plan.md` §B-6). 조사 내용 자체는 초판에도 `design.md` §A 와 `spec.md` §2·§3 에 있었으므로 **이 문서는 없던 정보를 만드는 것이 아니라 흩어진 것을 한자리에 모으고, 2회차가 새로 조사한 것을 더한다.**

---

## §A 이 조사가 실제로 실행한 명령과 그 출력

**[HARD] 아래는 전부 이 워크트리(`.claude/worktrees/t22`, 브랜치 `WT-gateway-mutual-auth`)에서 실행한 결과다.** 인용한 값과 실행한 값을 가른다 — 인용은 §C 에 따로 모았다.

### A.1 서버의 발신 경로 — **넷이 아니라 다섯**

```
$ grep -n 'send(ws\|sendToConn' server/src/gateway.ts
109:    send(ws, welcome)
123:    send(ws, {                     ← sendStoredMessage
144:  function send(ws: WebSocket, payload: object): void {
194:    sendToConn(info, {             ← 호출자
201:  function sendToConn(info: ConnInfo, payload: object): void {
202:    for (const [ws, c] of conns) ... send(ws, payload)
213:        send(ws, {                 ← deliver
231:      for (const [ws, c] of conns) ... { send(ws, payload); return true }
```

```
$ sed -n '194,196p' server/src/gateway.ts
    sendToConn(info, {
      type: 'history_response', rid: msg.rid,
```

**결론**: 확립된 소켓으로 나가는 자리는 `:109`(`welcome`) · `:123`(재전송) · `:202`(`sendToConn`) · `:213`(`deliver`) · `:231`(`sendToBot`) 다섯이다. 초판의 계획·설계가 **넷만 열거했고 빠진 것이 `history_response` 를 나른다**(1회차 감사 F-03). 봉투를 한 자리라도 빠뜨리면 그 프레임은 채널에서 조용히 버려지므로, 열거의 누락이 곧 무음 결함이다.

### A.2 등록 지점 — `:97` 이 아니라 `:101`

```
$ grep -n 'conns.set' server/src/gateway.ts
101:    conns.set(ws, { roomId: row.room_id, botId: row.bot_id, tokenRowId: row.token_row_id })
```

`:97` 은 조회 결과의 **타입 표기**의 일부다(`| { token_row_id: number; … }`). 초판이 세 자리에서 `:97` 을 등록 지점으로 인용했다(1회차 감사 F-11).

### A.3 채널 쪽 소켓 지역 상태 — `:74`·`:77`·`:80`

```
$ grep -n 'let established\|let proofRejected\|const nonce' channel/src/gateway-client.ts
74:    let established = false
77:    let proofRejected = false
80:    const nonce = randomBytes(32).toString('hex')
```

**초판의 인용 범위 `:74-80` 은 옳다.** 1회차 감사 F-12 의 첫 항목은 이 셋을 `:74`·`:79`·`:82` 로 적고 «인용 범위가 셋째를 담지 않는다» 고 했으나, **이 나무에서 다시 재니 `:77`·`:80` 이었다.** 감사관이 인용한 값과 실측이 어긋나므로 **F-12 의 그 항목은 수용하지 않는다** — 대신 `design.md` §A 가 세 줄 번호를 개별 앵커와 함께 적어 다음 라운드가 범위 대신 앵커로 대조하게 했다.

### A.4 초대 발급 — `:62-65`, 그 뒤는 무관한 라우트

```
$ grep -n "randomBytes(32)\|INSERT INTO bot_tokens\|reply.code(201)" server/src/routes-bots.ts
63:    const token = randomBytes(32).toString('hex')
64:    db.prepare('INSERT INTO bot_tokens (room_id, bot_id, token_hash) VALUES (?, ?, ?)')...
65:    return reply.code(201).send({ bot_id: bot.id, bot_name: bot.name, token, command: ... })
```

`:62` 는 기존 활성 토큰 철회(`UPDATE … revoked_at`)이고, `:66` 이후는 **초대 목록** 라우트다. 초판이 `:64-71` 로 인용해 범위가 무관한 코드로 넘쳤다(1회차 감사 F-12).

### A.5 [HARD] 서버는 TLS 를 종단하지 않는다 — **2회차가 새로 조사한 것**

```
$ grep -rn "https\|createSecureServer\|cert" server/src/*.ts | grep -vi "keyHex\|token\|hmac\|sha256"
(출력 없음)

$ grep -rn "Fastify(" server/src/*.ts
server/src/index.ts:34:  const app = Fastify({ logger: false })
```

`createGateway` 는 `new WebSocketServer({ server: app.server, path: '/bot' })` 로 그 앱의 서버 위에 얹힌다(`server/src/gateway.ts` 머리 부분). **따라서 서버 쪽 WebSocket 소켓은 어떤 배치에서도 TLS 소켓이 아니다** — 루프백 개발 배치에서도, `wss://` 를 역방향 프록시가 종단하는 배치에서도 그렇다.

**이 실측이 2회차의 설계를 바꿨다.** 리드 디스패치는 채널 바인딩이 «루프백을 뺀 모든 곳에서 선다» 는 전제로 처방을 주었으나, 실제로는 **오늘 어디에서도 서지 않는다.** 그 사실을 `spec.md` §2.8.4·§5, `design.md` §E, AC-GWAUTH2-024 가 함께 진다.

### A.6 전송 허용 규칙 — 평문은 루프백뿐

```
$ sed -n '29,39p' channel/src/index.ts
export function isTransportAllowed(url: string): boolean {
  ...
  const schemeOk = u.protocol === 'ws:' || u.protocol === 'wss:'
  if (LOOPBACK_HOSTS.includes(u.hostname)) return schemeOk
  return u.protocol === 'wss:'
}
```

**«바인딩이 서지 않는 평문 연결» 이 루프백으로 한정되는 근거가 이 함수다.** 그래서 `spec.md` §2.8.5 가 그 자리의 상대를 «루프백 포트 선점» 으로 특정해 성격을 규정할 수 있다.

### A.7 채널 바인딩 API 의 존재

```
$ node -e "console.log(typeof require('node:tls').TLSSocket.prototype.exportKeyingMaterial)"
function
```

```
$ node -e "console.log(require('fastify/package.json').version)"
5.12.1
```

`ws` 인스턴스의 밑 소켓은 `_socket` 인스턴스 필드로 노출된다(프로토타입 속성이 아니라 생성자가 세운다 — `WebSocket.prototype` 의 속성 목록에 `_socket` 이 없음을 확인했다). Fastify 5.12.1 은 `https` 옵션을 받으므로 **시험 안에서 TLS 종단 서버를 세우는 데 생산 코드 변경이 필요 없다.**

---

## §B 기각한 대안과 그 근거

### B.1 검증자 저장 — 대칭 검증자를 기각한다

| 대안 | 기각 근거 |
|---|---|
| `bot_tokens` 에 `HMAC(salt, T)` 같은 소금 섞은 대칭 검증자를 저장한다 | 그 값을 읽은 상대는 **여전히 봇을 사칭하기에 충분한 값**을 갖는다. 「검증자」가 뜻하는 것 — 서버가 **검증만 할 수 있고 만들 수는 없는** 값 — 을 만족하는 것은 비대칭 키뿐이다. 컬럼 이름만 바꾸고 위협표의 칸은 그대로 둔다 |
| `token_hash` 를 남긴 채 새 컬럼을 더한다 | v1 조회 경로가 코드에서 사라져도 **데이터가 남아** 다음 카드가 «아직 쓰이는가» 를 다시 판정해야 한다. 이 프로젝트가 여러 번 겪은 «죽은 자리가 살아 있는 것처럼 보이는» 부류다 |
| `generateKeyPairSync('ed25519')` 로 키쌍을 만든다 | **씨앗을 받지 않는다.** 채널은 디스크 무상태라 매 기동마다 T 에서 **결정적으로** 같은 키쌍을 얻어야 하므로 이 API 로는 성립하지 않는다. PKCS#8 DER 로 씨앗을 감싸 `createPrivateKey` 에 넣는 절차가 대신 선다(`plan.md` §D-1) |

### B.2 열쇠를 하나로 두는 안

서명 키쌍 하나로 양방향을 처리하는 안을 기각했다. **서버가 가진 것은 공개값 `pub` 뿐이므로 `pub` 으로 만든 서버 증명은 `pub` 을 아는 누구나 만든다** — 그리고 `hello` 를 받는 상대는 방금 `pub` 을 받았다. v1 의 실패가 글자 그대로 재현된다. 그래서 `k_srv` 를 별도 라벨로 유도한다(`plan.md` §D-2).

**대가를 적는다**: 이 결정이 «읽기 전용 DB 유출» 행의 게이트웨이 사칭 칸을 열어 둔다. 완전한 해소는 서버 키쌍 + 공개키 고정이며 `spec.md` §5 가 범위 밖에 두었다.

### B.3 채널 바인딩 — 세 대안을 기각했다 (2회차)

`plan.md` §D-10 이 정본이며 여기서는 **왜 그 셋이 이 코드베이스에서 특히 성립하지 않는지**를 덧붙인다.

| 대안 | 이 코드베이스에서의 기각 근거 |
|---|---|
| 서버가 `challenge` 에 «연결 식별자» 를 실어 보낸다 | 전선에 실리는 값은 **정의상 전달 가능**하다. 중계자는 위조하지 않고 전달하므로 이 축에서 아무것도 세우지 못한다. 이것이 `cb` 를 프레임에 싣지 않는 이유이며(REQ-GWAUTH2-021), **가장 흔한 오설계**다 |
| 상대의 TLS 인증서 지문을 전사에 넣는다 | 서버가 같은 값을 계산하려면 자기 인증서를 알아야 한다. **§A.5 가 실측한 대로 서버는 인증서를 갖지 않으며**, 역방향 프록시 배치에서 채널이 보는 인증서는 프록시의 것이다. 서버에 «기대 지문» 을 설정하면 그것은 `spec.md` §5 가 범위 밖에 둔 **공개키 고정**이 된다 — 순환이다 |
| 주소·포트 쌍을 전사에 넣는다 | NAT·프록시·컨테이너 경계에서 양쪽이 보는 값이 달라 **정상 구현이 거짓 실패한다.** 그리고 주소를 위장할 수 있는 배치에서는 방어도 되지 않는다 |

**채택안(RFC 5705 내보내기)이 가진 성질**: 한 TLS 연결의 양 종단에서 같고 서로 다른 연결에서는 다르다. 중계자는 두 연결을 종단하므로 두 값을 갖고, 대체가 성립하지 않는다(서버가 **자기 연결의 값을 스스로 계산**한다).

**채택안의 한계는 숨기지 않는다**: TLS 가 없으면 값이 없다. §A.5 의 실측이 그 한계를 오늘의 전 배치로 확대한다.

### B.4 하위 호환을 남기는 안

서버가 v1 `hello` 도 계속 환영하는 안을 기각했다. v1 의 근거(«공격자는 서버 쪽에 서는 상대이고 거절 결정은 보호받는 쪽이 내린다»)는 **v2 에서 서버도 보호받는 쪽이 되므로 성립하지 않는다.** 옛 경로를 남기면 공격자가 v1 채널을 흉내내 **평문 토큰을 되받는 경로로 내려가면 되고**, 요소 ①이 무의미해진다. 하향 협상이다.

**대가**: 이미 발급된 모든 봇 토큰이 무효가 되고 마이그레이션 경로가 없다. 서버는 평문 토큰을 저장한 적이 없으므로 `token_hash` 에서 `verifier_pub` 을 유도할 수 없다.

### B.5 봉투 대신 프레임 객체에 `mac` 필드를 더하는 안

기각 근거는 **정규화**다. «무엇을 직렬화한 바이트에 MAC 했는가» 가 계약이 되고, 키 순서·숫자 표기·유니코드 이스케이프에서 서버와 채널의 `JSON.stringify` 가 어긋나면 **정상 구현이 거짓 실패한다.** 그 어긋남은 단위 기준으로 드러나지 않고 왕복 기준만 잡는다. `payload` 를 문자열로 두면 정규화 규칙이 존재하지 않으므로 어긋날 자리가 없다.

---

## §C 인용한 값 — **이 패스가 재지 않았다**

**[HARD] 아래는 다른 문서가 다른 시점에 측정한 값의 인용이며, 이 조사가 재실행하지 않았다.** 섞어 적으면 «예측을 실측이라 부르는» 부류가 된다.

| 값 | 출처 | 언제 측정됐는가 |
|---|---|---|
| `welcome` 을 보내는 하네스 6자리 | `SPEC-GWAUTH-001` §3.2 재측정 표 | **v1 착지 이전 트리** |
| 영향 집합 상한 55건 (channel) | 같음 | 같음 |
| server 쪽 붕괴 규모 | — | **미측정** |
| Ed25519 DER 접두 상수 둘, 공개키 32바이트, 서명 64바이트 | `spec.md` §2.2 · `plan.md` §D-1 (초판이 node v24.12.0 에서 확인했다고 적는다) | **이 조사가 재실행하지 않았다.** §A.7 은 `exportKeyingMaterial` 의 존재만 쟀다 |
| `.moai/reports/t15` 의 `spec.md:NNN` 인용 88건 | `plan.md` §B-8 | 개수만 쟀고 **개별 대조는 두 건뿐**(1회차 감사 §6-2) |

**넷 전부를 `plan.md` §C 사전 점검이 run 착수 시점에 다시 잰다.** 특히 Ed25519 유도는 §C 5번이, 발신 경로는 §C 2b 가, TLS 부재는 §C 6번이 재확인한다.

---

## §D 이 조사가 하지 **않은** 것

정직하게 열거한다. 다음 라운드가 이 목록을 근거로 범위를 정할 수 있다.

1. **형제 SPEC 일곱을 통독하지 않았다.** `SPEC-GATEWAY-001`·`SPEC-CHANCLIENT-001`·`SPEC-CHANAUTH-001`·`SPEC-BOT-001`·`SPEC-CHANPERM-001`·`SPEC-CHANWIRE-001`·`SPEC-CHANNEL-001`. `hello`/`welcome`/`token_hash`/`proof` grep 훑기에 그쳤고, **grep 이 잡는 것은 하한이지 개수가 아니다.** `plan.md` §B-2 가 통독을 run 진입 전 [차단] 항목으로 올린다.
2. **스위트를 돌리지 않았다.** `npm test`·`npm run typecheck` 를 실행하지 않았으므로 base 개수나 형제 하네스의 실제 파손 범위에 대해 아무 주장도 하지 않는다.
3. **F-01 의 공격을 코드로 재현하지 않았다.** 구현이 아직 없으므로 실행 프로브를 만들 대상이 없다. 추적의 각 단계는 SPEC 본문의 조항과 §A 의 실측에 근거를 달았으나 **이것은 문서 추론이지 실행 증거가 아니다.** AC-GWAUTH2-022·024 가 run 단계에서 실행으로 확정한다.
4. **억제된 프레임의 채널 쪽 귀결을 확인하지 않았다.** `channel/src/channel-server.ts` 의 무판정 기본 동작을 읽지 않았으므로 선택적 억제의 심각도를 주장하지 않는다(`design.md` §E.0).
5. **역방향 프록시 배치의 실물을 확인하지 않았다.** §A.5 는 **저장소 안**에 TLS 종단이 없음을 쟀을 뿐, 운영자가 어떤 프록시를 어떻게 세우는지는 이 저장소 밖의 값이다. **그 질문은 후속 카드 `t23`(«서버 TLS 종단 · §1.1 무조건 종결»)이 진다**(`spec.md` §5, `plan.md` §B-0c 결정 3).
6. **`sha256Hex` 의 전 소비자를 열거하지 않았다.** `server/src/gateway.ts:7` 의 import 하나만 확인했다. `plan.md` §C 3번이 전건을 뽑는다.

---

## §E 교차 참조

- `spec.md` §2.8 — 채널 바인딩의 WHAT. §2.8.3 이 세션 열쇠 유도 포함의 근거를, §2.8.4 가 §A.5 의 실측 귀결을, §2.8.5 가 루프백 잔여의 성격 규정을 진다
- `plan.md` §D-10 — 채널 바인딩의 HOW (라벨·길이·컨텍스트 인자·소켓 접근·판별·시험 조건)
- `design.md` §E — 위협별 실패 지점. 전송 조건을 함께 적는 표
- `acceptance.md` AC-GWAUTH2-022·023·024 — 이 조사가 연 세 자리를 각각 재는 기준
- `acceptance.md` AC-GWAUTH2-004 ㉡ — **§B.3 첫 행이 기각 근거로 쓴 성질(«전선에 실리는 값은 정의상 전달 가능하다»)을 재는 자리.** `hello`·`challenge`·`auth`·`env` 의 키 집합을 각각 `toEqual` 로 고정한다. **3회차까지 이 성질을 프레임 전건에 대해 재는 기준이 없었고**, `design.md` §B.1 이 AC-GWAUTH2-003 을 근거로 적었으나 그 기준은 `hello` 하나만 쟀다(3회차 감사 H-02). **기각 근거로 쓴 성질에는 그것을 재는 기준이 붙어야 한다** — 붙지 않으면 기각의 근거가 강제되지 않는 가정 위에 선다
- `acceptance.md` AC-GWAUTH2-009 · `spec.md` REQ-GWAUTH2-002 — §B.1·§B.2 가 «열쇠 둘의 독립 유도» 를 근거로 대칭 검증자와 단일 열쇠를 기각했고, 그 독립이 깨졌을 때 붉어지는 자리가 AC-GWAUTH2-009 다(변이 AA). **전이적 관측이므로 두 문서가 그 전이를 명시한다**
- `.moai/reports/t22/plan-audit.md` — 1회차 계획 감사 (FAIL 0.83). 이 문서가 존재하는 이유의 절반
- `.moai/reports/t15/sync-audit.md` F-01·F-02 — 이 카드가 존재하는 이유

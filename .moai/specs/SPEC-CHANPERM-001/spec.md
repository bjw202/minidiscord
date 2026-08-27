---
id: SPEC-CHANPERM-001
title: "minidiscord 채널 권한 릴레이 — Claude Code 의 승인 요청을 게이트웨이로 넘기고 판정을 되돌린다"
version: "0.2.2"
status: in-progress
created: 2026-08-27
updated: 2026-08-27
author: manager-spec
priority: P0
phase: "v0.1.0 target"
module: "channel/"
lifecycle: spec-anchored
tags: "permission-relay, channel-plugin, mcp-notification, verdict, stateless, gateway-bridge"
tier: M
depends_on: [SPEC-CHANNEL-001, SPEC-CHANCLIENT-001, SPEC-CHANWIRE-001, SPEC-PERM-001]
---

# SPEC-CHANPERM-001 — 권한 릴레이 (채널 쪽)

## HISTORY

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.2.2 | 2026-08-27 | **sync 감사 마감 라운드 (기록 전용).** `.moai/reports/t4/sync-audit.md` 는 이 SPEC 의 수용 기준 품질을 **양호**로 판정했다 — 변이 5종(M11~M14·M20) 전건 사망, 각각 표적 기준 하나만 무너뜨렸다. 따라서 기준을 하나도 고치지 않았고, 요구사항 10개·수용 기준 12개 모두 그대로다. 대신 **미해소 결함 두 건을 기록했다.** (1) **F-01(Critical)** — 인증되지 않은 상대의 `allow` 판정이 세션으로 중계되는 경로이며, 감사자가 요구한 수정은 **REQ-CHANPERM-008 과 AC-CHANPERM-008 의 개정을 전제로 한다**(현재의 무상태 계약과 충돌). 이 카드는 그 개정을 하지 않았고 판단도 내리지 않았다 — 열린 계약 질문으로 §4.3 과 `acceptance.md` AC-CHANPERM-008 양쪽에 적었다. (2) **F-14(High)** — 방 멤버십 개념이 없어 서버에 계정이 있는 누구나 임의 방의 승인을 대신 눌러 줄 수 있다. 서버 쪽 인가 문제이고 카드 `t7` 의 `request_id` 결함과는 다른 항목이므로 §5 에 별도로 기록했다. | manager-spec |
| 0.2.1 | 2026-08-27 | **plan-audit 사소 2건 정리 (m1·m6).** m1 — AC-CHANPERM-001 이 `--reporter=verbose` 출력의 테스트 **이름**만 재고 본문이 그 테스트를 "원본"이라 불러, 구현자가 원본의 `as any` 스키마 형태(정상 구현을 거짓 실패시키는 부류)를 정본으로 되살릴 여지가 있었다. 기준을 **왕복 상관 관측**으로 바꿨다 — 나가는 경로에서 실제로 관측한 `request_id` 를 되먹여 돌아온 알림이 원래 값을 싣는지 잰다. 두 경로 중 어디서든 id 를 파생·재작성하는 구현을 잡으며, 리터럴 id 를 쓰는 002·003·005·006 어느 것도 잡지 못하던 자리다. 정본이 원본 테스트가 아니라 공통 하네스임을 `acceptance.md` 와 `plan.md` §F M1 에 명시했다. m6 — §3 코드 블록의 소유자 주석을 "확장 후 최종 형태"로 고쳤다. **요구사항 10개·수용 기준 12개는 그대로다.** | manager-spec |
| 0.2.0 | 2026-08-27 | **plan-audit 교정 라운드.** `.moai/reports/t4/plan-audit.md` 가 이 SPEC 을 포함한 채널 SPEC 4종을 **CONDITIONAL PASS** 로 판정하고, 이 SPEC 몫으로 주요 3건(M2·M3·M4)을 지적했다. M2·M3 은 §3.1 의 `request_id` 가정 두 개가 **실제 서버 코드와 어긋난다**는 것 — 방 대조는 `permissions.ts:49` 에 이미 있어 "다른 방의 판정이 섞인다"는 거짓이고, 대소문자 불일치는 `:47` 의 조회 단계에서 먼저 걸려 "돌아온 id 가 다르다"가 아니라 **판정이 아예 나가지 않는다**. 둘 다 실제 고장 경로와 사용자가 보는 증상으로 다시 썼고(§3.1, §5), 카드 `t7` 위임 문구도 같은 문장으로 맞췄다. M4 는 `acceptance.md` 하네스의 고정 50ms 대기 문제로 그쪽에서 닫았다. 부기로 지적된 SDK capability 위험은 `plan.md` §E 와 §F M1 에 등록했다. **요구사항 10개·수용 기준 12개는 개수·내용 모두 그대로다** — 채널 쪽 동작은 두 기술 중 어느 쪽에서도 같기 때문이다. | manager-spec |
| 0.1.0 | 2026-08-27 | 최초 작성. `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 14 에서 도출 (칸반 카드 `t4`, 마일스톤 M4). 요구사항 10개·수용 기준 12개로 Tier M 상한(16/16) 안이다. 서버 쪽 릴레이(`SPEC-PERM-001`)는 이미 구현돼 있어 이 SPEC 은 그 반대편 끝을 맡는다 — 서버 쪽 계약은 재정의하지 않고 소비만 한다. `request_id` 에 대해 채널이 세우는 가정 세 가지를 §3.1 에 명시했고, 그중 대소문자 가정은 `SPEC-PERM-001` / 카드 `t7` 의 미해결 결함과 맞물리므로 §3.1 과 §5 에 교차 의존으로 기록했다. | manager-spec |

---

## 1. 배경과 목적

봇은 Claude Code 세션이고, 그 세션 옆에 채널 플러그인 프로세스가 하나 붙어 있다. 세션이 `Bash` 같은 승인 필요 도구를 호출하면 Claude Code 는 **채널에게** 승인을 물어본다 — `notifications/claude/channel/permission_request` 알림을 보내고, 답이 올 때까지 그 도구 호출을 멈춘다.

`SPEC-PERM-001` 은 그 물음을 방에 띄우고 사람의 `yes <ID>` 를 판정으로 되돌리는 **서버 쪽 절반**을 이미 만들었다. 그런데 그 절반만으로는 회로가 닫히지 않는다. 서버는 봇 소켓으로 `permission_verdict` 를 내보낼 뿐이고, 그 payload 를 다시 Claude Code 의 알림으로 바꿔 주는 조각이 아직 없다.

이 SPEC 이 그 조각이다. 채널은 양방향 중계기 하나이며, 두 방향 모두 **번역만 하고 판단하지 않는다**.

```
Claude Code ──notifications/claude/channel/permission_request──▶ 채널 서버
                                                                    │ deps.sendPermissionRequest
                                                                    ▼
                                                  게이트웨이 클라이언트 ──{ type:'permission_request', … }──▶ 서버
                                                                                                              │ SPEC-PERM-001
                                                                                                              ▼
                                                                                                        방 / 사람
                                                                                                              │ "yes abcde"
게이트웨이 클라이언트 ◀──{ type:'permission_verdict', request_id, behavior }────────────────────────────────────┘
        │ onVerdict
        ▼
채널 서버 handlePermissionVerdict ──notifications/claude/channel/permission──▶ Claude Code (도구 호출 재개)
```

이 SPEC 이 끝나면 사람이 웹 UI 의 방에서 친 `yes abcde` 한 줄이 멈춰 있던 세션의 `Bash` 호출을 실제로 재개시킨다.

근거 문서: `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 14(계약·구현 지시), Task 11(`ChannelDeps`·`ChannelHandle`), Task 12(`GatewayClient`), Task 13(`wire`), `spec-v2.md` 4-B(채널 계약)·7장(권한 릴레이 흐름).

## 2. 용어

| 용어 | 뜻 |
|------|-----|
| 채널 서버 | `createChannelServer(deps)` 가 만드는 MCP 서버 하나. Claude Code 와 stdio 로 말한다 |
| 승인 요청 알림 | Claude Code → 채널 방향의 `notifications/claude/channel/permission_request`. params 는 `{ request_id, tool_name, description, input_preview }` |
| 판정 알림 | 채널 → Claude Code 방향의 `notifications/claude/channel/permission`. params 는 `{ request_id, behavior }` |
| 판정 / verdict | 게이트웨이가 봇 소켓으로 보내오는 `{ type: 'permission_verdict', request_id, behavior }`. `behavior` 는 `'allow'` 또는 `'deny'` |
| `request_id` | 승인 요청 하나를 가리키는 식별자. **Claude Code 가 만든다** — 채널도 서버도 만들지 않는다 |
| 배선 (`wire`) | `channel/src/index.ts` 가 채널 서버와 게이트웨이 클라이언트를 묶는 함수 (`SPEC-CHANWIRE-001` 소유) |
| 무상태 | 채널 프로세스가 디스크에 아무것도 쓰지 않고, 대기 중인 요청을 기억하지도 않는 성질 |

두 알림 메서드 이름이 **한 단어 차이**라는 점을 여기 적어 둔다 — 들어오는 쪽은 `…/permission_request`, 나가는 쪽은 `…/permission` 이다. 이 SPEC 의 기준 두 개(AC-CHANPERM-002·005)가 그 차이를 직접 관측한다.

## 3. 선행 SPEC에서 받아 쓰는 것

이 SPEC 은 새 도구도 새 알림 메서드도 새 WebSocket 메시지 타입도 만들지 않는다. 다음을 그대로 소비한다.

| 출처 | 받아 쓰는 것 |
|------|-------------|
| `SPEC-CHANNEL-001` (Task 11) | `createChannelServer(deps): ChannelHandle`, `ChannelDeps`, `ChannelHandle`, 내부 `mcp` 서버 인스턴스 |
| `SPEC-CHANCLIENT-001` (Task 12) | `GatewayClient.send(payload): boolean`, `GatewayClientOpts.onVerdict` |
| `SPEC-CHANWIRE-001` (Task 13) | `wire(opts): { channel, gw }` — 이 SPEC 은 그 안에 두 줄을 더한다 |
| `SPEC-PERM-001` (서버) | 봇 소켓으로 나가는 `{ type: 'permission_verdict', request_id, behavior }` 의 형태, 그리고 서버가 `permission_request` 를 **`msg` 통째로** 핸들러에 넘긴다는 사실 |

두 선행 인터페이스를 축약 없이 옮긴다. 이 SPEC 은 두 곳에 **선택적 멤버 하나씩**을 더할 뿐, 기존 멤버의 이름·타입을 바꾸지 않는다.

```ts
// 확장 후 최종 형태. 두 인터페이스의 뼈대는 SPEC-CHANNEL-001 소유이고,
// sendPermissionRequest 와 handlePermissionVerdict 두 멤버는 이 SPEC 이 더한다.
interface ChannelDeps {
  sendToChat: (payload: { text: string; files?: string[] }) => Promise<void>
  fetchHistory: (params: { since_id?: number; since?: string; until?: string; speaker?: string; limit?: number }) => Promise<string>
  sendPermissionRequest?: (params: { request_id: string; tool_name: string; description: string; input_preview: string }) => void
}
interface ChannelHandle {
  server: Server
  pushChatMessage(msg: { … }): Promise<void>
  handlePermissionVerdict(v: { request_id: string; behavior: 'allow' | 'deny' }): void
}

// SPEC-CHANCLIENT-001 소유
send(payload: object): boolean
onVerdict?: (v: { type: 'permission_verdict'; request_id: string; behavior: 'allow' | 'deny' }) => void
```

`sendPermissionRequest` 가 옵셔널인 것은 Task 11 계약 그대로다. 채널 서버는 그 의존이 없는 배선에서도 동작해야 한다 — §4.1 REQ-CHANPERM-003 참조.

### 3.1 `request_id` 에 대해 채널이 세우는 가정 (명시)

`request_id` 는 채널이 만들지도, 검증하지도, 변형하지도 않는 값이다. 그런데 **아무 가정도 하지 않는 것은 불가능하다** — 회로가 닫히려면 나가는 `request_id` 와 돌아오는 `request_id` 가 같은 문자열이어야 하기 때문이다. 채널이 실제로 기대는 가정은 셋이고, 여기 드러내 둔다.

| # | 가정 | 누가 보장하는가 | 깨지면 |
|---|------|----------------|--------|
| 가정-1 | `request_id` 는 **Claude Code 가 생성한다.** 채널도 서버도 만들지 않으며, 형식(길이·문자 집합)은 채널의 관심사가 아니다 | Claude Code (채널 계약) | 채널이 형식을 검증하면 Claude Code 형식 변경 때 릴레이가 통째로 죽는다. 그래서 검증하지 않는다 (REQ-CHANPERM-002) |
| 가정-2 | 한 채널 프로세스가 다루는 `request_id` 는 **그 프로세스 안에서 유일하다.** 채널은 세션 하나에 하나씩 뜨고 정확히 한 방에만 속하므로, 채널이 다른 세션·다른 방의 `request_id` 를 볼 일이 없다 | 아키텍처 (세션→방 N:1, 채널 프로세스=세션 1:1) | 서버의 대기 맵 키가 `request_id` 하나뿐이라(`permissions.ts:21, 33`), 서로 다른 두 방이 **같은 `request_id`** 를 동시에 대기시키면 뒤엣것이 앞엣것의 `ConnInfo` 를 덮어써 앞 요청이 영구히 고아가 된다 — **미해결. 카드 `t7` / `SPEC-PERM-001` 소유** |
| 가정-3 | 돌아오는 판정의 `request_id` 는 나갈 때의 문자열과 **글자 그대로 같다** | 서버 (`SPEC-PERM-001`) | 서버는 원본 id 로 등록하고(`permissions.ts:33`) 소문자 id 로 조회한다(`permissions.ts:46-47`). 대문자가 섞인 id 는 조회가 먼저 빗나가 `false` 로 흘러가므로 **판정이 아예 전송되지 않는다** — **미해결. 카드 `t7` / `SPEC-PERM-001` 소유** |

**가정-2 는 방 간 오배달이 아니다.** 서버 브로커는 대기 항목의 방과 답이 들어온 방을 대조하고(`permissions.ts:49` — `if (info.roomId !== roomId) return false`), 다른 방에서 친 답은 소비하지도 전송하지도 않는다. 즉 "다른 방의 판정이 섞여 들어온다"는 누출은 **현재 코드에 존재하지 않는다.** 남아 있는 결함은 위 표의 전역 키 충돌 하나이고, 그 증상은 판정이 섞이는 것이 아니라 **앞 요청의 대기 항목이 사라지는 것**이다. 그 방의 사람은 안내대로 `yes <id>` 를 쳐도 아무 일도 일어나지 않는다.

**가정-3 이 깨졌을 때 사람이 보는 증상**도 적어 둔다. 조회가 빗나가 `tryHandleUserReply` 가 `false` 를 돌려주므로, 사용자가 친 `yes AbC12` 는 **평범한 대화 메시지로 저장되고** 방에는 `✅ 승인 전송됨` 도 `⚠️ 전달하지 못했습니다` 도 뜨지 않는다. "세션이 재개되지 않는다"만 보고 채널을 의심하기 쉬운 자리라, 진단 지점을 서버 조회 경로로 못 박아 둔다.

**두 가정 모두 이 SPEC 에서 고치지 않는다.** 둘 다 서버 쪽 결함이고, 채널에서 보상하려면(가정-2 는 방 정보를 채널이 붙여 보내는 계약 변경, 가정-3 은 나가는 id 를 채널이 소문자로 낮추는 변형) 계약을 바꾸거나 REQ-CHANPERM-007 을 어겨야 한다. 이 SPEC 이 하는 일은 **가정을 코드가 아니라 문서에 드러내는 것**이며, 채널 쪽 동작은 어느 쪽으로도 흔들리지 않는다 — 채널은 받은 문자열을 그대로 넘기고(REQ-CHANPERM-007), 짝이 맞지 않는 판정이 와도 죽지 않는다(REQ-CHANPERM-008).

교차 SPEC 의존: **가정-2·가정-3 의 해소는 `SPEC-PERM-001`(카드 `t7`)에 달려 있다.** 그쪽이 대기 맵을 방별로 키잉하고 등록·조회의 대소문자 기준을 일치시키면 두 가정은 저절로 참이 된다. 그때 이 SPEC 은 한 글자도 고칠 필요가 없다 — 그것이 이 설계를 고른 이유다.

> **v0.2.0 교정 기록 (M2·M3).** v0.1.0 은 가정-2 의 고장을 "다른 방의 판정이 섞여 들어온다", 가정-3 의 고장을 "돌아온 id 가 원본과 달라 짝을 못 찾는다"로 적었다. 감사자가 `server/src/permissions.ts` 원문과 대조해 **둘 다 실제 코드와 어긋남**을 지적했다 — 방 대조는 `:49` 에 이미 있고, 대소문자 불일치는 `:47` 의 조회 단계에서 먼저 걸려 판정 자체가 나가지 않는다. 잘못된 기술을 근거로 카드 `t7` 이 수정 범위를 잡으면 존재하지 않는 누출을 막느라 방별 라우팅을 다시 짜고 실재하는 키 충돌은 그대로 남는다. 요구사항과 수용 기준은 이 교정으로 하나도 바뀌지 않았다 — 채널 쪽 동작은 두 기술 중 어느 쪽에서도 같기 때문이다.

---

## 4. 요구사항 (GEARS)

### 4.1 승인 요청 릴레이 (Claude Code → 게이트웨이)

**REQ-CHANPERM-001** (When — 이벤트 구동)
Claude Code 에서 `notifications/claude/channel/permission_request` 알림이 도착하면, 채널 서버는 그 알림의 `params` 를 `deps.sendPermissionRequest` 에 **정확히 한 번** 넘겨야 한다.

**REQ-CHANPERM-002** (Ubiquitous)
넘기는 `params` 는 받은 것과 같아야 한다 — 네 필드(`request_id`, `tool_name`, `description`, `input_preview`)의 이름과 값이 그대로 보존되어야 하며, 채널은 값을 절단하거나 마스킹하거나 대소문자를 바꾸거나 필드를 더하거나 빼서는 안 된다. 알림 메서드 이름은 문자열 `'notifications/claude/channel/permission_request'` 와 정확히 일치할 때만 이 경로를 타야 한다.

`input_preview` 의 절단·마스킹은 `SPEC-PERM-001` §5 가 이미 범위 밖으로 두었다. 양쪽이 모두 통과시키므로 원문이 방까지 도달한다 — 의도된 동작이다.

**REQ-CHANPERM-003** (Where — 의존 부재 조건)
`deps.sendPermissionRequest` 가 주어지지 않은 배선에서도, 승인 요청 알림의 도착은 예외를 던지지 않아야 하고 채널 서버의 나머지 기능(도구 호출·채팅 알림)을 망가뜨려서도 안 된다. Task 11 계약이 이 의존을 옵셔널로 정의했기 때문이다.

**REQ-CHANPERM-004** (Where — 배선 조건)
`channel/src/index.ts` 의 `wire` 가 채널 서버와 게이트웨이 클라이언트를 묶는 경로에서, 두 방향이 모두 이어져야 한다.

- `sendPermissionRequest` 는 받은 `params` 를 `GatewayClient.send({ type: 'permission_request', …params })` 로 내보내야 한다. `type` 필드가 붙는 것은 게이트웨이 프로토콜의 요구다 — 서버는 그 값으로 분기하고, 핸들러에는 **메시지 전체**를 넘긴다.
- `GatewayClientOpts.onVerdict` 는 `ChannelHandle.handlePermissionVerdict({ request_id, behavior })` 를 불러야 한다.

한쪽만 이으면 회로가 반만 돈다 — 요청은 방에 뜨는데 승인이 세션에 닿지 않거나(후자 누락), 세션은 멈춰 있는데 방에 아무것도 안 뜬다(전자 누락). 두 방향 모두 요구사항이다.

### 4.2 판정 반환 (게이트웨이 → Claude Code)

**REQ-CHANPERM-005** (When — 이벤트 구동)
`handlePermissionVerdict(v)` 가 호출되면, 채널 서버는 Claude Code 로 `notifications/claude/channel/permission` 알림을 **정확히 한 번** 보내야 하며, 그 `params` 는 `{ request_id, behavior }` 두 필드로만 이루어져야 한다.

**REQ-CHANPERM-006** (Ubiquitous)
알림의 `behavior` 는 호출자가 준 값이어야 한다 — `'allow'` 를 받으면 `'allow'`, `'deny'` 를 받으면 `'deny'` 가 Claude Code 에 도달해야 한다. 판정 값과 무관하게 한쪽 값을 보내는 구현은 이 요구사항을 만족하지 않는다.

거절이 승인으로 뒤집히는 것은 이 회로에서 가장 비싼 오작동이다. 사람이 `no` 라고 답했는데 세션이 `rm -rf` 를 실행하는 경로가 바로 여기다.

**REQ-CHANPERM-007** (Unwanted — shall not)
채널은 `request_id` 를 변형해서는 안 된다 — 대소문자를 바꾸거나, 공백을 다듬거나, 새로 만들어 붙여서는 안 된다. 양방향 모두 받은 문자열 그대로다. §3.1 가정-3 이 깨져 있는 동안 이 조항은 **채널이 그 결함의 두 번째 원인이 되지 않게** 하는 방어선이다.

### 4.3 불일치와 무상태 (금지 조항)

**REQ-CHANPERM-008** (Unwanted — shall not)
채널이 알지 못하거나 이미 해소된 `request_id` 에 대한 판정이 도착하더라도, 채널 프로세스가 죽어서는 안 되고 **다른 `request_id` 의 판정 알림을 만들어서도 안 된다**. 채널은 대기 중인 요청을 기억하지 않으므로(무상태), 판정과 요청을 짝짓는 일은 전적으로 Claude Code 의 몫이다 — 채널은 받은 `request_id` 를 그대로 실어 보내고 판단하지 않는다.

같은 `request_id` 로 판정이 두 번 오면 알림도 두 번 나간다. 두 번째를 채널이 삼키려면 해소된 id 목록을 기억해야 하는데, 그것이 곧 상태다. Global Constraints 의 무상태 원칙이 이 선택을 고정한다.

> **열려 있는 계약 질문 (감사 F-01, 미해소).** `.moai/reports/t4/sync-audit.md` 의 F-01(Critical)은 이 조항을 정면으로 겨눈다. 봇은 `hello` + 토큰으로 서버에 자신을 인증하지만 **서버는 봇에게 자신을 인증하지 않고**, `gateway-client` 는 접속 상태를 보지 않고 프레임의 `type` 만으로 분기한다. 그래서 채널이 내보낸 적 없는 `request_id` 의 `allow` 판정도 그대로 세션에 중계되는데 — 이것은 사고가 아니라 **이 조항이 요구하고 AC-CHANPERM-008 이 정상 동작으로 못 박은 계약**이다(`channel/test/permission-relay.test.ts`). 감사자가 요구한 수정 2번("채널이 실제로 내보낸 `request_id` 집합을 기억하고 그 안의 판정만 중계한다")은 **REQ-CHANPERM-008 과 AC-CHANPERM-008 의 개정을 전제로 한다** — 지금의 무상태 계약과 정면으로 충돌하기 때문이다.
>
> **이 카드는 그 개정을 하지 않았고, 판단도 내리지 않았다.** 무상태를 지킬 것인가(그러면 인증은 전송 계층 — `welcome` 게이팅과 `wss://` 요구 — 에서 해결해야 한다), 아니면 대기 id 를 기억하는 상태를 채널에 들일 것인가는 F-01 을 소유하는 별도 카드가 결정한다. 여기서는 **이 조항이 열린 질문의 대상**이라는 사실만 기록한다. 그 결정이 나기 전까지 REQ-CHANPERM-008 과 AC-CHANPERM-008 은 현재 문언대로 유효하다.

**REQ-CHANPERM-009** (Unwanted — shall not)
`handlePermissionVerdict` 는 전송이 불가능한 상태(Claude Code 와의 transport 가 아직 연결되지 않았거나 이미 끊긴 상태)에서 호출되더라도 동기 예외를 던져서는 안 되고, **처리되지 않은 프로미스 거부(unhandled rejection)를 남겨서도 안 된다**.

게이트웨이 판정은 채널이 stdio 에 붙기 전이나 종료 중에도 도착할 수 있다. Node 는 처리되지 않은 거부에 프로세스를 끝내며, 그러면 세션의 다른 모든 기능까지 함께 죽는다. `void mcp.notification(...)` 처럼 프로미스를 버리는 형태는 이 조항을 만족하지 않는다 — 거부 경로를 명시적으로 받아야 한다.

**REQ-CHANPERM-010** (Unwanted — shall not)
이 SPEC 의 구현은 새 MCP 도구를 만들어서는 안 되고, 새 알림 메서드 이름을 정의해서도 안 되며, 새 게이트웨이 메시지 타입을 도입해서도 안 되고, 디스크에 파일을 써서도 안 되며, `server/` 아래의 어떤 파일도 고쳐서는 안 된다.

이 SPEC 이 손대는 소스 파일은 정확히 둘이다 — 핸들러와 `handlePermissionVerdict` 를 더하는 `channel/src/channel-server.ts`, 배선 두 줄을 더하는 `channel/src/index.ts`. 계약 변경이 필요해 보이면 진행을 멈추고 보고한다.

---

## 5. 범위 밖 (Exclusions)

아래 항목은 이 SPEC 에서 **만들지 않는다**. 각 항목에 소유자 또는 배제 근거를 명시한다.

### Out of Scope — 서버 쪽 `request_id` 결함 두 건 (`SPEC-PERM-001` / 카드 `t7`)

§3.1 의 가정-2·가정-3 이 기대는 두 결함이다. 채널에서 고치거나 보상하지 않는다.

- **`request_id` 형식·대소문자 불일치.** 서버의 판정 정규식은 `[a-km-z]{5}` 만 받고(`permissions.ts:7`), 대기 등록은 원본 id 로 하면서 조회는 소문자 id 로 한다(`permissions.ts:33` ↔ `:46-47`). 그 형식을 벗어나거나 대문자가 섞인 id 는 **조회 단계에서 먼저 빗나가 판정이 전송되지 않는다** — 사람이 안내 문구대로 쳐도 그 줄이 평범한 대화 메시지로 남는다. 소유자는 서버다. 채널이 id 를 소문자로 낮춰 맞춰 주면 Claude Code 쪽 짝짓기가 대신 깨진다(REQ-CHANPERM-007).
- **전역 키 하나로 된 대기 맵.** 서버의 대기 레지스트리는 `request_id` 하나를 키로 쓴다(`permissions.ts:21, 33`). 방 대조는 이미 있으므로(`permissions.ts:49`) 방 간 오배달은 일어나지 않지만, 두 방이 같은 id 를 동시에 대기시키면 뒤엣것이 앞엣것을 덮어써 **앞 요청이 고아가 된다.** 채널은 이 사실을 알 수도 없고(자기 방밖에 보지 못한다) 고칠 수도 없다.

### Out of Scope — 서버 쪽 릴레이 전체 (`SPEC-PERM-001`)

- 대기 레지스트리, system 메시지 저장·발행, `PERMISSION_REPLY_RE` 판정 파싱, `sendToBot` 호출과 전달 실패 문구
- 게이트웨이의 `permission_request` 분기와 `setPermissionHandler` 등록

### Out of Scope — 서버 쪽 방 인가 (감사 F-14, 미해소)

`.moai/reports/t4/sync-audit.md` 의 F-14(High)는 **승인 권한이 방 참가와 무관하다**는 점을 지적했다 — 방 멤버십 개념이 코드베이스에 존재하지 않고(`grep -rn 'room_members\|membership\|requireMember' server/src` → 결과 없음), `request_id` 는 서버 스스로 방의 system 메시지로 공개하므로, **서버에 계정이 있는 누구나** 아무 방이나 열어 대기 중인 `request_id` 를 읽고 대신 승인해 줄 수 있다.

- `server/src/routes-messages.ts` 의 메시지 POST 에 방 멤버십 검사를 더하는 일
- `server/src/permissions.ts` 의 판정 수락 조건을 방 참가자로 좁히는 일

**이 카드에서 해소하지 않았고, 이 SPEC 의 범위도 아니다** — 서버 쪽 인가 모델이다. 카드 `t7` 에 인계된 서버 쪽 `request_id` 결함 2건(§3.1 가정-2·가정-3)과는 **다른 항목이다**: 저쪽은 형식·대소문자 문제이고 이것은 인가 문제이므로, 감사자는 별도 카드를 권했다. 여기서는 채널의 무상태 릴레이가 어떤 서버 위에서 도는지를 기록할 뿐이다.

### Out of Scope — 채널 코어와 게이트웨이 클라이언트

- `createChannelServer` 의 생성 자체, capabilities·instructions·`reply`·`fetch_history` 도구 (`SPEC-CHANNEL-001`)
- WebSocket 연결·`hello` 인증·재접속 백오프·`requestHistory` 의 rid 매칭 (`SPEC-CHANCLIENT-001`)
- `wire` 의 생성, 채팅 메시지 수신→세션 알림, `reply`→`bot_message`, `status` 전송 (`SPEC-CHANWIRE-001`). 이 SPEC 은 그 함수 **안에 두 줄**을 더할 뿐이다

### Out of Scope — 채널 쪽 정책과 상태

- 도구별 자동 승인 정책(allowlist), 승인 요청 빈도 제한, 요청 큐잉
- 미응답 타임아웃과 만료 처리. 만료 시 어떤 `behavior` 를 보낼지는 채널 계약 차원의 결정이라 Global Constraints 가 임의 변경을 금지한다
- 판정 대기 맵·해소된 id 기록 등 프로세스 메모리 상태. 무상태 원칙이 배제한다(REQ-CHANPERM-008)
- 게이트웨이 연결이 끊긴 동안 도착한 승인 요청의 버퍼링·재전송

### Out of Scope — 웹 UI 와 운영

- 방에 뜨는 system 메시지의 렌더링, 승인/거절 빠른 버튼 (카드 `t5`)
- 승인 이력 기록, 승인 통계, 감사 로그

---

## 6. 제약

- Node.js 20 이상, TypeScript strict 모드, `module: NodeNext`. 상대 import 는 `.js` 확장자를 붙인다.
- 채널 플러그인은 **무상태**다 — 디스크에 아무 파일도 쓰지 않고, 설정은 환경변수 `MINIDISCORD_TOKEN`, `MINIDISCORD_SERVER` 로만 받는다.
- 의존성은 선행 SPEC 이 설치한 것을 그대로 쓴다: `@modelcontextprotocol/sdk ^1`, `ws ^8`, `zod ^3`, `vitest ^2`. 이 SPEC 은 새 의존성을 추가하지 않는다.
- 테스트 프레임워크는 vitest. 실행 명령은 워크스페이스 루트에서 `npm test -w channel`.
- 채널 계약(capabilities·notification 메서드·reply 도구·권한 릴레이)은 `spec-v2.md` 4-B 와 공식 channels-reference 를 그대로 따른다. 두 알림 메서드 이름과 `params` 필드 이름, `behavior` 값(`'allow'`/`'deny'`)은 이 SPEC 에서 바꾸지 않는다. 변경이 필요해 보이면 중단하고 보고한다.
- 코드 주석은 한국어. 커밋 메시지는 영어 관례(`feat:`, `test:`).

---

## 7. 수용 기준

수용 기준 전체는 `acceptance.md` 에 있다. 각 기준은 명령 하나와 관측 가능한 결과 하나로 이루어진다.

## 8. 참조

- `.moai/plan/2026-08-26-minidiscord/plan-v2.md` — Global Constraints, 파일 구조, Task 14(이 SPEC 의 원본), Task 11·12·13(선행 계약)
- `.moai/plan/2026-08-26-minidiscord/spec-v2.md` — 4-B 채널 계약, 7장 권한 릴레이 흐름
- `.moai/specs/SPEC-CHANNEL-001/` — 채널 서버 코어 (`createChannelServer`, `ChannelDeps`, `ChannelHandle`)
- `.moai/specs/SPEC-CHANCLIENT-001/` — 게이트웨이 클라이언트 (`send`, `onVerdict`)
- `.moai/specs/SPEC-CHANWIRE-001/` — 배선 (`wire`)
- `.moai/specs/SPEC-PERM-001/` — 서버 쪽 권한 릴레이. §3.1 가정-2·가정-3 의 소유자
- 칸반 카드 `t4` (마일스톤 M4), 카드 `t7`(서버 쪽 `request_id` 결함)

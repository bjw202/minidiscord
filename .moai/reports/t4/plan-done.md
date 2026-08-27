# 카드 t4 — plan 단계 완료 보고

- **카드**: t4 (M4 채널 플러그인 / MCP 서버)
- **워크트리**: `.claude/worktrees/t4`
- **브랜치**: `WT-channel-plugin` (기반: `WT-msg-gateway-relay` 병합 = t1·t2·t3 포함)
- **작업 정의 출처**: `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 11-14 + Global Constraints
- **plan-audit 최종 판정**: **PASS**

---

## 1. SPEC-ID 및 산출물

Task 하나당 SPEC 하나. 네 SPEC 모두 `spec.md` / `plan.md` / `acceptance.md` / `progress.md` 4종을 갖췄고, 모두 `status: draft`, `module: "channel/"`, `tier: M`.

| SPEC-ID | 대응 Task | 범위 | 버전 | 수용 기준 | depends_on |
|---|---|---|---|---|---|
| `SPEC-CHANNEL-001` | Task 11 | `@minidiscord/channel` 패키지 + `createChannelServer` — Channels MCP 계약(capabilities·instructions·`reply`·`fetch_history` + `since_id`·`#번호`) | 0.1.0 | 16 | (없음) |
| `SPEC-CHANCLIENT-001` | Task 12 | `createGatewayClient` — hello/welcome 핸드셰이크, 재접속 백오프, `requestHistory`(rid 매칭·10초 타임아웃) | 0.2.1 | 16 | `SPEC-CHANNEL-001` |
| `SPEC-CHANWIRE-001` | Task 13 | `channel/src/index.ts` 배선 — 실행 가능한 `minidiscord-channel` 바이너리, `wire(opts)` | 0.2.0 | 14 | `SPEC-CHANNEL-001`, `SPEC-CHANCLIENT-001` |
| `SPEC-CHANPERM-001` | Task 14 | 채널 쪽 권한 릴레이 — `permission_request` 전달 + `handlePermissionVerdict` 회신 | 0.2.1 | 12 | 위 셋 + `SPEC-PERM-001` |

수용 기준 합계 **58개**. 의존 관계는 단일 사슬이며 순환 없음(감사 확인).

---

## 2. plan-audit 판정 경과

독립 검토는 `plan-auditor`가 2라운드 수행했다. 보고서 원문은 같은 디렉터리에 있다.

| 라운드 | 보고서 | 판정 | 지적 |
|---|---|---|---|
| 1차 | `plan-audit.md` | 조건부 승인 | blocker 1 / major 6 / minor 6 |
| 2차 (교정 재확인) | `plan-audit-2.md` | **PASS** | blocker·major 7건 전부 닫힘 확인 |

### 1차에서 닫은 차단·주요 7건

| # | SPEC | 내용 | 처리 |
|---|---|---|---|
| B1 | CHANWIRE | 임포트 부작용 기준이 같은 파일이 이미 임포트한 모듈을 다시 `import()` 해 ES 모듈 캐시만 돌려받음 → 최상단에서 무조건 접속하는 구현도 통과하는 **아무것도 재지 않는 기준** | 자식 프로세스 관측으로 교체 |
| M1 | CHANWIRE | 토큰 게이트가 형제 SPEC 의 stdio 프로브를 무력화하는데, 배선 이후 빌드 산출물이 MCP 를 말하는지 재는 기준이 없었음 | **계약 개정** — stdio 연결은 토큰과 무관, 토큰은 게이트웨이 접속만 가로막음. `AC-CHANWIRE-014` 신설 |
| M6 | CHANWIRE | 기본 주소 기준이 스텁을 `127.0.0.1:3000`(서버 자신의 기본 포트)에 바인딩 → 서버를 띄운 개발자에게 정상 구현이 거짓 실패 | `resolveUrl(env)` 로 포트와 분리 |
| M2 | CHANPERM | `request_id` 가정-2("다른 방 판정이 섞임")가 `server/src/permissions.ts:49` 의 방 대조와 모순 | 실재 결함(전역 키 충돌로 인한 대기 항목 유실)으로 좁힘 |
| M3 | CHANPERM | 가정-3 의 고장 기술이 틀림 — 실제로는 조회가 빗나가 **판정이 아예 전송되지 않음**(`:33` 원본 키 등록 vs `:46-47` 소문자 조회) | 실제 고장 경로·증상으로 재작성 |
| M4 | CHANPERM | 소켓 왕복을 고정 50ms 로 기다려 정상 구현을 거짓 실패 | `waitFor(..., 3000)` 조건 대기로 교체 |
| M5 | CHANCLIENT | `depends_on: []` 인데 본문은 `channel/` 스캐폴드를 실행 전제로 명시 → 스케줄러가 CHANNEL 보다 먼저 띄우면 AC 16개 전부 실행 불가 | `depends_on: [SPEC-CHANNEL-001]` |

사소 지적도 함께 닫았다: CHANPERM `m1`(원본 `as any` 형태를 정본으로 되살릴 여지가 있는 문구 + `AC-CHANPERM-001` 을 이름 관측 → 왕복 상관 관측으로 보강)·`m6`, CHANWIRE `m2`(`process.env` 오염 — 자식 프로세스 전환으로 소멸)·`n1`(`--input-type=module` — 없으면 선언 하한선 Node 20 에서 거짓 실패)·좀비 프로세스 수거(`spawnChild` 가 spawn 직후 `SIGKILL` 을 `cleanups` 에 등록), CHANCLIENT `m3`(없는 소비자를 가리키던 근거 문장 → 실제 소비자인 서버 재전송 경로로 정정).

---

## 3. 원본 계획서에서 발견해 교정한 결함

SPEC 작성 과정에서 `plan-v2.md` Task 11-14 의 테스트 예제 자체에 있던 결함을 찾아 각 SPEC 의 하네스에서 교정했다. 원본 문서는 수정하지 않았고, 교정 경위는 각 SPEC 의 `plan.md` §D 에 기록했다.

1. **`setNotificationHandler` 에 zod 스키마가 아닌 평범한 객체를 넘김** — SDK 가 `schema.shape.method.value` 로 등록 키를 만들므로 등록이 되지 않는다. `as any` 가 타입 검사도 가려 컴파일에서 걸리지 않는다. **배선이 완벽해도 알림 관련 기준이 전부 실패**한다. Task 11·13·14 세 곳에 있었고 세 SPEC 모두 zod 스키마로 교정.
2. **capabilities 검증이 아무것도 재지 않음** — 원본 테스트가 이름과 달리 `tools/list` 로 대신 확인해, `experimental['claude/channel']` 을 통째로 빼도 통과한다. 그 구현은 Claude Code 가 채널로 인식하지 않아 채팅이 한 건도 오지 않는데 오류는 나지 않는다. 빌드 산출물에 stdio 로 `initialize` 를 던져 응답 JSON 을 직접 읽도록 교정.
3. **`tsconfig.json` 을 server 에서 복사하면 `bin` 이 깨짐** — server 쪽은 `rootDir` 이 없어 산출물이 `dist/src/index.js` 에 놓이고 `bin: "./dist/index.js"` 는 없는 파일을 가리킨다. `npm test` 는 전부 통과하고(vitest 는 소스를 직접 읽음) 사용자가 플러그인을 실제로 실행할 때 처음 깨진다. 관측을 tsconfig 모양이 아니라 "빌드 산출물이 MCP 응답을 내놓는가"로 잡아 교정.
4. **`fetch_history` 반환 검증이 상수 스텁을 통과시킴** — 하네스가 인자에서 파생된 문자열을 돌려주도록 변경.

---

## 4. run 단계로 넘기는 사항

**먼저 확인할 것 (M1 단계 초입)** — 의존성을 설치하지 않은 상태에서 작성했으므로 MCP SDK 의 실제 API 표면은 미검증이다.

- `Server.notification()` 이 미선언 capability 의 알림을 거부하는지. 거부한다면 CHANPERM 의 나가는 `notifications/claude/channel/permission` 이 막힌다 — capabilities 는 `SPEC-CHANNEL-001` 소유이므로 그쪽에서 처리한다.
- `Client.getServerVersion()` 접근자 존재 여부. 없으면 `AC-CHANNEL-003` 의 해당 한 줄만 빼고 판정한다(`serverInfo` 는 `AC-CHANNEL-004` 가 독립 관측하므로 계약에 구멍은 없다).

**다른 카드로 넘기는 것**

- 서버 쪽 `request_id` 결함 2건(전역 키 충돌로 인한 대기 항목 유실, 소문자 정규화로 인한 판정 미전송)은 **카드 t7 소유**다. 채널 쪽은 무상태 원칙상 보상하지 않으며, t7 이 고쳐도 이 SPEC 들은 바뀌지 않는다. 단, 감사 결과 t7 의 근거 기술 두 곳이 실제 코드와 어긋나 있었으므로, **t7 착수 시 `SPEC-CHANPERM-001` §3.1 의 교정된 기술을 근거로 삼을 것**.

**알려진 틈 (수용 판정됨)**

- `AC-CHANWIRE-011`: 기본 주소 경로가 실제 접속에 쓰이는 것은 직접 관측하지 않고, 주소 결정 지점이 `resolveUrl` 호출 한 곳뿐이라는 사실에 기댄다. 더 강한 관측의 대안이 3000 번 포트 점유(= M6 로 지적한 거짓 실패)여서, 더 나쁜 결함을 더 작은 틈으로 바꾼 교환이다.

**미검증 (감사 보고서 §5·§8)**

- 테스트를 한 건도 실행하지 않았고 `node_modules` 는 비어 있다. `channel/` 디렉터리는 아직 없다 — run 단계가 만든다.
- 이음매 1(zod 스키마) 판정은 문서 대조 기반이며 실행으로 확인하지 않았다.

---

## 5. 다음 단계

`/moai run` — SPEC 실행 순서는 의존 사슬을 따른다:

```
SPEC-CHANNEL-001 → SPEC-CHANCLIENT-001 → SPEC-CHANWIRE-001 → SPEC-CHANPERM-001
```

`SPEC-CHANWIRE-001` 은 앞의 둘이 모두 끝나야 착수 가능하다.

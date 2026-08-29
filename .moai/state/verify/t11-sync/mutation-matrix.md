# t11 sync — 변이 검증 행렬 (SPEC-ROOMAUTHZ-001)

- 실행 주체: sync 레인 세션, 직접 실행 (인용 아님)
- 기준선: HEAD c87cbc1 / server 125 passed (125) exit 0 / channel 70 passed (70) exit 0 / typecheck 서버·채널 exit 0
- 방법: 강제 대상 한 곳만 최소 변이 → `npm test -w server --reporter=verbose` → 실패 테스트 이름 관측 → `git checkout --` 복원 → `git hash-object` 로 기준선 해시 대조
- 굵은 변이 금지 준수: diff 통째 되돌림 없음, indexOf/접두 단언 없음. 실패는 **이름 단위**로 관측했다.

## A. 강제 지점 아홉 (게이트 여덟 + 목록)

| # | 지점 | 변이 | 결과 | 실패한 테스트 (이름) |
|---|---|---|---|---|
| M1 | `routes-messages.ts:32` POST 메시지 | preHandler 에서 `requireRoomMember` 제거 | **검출 (exit 1, 4건)** | refuses a non-member send… / never lets a non-member approve… / byte-identical answers… / moves every gated route together… |
| M2 | `routes-messages.ts:128` GET 메시지 | 동상 | **검출 (3건)** | answers a non-member read with 404, not an empty list… / byte-identical answers… / moves every gated route… |
| M3 | `routes-events.ts:13` SSE | 동상 | **검출 (3건)** | refuses a non-member event stream before hijack… / refuses a non-member on the buildServer-assembled event route / moves every gated route… |
| M4 | `routes-rooms.ts:47` 멤버 초대 | 동상 | **검출 (4건)** | refuses an invitation from a non-member… / hides an archived room from a non-member while showing 409 to a member / offers no self-service join path… / moves every gated route… |
| M5 | `routes-bots.ts:50` POST 봇 초대 | 동상 | **검출 (3건)** | moves every gated route… / refuses all three bot-invite routes… / keeps the member-facing invite failure codes intact behind the gate |
| M6 | `routes-bots.ts:70` GET 봇 초대 | 동상 | **검출 (2건)** | moves every gated route… / refuses all three bot-invite routes… |
| M7 | `routes-bots.ts:82` DELETE 봇 초대 | 동상 | **검출 (2건)** | moves every gated route… / refuses all three bot-invite routes… |
| M8 | `permissions.ts:53` 브로커 백스톱 | `if (!isRoomMember(...))` → `if (false)` | **검출 (1건)** | the broker itself refuses a non-member verdict, independent of the route gate |
| M9 | `routes-rooms.ts:18` 방 목록 SQL | `WHERE id IN (SELECT room_id FROM room_members …)` → `WHERE ? IS NOT NULL` | **검출 (1건)** | narrows the room listing to the caller rooms and widens it on invitation |

**아홉 지점 전부 개별 검출.** 살아남은 변이 0건.

분별력 주석: M6 과 M7 은 실패 집합이 동일하다 — 봇 초대 셋을 한 테스트가 함께 재기 때문에 «GET 과 DELETE 중 어느 쪽이 뚫렸는지»는 스위트가 가르지 못한다. 각각이 개별 검출된다는 사실은 성립하므로 결함은 아니고, 국소화 해상도의 한계로 기록한다.

## B. 술어 자체

| # | 변이 | 결과 | 관측 |
|---|---|---|---|
| P1 | `isRoomMember` → `return true` | **검출 (13건)** | room-members.test.ts 13건 전부 실패 |
| P2 | 질의를 `room_members` → `rooms.created_by` 로 교체 | **검출 (34건)** | 형제 스위트(sse·messages·permissions 등)까지 광범위 실패 — `@MX:REASON` 의 "created_by 는 기록일 뿐 권한이 아니다" 주장이 실행으로 뒷받침됨 |
| P3 | 거부 코드 `404` → `403` | **검출 (14건)** | 방 실재 누출 기준이 실제로 잰다 |
| P4 | 거부 본문 문구만 변경 (코드는 404 유지) | **검출 (6건)** | 본문 동일성까지 기준이 잰다 — 코드만 보는 게 아님 |
| P5 | `!Number.isInteger(roomId)` 가드 제거 | **생존 (125/125 통과)** | 미검출 |
| P6 | `!req.user` 가드 제거 | **생존 (125/125 통과)** | 미검출 |

P5·P6 해석: 둘 다 `requireAuth` 뒤에서만 도는 이중 방어다. `req.user` 는 `requireAuth` 가 보장하고, 정수가 아닌 id 는 `Number(...)` → `NaN` → 질의 무매치 → 같은 404 로 흡수된다. 즉 **관측 가능한 행위 차이가 없어서** 테스트가 못 재는 것이지, 방어가 헛돈다는 뜻이 아니다. 결함으로 올리지 않고 «측정되지 않는 이중 방어»로 기록한다.

## C. 복원 무결성

변이 6개 파일 전부 변이 전 `git hash-object` 값과 복원 후 값이 일치. `git status --short server/` 빈 출력.

- `room-members.ts` 6f78ab74df6241115332641fea207dc0a1854c58
- `routes-messages.ts` 19bb86e4453a935cebc6c4e3024db0768696ae27
- `routes-events.ts` eaf989f26dad44cf368b44a93c01e6da7d86386c
- `routes-rooms.ts` 5a44324c0a7ecdd8c24f200ed03ab0191a2f97f6
- `routes-bots.ts` 3ae327e4d3ffca3efeaf6a3c4a6cf083f9a6c025
- `permissions.ts` cff9936b21c8723dc143e7be0f8f6ac08cdda082

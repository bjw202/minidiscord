# SPEC-BOTSTAB-001 M4a — 형제 자리 훑기 «그때 출력» (run 단계, 갱신 전 라이브 출력)

- 실행 시각: 2026-09-01T16:08:34+0900
- 명령: `node .moai/state/verify/t25-plan/sibling-sweep.mjs` (워크트리 루트에서)
- 종료 코드: 0
- 블록 총수: 33

## 라이브 출력 (전문)

```
channel/test/channel-server.test.ts:95	exposes exactly the reply and fetch_history tools	assert_lines=98
channel/test/channel-server.test.ts:115	reply forwards text and files to sendToChat and answers 	assert_lines=118,119
channel/test/channel-server.test.ts:123	declares all five optional fetch_history parameters and requires none	assert_lines=127,128,129,130,131,132,133,134
channel/test/channel-server.test.ts:139	points the cursor at the JSON field and never at a #번호 in line text	assert_lines=144,146,148,149
channel/test/channel-server.test.ts:153	passes fetch_history arguments through and returns the dependency string verbatim	assert_lines=156,157,160,161
channel/test/channel-server.test.ts:173	pushChatMessage notifies with TO meta and the attachment local path	assert_lines=185,186,187,188,189,190,191
channel/test/channel-server.test.ts:211	carries the load-bearing instruction literals in the initialize response	assert_lines=214,216,217,219,220,221
channel/test/channel-server.test.ts:225	carries cc as cc and omits the attachment note when there are no files	assert_lines=231,232,233,234
channel/test/channel-server.test.ts:239	neutralizes channel envelope sequences in the body, the author name and the file path	assert_lines=253,254,255,258,266
channel/test/channel-server.test.ts:271	leaves a body without envelope sequences byte-identical, and never touches meta	assert_lines=283
channel/test/channel-server.test.ts:335	AC-BOTSTAB-004 (가) — 본문 2배는 잘리고 표시가 붙고 앞부분은 살아 있다	assert_lines=346,347,350
channel/test/channel-server.test.ts:354	AC-BOTSTAB-004 (나) ㉣ — 이름 조각만 잘리고 본문 조각은 원문과 글자 그대로 같다	assert_lines=363,367,368,370,371
channel/test/channel-server.test.ts:375	AC-BOTSTAB-005 (가) — 상한 이하 본문은 글자 그대로, 표시 없고 meta 무변형	assert_lines=383,384,386
channel/test/channel-server.test.ts:390	AC-BOTSTAB-005 (나) — 정확한 형태와 근사 형태의 시길이 모두 엔티티로, 나머지는 원문 그대로	assert_lines=401,402,404
channel/test/channel-server.test.ts:411	AC-BOTSTAB-006 (가) — 짧은 경로가 많으면 OD-2 개만 실리고 표시가 있다	assert_lines=430,431
channel/test/channel-server.test.ts:435	AC-BOTSTAB-006 (나) — 긴 경로 하나는 OD-3 안에서 잘리고 그 자리에 표시가 있다	assert_lines=453,454,455
channel/test/channel-server.test.ts:460	E-9 — 이름이 정확히 상한 바이트면 접두가 원문 그대로다	assert_lines=464,469,470
channel/test/channel-server.test.ts:474	E-10 — 둘 다 초과하면 표시 두 개, content 는 파생 총상한 이하	assert_lines=482,483
channel/test/channel-server.test.ts:488	E-11 — 이름 조각의 시길도 엔티티로 치환된다	assert_lines=496,497,498
channel/test/gateway-mutual-auth.test.ts:212	the real server and the real channel agree end to end, envelope included	assert_lines=226
channel/test/gateway-mutual-auth.test.ts:231	a relaying man in the middle passes the handshake and still injects nothing	assert_lines=242,243,244,245,265,266
channel/test/gateway-mutual-auth.test.ts:404	on an unbound transport the same relay does take over, and the channel says so	assert_lines=425,426,427,428,430
channel/test/index-wiring.test.ts:179	gateway message becomes exactly one session notification	assert_lines=183,184,185,186
channel/test/index-wiring.test.ts:241	fetch_history forwards since_id and limit verbatim	assert_lines=248,249
channel/test/index-wiring.test.ts:254	history renders as one structured JSON document	assert_lines=260
channel/test/index-wiring.test.ts:268	empty history renders the same JSON shape with a null cursor	assert_lines=274
channel/test/index-wiring.test.ts:279	a single poisoned message stays a single element and carries no live envelope sequence	assert_lines=296,303,304,307,308,318
channel/test/index-wiring.test.ts:322	derives the cursor from ids only, never from body text, and nulls it when empty	assert_lines=331,332,340
channel/test/index-wiring.test.ts:423	history result stays under the total byte limit and carries the truncation marker (AC-BOTSTAB-007)	assert_lines=439,440,442,445,448,449
channel/test/index-wiring.test.ts:455	a truncated history derives the cursor from the kept ids only, dropping the newest first (AC-BOTSTAB-008)	assert_lines=475,479,487
channel/test/index-wiring.test.ts:492	empty history passes through untouched — cursor null, empty messages (E-1)	assert_lines=500,501
channel/test/transport-auth.test.ts:410	after welcome, the same two frames reach the session exactly once each	assert_lines=423,424,425
channel/test/transport-auth.test.ts:769	an envelope with a broken mac, and a frame with no envelope, are both dropped	assert_lines=786,787,791
```

## 스냅숏 대조 — spec.md §3.3 (2026-09-01, 21/13/8/19) vs 라이브

| 항목 | 스냅숏 | 라이브 | 델타 |
|---|---|---|---|
| 대상 블록 총수 | 21 | 33 | +12 |
| channel-server.test.ts | 10 | 19 | +9 |
| index-wiring.test.ts | 6 | 9 | +3 |
| gateway-mutual-auth.test.ts | 3 | 3 | 0 |
| transport-auth.test.ts | 2 | 2 | 0 |
| gateway-client·permission-relay | 0 | 0 | 0 |

델타 +12 의 전부는 M3(알림 통로 — channel-server 신설 9블록: AC-BOTSTAB-004 가/나, 005 가/나,
006 가/나, E-9, E-10, E-11)·M4(이력 통로 — index-wiring 신설 3블록: AC-BOTSTAB-007, 008, E-1)가
추가한 테스트다. 구(舊) 21블록의 파일별 구성은 스냅숏 관측(channel-server 10 · index-wiring 6 ·
gateway-mutual-auth 3 · transport-auth 2)과 문자 그대로 같다.

«출력이 이긴다»(plan.md M4a) 원칙에 따라 갱신 대상은 라이브 33블록 전부다. 스냅숏의 «영향 13 /
무영향 8» 분류와 «단언 19자리» 계수는 2026-09-01 계획 시점 값으로, 이 문서가 그것을 다시 매기지
않는다 — §3.3 재도출은 manager-spec 몫이며 run 단계는 SPEC 본문을 손대지 않는다.

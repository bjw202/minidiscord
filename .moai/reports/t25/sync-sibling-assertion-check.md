# SPEC-BOTSTAB-001 §M 형제 자리 단언 착지 판정 (카드 `t25` · sync 단계)

> 작성: sync 레인. 2026-09-02. 근거 규정 `plan.md` §M-1~§M-4 + § 「착지」의 정의.
> 나무 `.claude/worktrees/t25` @ `7248e89`(F1 수리 커밋), 브랜치 `WT-bot-stability`.
> 개정 이력: 초판은 `ee7dd40` 기준 34블록이었다. F1 수리(`7248e89`)가 엣지 E-12 기준 두 개를 더해 살아 있는 출력이 36블록이 되었고, 이 판에서 그 두 블록의 판정을 더하고 밀린 줄 인용을 다시 앵커했다.

## 쉬운 말 요약

이 카드가 고친 것은 「봇이 모델에게 보내는 글이 너무 길거나 위험한 글자를 담고 있으면 잘라 내고 표시를 붙인다」는 동작이다. 그 변경은 같은 표면을 재던 기존 테스트들의 계약을 함께 좁혔으므로, 좁아진 계약이 **실제 단언으로 착지했는지**를 사람이 한 번 확인해야 한다. 훑기 스크립트를 다시 돌려 대상 블록 **36개**를 얻었고, 그 36개 전부에서 상한·시길 상수를 인자로 쓰는 **실행되는 단언**을 찾았다. **미착지 0건**이다. 다만 이 절이 보증하는 것은 「단언이 있다」까지이고, 「그 단언이 옳게 재는가」는 보증하지 않는다 — 규정이 명시한 한계 그대로다.

---

## ① 돌린 명령과 종료 코드, 블록 수 (§M-3 ①)

| 항목 | 값 |
|------|-----|
| 명령 | `node .moai/state/verify/t25-plan/sibling-sweep.mjs` |
| 종료 코드 | **0** |
| 출력 블록 수 | **36** |
| 원본 저장 | `.moai/state/verify/t25-run/f1-repair/sweep-after.txt` (수리 커밋 `7248e89` 동봉본) |
| 이 판의 재실행 | sync 레인이 `7248e89` 트리에서 위 명령을 **직접 재실행**해 exit 0 · 36줄을 관측했고, 출력이 `sweep-after.txt` 와 **byte 동일**임을 `diff` 로 확인했다(차이 없음). 이 절의 판정은 그 재실행 출력에 귀속된다 |
| 34블록 시점 원본 | `.moai/state/verify/t25-sync/{sweep-plain.txt, sweep.json}` — 초판(@`ee7dd40`) 근거로 보존 |

**스냅숏 대조 (§M-1).** `spec.md` §3.3 의 스냅숏은 21블록이고 살아 있는 출력은 36블록이다. §M-1 은 «출력이 스냅숏과 다르면 출력이 이긴다» 이므로 **판정 대상은 36블록**이다. 차분 15 = M3·M4 신설 12 + AC-BOTSTAB-010 배선 목격 1(`channel-server.test.ts:547`, run 단계 K 보강) + 엣지 E-12 신설 2(`index-wiring.test.ts:540`·`:568`, F1 수리 커밋 `7248e89`). `m4a-evidence.md` §E2 의 착지표 33행은 K 보강(17:23) **이전** 캡처이고, 34번째 행은 초판이, 35·36번째에 해당하는 E-12 두 행은 이 판이 채운다.

**줄 밀림 재앵커 (이 판에서 고친 것).** F1 수리는 `index-wiring.test.ts:466` 부근의 낡은 주석 한 줄을 두 줄로 바꿨다. 그래서 그 아래 모든 줄이 **정확히 +1** 밀렸고, 초판 표의 블록 24~32 중 일부와 그 판정 단언의 줄 인용이 거짓이 되었다. 밀림폭을 산술로 더하지 않고 **원문을 다시 읽어** 각 단언을 찾아 고쳤다(이 저장소가 「줄 인용은 앵커로 다시 찾는다」로 이름 붙인 부류). 블록 24~29 는 변경 지점보다 위여서 인용이 그대로 유효하고, 블록 30 은 시작 줄만 유효하며 그 판정 단언 두 개가 밀렸다.

## ② 블록별 판정 (§M-3 ②)

판정 기준은 `plan.md` § 「착지」의 정의 — **상한·시길 상수를 인자로 쓰는 실행되는 단언의 존재**. 물음 ①(실행되는가)·②(경계가 상수에서 나오는가)만 판정이고, 물음 ③은 **기록 항목**이다(v0.7.1, 7회차 J-04).

물음 ③ 표기: **좁힘** = 상한 이하·시길 없음·실린 원소 최댓값 중 하나를 직접 가리킨다 · **전제** = 상수를 쓴 단언이 fixture 전제 관측이고, 좁힌 조건은 상수 없는 인접 단언이 잰다.

| # | 파일 : 블록 | 기준 이름 | 판정 단언 (줄) | 착지 | 물음 ③ |
|---|---|---|---|---|---|
| 1 | channel-server:96 | exposes exactly the reply and fetch_history tools | `:102 not.toContain(SIGIL_OPEN)` | 착지 | 좁힘 |
| 2 | channel-server:119 | reply forwards text and files to sendToChat | `:126 ≤ MAX_BODY_BYTES` | 착지 | 좁힘 |
| 3 | channel-server:130 | declares all five optional fetch_history parameters | `:143 not.toContain(SIGIL_OPEN)` | 착지 | 좁힘 |
| 4 | channel-server:148 | points the cursor at the JSON field | `:160 not.toContain(SIGIL_OPEN)` | 착지 | 좁힘 |
| 5 | channel-server:164 | passes fetch_history arguments through | `:176 ≤ MAX_HISTORY_BYTES` | 착지 | 좁힘 |
| 6 | channel-server:188 | pushChatMessage notifies with TO meta | `:210-212 ≤ MAX_NAME+MAX_BODY+MAX_ATTACHMENTS*MAX_PATH+ASSEMBLY` | 착지 | 좁힘 |
| 7 | channel-server:232 | carries the load-bearing instruction literals | `:244 not.toContain(SIGIL_OPEN)` | 착지 | 좁힘 |
| 8 | channel-server:248 | carries cc as cc, omits the attachment note | `:260-262 ≤ 파생 총상한` | 착지 | 좁힘 |
| 9 | channel-server:267 | neutralizes channel envelope sequences | `:298-300 ≤ 파생 총상한` | 착지 | 좁힘 |
| 10 | channel-server:305 | leaves a body without envelope sequences byte-identical | `:322-324 ≤ 파생 총상한` | 착지 | 좁힘 |
| 11 | channel-server:374 | AC-BOTSTAB-004 (가) 본문 2배 절단 | `:383 ≤ CONTENT_TOTAL_LIMIT` (그리고 `:378` 전제) | 착지 | 좁힘 |
| 12 | channel-server:393 | AC-BOTSTAB-004 (나) ㉣ 이름 조각만 절단 | `:401 ≤ CONTENT_TOTAL_LIMIT` · `:405 ≤ MAX_NAME_BYTES` | 착지 | 좁힘 |
| 13 | channel-server:414 | AC-BOTSTAB-005 (가) 상한 이하 본문 무변형 | `:426 ≤ MAX_BODY_BYTES` | 착지 | 좁힘 |
| 14 | channel-server:432 | AC-BOTSTAB-005 (나) 시길 엔티티 치환 | `:446-449 toBe(… SIGIL_OPEN_ESCAPE … SIGIL_CLOSE_ESCAPE …)` | 착지 | 좁힘 |
| 15 | channel-server:453 | AC-BOTSTAB-006 (가) 원소 수 상한 | `:469 ≤ MAX_ATTACHMENTS` | 착지 | 좁힘 |
| 16 | channel-server:477 | AC-BOTSTAB-006 (나) 경로 상한 | `:494 ≤ MAX_PATH_BYTES` (그리고 `:481` 전제) | 착지 | 좁힘 |
| 17 | channel-server:502 | E-9 이름이 정확히 상한 바이트 | `:506 toBe(MAX_NAME_BYTES)` | 착지 | **전제** |
| 18 | channel-server:516 | E-10 둘 다 초과, content 는 총상한 이하 | `:526 ≤ CONTENT_TOTAL_LIMIT` | 착지 | 좁힘 |
| 19 | channel-server:530 | E-11 이름 조각의 시길도 엔티티로 | `:540 toBe(… SIGIL_*_ESCAPE …)` | 착지 | 좁힘 |
| 20 | channel-server:547 | AC-BOTSTAB-010 배선 목격 (변이 K) | `:568 ≤ CONTENT_TOTAL_LIMIT` · `:572 ≤ MAX_BODY_BYTES` · `:576 toContain(TRUNC_MARKER_HEAD)` | 착지 | 좁힘 |
| 21 | gateway-mutual-auth:215 | real server ↔ real channel end to end | `:231-233 ≤ MAX_NAME+MAX_BODY+'[] '` | 착지 | 좁힘 |
| 22 | gateway-mutual-auth:238 | relaying man in the middle injects nothing | `:274-276 ≤ 같은 합` | 착지 | 좁힘 |
| 23 | gateway-mutual-auth:415 | unbound transport — relay takes over | `:441-443 ≤ 같은 합` | 착지 | 좁힘 |
| 24 | index-wiring:179 | gateway message → exactly one notification | `:190-192 ≤ 같은 합` | 착지 | 좁힘 |
| 25 | index-wiring:247 | fetch_history forwards since_id and limit | `:258 not.toContain(SIGIL_OPEN)` | 착지 | 좁힘 |
| 26 | index-wiring:263 | history renders as one structured JSON document | `:275-276 ≤ MAX_HISTORY_BYTES` | 착지 | 좁힘 |
| 27 | index-wiring:281 | empty history — same shape, null cursor | `:289-290 ≤ MAX_HISTORY_BYTES` | 착지 | 좁힘 |
| 28 | index-wiring:295 | poisoned message stays one element | `:323 ≤ MAX_HISTORY_BYTES` | 착지 | 좁힘 |
| 29 | index-wiring:341 | cursor from ids only | `:357-358 ≤ MAX_HISTORY_BYTES` | 착지 | 좁힘 |
| 30 | index-wiring:449 | AC-BOTSTAB-007 총 상한 + 절단 표시 | `:462 ≤ MAX_HISTORY_BYTES` · `:475 toContain(TRUNC_MARKER_HEAD)` · `:476 endsWith(TRUNC_MARKER_TAIL)` | 착지 | 좁힘 |
| 31 | index-wiring:482 | AC-BOTSTAB-008 실린 id 의 최댓값 | `:508-509 ≤ MAX_HISTORY_BYTES` · `:513 ≤ MAX_BODY_BYTES` · `:514 endsWith(TRUNC_MARKER_TAIL)` | 착지 | 좁힘 |
| 32 | index-wiring:519 | E-1 빈 이력 무변형 | `:531-532 ≤ MAX_HISTORY_BYTES` | 착지 | 좁힘 |
| 33 | index-wiring:540 | **E-12 (신규)** author 만 상한 초과여도 원소는 실린다 | `:559 ≤ MAX_NAME_BYTES` · `:561 toContain(TRUNC_MARKER_HEAD)` (그리고 `:547 > MAX_HISTORY_BYTES` 전제) | 착지 | 좁힘 |
| 34 | index-wiring:568 | **E-12 홍수 회귀 (신규)** 큰 author 가 최저 id 여도 전원 생존 | `:590 ≤ MAX_NAME_BYTES` · `:591 toContain(TRUNC_MARKER_HEAD)` (그리고 `:578 > MAX_HISTORY_BYTES` 전제) | 착지 | 좁힘 |
| 35 | transport-auth:413 | two frames reach the session exactly once | `:431-433 ≤ MAX_NAME+MAX_BODY+'[] '` | 착지 | 좁힘 |
| 36 | transport-auth:777 | broken mac / no envelope both dropped | `:801-803 ≤ 같은 합` | 착지 | 좁힘 |

**물음 ③ 이 「전제」인 유일한 블록 — 17번.** 상수를 인자로 쓰는 단언은 `:506` 하나이고 그것은 «fixture 이름이 정확히 OD-5 바이트다» 라는 전제 관측이다. 이 블록이 좁힌 조건(시길 없음)은 `:512 expect(rawOpens(content)).toBe(0)` 이 재지만 상수 식별자를 직접 쓰지 않는다. **판정은 착지다** — 정의는 «상수를 인자로 쓰는 실행되는 단언의 존재» 이고 `:506` 이 그것을 만족하며, 물음 ③은 판정 조건이 아니다(v0.7.1). 기록으로만 남긴다.

**신규 블록 33·34 (E-12) 의 판정 근거.** 두 블록 모두 `MAX_NAME_BYTES` 와 `TRUNC_MARKER_HEAD` 를 **인자로 직접 쓰는 실행되는 단언**을 가진다 — 잘린 author 의 바이트 길이를 이름 상한과 견주고(`:559`·`:590`), 그 자리에 시스템이 붙인 표시의 고정 앞부분이 있는지 본다(`:561`·`:591`). 어느 쪽도 숫자를 복제하지 않는다. `MAX_HISTORY_BYTES` 를 쓰는 `:547`·`:578` 은 「author 가 혼자 총 상한을 넘는다」는 Given 을 고정하는 전제 관측이므로 판정 단언이 아니라 전제로 적었다 — 물음 ③ 표기가 「좁힘」인 것은 `:559`·`:590` 이 상한 이하임을 직접 재기 때문이다.

## ③ 착지하지 않은 블록 (§M-3 ③)

**0건.**

## ④ 종합 판정 (§M-3 ④ · §M-4)

**통과** — 살아 있는 출력 36블록 전부에서 상한·시길 상수를 인자로 쓰는 실행되는 단언을 관측했고, 미착지 목록이 비어 있다.

---

## 판정에 쓴 보조 도구와 그 한계

판정은 사람이 원문을 읽어 내렸고, 후보 줄을 뽑는 데 `.moai/state/verify/t25-sync/assert-landing-extract.mjs` 를 썼다(출력 `const-lines.txt`). 이 도구는 `sibling-sweep.mjs` 의 블록 가르기를 그대로 재현하고 블록 안에서 상수 식별자를 담은 줄을 뽑는다 — **판정하지 않는다.**

**훑기 자신의 `assert_lines` 도 판정 단언을 다 담지 못한다.** 신규 블록 33 의 판정 단언 `:559` 는 `sweep-after.txt` 의 `assert_lines=554,556,561` 에 **없다** — 훑기의 규식이 `.toBeLessThanOrEqual(` 류 파생 단언을 잡지 못하기 때문이다(F1 수리 보고 `green.md` 가 감사 F4 재확인으로 같은 것을 적었다). 블록 34 의 `:590` 도 같다. 이 표의 판정은 사람이 원문을 읽어 내린 것이므로 그 누락에 영향받지 않지만, **`assert_lines` 를 착지의 증거로 쓰면 안 된다**는 뜻이다 — 그것은 후보 줄일 뿐이다.

**첫 판에서 도구가 두 블록의 판정 단언을 놓쳤다.** 규식이 `MAX_*`·`TRUNC_*`·`SIGIL_*` 세 어족만 잡아서, 그 상수들로만 조립된 파생 상수 `CONTENT_TOTAL_LIMIT`(`channel-server.test.ts:369`)를 인자로 쓰는 블록 11·18 의 단언이 빠졌다. 원문 대조에서 잡아 규식을 넓혔다. 기록해 두는 이유: **§M-2 의 물음 ②는 «경계가 상수에서 나오는가» 이지 «상수 이름이 그 줄에 있는가» 가 아니다** — 파생 상수를 거친 경계도 숫자 복제가 아니므로 착지다. 좁은 규식만 믿었으면 착지한 블록 둘을 미착지로 적을 뻔했다.

## 이 판정이 사지 못하는 것 (plan.md §M 「사지 못하는 것」 그대로)

- **단언이 옳게 재는가** — 물음 ③이 관측을 기록할 뿐 보증하지 않는다. 위 표의 「좁힘」 표기는 관측이지 보증이 아니다.
- **기존 단언이 지워졌는가** — 이 판정의 범위 밖이다(`t28` 소유).
- **훑기가 실제로 돌았는가** — 이 절차는 사람이 돌리는 것이라 스스로 신고하지 못한다. 위 ①의 명령·종료 코드·원본 파일 경로가 그 자리를 대신하는 기록이다.
- **연속 관측** — 한 시점의 판정이며, 이 sync 이후에 착지한 회귀는 다음 sync 까지 잡히지 않는다.

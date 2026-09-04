# t34 리드 처분 기록 — SPEC-PERMROUTE-001 plan 1회차 F-04 미결 둘

- 기록 시각: 2026-09-03 (plan-audit.md 1회차 FAIL 0.6875 판독 후)
- 결정 주체: 운영자 (리드 AskUserQuestion 경유)
- 대상 미결: `plan.md:54` (§D-1) · `plan.md:103` (§D-5)

| 미결 | 처분 | 조건 |
|---|---|---|
| §D-1 `ConnInfo.connId` 선택/필수 | **선택 필드** | 감사 F-07 대로 `undefined` 좁히기 분기를 재는 수용 기준 1건을 추가한다. run 의 typecheck 에서 형제 시험 파급이 30자리와 다르게 나오면 리드에 재회부 (progress.md Gaps 4번째 항목과 동일 조건) |
| §D-5 `sendToBot` 처분 | **유지** | REQ-PERMROUTE-006(판정 경로에서 `sendToBot` 호출 금지)이 재생산 방지 조항으로 남아 있어야 한다. 제거는 별도 카드 후보 |

두 `[NEEDS CLARIFICATION]` 표식은 이 처분으로 닫는다. 나머지 차단(F-01·F-02·F-03·F-05)은 plan 2회차 자체 수리 범위.

## 추가 처분 — 형제 개정 범위 제한 (운영자 우려 «SPEC 이 SPEC 을 낳는가» 판독 후)

- 신설 SPEC 은 1개, 생산 코드 4자리·시험 3자리로 코드 범위는 작다. 부푸는 쪽은 형제 문서 개정(초판 9행 → 5개 SPEC 이상)이며, 원인은 옛 SPEC 이 인터페이스 코드 블록과 「발신 지점 다섯」 열거를 글자 그대로 고정한 데 있다.
- 지시: `SPEC-GWAUTH-002` 열거 7자리는 본문 재작성 금지, 자리당 한 줄 개정 주석만. `SPEC-GATEWAY-001`·`SPEC-PERM-001` 코드 블록은 거짓이 되므로 실제 개정(카드 본문 범위). §6 표는 «거짓이 되는 자리»만 싣는다.
- 후속 후보(ROADMAP, 이 카드 밖): SPEC 이 구현 리터럴을 글자 그대로 고정하지 않도록 하는 작성 규약.

## 정정 — 범위 제한 두 조항의 충돌 해소 (plan 지적, 리드 승인)

- 「거짓이 되는 자리만 싣는다」와 「낡은 열거는 행 수를 늘리지 않는다」가 `SPEC-GWAUTH-002` 에서 충돌한다(「발신 지점 다섯」은 여섯이 되는 순간 거짓).
- 해소: GWAUTH-002 는 §6 표에 **한 행**으로 싣고, 처분란에 앵커 일곱(design.md:24 · plan.md:105·322·459 · acceptance.md:776·873·880)과 「자리당 개정 주석 1줄, 본문 무개정」을 적는다. 표는 자기 규칙에 완전하고 행 수는 늘지 않는다.
- §6 머리에 이 상한이 리드 지시임을 이 파일 출처로 적는다 — 다음 감사관이 주석-only 처분을 누락으로 읽지 않게.

## 정정 — §D-1 근거 문장 (plan 2회차 발견, 리드 실측 확인)

- 「선택 필드는 형제 시험 30자리를 건드리지 않는다」는 타입 검사에 대해서만 참. 그중 7자리(permissions.test.ts:195·323·324·347·348 · room-members.test.ts:527·549)는 connId 없이 브로커를 부른 뒤 소켓이 판정을 받는다고 단언하므로 실행 시 붉어진다. 비교는 «30(타입) 대 7(실행)».
- 처분(선택 필드)은 유지 — 7 < 30. run M1 이후 실제 붉어지는 자리 수를 세어 7 과 대조, 초과 시 리드 보고.
- typecheck 실측 32줄(형제 30 + 생산 2) — 재회부 조건 미발동. 증거 evidence/D1-connid-required-typecheck.txt. 리드 표본 실측 :195·:527 일치.

## 정정 — 회부 방아쇠 «7» 은 거짓 (plan-audit-2.md N-01, 리드 수용)

- 2회차 감사가 전수로 센 결과, 선택 필드에서 실행 시 붉어지는 형제 시험 자리는 permissions.test.ts 10 + room-members.test.ts 2 = **12**, `:303`·`:304`(성공/실패 문구 상이 단언) 포함 **14**. 위 절의 «7» 은 plan 이 부분 계수한 값이며 리드가 표본 2자리만 대조해 통과시켰다 — 리드 귀속.
- 처분(선택 필드) 유지 — 14 < 30 그대로. 회부 방아쇠는 «run M1 이후 실측이 **14** 를 초과하면 리드 보고» 로 바꾼다.
- 2회차 판정 FAIL 0.75 (Clarity·Completeness·Testability·Traceability 전부 0.75). 차단 N-01·N-02·N-03a·N-03b·N-04. 3회차는 델타 범위 재판정, 3회차 FAIL 이면 4회차 없이 리드 처분.

## 3회차 수리 리드 검산 (v0.3.0 · REQ 11 / AC 15)

- §6.1 명령을 리드가 원문 그대로 재실행: scope-all 117 · ex-self 114 · `sendToBot` 60 · `ConnInfo` 25 · §6.2 18행 — plan 보고와 전건 일치(표가 자기 지시로 재도출됨, F-01 부류 종결 신호).
- 「새 추정치 금지」 집행 승인: 수 9개 삭제·명령 대체, 재측정 값은 명령+출력 동반(48→60 · 48→55 · 13→15).
- 방아쇠 14 는 «2회차 감사관 귀속·실행 미검증» 으로 표기하고 편집 목록은 run M1-6 실측이 정한다 — 승인.
- 수리가 찾은 실물 결합 `web/rich.js:67 RESOLUTION_RE`(판정 메시지를 꼬리 문자열로 식별) → REQ-PERMROUTE-007 [HARD] 제약 — 승인.

## 3회차 감사 PASS 0.8625 — N3-01 처분과 Kickoff (운영자 결정)

- 3회차 최종 PASS 0.8625 (0.6875 → 0.75 → 0.8625). 필수 통과 7항 전건. 2회차 N-01~N-07 종결.
- N3-01: 감사관은 「세 템플릿」 3자리라 했으나 plan 이 원문으로 갈라 **`web/rich.js:62` 한 자리만 거짓**(`:59`·`web-rich.test.ts:150` 은 정규식 갈래 셋이 그대로라 참, 부류 4). 리드가 `:67` 원문으로 확인. 무거운 절반은 구조 — `web/` 가 §6.1 범위 밖이라 AC-PERMROUTE-010 이 눈먼다.
- 처분: 운영자가 처음 (나) 부채 수용을 골랐으나 plan 반론 도착 후 **(가) 경계 지은 수리 1회 → 리드 §6.1 명령 재실행 검산 → 커밋** 으로 변경. 4회차 감사 없음(판정이 아니라 집행). 범위 넷: web/ 편입 · 재실행 행 착지 · :62/:59/:150 분류 · N3-02·N3-03.
- Kickoff 승인됨(커밋 착지 후 run 디스패치). 진행 방식 **반자율**(밀스톤마다 리드 판독). 재회부 방아쇠 둘 유지(typecheck 30 이탈 · M1-6 실측 ≠ 14).

## 경계 수리 착지 (v0.4.0) — 리드 검산·커밋 승인

- §6.1 열한 어간을 리드가 bash 로 원문 재실행: 119 · 116 · web 2 · ConnInfo 25 · sendToBot 60 · sendToConn 26 · onGatewayRequest 58 · setPermissionHandler 32 · sendEstablished 13 · 발신 지점 11 · @MX:WARN 6 · 다섯(좁힘) 55 · 실패 문구 17 · 세 템플릿 4 · §6.2 19행 — plan 보고와 전건 일치. 코드 순변경 0.
- 셸 주의: 명령은 `F=$(cat …)` 무인용 단어 분리에 기대므로 **bash 에서만** 재현된다(zsh 는 전 어간 0). 증거 `.moai/reports/t34/evidence/round4-section6-web-scope.txt`.
- 범위 밖 동시 수정 1건(spec.md §3 「시험 두 파일」) 승인 — 3회차 시점에 이미 거짓이던 절반을 같은 문장에서 참으로 만든 최소 편집.
- 4회차 감사 없음(집행 검산으로 대체). plan 단계 단일 커밋 승인(pathspec 명시, 푸시 없음). 다음: run 디스패치(반자율) → plan /clear.

## plan 종결 — 커밋 c3d1d09 (리드 판독 일치) · run 디스패치

- 13파일 +2997, pathspec 두 경로만. 잔여: plan-auditor 에이전트 기억 3파일 → **sync 단일 커밋에서 흡수**(이 커밋 밖).
- 게이트 사건: 첫 커밋 시도가 pre-commit 에서 `channel/test/transport-auth.test.ts` «both nonces are regenerated per socket» 1건으로 막힘 → 단독 재실행 `npx vitest run test/transport-auth.test.ts` **30 passed** 자가소멸 → 재시도 통과. **t36 플레이크 6번째 관측**(t25 2·t33 3·t34 1). 우회 미사용. t36 pick 시 인계.
- run 디스패치 22:2x (반자율 · 밀스톤 판독 · 방아쇠 둘 · M4 web/rich.js:62 · REQ-010 F-04 흡수).

## run M1 판독 (2026-09-04 새벽) — PASS · 회부 2건 처분

- 리드 재실행: 나무 안 `npm run typecheck -w server` exit 0(오류 0). 주의 — 첫 재실행은 셸 cwd 가 주 체크아웃에 남아 main 을 검사했음(「셸 cwd 는 남는다」 재현); 나무 안 재실행으로 정정.
- 편집: `server/src/gateway.ts` 1파일(git +10/-2; run 보고 +12/-2 — 비차단). plan 밖 최소 해석 둘 승인 — (가) `:204` `connId: randomUUID()` 발급 선행(Established 좁힘 때문에 타입상 불가피), (나) `sendToOrigin` 스텁 `false`(M2-4 가 대체).
- 회부1: «14 실측» 유효 시점 = **M3 착지 직후** 로 확정. M1-6 의 0 은 발현 전. M3 보고에 실패 자리 전수 첨부 → 14 대조.
- 회부2: M1 커밋 승인(pathspec gateway.ts + progress.md + evidence/M1-*.txt 3파일, 푸시 없음).
- M1 커밋 **f64027d** 리드 판독: 6파일(+90/-4) — 지시 pathspec 5 + `spec.md` `status: draft → in-progress`(run 진입 전이, manager-develop 소유 — 정당). 채널 사건: run 소켓이 메시지 거부 2회 → `tengu_harbor_kite` False 확인 → `claude -p ok` 1회로 True 복구 → 재전달 성공.

## run M2 판독 — PASS · AC-009 시험 신설 · 커밋 승인

- 리드 나무 안 재실행: typecheck exit 0 · `npm test -w server` **2 failed | 209 passed (211)** — 붉은 둘 `gateway.test.ts:833`·`:878`(toEqual 여분 키, plan §B-2 예고, M4-1 소유). RED 증거 1 failed(timeout) → GREEN 1 passed.
- 공시 수용: M2-1 RED 의 실측 원인은 «전원 발신»이 아니라 «배선 부재»(스텁 false + :142 미실음). plan 문구 귀속 오차 — sync 에서 정정.
- AC-009: «A·B 둘 다 수신 + true» 를 직접 세는 회귀 시험 **신설**(M3 착지 시). 기존 D-5 시험은 second 만 보증.
- M2 커밋 승인(pathspec gateway.ts · gateway.test.ts · progress.md · evidence/M2-*.txt 3파일, 푸시 없음).
- M2 커밋 게이트 차단(붉음 2 = plan §B-2 예고 자리): 처분 **(나)** — M4-1 toEqual 개정 2건(gateway.test.ts:833·:878)을 M2 커밋에 선행 이행, `connId: expect.any(String)` 명시 단언 형태. (가) SKIP_MOAI_PRECOMMIT 우회는 채택하지 않음(붉은 커밋·거버넌스 행위 회피). M4-1 자리는 «14 실측» 대상과 겹치지 않음.
- M2 커밋 **2708a7a** 리드 판독 PASS: 6파일 · `:833`·`:878` `connId: expect.any(String)` · 리드 재실행 `npm test -w server` **211 passed (211)**. 비차단 결함: `evidence/M2-full-suite-green.txt` 가 처분 (나) 이전 실행(2 failed)이라 이름과 어긋남 → M3 커밋에서 실제 초록 출력을 별도 파일로 착지, 기존 파일은 «낡음» 표기.

## run M3 판독 — PASS · 회부 «14» 종결(단위 변환) · 커밋은 M4-7 합병

- 리드 나무 안 재실행: typecheck 0 · `npm test -w server` **11 failed | 203 passed (214)**. 실패 단언 줄 permissions `:198·:209·:231·:255·:272·:294·:312·:332·:353` · room-members `:539·:553` — run 보고와 전건 일치.
- 회부1: 추론 **14** 는 요청 라인 단위, 실측 **11** 은 시험 단위. `:303/:304→:312`, `:323/:324→:332`, `:347/:348→:353` 로 접힘. 추론 밖 붉음 0 · 미발현 0 → §D-1 전제 유지, 재회부 불필요. M4-7 편집 대상 = 11 시험.
- 커밋: 11 붉음은 게이트 불통 → M2 선례대로 **M4-7 을 M3 커밋에 합병**(우회 금지). RED 증거 `M3-test-failures-full.txt` 보존, 초록 출력은 별도 파일.
- 낡은 증거 처리(M2-full-suite-green.txt 표기 + after-m4-1 파일) 이행 보고 — 커밋 판독 때 확인.
- M3+M4-7 커밋 **600a1a5** 리드 판독: 9파일(+426/-27) pathspec 일치 · 리드 재실행 typecheck 0 · **214 passed (214)** · 낡은 증거 표기·초록 증거 파일 확인. **결함: 메시지가 «test» 한 단어**(카드 id 없음) → 미푸시이므로 나무 안 `commit --amend` 로 메시지만 정정 지시. 새 SHA 는 amend 후 기록.
- amend 착지 **8e7e7ef** (600a1a5 와 트리 동일 확인 — 메시지만 교체). 사고 원인: 게이트 실패 원인 확인용 `git commit -m "test"` 가 게이트를 통과해 착지(run 자기 공시). 이후 게이트 실패 출력은 evidence 에 캡처.

## run M4 판독 — PASS · 커밋 승인

- 리드 나무 안 재실행: typecheck 0 · **214 passed (214)**. 4파일 +12/-10. `web/rich.js` 는 `:62` 한 글자(세→네)만 편집, `:59`·`:60`·`:67` 무편집(grep 0) — [HARD] 준수. `:59`·`web-rich.test.ts:150` 잔존은 §6.2 부류 4(정규식 갈래 셋, 참). `gateway.ts:268` «발신 지점 여섯». channel 무변경(AC-008).
- M4-6 FAILED_BODY 실물 «⚠️ 요청한 세션의 신원이 기록되지 않아 판정을 전달하지 못했습니다 (…)» 이식 — run 이 실행으로 관측.
- REQ-PERMROUTE-010(F-04 흡수)은 M2-5 에서 이행됨 확인. M4 커밋 승인(6파일 pathspec, 푸시 없음). 다음 M5 → §6.1 bash 재실행 대조.
- M4 커밋 **8ad7e2d** 착지(리드 판독: 파일 수·pathspec 일치). 궤적 c3d1d09 → f64027d → 2708a7a → 8e7e7ef → 8ad7e2d.

## run M5 판독 — PASS · :188 처분 · 커밋 승인

- 리드 bash 재실행(자기 제외 116): ConnInfo 31 · sendToBot 67 · sendToConn 27 · onGatewayRequest 47 · setPermissionHandler 33 · sendEstablished 15 · 발신 지점 19 · @MX:WARN 5 · 다섯(좁힘) 58 · 실패 문구 26 · 세 템플릿 3 — run 보고 전건 일치. 이동 귀속(+주석 언급 / −11 M4-7 / −1 M2-5 / −1 M4-8) 수용.
- GWAUTH-002: numstat 추가 14 / 삭제 0 → 본문 무개정(리드 상한 준수). GATEWAY-001/acceptance `:187·:873·:892·:933` 지목형 주석 확인.
- 회부 `:188` «app.gateway 5개 메서드»(아라비아 숫자, 어간 «다섯» 밖·표 밖): **주석 1줄 + §6.2 20행 + §6.1 어간 `[0-9]개 메서드` 추가** 로 처분. 편집 파일 수 9→10 정정(비차단).
- M5 커밋 승인(spec 10 + PERMROUTE spec/progress + evidence 3, 푸시 없음). 다음 M6.
- M5 커밋 **92a4ca2** 착지(15파일 +338/-1). :188 처분 셋 이행 확인 — §6.1 어간 `[0-9]개 메서드`(:280) · §6.2 20행(:348) · 제목 (20행). 잔여 변경 0. 다음 M6.

## M6 진입 전 — plan 커버리지 갭 (run 발견, 리드 확인) · 시험 4건 신설 승인

- 매핑표(acceptance.md:9-30) 리드 확인: AC-001·002·004·005 의 방법 열이 «npm test -w server» 뿐, plan M1~M6 에 이 넷의 시험 저작 단계 없음. 착지된 시험은 003a/003b·006·013·009 회귀뿐. DoD 1항(15개 통과·관측 인용) 불가, DoD 2항(변이 여섯 집합 구별)에서 M2 와 M5 관측 집합이 {003a,006} 으로 동일해져 AC-011 판정 불가.
- 처분 (가): 시험 4건 신설(M6-0, 별도 커밋), 생산 코드 무변경, AC↔시험 이름 표 15개 착지. plan 갭은 sync 에서 plan.md 에 공시. (나) 시험 없이 진행은 DoD 위반이라 기각.
- M6-0 커밋 **4f707c2** 리드 판독 PASS: 4파일 +146(시험 2파일·progress·증거), 생산 코드 변경 0, 리드 재실행 **218 passed (218)**(214+4). 다음 M6 변이 여섯.

## run M6 판독 — PASS · 어긋남 ① 처분 (나) · 커밋 승인

- 증거 8파일 실재. M1 1 failed/217 · M3 3 failed/215 · M6 서버 **218 passed(서버 0건 — REQ-PERMROUTE-010 반증 없음)** · channel 5 failed(가드 4 + transport-auth 플레이크 = **t36 7번째 관측**). 복원: progress.md:700 hash-object 전후 일치 + 리드 `git status` 빈 출력. 리드는 동시 변이 금지 교훈으로 직접 변이는 재현하지 않음(증거·복원·트리로 판독).
- 어긋남 ①(M4·M5 가 AC-005 시험의 문구 절반도 무너뜨림 — 표 도출 시 시험 부재): **(나)** 시험 유지, progress.md 에 보고된 어긋남으로 기록(DoD 2항 충족). acceptance.md AC-011 표 개정은 sync 에서 manager-spec 재위임.
- M2 형제 시험 14건 붉음 «기준 밖» 수용(목록 필수). M6 커밋 승인(progress + evidence 7, 코드 없음). 다음 §E.3 → run 종결 → sync 디스패치.
- M6 커밋 **4535424** 착지(리드 판독: 코드 없음·progress+evidence 7). 궤적 c3d1d09 → f64027d → 2708a7a → 8e7e7ef → 8ad7e2d → 92a4ca2 → 4f707c2 → 4535424.

## run 종결 — dbee7b0 · sync 디스패치 (2026-09-04 08:0x)

- 종결 커밋 dbee7b0: §E.3 audit-ready · AC 15개 ↔ 시험·관측 표 · AC-009 (가) 주석 어간 수리(permissions.ts 주석의 «sendToBot» 단어 제거 — 리드 재실행 적중 0·exit 1 통과). run_commit_sha 는 sync 백필.
- run 커밋 사슬(8): f64027d → 2708a7a → 8e7e7ef → 8ad7e2d → 92a4ca2 → 4f707c2 → 4535424 → dbee7b0. 최종 관측 server 218 · channel 126 · typecheck 0.
- sync 디스패치(sync [fa7bdc], lens --security --deep) 인계 6건: 백필 · plan 갭 공시 · RED 귀속 정정 · AC-011 표 manager-spec 재위임 · 메모리·lead-decisions 흡수 · AC-010 역방향 전수.

## sync 감사 1회차 FAIL 0.776 — 리드 처분 (2026-09-04 08:3x)

- 차원: Functionality 0.78(must-pass 미달) · Security 0.88 · Craft 0.80 · Consistency 0.62. 감사관 공시: «FAIL 은 구현이 아니라 장부». 차단 F-01~F-05.
- F-02 «표 밖 23자리»: (가) 형제 수용 기준의 시험 축자 사본 10 → §6.2 한 행(주석 1줄·앵커 10). (나) 낡은 산문 13 → 개정 주석 1줄; **GWAUTH-002 는 7이 아니라 10자리** — 리드가 건 상한의 대상이 과소 계수였다(같은 부류 세 번째: 7→14, 어간 둘→열둘, 앵커 7→10 — 리드 귀속). 13번 test 주석은 어간 제거 + AC-009 (가) 범위에 server/test 추가.
- F-01 §E.3 «0건» 삭제 → §5 인용 · F-03 행수 재계수(명령 동반) · F-04 M6 판정값 «서버 0건» 제거·귀속 명시 · F-05 status in-progress 복귀.
- 소유권: SPEC 본문은 manager-spec 재위임. 재감사 2/3회차 델타 범위.
- **정정(리드 귀속)**: «AC-009 (가) 훑기 범위에 server/test 추가» 지시 철회. sync 실측: 범위 확장 시 13행 적중 — 그중 gateway.test.ts:932·940 등은 AC-009 자신이 요구하는 유지 회귀(sendToBot 을 반드시 호출)라 영구 위반이 된다. 리드가 실측 없이 낸 전제. #13(permissions.test.ts:170)은 주석 수리로 종결, :575 는 부류 3 으로 명시. 부수 정정 2건(CHANGELOG t32 D-5 추월 표기·README:188 오진) 수용.
- sync 수리 1차 회부 처분: **R-1 (나)** GATEWAY-001/spec.md:234 «만 제공한다» 한 자리만 본문 최소 개정(인용 블록·원문 보존) — 본문·주석이 반대말을 하게 두지 않는다 · **R-2 (가)** server/test sendToBot 적중 9자리(유지 회귀 5 + 이 카드 저작 AC-009 회귀 4)는 §6.1 부류 4 한 줄로 · **R-3 승인** spec.md §7 성공 정의 2번 개정(F-04 연쇄). §6.2 20→25행, 9행 앵커 7→10(리드 귀속 공시), 제목 수 삭제·계수 명령 대체, «13~19행» 포인터 형태 개정 승인. sync 자기 정정(13→12 열거) 수용.
- **정정(sync 귀속, 리드 기록 동반 정정)**: 「spec.md:112·plan.md:208 이 낡은 이유는 20행과 25행」은 틀림 — §3 이 그 부류를 코드 파일로 한정하므로 20행(형제 문서)은 부류 밖, 원인은 **25행(permissions.test.ts:170) 하나**. plan.md:208 은 M5 가 아니라 M4 절. 실측 `grep -cE '\`server/|\`web/'` → 8. 대응 계수는 «3+9» 가 아니라 **2+10**(§6.2 :857·:1032 + 부류 4 열).
- 이 카드의 계수·목록 오류는 리드 1(7자리)·sync 2(13→12 열거, 20행 근거)로 세 주체에서 나왔고 전부 **명령 재실행이 잡음**.
- 잔여 위험 «창구 둘» 전제: 리드 `grep -rn "창구" .moai/specs` 전수 — 살아 있는 전제 문장 0건(GATEWAY-001 :180 «창구만 만든다» 는 범위 서술이라 셋이 돼도 참; PERM-001/progress:418 은 이력). 종결.
- manager-docs 착지 판독 수용(F-01·F-03·F-04·F-05, §E.4 `reaudit-pending`). 회부 progress.md:645 → **(가)** §E.3 과 같은 형태로 정정(run 종결 후 sync 정정, 취소선 보존). 선택 발견 F-06·F-07·F-08·§4.5 «직후→직전» 은 미처리 공시(범위 불확장) — §4.5 선재 주석 오류는 **ROADMAP 후속 후보**. 미커밋 18파일 +405/-39, 2회차 델타 재감사 대기.
- 재감사 직전 회부 progress.md:645 제목 «표 19행 착지 대조» → **(나)** 시점 표지 한 줄(«M5 시점 — 당시 20행 체계, §E.3 참조»). §E.2 취소선 두 자리(:353·:645)는 리드 처분 근거로 소유 위반 아님. 수리 전건 착지 18파일(수는 sync 보고값이었고 감사 G-03 이 트리와 다름을 지적 — 수 삭제; 실측은 `git -C .claude/worktrees/t34 diff --stat | tail -1`) · HEAD dbee7b0 불변 · 2회차 델타 재감사 진입.

## sync 감사 2회차 FAIL 0.819 (점수 ≥ 0.80, 차단 G-01) — 3회차 진입

- 1회차 F-01~F-05 전건 닫힘(감사관 명령 재실행). 차원 Functionality 0.86 · Security 0.88 · Craft 0.82 · Consistency 0.66.
- G-01: 개정 주석 22줄 삽입이 형제 문서 줄을 밀어 §6.2 줄 앵커 **35개**가 낡음(HEAD dbee7b0 에서는 전건 유효 — 수리가 만든 낡음). 두 자리(21행 :473 · 22행 :262)는 «거짓 확인». 처분: 새 번호 금지, **grep 앵커 형식**으로 교체(manager-spec), 각 앵커 정확히 1건 적중 출력 착지. 권고 2(§6.1 일반 규칙) 승인.
- G-03(리드 기록 «+462» 트리 불일치) — 리드가 수 삭제·명령 대체(이 파일). G-02(14·16행 선재 앵커 낡음)·§4.5 «직후→직전» → ROADMAP 후속 후보. G-04 허용.
- 3회차(마지막) 델타: G-01 + 권고 2 + 앵커 35 재실행 회귀. FAIL 이면 4회차 없이 리드 처분.
- «35» 는 감사관 공시 하한(추출기 폐기·§6.2 13개 행 앵커 미확인). 선결 처분 **(가)**: 열거에서 더 나오면 3회차 안에서 함께 grep 앵커로 전환(범위는 §6.2 앵커에 한정, 형제 본문 무편집). 절차 관찰 수용: 리드가 감사 파일을 완료 통지 전에 읽음 → 3회차부터 sync 보고 후 판독.

## sync 감사 3회차 PASS 0.871 — 리드 판독·단일 커밋 승인 (2026-09-04)

- 궤적 0.776 → 0.819(G-01 차단) → **0.871**. 차원 0.90 / 0.88 / 0.86 / 0.80. 리드 나무 안 재실행: server 218 · channel 126 · typecheck 0/0 · `evidence/audit3/RERUN-anchors.txt` PASS 55 / FAIL 0 · HEAD dbee7b0 · diff 20파일 +491/-53 · 스테이징 0.
- G-01 귀속 정정(감사관 자기 판정 19 참 / 16 거짓 — 18행 열둘·6·7·8행은 run M4-7 이 밀어냄, 11행 둘은 반대로 유효). 차단 성격은 유지, 2회차 Consistency 근거 절반 철회.
- 3회차 선결 처분 (가) 결과: 줄 앵커 79 중 낡음 52 → 50 전환 + 앵커 55 삽입 전건 1건 적중. 줄 번호 9행분은 t37 규약(줄 앵커 표 금지)으로 넘김.
- 커밋: 1차 = 수정 20 + sync-audit-2/3 + evidence/audit3 + agent-memory 신규(manager-spec 2·sync-auditor·plan-auditor) + 이 파일, `status: completed`, `sync_commit_sha: pending-backfill-sync-close`. 2차 = SHA 백필만(t32 선례 ca03303→9c7d51b). 푸시 없음.
- **ROADMAP 후속 후보(t37 착수 시 등재)**: H-01 §6.1 재현 명령의 zsh 조용한 0(선재·최우선) · G-02 14·16행 선재 앵커 · H-06 줄 번호 9행(t37 규약으로 답) · §4.5 «직후→직전» 선재 주석 · F-06/F-07/F-08 선택 발견 · t36 플레이크 누적 7회.
- 커밋 보류 처분(sync 지적 수용): ① pathspec 을 `.moai/reports/t34/` 전체로(인용 대상 미추적 = VCI §2 위반) ② SPEC 디렉터리 안에 잘못 쓰인 sync-auditor 기억 3파일 → **(가)** 정상 위치 이동·색인 병합·오위치 삭제(hash-object 동일 확인) ③ `sync_status` 와 `:821` 근거 문단은 커밋 ②에서 백필과 함께 정정.

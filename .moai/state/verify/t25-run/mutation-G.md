# t25 M5 변이 실측 — G (2026-09-01)

## 변이 내용

- 행: **G** — 자리 `fetchHistory`, 최소 편집 «총 바이트 검사 제거» (acceptance.md 변이표)
- 적용 편집: `channel/src/index.ts` fetchHistory 2단계의 총 바이트 검사 — `while` 루프
  (`while (kept.length > 0 && Buffer.byteLength(doc(kept), 'utf8') > MAX_HISTORY_BYTES) { … }`) 을
  통째로 제거 (그 외 무변경 — 1단계 원소별 절단과 cursor 계산은 그대로)
- 적용 전 shasum: `a9d44572869fcfc1e24d4b54dec6be2d8e0afb06  channel/src/index.ts`
- 적용 후 shasum: `ba4bea242f703908805ca3e99b22117b3108e8fc  channel/src/index.ts`
- 복원 후 shasum: `a9d44572869fcfc1e24d4b54dec6be2d8e0afb06  channel/src/index.ts` — **적용 전 값과 일치 (복원 확인)**

## 명령

```
npx vitest run --root channel --reporter=dot
```

- 1회차: **exit=1 (RED)** — 원본 전문: `m5-raw/mutation-G.txt`
- 2회차(플레이크 프로토콜 재실행 — 변이 적용 상태 그대로): **exit=1 (RED)** — 원본 전문: `m5-raw/mutation-G-rerun.txt`

## 예측과 관측

- 예측(변이표): **AC-007 실패**
- 관측: **예측과 불일치 — 실패한 기준은 AC-008 이다.** 두 실행 모두 `a truncated history derives the cursor from the kept ids only, dropping the newest first (AC-BOTSTAB-008)` 만 실패했고, **AC-007 은 통과했다.**
- **왜 AC-007 이 살아 남았는가 (관측 근거)**: AC-007 의 Given 은 «원소 하나» 뿐이다. plan.md §E 의 1단계(원소별 본문 절단, OD-1)가 그 원소를 먼저 4,000바이트로 자르므로 2단계(총 바이트 검사)를 지워도 단일 원소 문서는 애초에 OD-4 를 넘지 않는다 — INV-2 가 보증하는 «원소 하나는 반드시 실린다» 가 곧 «G 만 지워도 AC-007 은 지킨다» 의 근거다. 총 바이트 검사의 실제 관측 표면은 **여러 원소의 총합**을 재는 AC-008 이다(㉠ 실린 원소 수 감소 · ㉢ cursor < 전체 최댓값).
- **이것이 뜻하는 것**: 변이표 G 행의 예측은 이 트리에서 어긋나 있다 — «AC-007 실패» 가 아니라 «AC-008 실패» 가 관측값이다. 판정·후속 처리는 리드 회부 사항이다 (acceptance.md 관측 열은 SPEC 본문 — run 이 채우지 않는다).

## 실패한 기준 이름 (관측 — 2회차 출력)

```
 FAIL  test/index-wiring.test.ts > channel wiring > a truncated history derives the cursor from the kept ids only, dropping the newest first (AC-BOTSTAB-008)
```

## 스위트 요약 (관측)

```
1회차: Test Files  2 failed | 5 passed (7)   /   Tests  2 failed | 118 passed (120)
2회차: Test Files  1 failed | 6 passed (7)   /   Tests  1 failed | 119 passed (120)
```

- 1회차의 두 번째 실패 `transport auth > both nonces are regenerated per socket and a replayed challenge is refused` 는 예측 밖 실패라 플레이크 프로토콜대로 1회 재실행했고 2회차에서 사라졌다 — **간헐 실패로 판정, 이 행의 관측과 무관.** 이름·시각은 `flake-observations.md` 에 기록했다.

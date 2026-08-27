# SPEC-MENTION-001 구현 계획

> 이 문서는 `spec.md` 에서 도출된다. 원본 근거는 `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 6 이며, 그 문서는 읽기 전용이다.
>
> 아래 순서는 **바뀔 가능성이 큰 결정을 먼저** 놓았다. §A 부터 §E 까지가 검토가 필요한 부분이고, §F 의 마일스톤은 그 결정이 확정된 뒤의 기계적 실행 절차다.

---

## §A 실행 순서와 의존

카드 `t3`(마일스톤 M3)는 `plan-v2.md` Task 6·7·8·9 를 담는다. 이 SPEC 은 그중 Task 6 하나다.

```
Task 6 (이 SPEC — 멘션 파서)  ─┐
Task 7 (SSE 허브)             ─┼→ Task 9 (메시지 API) 가 셋을 모아 배선한다
Task 8 (봇 게이트웨이)         ─┘
```

**이 SPEC 은 선행 의존이 사실상 없다.** 순수 함수라서 `requireAuth` 도, `app.db` 도, 라우트도 쓰지 않는다. `SPEC-CORE-001` 이 만든 워크스페이스와 vitest 배선만 있으면 돌아간다.

| 선행 SPEC | 받아 쓰는 것 | 이 SPEC에서의 쓰임 |
|-----------|-------------|-------------------|
| `SPEC-CORE-001` | `server/package.json` 의 `test` / `typecheck` 스크립트 | 두 수용 기준의 명령 |
| `SPEC-CORE-001` | `server/tsconfig.json` (strict, NodeNext, `include: ["src", "test"]`) | AC-MENTION-006 의 타입 고정이 실제로 검사되는 근거 |

의존이 얕다는 것이 실행 순서상 이점이다 — 카드 `t3` 의 네 태스크 중 **가장 먼저** 끝낼 수 있고, Task 8·9 가 이 SPEC 이 확정한 타입에 결합하므로 먼저 끝내는 편이 낫다.

**의존이 아니라 소비자 쪽으로의 결합**은 반대로 깊다. §B 가 그 이야기다.

## §B 되돌리기 어려운 결정 — 반환 타입 계약

이 SPEC 에서 가장 되돌리기 비싼 결정이다. Task 8(게이트웨이)과 Task 9(메시지 API)가 이 타입에 직접 결합하고, 두 태스크는 **같은 카드 안에** 있다. 여기서 바꾸면 두 곳이 함께 바뀐다.

확정 사항:

| 항목 | 값 | 왜 여기서 고정하는가 |
|------|-----|---------------------|
| 함수 시그니처 | `parseMentions(body: string): Mention[]` | Task 9 가 메시지 본문 문자열 하나만 넘긴다 |
| 원소 타입 | `interface Mention { bot: string; delivery: 'to' \| 'cc' }` | Task 8 이 `message` 이벤트에 `delivery` 를 그대로 싣는다 |
| 반환은 **배열** | 단일 객체가 아니다 | `spec-v2.md` 2장 "복수 지정을 허용한다" |
| 순서 | 본문 등장 순서 | UI 가 멘션 순서대로 표시할 수 있게 |
| 중복 | 합치지 않는다 | `@TO(x)` 와 `@CC(x)` 는 delivery 가 달라 별개다 |
| `delivery` 값 | 소문자 `'to'` / `'cc'` | 프로토콜 표면의 값이 소문자 |
| 파일 경로 | `server/src/mention.ts` (**단수형**) | `plan-v2.md` 세 곳이 단수형으로 일치 |

**의도적으로 넣지 않은 것 세 가지:**

- **봇 존재 검증.** 넣으면 DB 를 읽어야 하고 순수 함수가 깨진다. 호출자(Task 9)의 몫 — §D 2번.
- **멘션이 제거된 본문**(`{ mentions, cleanBody }` 같은 확장 반환). 저장되는 본문은 원문 그대로이므로 지금 쓸 곳이 없다. 나중에 필요하면 함수를 하나 더 만드는 편이 이 함수를 넓히는 것보다 싸다.
- **봇별로 묶은 맵**(`Record<string, 'to' | 'cc'>`). 그 형태는 중복과 순서를 표현할 수 없어 REQ-MENTION-002 와 정면으로 충돌한다.

검토 시 이 표가 확인 대상이다. 여기서 한 칸을 바꾸면 Task 8·9 의 코드가 함께 바뀐다.

## §C 되돌리기 어려운 결정 — 멘션 문법

사람이 채팅창에 직접 타이핑하는 표면이라, 한 번 쓰기 시작하면 바꾸기 어렵다. 이미 저장된 메시지의 본문은 소급해서 재해석되지 않는다.

확정 문법: `@TO(이름)` / `@CC(이름)`

| 규칙 | 값 | 왜 |
|------|-----|-----|
| 키워드 | `TO` / `CC` **대문자만** | 소문자를 허용하면 영어 문장 속 `@to(...)` 같은 우연한 일치가 생긴다. 명시적 대문자가 "이건 지시다"라는 신호가 된다 |
| 이름 경계 | 여는 괄호 ~ 닫는 괄호 | 공백형(`@TO 봇이름`)은 이름의 끝을 판정할 수 없다 — `spec.md` §9 1번 |
| 이름 문자 | 괄호·공백을 뺀 **모두** (부정 클래스) | 한국어 이름을 허용해야 한다(REQ-MENTION-005). 허용 문자를 열거하는 방식(`\w+`)은 그 순간 ASCII 로 좁혀진다 |
| 이름 길이 | 1자 이상 | `@TO()` 를 배제 |

정규식은 이 네 규칙의 직역이다.

```ts
const MENTION_RE = /@(TO|CC)\(([^()\s]+)\)/g
```

| 조각 | 어느 규칙 |
|------|-----------|
| `(TO\|CC)` | 대문자 키워드 두 개 (`i` 플래그 없음) |
| `\(` … `\)` | 이름 경계 |
| `[^()\s]` | 이름 문자 — 부정 클래스라 한국어가 자동으로 들어온다 |
| `+` | 1자 이상 |
| `g` | 본문의 모든 멘션 (하나만이 아니라) |

**정규식의 다섯 조각이 각각 하나 이상의 수용 기준에 대응한다.** 조각을 지우면 어느 기준이 깨지는지가 `acceptance.md` 「스텁 대조」 표다. 이것이 이 SPEC 에서 정규식 리터럴을 계획서에 적어 두는 이유다 — 구현 자유를 뺏으려는 것이 아니라, 각 조각이 검증되고 있음을 보이기 위해서다.

## §D 원본 문서 모순과 해결

`spec.md` §9 에 결론만 적었고, 여기 판단 근거를 남긴다.

### 1. 멘션 표기 — 공백형 대 괄호형

`spec-v2.md` 2장은 `@TO <봇>`, 4-A 표는 `@TO(봇)` 이다. **괄호형 채택.**

근거는 구체성의 차이가 아니라 **판정 가능성**이다. 공백형에는 이름의 끝을 정하는 규칙이 문서 어디에도 없다. `@TO 코드 리뷰어 봐줘` 에서 이름이 `코드` 인지 `코드 리뷰어` 인지 결정하려면 등록된 봇 목록을 조회해 가장 긴 일치를 찾아야 하고, 그 순간 순수 함수가 깨진다. 괄호형은 닫는 괄호가 경계를 주므로 문자열만 보고 판정된다. `plan-v2.md` 가 괄호형에 정규식과 테스트 여섯 개를 붙인 것도 같은 이유일 것이다.

### 2. "알 수 없는 봇 멘션은 서버가 거부" 는 누구의 일인가

`spec-v2.md` 8장 에러 처리 표의 한 행이다. 파서가 하면 DB 를 읽게 된다.

**층위 문제로 해소한다** — 모순이 아니다. 그 문장의 주어 "서버"는 시스템 전체이지 파서가 아니다. 책임을 이렇게 나눈다.

| 층 | 하는 일 |
|----|---------|
| `mention.ts` (이 SPEC) | 문자열 → `Mention[]`. 이름이 실재하는지 모른다 |
| `routes-messages.ts` (Task 9) | 그 이름들을 등록 봇 목록과 대조해 없는 것을 거부하고 안내 |

이 분리의 이점은 테스트에서 바로 나타난다 — 파서 테스트가 DB 를 띄우지 않는다. `plan-v2.md` 파일 구조 주석의 *"`mention.ts` 는 순수 함수로 분리해 파서만 단독 테스트한다"* 가 이 이점을 가리킨다.

### 3. 리드 지시와 `plan-v2.md` 의 불일치 (파일명·반환 타입)

| 항목 | 리드 지시 | `plan-v2.md` | 채택 |
|------|-----------|--------------|------|
| 파일명 | `server/src/mentions.ts` | `server/src/mention.ts` | **`mention.ts`** |
| 반환 | `{ bot, delivery }` | `Mention[]` | **`Mention[]`** |

파일명은 `plan-v2.md` 세 곳(파일 구조 트리, Task 6 의 Files, 테스트의 `import ... from '../src/mention.js'`)이 모두 단수형이라 다수결이 아니라 **일치**다. 리드 지시는 한 곳뿐이다.

반환 타입은 더 단정적이다. 단일 객체로는 `@TO(pm) @TO(coder)` 를 담을 수 없어 `spec-v2.md` 2장의 "복수 지정을 허용한다"를 **표현 자체가 불가능**하다. 취향 문제가 아니라 요구사항 충족 여부 문제다.

**리드에게 보고한다.** 지시와 다르게 구현하는 것이므로, 리드가 다른 판단을 하면 이 SPEC 을 고친다. AC-MENTION-006 의 「계약 고정 2」가 단일 객체 반환을 컴파일 단계에서 거절하므로, 판단이 뒤집히면 그 줄도 함께 바뀐다.

### 4. [미해결 — 보존] 이름의 대소문자 구분

`@TO(PM)` 과 `@TO(pm)` 이 다른 봇인가. 원본 문서 어디에도 답이 없다.

**이 SPEC 은 결정하지 않는다.** 파서는 괄호 안 문자열을 **원문 그대로** 담고, 그것이 등록 봇과 같은지 판정하는 것은 Task 9 다. 대조를 대소문자 무시로 할지는 그때 결정할 문제다. 여기서 정규화(소문자화)를 넣으면 그 결정을 파서가 몰래 대신하게 되므로 넣지 않는다.

## §E 알려진 위험

| 위험 | 영향 | 대응 |
|------|------|------|
| **이 워크트리에 `node_modules` 가 없다** — `npm test -w server` 가 `sh: vitest: command not found` (종료 코드 127)로 끝나는 것을 실행해 확인했다 | 모든 수용 기준의 명령이 실행 불가 | run 단계 **0단계**에서 워크스페이스 루트 `npm install` 을 먼저 돌린다 (§F M0). 설치 실패는 진행 중단 사유 |
| 부정 기준이 스텁을 통과시킨다 | 검증하지 않는 수용 기준 — 이 프로젝트에서 이미 재발한 결함 부류 | `acceptance.md` 「판정 규범 2」로 부정 테스트를 강화했고, AC-MENTION-008 RED-2 가 그 강화가 실제로 듣는지 실행으로 관측한다 |
| 원본 테스트 이름 두 개를 바꿨다 | `plan-v2.md` 와 이름이 달라져 대조 시 혼동 | `acceptance.md` 서두에 이탈로 명시. 바뀐 것은 두 테스트의 입력·기대값·이름뿐이고 요구사항은 그대로 |
| `body` 파라미터가 `any` 로 느슨해져도 아무 기준이 잡지 못한다 | 타입 계약의 작은 구멍 | 잔여 위험으로 수용. `tsconfig` 의 `strict` 가 암묵적 `any` 는 막고, 명시적 `any` 는 리뷰에서 본다 |
| Task 8·9 가 이 타입을 다르게 가정한 채 병행 진행 | 카드 `t3` 안에서 재작업 | 이 SPEC 을 카드 `t3` 의 **첫 번째**로 끝낸다 (§A) |

## §F 마일스톤

### M0 — 사전 준비 (우선순위 High)

1. 워크스페이스 루트에서 `npm install`. 종료 코드 `0` 확인.
2. `npm test -w server` 가 **기존 테스트로** 통과하는지 확인 — 이 SPEC 이 손대기 전의 기준선.
3. 기준 SHA 기록:
   ```bash
   git rev-parse HEAD > .moai/specs/SPEC-MENTION-001/.spec-base-sha
   ```
   같은 값을 `progress.md` §E.1 의 `spec_base_sha` 에도 옮겨 적는다. **이 값이 없으면 AC-MENTION-007 은 통과가 아니라 실패다.**

### M1 — 멘션 파서 (우선순위 High)

1. **실패하는 테스트 작성** — `server/test/mention.test.ts`. `describe('parseMentions', …)` 안에 여섯 개를 둔다. 넷은 `plan-v2.md` Task 6 원문 그대로, 둘(부정 테스트)은 `acceptance.md` AC-MENTION-004 의 강화판. 파일 상단에 AC-MENTION-006 의 타입 고정 세 줄을 함께 넣는다.
2. **RED-1 관측** — `npm test -w server`. 모듈 없음으로 실패. 출력을 `progress.md` §E.2 에 원문으로 남긴다.
3. **스텁 작성** — `server/src/mention.ts` 에 `Mention` 인터페이스와 `return []` 스텁.
4. **RED-2 관측** — `npm test -w server -- --reporter=verbose`. 동작 기준들이 `×` 로 실패하는 것을 확인하고 출력을 남긴다. **이 단계를 건너뛰지 않는다** — 수용 기준이 스텁을 실제로 거른다는 유일한 직접 증거다.
5. **구현** — 스텁 본문을 `plan-v2.md` Task 6 의 구현으로 바꾼다.

   ```ts
   // @TO(봇)/@CC(봇) 멘션 파서 — 순수 함수
   const MENTION_RE = /@(TO|CC)\(([^()\s]+)\)/g

   export interface Mention {
     bot: string
     delivery: 'to' | 'cc'
   }

   export function parseMentions(body: string): Mention[] {
     const out: Mention[] = []
     for (const m of body.matchAll(MENTION_RE)) {
       out.push({ bot: m[2], delivery: m[1].toLowerCase() as 'to' | 'cc' })
     }
     return out
   }
   ```

   주석은 한국어. import 를 넣지 않는다 (REQ-MENTION-006).
6. **GREEN 관측** — `npm test -w server -- --reporter=verbose`. `✓` 줄 여섯 개를 확인하고 원문을 남긴다.
7. **TYPE 관측** — `npm run typecheck -w server`. 종료 코드 `0`.
8. **범위 경계 검사** — `acceptance.md` AC-MENTION-007 의 네 명령을 순서대로 실행하고 출력을 남긴다.
9. **커밋**
   ```bash
   git add server/src/mention.ts server/test/mention.test.ts
   git commit -m "feat: @TO/@CC mention parser"
   ```

마일스톤이 하나뿐인 것은 Tier S 의 정상 형태다. 파일 둘, 함수 하나, 300 LOC 훨씬 아래다.

## §G 자기 검증

run 단계 종료 전 아래를 순서대로 확인하고 결과를 `progress.md` §E.2 에 원문으로 남긴다.

| # | 명령 | 통과 조건 |
|---|------|-----------|
| 1 | `npm test -w server -- --reporter=verbose` | `✓ test/mention.test.ts > parseMentions > …` 줄 여섯 개가 모두 나타남 |
| 2 | `npm run typecheck -w server` | 종료 코드 `0` |
| 3 | `grep -nE '(^\|[^A-Za-z])(import\|require)[ (]' server/src/mention.ts` | 빈 출력 + 종료 코드 `1` |
| 4 | `git rev-parse --verify "$(cat .moai/specs/SPEC-MENTION-001/.spec-base-sha)^{commit}"` | 40자리 SHA + 종료 코드 `0` |
| 5 | `git diff --name-only <SHA> -- server` | 정확히 두 줄 + 종료 코드 `0` |
| 6 | `git diff --stat <SHA> -- server/src/db.ts server/src/index.ts` | 빈 출력 + 종료 코드 `0` |

4번이 5·6번의 전제다. 4번 없이 5·6번의 빈 출력만 보고 통과 처리하면 검사가 아무것도 검사하지 못한다.

## §H 안티패턴 (하지 말 것)

- **기대값이 `[]` 뿐인 부정 테스트를 쓰지 않는다.** `return []` 스텁이 자동으로 통과한다. 부정 케이스는 반드시 같은 입력에 정상 멘션을 섞어 기대값을 비워 두지 않는다. — 이 SPEC 의 중심 규범 (`acceptance.md` 「판정 규범 2」)
- **`npm test -w server` 의 종료 코드로 "이름 붙은 테스트가 통과했다"를 주장하지 않는다.** 기본 리포터에는 테스트 이름이 없어, 그 테스트를 아예 쓰지 않은 실행과 출력이 같다. `--reporter=verbose` 의 `✓` 줄을 본다.
- **`-t <이름>` 필터를 `--reporter=verbose` 대신 쓰지 않는다.** 맞는 이름이 하나도 없으면 전부 건너뛴 채 종료 코드 `0` 이라 같은 결함이 되살아난다.
- **`git diff` 를 `HEAD` 기준으로 쓰지 않는다.** 이미 커밋된 변경을 못 봐서 범위 경계 요구사항을 거짓 통과시킨다. 기준은 `spec_base_sha` 이고, 그 SHA 가 실제 커밋으로 풀리는지 먼저 확인한다.
- **`mention.ts` 에 import 를 넣지 않는다.** 편의를 위해 상수 하나를 다른 모듈에서 가져오는 순간 순수성 요구사항(REQ-MENTION-006)이 깨지고 파서 단독 테스트의 이점이 사라진다.
- **파서에서 봇 이름을 정규화(소문자화·공백 제거)하지 않는다.** Task 9 가 내려야 할 대조 규칙을 파서가 몰래 대신하게 된다 (§D 4번).
- **`index.ts` 나 `routes-messages.ts` 에 배선을 더하지 않는다.** 이 SPEC 은 함수만 만든다. 배선은 Task 9 다.
- **RED-2(스텁 단계) 관측을 건너뛰지 않는다.** 건너뛰면 "수용 기준이 스텁을 거른다"가 문서상의 주장으로만 남는다.

## §I 상호 참조

- `.moai/specs/SPEC-MENTION-001/spec.md` — 요구사항 7개, 범위 밖, 원본 모순 3건
- `.moai/specs/SPEC-MENTION-001/acceptance.md` — 수용 기준 8개, 스텁 대조 표, 엣지 케이스
- `.moai/specs/SPEC-MENTION-001/progress.md` — §E.1 기준 SHA, §E.2 실행 증거
- `.moai/plan/2026-08-26-minidiscord/plan-v2.md` — Task 6 (테스트·구현 원문), 파일 구조, Global Constraints
- `.moai/plan/2026-08-26-minidiscord/spec-v2.md` — 2장·6장·7장·8장
- `.moai/specs/SPEC-BOT-001/acceptance.md` — verbose `✓` 줄 판정 규범과 기준 SHA 검사 형태의 선례

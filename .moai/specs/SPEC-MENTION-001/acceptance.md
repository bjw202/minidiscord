# SPEC-MENTION-001 수용 기준

각 기준은 **명령 하나 + 관측 가능한 결과 하나**로 이루어진다. 판정은 이분법이다 — 통과 아니면 실패이고, 그 사이는 없다.

모든 명령은 별도 언급이 없는 한 워크스페이스 루트에서 실행한다.

**규범 근거는 `plan-v2.md` 와 `spec-v2.md` 뿐이다.** 같은 디렉터리 이름의 `.moai/plan/2026-08-26-minidiscord/plan.md` / `spec.md` 는 초기 커밋에 담긴 **폐기된 v1** 이며 이 SPEC 의 참조 대상이 아니다.

---

## 이 SPEC 의 판정 규범 두 가지

### 1. 이름 붙은 테스트의 통과는 `--reporter=verbose` 의 `✓` 줄로 판정한다

기본 리포터는 파일 수와 테스트 수만 내보내고 **테스트 이름은 한 줄도 내지 않는다.** 그래서 그 테스트를 아예 쓰지 않은 실행과 통과한 실행의 출력이 서로 같고, 둘 다 종료 코드 `0` 이다 — 요약 줄로도 종료 코드로도 두 경우를 가를 수 없다.

그래서 그런 기준의 명령은 `npm test -w server -- --reporter=verbose` 이고, 관측 대상은

```
 ✓ test/mention.test.ts > parseMentions > <테스트 이름> <소요시간>
```

줄이 출력에 **실제로 나타나는가** 하나다. 그 줄이 없으면 **실패**다. 판정은 `✓ test/mention.test.ts > parseMentions > ` 로 시작해 해당 테스트 이름으로 끝나는 줄(끝에 붙는 소요 시간은 제외)이 있는가로 한다.

`-t <이름>` 필터로 대신하지 않는다 — 맞는 이름이 하나도 없으면 전부 건너뛴 채 종료 코드 `0` 이 되어 같은 결함이 되살아난다.

> 출력 형태의 근거: 같은 워크스페이스·같은 vitest 판에서 앞 카드가 남긴 원문 출력 (`.moai/specs/SPEC-BOT-001/progress.md` §E.2, 190-194행). 추정이 아니라 관측된 형식이다.

### 2. 스텁을 통과시키는 기준은 기준이 아니다

이 SPEC 이 만드는 것은 순수 함수 하나여서, 부정 기준("이런 건 안 잡혀야 한다")의 기대값이 전부 빈 배열 `[]` 이 된다. 그러면 아래 스텁이 그 기준들을 **전부 통과한다.**

```ts
export function parseMentions(_body: string): Mention[] { return [] }
```

그래서 이 SPEC 의 부정 테스트는 원본 `plan-v2.md` Task 6 의 것을 그대로 쓰지 않는다. **같은 입력 문자열 안에 정상 멘션을 하나 섞어** 두고, 잡히지 말아야 할 것이 안 잡히는 것과 잡혀야 할 것이 잡히는 것을 **한 단언에서 함께** 관측한다. 그 결과 기대값이 `[]` 이 아니게 되고, 스텁도 느슨한 정규식도 함께 걸린다.

원본으로부터의 **의도적 이탈**이며, 바뀐 것은 두 테스트의 입력·기대값·이름뿐이고 요구사항은 그대로다. 아래 「스텁 대조」 표가 기준마다 어떤 잘못된 구현을 잡아내는지 명시한다.

---

## AC 매트릭스

| ID | 요구사항 | 명령 | 관측할 결과 |
|----|----------|------|-------------|
| AC-MENTION-001 | REQ-MENTION-002, REQ-MENTION-003 | `npm test -w server -- --reporter=verbose` | 출력에 `✓ test/mention.test.ts > parseMentions > parses a single TO` 줄이 나타남 |
| AC-MENTION-002 | REQ-MENTION-003 | `npm test -w server -- --reporter=verbose` | 출력에 `✓ test/mention.test.ts > parseMentions > parses CC` 줄이 나타남 |
| AC-MENTION-003 | REQ-MENTION-002 | `npm test -w server -- --reporter=verbose` | 출력에 `✓ test/mention.test.ts > parseMentions > parses multiple mentions in order, duplicates kept` 줄이 나타남 |
| AC-MENTION-004 | REQ-MENTION-001, REQ-MENTION-004 | `npm test -w server -- --reporter=verbose` | 아래 두 `✓` 줄이 **모두** 나타남 |
| AC-MENTION-005 | REQ-MENTION-005 | `npm test -w server -- --reporter=verbose` | 출력에 `✓ test/mention.test.ts > parseMentions > korean bot names work` 줄이 나타남 |
| AC-MENTION-006 | REQ-MENTION-003 | `npm run typecheck -w server` | 종료 코드 `0`. 세 개의 타입 고정 줄이 `mention.test.ts` 에 있는 상태에서 통과 |
| AC-MENTION-007 | REQ-MENTION-006, REQ-MENTION-007 | 아래 AC-MENTION-007 본문 참조 | `mention.ts` 에 import 0건(grep 종료 코드 `1` + 빈 출력), 기준 SHA 확인 종료 코드 `0`, 변경 파일이 정확히 두 줄 |
| AC-MENTION-008 | RED→GREEN 전이 | 아래 AC-MENTION-008 본문 참조 | 네 전이가 순서대로 관측됨 |

---

## Given-When-Then 시나리오

### AC-MENTION-001 — TO 멘션 하나를 파싱

**Given** `server/test/mention.test.ts` 에 원본 `plan-v2.md` Task 6 의 테스트가 있다.

```ts
it('parses a single TO', () => {
  expect(parseMentions('@TO(pm) 일정 정리해줘')).toEqual([{ bot: 'pm', delivery: 'to' }])
})
```

**When** `npm test -w server -- --reporter=verbose` 를 실행한다.

**Then** 출력에 `✓ test/mention.test.ts > parseMentions > parses a single TO` 줄이 나타난다. 그 줄이 없으면 이 기준은 **실패**다.

관측되는 것은 세 가지다 — 결과가 **길이 1의 배열**이고, `bot` 이 괄호 안 문자열 `'pm'` 이며(`@TO(` 나 `)` 가 섞여 있지 않다), 멘션 뒤에 붙은 한국어 본문이 결과에 섞이지 않는다.

### AC-MENTION-002 — CC 는 delivery 가 `'cc'`

**Given** 원본 테스트가 있다.

```ts
it('parses CC', () => {
  expect(parseMentions('이건 참고만 @CC(coder)')).toEqual([{ bot: 'coder', delivery: 'cc' }])
})
```

**When** `npm test -w server -- --reporter=verbose` 를 실행한다.

**Then** 출력에 `✓ test/mention.test.ts > parseMentions > parses CC` 줄이 나타난다.

이 기준이 단독으로 존재하는 이유는 **delivery 사상이 이 SPEC 의 교차 태스크 계약(REQ-MENTION-003)의 절반**이기 때문이다. `delivery` 를 항상 `'to'` 로 두는 구현은 AC-MENTION-001 을 통과하고 이 기준에서만 걸린다. 또한 멘션이 본문 **끝**에 오는 경우를 함께 덮는다.

### AC-MENTION-003 — 순서 보존과 중복 유지

**Given** 원본 테스트가 있다.

```ts
it('parses multiple mentions in order, duplicates kept', () => {
  expect(parseMentions('@TO(pm) 정리하고 @TO(coder) 구현해. @CC(coder)')).toEqual([
    { bot: 'pm', delivery: 'to' },
    { bot: 'coder', delivery: 'to' },
    { bot: 'coder', delivery: 'cc' },
  ])
})
```

**When** `npm test -w server -- --reporter=verbose` 를 실행한다.

**Then** 출력에 `✓ test/mention.test.ts > parseMentions > parses multiple mentions in order, duplicates kept` 줄이 나타난다.

`toEqual` 은 배열 순서를 따지므로 이 단언 하나가 **세 가지 잘못된 구현**을 동시에 잡는다 — 봇 이름으로 중복을 합치는 구현(`coder` 가 하나로 줄어 길이 2), 결과를 정렬하는 구현(순서가 `coder, coder, pm` 으로 바뀜), 그리고 정규식에 `g` 플래그를 빠뜨린 구현(첫 매치만 잡혀 길이 1). REQ-MENTION-002 의 "중복을 합치지 않는다"가 왜 필요한지도 여기서 드러난다 — 세 번째 원소는 같은 봇에 대한 `'cc'` 이고, 합치면 그 정보가 사라진다.

### AC-MENTION-004 — 형식에 맞지 않는 후보는 배제된다 (정상 멘션과 함께 관측)

**Given** `server/test/mention.test.ts` 에 다음 두 테스트가 있다. 원본 `plan-v2.md` Task 6 의 부정 테스트 두 개를 **강화한 것**이며, 이 문서 서두 「판정 규범 2」의 이탈에 해당한다.

```ts
it('ignores plain @name and non-TO/CC keywords while catching a real mention', () => {
  expect(parseMentions('@pm 안녕 @토(pm)도 무시 @to(pm)도 무시 @TO(real) 이건 잡힌다')).toEqual([
    { bot: 'real', delivery: 'to' },
  ])
})

it('rejects empty and space-containing names while catching a valid one', () => {
  expect(parseMentions('@TO( ) @TO() @CC(ok)')).toEqual([{ bot: 'ok', delivery: 'cc' }])
})
```

**When** `npm test -w server -- --reporter=verbose` 를 실행한다.

**Then** 출력에 아래 **두 줄이 모두** 나타난다. 하나라도 없으면 이 기준은 **실패**다.

```
 ✓ test/mention.test.ts > parseMentions > ignores plain @name and non-TO/CC keywords while catching a real mention
 ✓ test/mention.test.ts > parseMentions > rejects empty and space-containing names while catching a valid one
```

이 기준이 이 SPEC 에서 가장 많은 잘못된 구현을 잡는다. 기대값이 `[]` 이 아니라 **정확히 한 원소**이므로 양쪽으로 판별한다.

| 잘못된 구현 | 어떻게 걸리나 |
|-------------|--------------|
| 빈 스텁 `return []` | 길이 0 ≠ 1 |
| 이름 클래스가 느슨함 (`\(([^)]*)\)`) | 첫 테스트에서 `@토(pm)` 이, 둘째에서 `@TO( )`·`@TO()` 가 함께 잡혀 길이가 늘어난다 |
| 키워드 클래스가 느슨함 (`@(\w+)\(`) | 첫 테스트에서 `@토(pm)` 이 잡힌다 |
| 대소문자 무시 (`i` 플래그) | 첫 테스트에서 `@to(pm)` 이 잡혀 길이 2 |
| 이름에 `+` 대신 `*` | 둘째 테스트에서 `@TO()` 가 빈 이름으로 잡힌다 |

원본 테스트 두 개(기대값 `[]`)를 그대로 두었다면 위 다섯 중 **빈 스텁 하나도** 잡지 못했다.

### AC-MENTION-005 — 한국어 봇 이름

**Given** 원본 테스트가 있다.

```ts
it('korean bot names work', () => {
  expect(parseMentions('@TO(코드리뷰어) 봐줘')).toEqual([{ bot: '코드리뷰어', delivery: 'to' }])
})
```

**When** `npm test -w server -- --reporter=verbose` 를 실행한다.

**Then** 출력에 `✓ test/mention.test.ts > parseMentions > korean bot names work` 줄이 나타난다.

잡아내는 구현은 이름 클래스를 ASCII 로 못박은 것(`[A-Za-z0-9_-]+`, `\w+`)이다. 그런 구현은 AC-MENTION-001·002·003 을 전부 통과하고 여기서만 걸린다 — 앞 세 기준의 봇 이름이 모두 ASCII 이기 때문이다. REQ-MENTION-001 이 이름을 **부정 문자 클래스**(괄호와 공백만 배제)로 규정한 이유가 이것이다.

### AC-MENTION-006 — 반환 타입 계약이 컴파일러로 고정된다

**Given** `server/test/mention.test.ts` 상단에 다음 세 줄이 있다. 실행되는 단언이 아니라 **`tsc` 가 판정하는 타입 고정**이다.

```ts
import type { Mention } from '../src/mention.js'

// 계약 고정 1 — 반환은 Mention 배열이다.
const _pinned: Mention[] = parseMentions('@TO(pm)')
// 계약 고정 2 — 배열이지 단일 Mention 이 아니다.
// @ts-expect-error parseMentions 는 Mention[] 를 돌려준다
const _notSingle: Mention = parseMentions('@TO(pm)')
// 계약 고정 3 — delivery 는 'to' | 'cc' 두 값뿐이다.
// @ts-expect-error 'bcc' 는 delivery 값이 아니다
const _notWidened: Mention = { bot: 'pm', delivery: 'bcc' }
```

**When** `npm run typecheck -w server` 를 실행한다.

**Then** 종료 코드가 `0` 이다.

`server/tsconfig.json` 의 `include` 가 `["src", "test"]` 이므로 `tsc --noEmit` 이 이 테스트 파일을 실제로 검사한다(확인함). 두 `@ts-expect-error` 는 **거기 오류가 나야만** 통과하는 지시자이므로, 계약이 느슨해지면 지시자가 남아돌아 `Unused '@ts-expect-error' directive` 로 타입 검사가 **실패**한다.

| 잘못된 구현 | 어떻게 걸리나 |
|-------------|--------------|
| 단일 객체 반환 `{ bot, delivery }` (리드 지시의 형태 — `spec.md` §9 3번) | 고정 1 이 오류가 되고, 고정 2 의 `@ts-expect-error` 가 남아돌아 실패 |
| `delivery: string` 으로 넓힘 | 고정 3 의 `@ts-expect-error` 가 남아돌아 실패 |
| `Mention` 을 내보내지 않음 | `import type` 이 해결되지 않아 실패 |
| `body` 파라미터 타입을 `any` 로 | 고정 1·2 는 통과하나, 이는 §5 범위 밖이며 AC-MENTION-007 의 소스 검사에서도 잡히지 않는다 — 잔여 위험으로 기록한다 |

**이 기준은 빈 스텁을 잡지 못한다.** 타입 계약 기준이지 동작 기준이 아니기 때문이다. 동작은 AC-MENTION-001 부터 005 가 덮고, 그 다섯은 전부 스텁을 잡는다.

### AC-MENTION-007 — 순수성과 범위 경계

**Given** run 단계 진입 시점 커밋이 `spec_base_sha` 로 `progress.md` §E.1 에 기록돼 있다. `HEAD` 기준 비교는 이미 커밋된 변경을 볼 수 없어 금지 요구사항을 거짓 통과시키므로 쓰지 않는다.

**When** 워크스페이스 루트에서 네 명령을 순서대로 실행한다.

```bash
# 1) mention.ts 가 아무것도 import 하지 않는다 (REQ-MENTION-006)
grep -nE '(^|[^A-Za-z])(import|require)[ (]' server/src/mention.ts
echo "grep exit: $?"

# 2) 기준 SHA 가 실제 커밋으로 풀리는지 먼저 확인한다
SHA=$(cat .moai/specs/SPEC-MENTION-001/.spec-base-sha)
git rev-parse --verify "$SHA^{commit}"
echo "rev-parse exit: $?"

# 3) 그 확인이 종료 코드 0 으로 끝난 뒤에만 변경 파일을 센다 (REQ-MENTION-007)
git diff --name-only "$SHA" -- server
echo "diff exit: $?"

# 4) 기존 소스가 한 줄도 바뀌지 않았다
git diff --stat "$SHA" -- server/src/db.ts server/src/index.ts server/src/auth.ts \
  server/src/config.ts server/src/routes-rooms.ts server/src/routes-bots.ts
echo "diff-stat exit: $?"
```

**Then** 네 가지가 모두 관측된다.

| 명령 | 관측할 결과 |
|------|-------------|
| 1 | 출력이 비어 있고 `grep exit: 1`. 출력이 있거나 `grep exit: 0` 이면 **실패** |
| 2 | 40자리 SHA 를 출력하고 `rev-parse exit: 0`. **기준 SHA 가 없으면 이 기준은 통과가 아니라 실패다** |
| 3 | 출력이 정확히 두 줄 — `server/src/mention.ts` 와 `server/test/mention.test.ts`. `diff exit: 0` |
| 4 | 출력이 비어 있고 `diff-stat exit: 0` |

명령 2 가 명령 3·4 의 전제다. 기준 SHA 가 없을 때도 3·4 의 표준 출력은 비어 있어서, **빈 출력만으로 통과 처리하면 검사가 아무것도 검사하지 못한다.** 그래서 종료 코드를 관측 조건에 함께 넣었다.

**이 기준도 빈 스텁을 잡지 못한다** — 경계 기준이지 동작 기준이 아니다. 잡아내는 것은 `mention.ts` 에 import 를 넣어 순수성을 깬 구현과, 이 SPEC 범위 밖 파일(특히 `index.ts` 배선, `routes-messages.ts`)을 함께 건드린 구현이다.

### AC-MENTION-008 — RED → GREEN 전이 증거

**Given** 구현 전이다.

**When** `plan.md` §F 의 순서대로 진행하며 네 시점의 출력을 `progress.md` §E.2 에 원문으로 남긴다.

**Then** 네 전이가 순서대로 관측된다.

| 시점 | 명령 | 관측할 결과 |
|------|------|-------------|
| RED-1 | `npm test -w server` | **실패**. `server/src/mention.ts` 가 없어 `mention.test.ts` 가 모듈 해석에 실패한다 |
| RED-2 | `npm test -w server -- --reporter=verbose` | 구현 파일을 스텁(`return []`)으로 만든 직후. `✓ ... parses a single TO` 줄이 **없고** 대신 `×` 줄이 나타난다 — 이 SPEC 의 동작 기준이 스텁을 실제로 거른다는 증거다 |
| GREEN | `npm test -w server -- --reporter=verbose` | 정식 구현 후. `parseMentions` 의 여섯 `✓` 줄이 모두 나타난다 |
| TYPE | `npm run typecheck -w server` | 종료 코드 `0` |

RED-2 는 이 SPEC 에만 있는 단계다. 「판정 규범 2」가 문서상의 주장에 그치지 않고 **실행으로 확인**되는 지점이므로 건너뛰지 않는다.

---

## 스텁 대조 (기준별로 어떤 잘못된 구현을 잡는가)

수용 기준을 개별로 보지 않고 **부류로 한 번 훑은 결과**다. 열 「스텁」은 `return []` 스텁에 대해 그 기준이 실패하는가다 — `아니오` 인 기준은 동작을 검증하지 않는 기준이며, 그것이 정당한 이유를 함께 적었다.

| 기준 | 스텁을 잡는가 | 그 밖에 잡아내는 잘못된 구현 |
|------|---------------|------------------------------|
| AC-MENTION-001 | **예** (길이 0 ≠ 1) | 괄호까지 `bot` 에 담는 구현, 본문이 섞여 들어가는 구현 |
| AC-MENTION-002 | **예** | `delivery` 를 항상 `'to'` 로 하드코딩, 대문자 `'TO'` 를 그대로 담는 구현 |
| AC-MENTION-003 | **예** | 중복 병합, 결과 정렬, `g` 플래그 누락(첫 매치만) |
| AC-MENTION-004 | **예** | 느슨한 이름 클래스, 느슨한 키워드 클래스, `i` 플래그, `+` 대신 `*` |
| AC-MENTION-005 | **예** | ASCII 한정 이름 클래스 (`\w+`, `[A-Za-z0-9_-]+`) |
| AC-MENTION-006 | 아니오 — **타입 계약 기준** | 단일 객체 반환, `delivery: string` 확장, `Mention` 미노출 |
| AC-MENTION-007 | 아니오 — **경계 기준** | `mention.ts` 의 import, 범위 밖 파일 수정, 기준 SHA 없이 통과시키기 |
| AC-MENTION-008 | **예** (RED-2 가 스텁 거부를 직접 관측) | 구현을 먼저 쓰고 테스트를 나중에 맞추는 진행 |

동작을 다루는 여섯 기준(001-005, 008)은 **전부** 스텁에서 실패한다. 나머지 둘은 동작이 아니라 타입과 경계를 관측하며, 그 사실을 여기 명시해 "통과했으니 동작이 검증됐다"는 오독을 막는다.

---

## 엣지 케이스

| 케이스 | 기대 동작 | 검증 |
|--------|-----------|------|
| 빈 문자열 `''` | 빈 배열 `[]`. 오류가 아니다 | 정규식 매칭의 자연스러운 결과 — 별도 기준을 두지 않는다 |
| 멘션만 있고 본문이 없음 (`'@TO(pm)'`) | 그 멘션 하나 | AC-MENTION-002 가 본문 끝 멘션을 덮는다 |
| `@TO(a)@CC(b)` — 붙어 있는 멘션 둘 | 둘 다 잡힌다. 구분자를 요구하지 않는다 | AC-MENTION-004 둘째 테스트의 `@TO( ) @TO() @CC(ok)` 와 같은 경로 |
| `@TO(코드 리뷰어)` — 이름에 공백 | 잡히지 않는다. 이름 클래스가 공백을 배제한다 | AC-MENTION-004 둘째 테스트 |
| `@TO(a(b))` — 이름에 괄호 | 잡히지 않는다. 이름 클래스가 괄호를 배제한다 | REQ-MENTION-001. 중첩 괄호 문법은 §5 범위 밖 |
| `@to(pm)` — 소문자 키워드 | 잡히지 않는다 | AC-MENTION-004 첫째 테스트가 명시적으로 단언한다 |
| `@TO(없는봇)` — 등록되지 않은 봇 | **잡힌다.** 파서는 봇 존재를 검증하지 않는다 | REQ-MENTION-006. 거부는 Task 9 메시지 API 의 몫 (`spec.md` §9 2번) |
| 코드 블록 안의 `@TO(pm)` | 잡힌다. 문맥을 보지 않는다 | §5 범위 밖으로 명시 배제 |
| 아주 긴 본문 | 선형 시간. `matchAll` 한 번만 돈다 | 성능 기준을 두지 않는다 — 메시지 본문 길이에서 문제가 되지 않는다 |

---

## 품질 게이트

| 게이트 | 기준 | 명령 |
|--------|------|------|
| Tested | `server/test/` 의 테스트가 전부 통과 (기존 분 + 이 SPEC 의 여섯) | `npm test -w server` |
| Readable | 코드 주석은 한국어(`code_comments: ko`), `mention.ts` 는 문자열 파싱만 안다 | 리뷰 |
| Unified | TypeScript strict, NodeNext | `npm run typecheck -w server` |
| Secured | 해당 없음 — 순수 함수이고 신뢰 경계가 없다. 입력 검증(등록된 봇인가)은 호출자 몫 | REQ-MENTION-006 |
| Trackable | 커밋 메시지가 Conventional Commits (`feat: @TO/@CC mention parser`) | `git log --oneline` |

---

## Definition of Done

- [ ] AC-MENTION-001 부터 AC-MENTION-008 까지 전부 통과, 각 항목의 명령 출력이 `progress.md` §E.2 에 **원문으로** 기록됨
- [ ] `npm test -w server` 가 종료 코드 `0`
- [ ] `npm run typecheck -w server` 가 종료 코드 `0`
- [ ] `parseMentions` 의 `✓` 줄 여섯 개가 verbose 출력에 모두 나타남
- [ ] RED-2(스텁 단계에서 동작 기준이 실패함) 출력이 `progress.md` §E.2 에 남아 있음
- [ ] `spec_base_sha` 가 `progress.md` §E.1 과 `.moai/specs/SPEC-MENTION-001/.spec-base-sha` 에 기록됨
- [ ] `git rev-parse --verify "$(cat .moai/specs/SPEC-MENTION-001/.spec-base-sha)^{commit}"` 이 종료 코드 `0` 으로 40자리 SHA 출력
- [ ] 그 SHA 로 실행한 `git diff --name-only <SHA> -- server` 가 종료 코드 `0` 이고 출력이 정확히 두 줄 (`server/src/mention.ts`, `server/test/mention.test.ts`)
- [ ] `grep -nE '(^|[^A-Za-z])(import|require)[ (]' server/src/mention.ts` 가 빈 출력 + 종료 코드 `1`
- [ ] `channel/`, `web/`, `scripts/` 아래 어떤 파일도 생성되지 않음
- [ ] 커밋 1개 (`feat: @TO/@CC mention parser`)

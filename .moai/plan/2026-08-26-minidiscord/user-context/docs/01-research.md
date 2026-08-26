# 리서치: Claude Code를 채팅 봇으로 쓸 때 생기는 문제들

조사일 2026-08-26 · 모든 사실은 공식 문서 또는 GitHub API로 직접 확인했습니다.

> 이 문서는 **근거 모음**입니다. 원문 인용이 많습니다.
> 각 인용문 아래에 **"쉽게 말하면"** 을 붙여뒀으니 그것만 읽어도 됩니다.
> 왜 이렇게 만들었는지 이해하고 싶으면 [02-eli5-architecture.md](02-eli5-architecture.md)를 먼저 보세요.

---

## 요약: 궁금했던 것 3가지에 대한 답

**Q1. 봇 하나에 대화창 하나만 붙는 게 맞나?**
→ 맞습니다. 정확히는 **봇 1개 = 세션(대화 한 판) 1개**입니다. 봇 하나가 여러 채팅방 메시지를 받을 수는 있지만, **전부 같은 대화 기록에 섞여 들어갑니다.**

**Q2. 여러 봇을 자유롭게 붙일 수 있나?**
→ **플랫폼은 허용합니다.** 디스코드 서버나 텔레그램 그룹에 봇 여러 개를 넣는 건 문제없어요. 막고 있는 건 Claude Code의 공식 기능 쪽입니다. 그래서 중간에 프로그램을 하나 끼우면 해결됩니다.

**Q3. 오토컴팩트를 끄면 어떻게 되나?**
→ 한도에 닿는 순간 **에러 내고 그냥 멈춥니다.** 그래서 인계(핸드오프)는 선택이 아니라 필수입니다.

---

## 1. Claude Code 공식 Channels 기능

출처: https://code.claude.com/docs/en/channels · https://code.claude.com/docs/en/channels-reference

Anthropic이 만든 공식 기능입니다. 아직 **research preview**(실험 단계라 언제든 바뀔 수 있는 상태)입니다.

| 항목 | 내용 |
|---|---|
| **이게 뭔가** | 원문: "A channel is an MCP server that pushes events into your running Claude Code session"<br>👉 쉽게 말하면: **이미 켜둔 Claude Code 창 안으로** 외부 메시지를 밀어 넣어주는 부품입니다. 새 창을 여는 게 아니에요. |
| **어디를 지원** | 텔레그램, 디스코드, iMessage, fakechat(연습용). 전부 `anthropics/claude-plugins-official` 저장소 (⭐34,102, 2026-08-25 갱신) |
| **어떻게 켜나** | Bun(자바스크립트 실행기)이 필요하고, `claude --channels plugin:telegram@claude-plugins-official` 처럼 **창을 열 때마다 옵션으로 붙여야** 합니다 |
| **상시 운영** | 원문: "Events only arrive while the session is open, so for an always-on setup you run Claude in a background process or persistent terminal."<br>👉 **창을 켜둔 동안에만** 메시지가 들어옵니다. 24시간 돌리려면 터미널을 계속 띄워둬야 합니다. |
| **보안** | 허용 목록 방식(페어링 코드로 등록). 문서가 **"방 번호가 아니라 사람 번호로 막아라"** 고 명시합니다. 방으로 막으면 그 방에 있는 아무나 명령을 밀어 넣을 수 있기 때문입니다. |
| **회사 계정** | Team/Enterprise는 관리자가 `channelsEnabled`를 켜야 합니다. Bedrock / Google Cloud Agent Platform / Microsoft Foundry에서는 못 씁니다. |
| **숨겨진 옵션** | 실험 단계라 `--channels`가 `claude --help`에 안 나옵니다. 문법이 바뀔 수 있습니다. |

### 가장 중요한 한 문장

> "Events queue into the session and are processed in order. If several notifications arrive while Claude is busy, they're delivered together on the next turn and Claude handles them as a group. **To process independent event streams concurrently, run separate sessions.**"

**쉽게 말하면:**

> 어느 방에서 온 메시지든 **한 줄로 세워서 순서대로** 처리합니다.
> 서로 안 섞이게 하려면 **창(세션)을 따로 띄우는 수밖에 없습니다.**

### 그래서 정리하면

- 봇 하나가 여러 채팅방을 커버하는 것 **자체는 가능합니다.** 메시지에 방 번호(`chat_id`)가 붙어 오고, Claude가 그 번호로 답장을 보냅니다.
- 그런데 **대화 기록은 하나입니다.** A방 얘기와 B방 얘기가 같은 종이 위에 섞입니다.
- 따로 놀게 하려면 = 세션을 나눠야 하고 = **프로그램을 따로 띄워야** 합니다.
- 같은 컴퓨터에서 봇 여러 개를 돌리려면 각각 `TELEGRAM_STATE_DIR` / `DISCORD_STATE_DIR`(설정 저장 폴더)을 다르게 지정하라고 플러그인 문서가 안내합니다.

---

## 2. 플랫폼 자체는 뭘 허용하나

| 플랫폼 | 봇 여러 개 넣기 | 알아야 할 점 |
|---|---|---|
| **디스코드** | 가능. 한 채널에 봇 여러 개가 동시에 동작해도 문제없음 | 개발자 포털에서 **Message Content Intent**를 켜야 일반 메시지가 봇에게 들어옵니다. 안 켜면 멘션만 옵니다.<br>스레드는 각각 고유 채널 번호를 가지므로 **대화를 나누는 기준으로 쓰기 좋습니다.** |
| **텔레그램** | 가능 (한 그룹에 봇 여러 개 추가 OK) | 봇은 기본적으로 **프라이버시 모드**라 그룹에서 멘션이나 답장만 받습니다 → BotFather에서 `/setprivacy` Disable.<br>**Bot API에 지난 메시지를 조회하는 기능이 아예 없습니다.** |

> ⚠️ **텔레그램의 "지난 메시지 조회 불가"가 설계를 결정합니다.**
> 봇이 재시작되면 이전 대화를 텔레그램에서 다시 받아올 방법이 **없습니다.**
> 그래서 대화 연속성을 플랫폼에 맡길 수 없고, **100% 내 컴퓨터의 인계서 파일에 의존해야** 합니다.

「서버나 그룹 하나에 봇을 최대 몇 개까지」는 공식 수치를 문서로 확인하지 못했습니다. 실무에서 문제가 된 사례는 안 보입니다.

---

## 3. 남들은 어떻게 하고 있나 (2026-08-26 GitHub API로 확인)

| 프로젝트 | ⭐ | 최근 갱신 | 어떤 방식인가 |
|---|---|---|---|
| slopus/happy | 23,503 | 2026-08-25 | 봇이 아니라 **휴대폰용 원격 조종기**. 터미널 세션을 폰에서 이어받는 방식 |
| omnara-ai/omnara | 2,763 | 2026-08-26 | 자체 서버가 세션 상태를 관리. AI 모델 종류를 안 가림 |
| RichardAtCT/claude-code-telegram | 2,765 | 2026-03-30 | 파이썬. `ENABLE_PROJECT_THREADS=true`로 프로젝트별 스레드 분리, `/new`로 새 세션 |
| chadingTV/claudecode-discord | 62 | 2026-05-01 | **채널 1개 = 세션 1개.** 컴퓨터마다 봇을 하나씩 띄워 같은 서버에 다 초대하는 방식 |

**핵심 발견:**

> "여러 봇을 자유롭게 붙이기"는 공식 기능으로는 안 되지만,
> **중간에 프로그램(브리지)을 하나 끼우고 "어느 방이 어느 세션인지" 명단만 들고 있으면** 됩니다.
> 위 네 번째 프로젝트가 그렇게 하고 있고, 이 레포도 같은 방식입니다.

---

## 4. 오토컴팩트 끄는 방법 — 정확한 스위치

출처: https://code.claude.com/docs/en/env-vars · https://code.claude.com/docs/en/model-config

> **오토컴팩트**: 대화가 길어져 한도에 가까워지면 Claude Code가 **알아서 요약해서 자리를 비우는** 기능.

| 방법 | 실제 효과 |
|---|---|
| **`DISABLE_AUTO_COMPACT=1`** ← 이걸 쓰세요 | 원문: "disable automatic compaction when approaching the context limit. The manual `/compact` command remains available."<br>👉 자동 요약만 끄고, 직접 `/compact` 치는 건 남겨둡니다. **설정 파일보다 우선 적용됩니다.** |
| `DISABLE_COMPACT=1` | 원문: "disable all compaction: both automatic compaction and the manual `/compact` command"<br>👉 수동 요약까지 전부 차단 |
| `/autocompact 500k`, `--autocompact`, `CLAUDE_CODE_AUTO_COMPACT_WINDOW` | **끄는 게 아니라 "몇 장 찼을 때 요약할지"를 조절**하는 것. 100000~1000000 사이 정수만 받습니다. `500k`라고 쓰면 `500`으로 읽혀서 최소값으로 깎입니다 (함정!) |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | 몇 %에서 요약할지. **낮추는 것만 되고 올리는 건 안 됩니다** |
| `PreCompact` 훅 + `exit 2` | 요약이 시작되려는 순간 가로채서 막기. `matcher: "auto"`로 좁히면 자동만 막고 수동은 허용 |

### ⚠️ 끄면 어떻게 되는지

> "With auto-compaction off, sessions stop at the 200K boundary with the context-limit error instead of compacting."

**쉽게 말하면: 20만 토큰에 도달하면 요약하는 대신 `Prompt is too long` 에러를 내고 멈춥니다.** 우아하게 안 끝나요.

### ⚠️ 또 하나의 함정

> "The status line's `used_percentage` always measures against the model's full context window, so once this variable is set, that percentage no longer indicates when compaction will run"

**쉽게 말하면:** `CLAUDE_CODE_AUTO_COMPACT_WINDOW`를 건드리면, 화면에 뜨는 % 표시와 실제 요약 시점이 **서로 다른 기준**이 됩니다. 둘을 섞어 쓰면 헷갈립니다.

### 커뮤니티 보고

`autoCompactEnabled`라는 **설정 파일 키가 무시된다**는 리포트가 있습니다 (GitHub anthropics/claude-code #42817, v2.1.90 기준).
→ **설정 파일 대신 환경변수(`DISABLE_AUTO_COMPACT=1`)를 쓰는 게 안전합니다.**

---

## 5. "지금 몇 % 찼는지" 알아내는 방법 4가지

| 방법 | 뭘 알려주나 | 언제 쓰나 |
|---|---|---|
| **statusline** (화면 아래 상태 표시줄) | `used_percentage`, `remaining_percentage`, `context_window_size`, `total_input_tokens`(캐시 포함), `session_id`, `exceeds_200k_tokens` | 터미널을 직접 보고 있을 때. AI가 답할 때마다 갱신됨 |
| **`claude -p --output-format json`** ← 이 레포가 쓰는 것 | 원문: "the result, session ID, usage, and cost of a non-interactive run as structured JSON"<br>👉 답변 + 세션 번호 + 사용량 + 비용을 프로그램이 읽기 좋은 형식으로 | **자동화할 때.** 매번 사용량을 읽어서 누적 |
| `/context` 명령 | 뭐가 자리를 얼마나 차지하는지 항목별로 | 사람이 눈으로 볼 때 |
| 훅의 `transcript_path` | 대화 기록 원본 파일 위치 | 보관용 |

> ⚠️ 마지막 것은 **파일을 직접 뜯어보지 마세요.** 공식 문서 경고:
> "The entry format is internal to Claude Code and changes between versions, so scripts that parse these files directly can break on any release."
> 👉 **버전 올라갈 때마다 형식이 바뀌므로, 직접 읽는 코드는 언제든 깨집니다.**

---

## 6. 세션을 이어붙이는 기본 명령들

출처: https://code.claude.com/docs/en/sessions · https://code.claude.com/docs/en/headless

| 명령 | 하는 일 |
|---|---|
| `claude --continue` | 지금 폴더에서 **가장 최근 대화**를 이어감 |
| `claude --resume <ID나 이름>` | **특정 대화**를 콕 집어 이어감. v2.1.223부터 **어느 폴더에서든** 됨 |
| `--session-id <번호>` | 대화 번호를 **내가 직접 정해서** 시작 |
| `--fork-session` / `/branch` | 대화 기록을 **복사해서** 갈라짐. 원본은 그대로 |
| `/clear` | 대화 내용만 비우고 새로 시작 (프로그램은 계속 켜져 있음) |
| `/rewind` | 특정 메시지를 골라 **거기부터 / 거기까지만 요약**. 대화의 일부만 정리하고 싶을 때 |

### 이 프로젝트에 결정적인 문장

> "Claude Code leaves sessions created with `claude -p` or the Agent SDK out of the session picker and out of `claude --continue`. You can still resume one by passing its session ID."

**쉽게 말하면:**

> `claude -p`(한 번 실행하고 끝나는 방식)로 만든 대화는 **목록에 안 보입니다.**
> **번호를 우리가 안 적어두면 영영 못 찾습니다.**

→ 그래서 이 레포에 `session_store.py`(번호 명단)가 있는 겁니다.

### 부가 정보

- 대화 기록 저장 위치: `~/.claude/projects/<프로젝트>/<세션번호>.jsonl`
  (`<프로젝트>`는 작업 폴더 경로에서 특수문자를 `-`로 바꾼 이름). `CLAUDE_CONFIG_DIR`로 옮길 수 있음
- 기본 보관 기간 30일 (`cleanupPeriodDays`로 조정)
- ⚠️ **`--fork-session`은 컨텍스트 해소용이 아닙니다.** 기록을 **복사**하므로 종이가 그대로 따라옵니다. 실험용으로 갈라볼 때 쓰는 것입니다.

---

## 7. 요약(컴팩션)이 일어나면 뭐가 살아남나

출처: https://code.claude.com/docs/en/context-window

수동 `/compact`를 쓸 일이 있을 때 알아두면 좋습니다.

| 항목 | 요약 후 어떻게 되나 |
|---|---|
| 프로젝트 루트의 CLAUDE.md, 자동 메모리, 계획 | 파일에서 **다시 읽어옴** ✅ |
| 읽거나 고친 파일 | 최근 수정 순으로 **최대 5개만** 다시 읽음. 5,000토큰 넘는 파일은 경로만 남김 |
| 사용한 스킬 본문 | 다시 넣어줌. 단 **스킬당 5,000 / 전체 25,000토큰 상한**, 오래된 것부터 버림 |
| 훅이 넣었던 내용 | **요약되어 사라짐** ❌ |
| `paths:` 표시가 붙은 규칙 | 해당 파일을 읽을 때 다시 로드 → 꼭 남기려면 `paths:`를 빼거나 루트 CLAUDE.md로 옮기기 |
| `SessionStart` 훅 (`compact` 조건) | **실행되고 그 출력이 요약본에 추가됨** ✅ ← 인계서를 다시 넣는 공식 경로 |

> 💡 스킬 본문은 **앞부분만 남기고 잘립니다.** 그래서 중요한 지시는 `SKILL.md` 맨 위에 둬야 합니다.

### 대안: 종이 자체를 늘리기

Fable 5, Sonnet 5, Opus 4.6 이상, Sonnet 4.6은 **100만 토큰** 창을 지원합니다. Sonnet 5는 Anthropic API에서 항상 100만으로 돌고 기본 약 **967,000토큰**(96만 7천)에서 자동 요약합니다. 이 지점은 `CLAUDE_CODE_AUTO_COMPACT_WINDOW`로 바꿀 수 있습니다.

핸드오프를 없애주진 않지만 **빈도를 5배쯤 낮춰줍니다.**

---

## 8. 확인 못 한 것

정직하게 남겨둡니다.

- **Aside의 Channels 기능**은 Pro 플랜 전용이라 이 계정에서 실물 확인 불가.
  내부 구조상 봇 하나가 여러 스레드/채널을 다룰 수 있어 보이며, Claude Code 공식 Channels(전부 한 세션에 줄 세우기)와는 **다른 방식**입니다. 같은 걸로 착각하면 안 됩니다.
- 디스코드/텔레그램의 **서버·그룹당 봇 개수 상한** 공식 수치.

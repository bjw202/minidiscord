# 운영 설명서 — 켜고, 확인하고, 고장 나면 뭘 보나

> 명령어마다 **"이게 왜 필요한지"** 를 같이 적었습니다.
> 순서대로 따라 하시면 됩니다. 중간을 건너뛰지 마세요.

---

## 0. 시작 전 확인 2가지

### ① Claude Code가 제대로 깔려 있나

```bash
claude --version
```

버전 번호가 나오면 OK. `command not found`가 나오면 Claude Code부터 설치하세요.

### ② 프로그램이 읽을 수 있는 형식으로 답하나

```bash
claude -p "hello" --output-format json | head -c 300
```

**이게 왜 필요하냐면:** 이 브리지는 Claude의 답을 사람이 아니라 **프로그램이 읽어서** 토큰 사용량을 계산합니다. 이 명령이 `{` 로 시작하는 글자 덩어리를 뱉지 않으면 브리지도 못 돕니다.

`{"type":"result",...` 같은 게 나오면 성공입니다. 안 나오면 `claude update`로 업데이트하세요.

### 파이썬 버전

```bash
python3 --version
```

**3.10 이상**이어야 합니다. 코드에서 최신 문법을 쓰거든요.

---

## 1단계 — 돈 한 푼 안 쓰고 전체 흐름 확인

```bash
cd cc-bot-handoff
python3 tests/test_handoff_flow.py
```

**이게 뭘 하냐면:** 진짜 Claude를 부르는 대신 **가짜 Claude**(`tests/fake_claude.py`)를 씁니다. 턴이 진행될수록 사용량을 부풀려서, 종이가 차오르고 교대가 일어나는 상황을 흉내 냅니다. **API 요금 0원.**

이렇게 나오면 성공입니다.

```
--- 턴 3 (컨텍스트 ~90% → 임계 초과) ---
  ✅ 핸드오프가 1회 실행됐다
  ✅ 세션 ID 가 교체됐다 (3aa7da9a → 6547c8ed)
  ✅ chat_key 는 그대로다 (사용자 대화창은 안 바뀜)
  ✅ HANDOFF.md 가 생성됐다
✅ 전부 통과
```

> ⚠️ **여기서 실패하면 다음 단계로 넘어가지 마세요.**
> 봇까지 붙여놓고 문제를 찾으면 어디가 원인인지 알 수가 없습니다.

---

## 2단계 — 진짜 Claude로, 봇 없이 터미널에서

```bash
cp .env.example .env      # 설정 파일 복사 (토큰은 아직 안 채워도 됨)
python3 -m bridge local --chat myproject
```

**이게 뭐냐면:** 텔레그램이나 디스코드 없이, 터미널에서 직접 대화하면서 브리지가 제대로 도는지 보는 모드입니다. 봇 토큰 발급이라는 귀찮은 단계를 건너뛰고 먼저 확인할 수 있습니다.

```
🧑 이 폴더에 hello.py 만들어줘
🤖 [Claude 답변]

🧑 /status
🤖 세션 `a1b2c3d4` (세대 1, 핸드오프 0회)
   컨텍스트 ███░░░░░░░░░░░░░░░░░ 14.2%  (28,400 / 200,000 토큰)
   임계값 75% · 이 세션 비용 $0.0412
   작업 폴더 `.../workspaces/local_myproject`
```

### 교대를 직접 눈으로 보고 싶다면

정상적으로는 종이가 75%까지 차야 교대가 일어나는데, 그러려면 대화를 한참 해야 합니다. 임계값을 잠깐 10%로 낮춰보세요.

```bash
BRIDGE_HANDOFF_THRESHOLD=0.10 python3 -m bridge local --chat myproject
```

몇 마디만 주고받아도 교대가 일어납니다.

> 👀 **교대 직후 대화가 자연스러운지 반드시 눈으로 확인하세요.**
> 어색하면 `prompts/handoff_write.md`(인계서에 뭘 적을지 정하는 파일)를 고칠 차례입니다.
> 이게 이 프로젝트에서 제일 중요한 튜닝 작업입니다.

---

## 3단계-A — 텔레그램 붙이기

### ① 봇 만들기

1. 텔레그램에서 **@BotFather** 를 찾아 `/newbot` 을 보냅니다
2. 이름을 정하면 **토큰**(긴 글자 덩어리)을 줍니다 → `.env`의 `TELEGRAM_BOT_TOKEN=` 뒤에 붙여넣기
3. 그룹에서 모든 메시지를 받고 싶다면:
   `/mybots` → 봇 선택 → Bot Settings → Group Privacy → **Turn off**

> **왜 이걸 꺼야 하나:** 텔레그램 봇은 기본적으로 그룹에서 **자기를 멘션했거나 자기 메시지에 답장한 것만** 봅니다. 이걸 끄면 그룹의 모든 메시지를 봅니다.

### ② 내 사용자 번호 알아내기

봇에게 아무 메시지나 하나 보낸 다음, 터미널에서:

```bash
curl -s "https://api.telegram.org/bot<여기에_토큰>/getUpdates" \
  | python3 -c "import sys,json;[print(u['message']['from']) for u in json.load(sys.stdin)['result'] if 'message' in u]"
```

출력에 나오는 `'id': 12345678` 의 숫자를 `.env`의 `TELEGRAM_ALLOWLIST=` 뒤에 넣습니다.

> ### ⚠️ 여기가 제일 중요합니다
>
> **이 목록을 비워두면 아무나 당신 컴퓨터에서 명령을 실행할 수 있습니다.**
>
> 이 봇은 실제로 당신 컴퓨터의 파일을 고치고 명령어를 돌립니다. 텔레그램에서 봇 이름만 알면 누구나 말을 걸 수 있다는 걸 기억하세요.
>
> 그리고 **"방 번호"가 아니라 "사람 번호"** 로 걸어야 합니다. 방으로 걸면 그 그룹에 있는 아무나 명령을 밀어 넣을 수 있습니다. Claude Code 공식 문서도 똑같이 경고합니다.

### ③ 실행

```bash
python3 -m bridge telegram
```

### 💡 봇 하나로 여러 프로젝트 굴리기

텔레그램 그룹을 **포럼(토픽)** 으로 바꾸면, 토픽마다 세션이 갈라집니다.

```
그룹: 내 작업실
 ├─ 토픽 #기획   → 세션 A
 ├─ 토픽 #개발   → 세션 B
 └─ 토픽 #실험   → 세션 C
```

봇은 하나인데 대화는 셋이고, 서로 안 섞입니다.

---

## 3단계-B — 디스코드 붙이기 (텔레그램 대신)

### ① 라이브러리 설치

```bash
pip install "discord.py>=2.3"
```

(텔레그램은 설치할 게 없지만, 디스코드는 이게 필요합니다.)

### ② 봇 만들기

1. https://discord.com/developers/applications → **New Application** → 왼쪽 메뉴 **Bot**
2. **Privileged Gateway Intents → MESSAGE CONTENT INTENT 켜기** ← **필수**
   > 안 켜면 봇이 일반 메시지를 아예 못 봅니다. 멘션만 들어옵니다.
3. **Reset Token** 눌러 토큰 복사 → `.env`의 `DISCORD_BOT_TOKEN=`
4. **OAuth2 → URL Generator** → scope에서 `bot` 체크 → 권한에서 `Send Messages`, `Read Message History` 체크 → 아래 나온 주소를 브라우저에 붙여넣어 서버에 초대
5. 내 디스코드 사용자 번호: 설정 → 고급 → **개발자 모드** 켜고, 내 프로필 우클릭 → **ID 복사** → `.env`의 `DISCORD_ALLOWLIST=`

### ③ 실행

```bash
python3 -m bridge discord
```

### 💡 채널 = 세션

디스코드는 **채널마다 자동으로 세션이 갈라집니다.** 프로젝트마다 채널을 하나씩 파면 됩니다.

```
서버: 내 작업실
 ├─ #프로젝트A   → 세션 A
 ├─ #프로젝트B   → 세션 B
 └─ #실험실      → 세션 C
```

스레드도 고유 번호를 갖기 때문에 자동으로 분리됩니다.

---

## 4. 대화 중에 쓸 수 있는 명령

| 명령 | 하는 일 |
|---|---|
| `/status` | 종이가 몇 % 찼는지, 세션 번호, 몇 대째인지, 지금까지 쓴 돈 |
| `/handoff` | 지금 당장 교대 (75%를 안 기다리고) |
| `/new` | 인계 없이 **완전히 새로 시작** (이전 맥락 전부 버림) |
| `/help` | 도움말 |

---

## 5. 컴퓨터 켤 때마다 자동 실행 (맥의 launchd 사용)

터미널을 계속 띄워두기 귀찮으면 자동 실행으로 등록할 수 있습니다. 맥에는 **launchd**라는 자동 실행 관리자가 기본으로 들어 있어서, 설정 파일 하나만 만들어 주면 됩니다.

`~/Library/LaunchAgents/com.local.ccbridge.plist` 파일을 만들고:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
  <key>Label</key><string>com.local.ccbridge</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/python3</string>
    <string>-m</string><string>bridge</string><string>telegram</string>
  </array>
  <key>WorkingDirectory</key><string>/절대/경로/cc-bot-handoff</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/ccbridge.log</string>
  <key>StandardErrorPath</key><string>/tmp/ccbridge.err</string>
</dict></plist>
```

- `RunAtLoad` = 로그인하면 자동 시작
- `KeepAlive` = 죽으면 자동 재시작
- `StandardOutPath` = 기록을 남길 파일

등록하고 기록 보기:

```bash
launchctl load ~/Library/LaunchAgents/com.local.ccbridge.plist
tail -f /tmp/ccbridge.log
```

---

## 6. 가끔 확인할 것들

```bash
# 모든 대화방이 지금 몇 % 찼는지 한눈에
python3 -m bridge status

# 지금까지 쌓인 인계서 목록 (최신순)
ls -lt workspaces/*/.claude/session-history/ | head -20

# 가장 최근 인계서 읽어보기
cat "$(ls -t workspaces/*/.claude/session-history/*.md | head -1)"
```

> ### 📌 일주일에 한 번은 최근 인계서를 직접 읽어보세요.
>
> **인계서에서 빠진 항목 = 사용자가 느낀 "대화 끊김"** 입니다.
>
> 예를 들어 교대 직후 봇이 갑자기 존댓말을 반말로 바꿨다면, 인계서에 말투가 안 적혀 있었던 겁니다. 그러면 `prompts/handoff_write.md`에 그 항목을 추가하면 됩니다. 이게 이 프로그램을 길들이는 방법입니다.

---

## 7. 설정 바꾸기 (`.env` 파일)

| 하고 싶은 것 | 이렇게 바꾸세요 |
|---|---|
| 교대를 덜 자주 하고 싶다 | `BRIDGE_CONTEXT_WINDOW=1000000` + `CLAUDE_MODEL=sonnet`<br>(100만 토큰짜리 큰 모델을 쓰면 종이가 5배 늘어납니다) |
| 교대를 더 일찍 하고 싶다 | `BRIDGE_HANDOFF_THRESHOLD=0.65` |
| 인계 품질을 높이고 싶다 | `prompts/handoff_write.md`에 항목 추가 |
| 교대를 사용자에게 안 알리고 싶다 | `BRIDGE_NOTIFY_ON_HANDOFF=false` |
| 권한 물어보느라 멈추는 걸 막고 싶다 | `CLAUDE_PERMISSION_MODE=acceptEdits`<br>+ `CLAUDE_ALLOWED_TOOLS`로 필요한 것만 허용 |
| 오래 걸리는 작업이 중간에 끊긴다 | `BRIDGE_TURN_TIMEOUT_SEC=1800` (30분) |

### 💡 제일 효과 큰 튜닝: 애초에 종이를 덜 쓰게 하기

교대 횟수를 줄이는 최선은 **종이를 덜 쓰는 것**입니다. Claude Code 공식 문서 권고:

> "Delegate large reads: send research to a subagent so the file contents stay in its context window, not yours."
>
> **쉽게 말하면:** 파일을 많이 읽어야 하는 일은 **부하 직원(subagent)에게 시키세요.** 그러면 그 파일 내용이 내 책상이 아니라 부하 직원 책상에 쌓입니다.

작업 폴더에 `CLAUDE.md`라는 파일을 만들고 이렇게 적어두세요.

```markdown
- 파일 3개 이상을 읽어야 하는 조사는 반드시 subagent 에게 위임한다.
- 대용량 로그나 JSON 은 통째로 읽지 말고 grep/head 로 좁혀서 읽는다.
- 같은 파일을 두 번 읽지 않는다.
```

이것만으로도 교대 빈도가 눈에 띄게 줄어듭니다.

---

## 8. 고장 났을 때

| 이런 증상 | 이걸 확인하세요 |
|---|---|
| `claude 실행 파일을 찾을 수 없습니다` | `which claude` 를 쳐서 나온 경로를 `.env`의 `CLAUDE_BIN=` 에 통째로 |
| 답은 오는데 `/status`가 계속 0% | Claude Code가 구버전. `claude update` |
| `Prompt is too long` 이 뜬다 | 교대 기준이 너무 높음. `BRIDGE_HANDOFF_THRESHOLD=0.6` 으로 |
| 교대 실패 후 봇이 경고만 반복 | `/handoff` 로 다시 시도 → 그래도 안 되면 `/new` |
| 텔레그램 그룹에서 무반응 | 프라이버시 모드. BotFather `/setprivacy` → Disable |
| 디스코드에서 멘션만 들어옴 | Message Content Intent 안 켬 |
| 메시지 두 개를 연달아 보냈는데 하나만 처리됨 | **정상입니다.** 방마다 순서대로 처리하도록 잠가뒀습니다. 첫 번째가 끝나면 두 번째가 돕니다 |
| 세션이 사라진 것 같다 | Claude Code 대화 기록은 기본 30일 보관입니다. 다만 **인계서는 작업 폴더에 남아 있으니** `session-history/`에서 복구할 수 있습니다 |

---

## 9. 보안 점검표

**봇을 켜기 전에 한 번씩 확인하세요.** 이 봇은 당신 컴퓨터에서 실제로 명령을 실행합니다.

- [ ] `TELEGRAM_ALLOWLIST` / `DISCORD_ALLOWLIST` 가 **비어 있지 않다**
- [ ] 그 목록이 **방 번호가 아니라 사람 번호**다
- [ ] `.env` 파일이 git에 안 올라간다 (`.gitignore`에 들어 있는지 확인)
- [ ] `CLAUDE_PERMISSION_MODE` 가 `bypassPermissions`(전부 승인)가 **아니다**
- [ ] 작업 폴더가 홈 디렉터리 전체가 아니라 **따로 떼어둔 폴더**다
- [ ] 토큰이 새어 나갔다면 즉시 재발급
      (텔레그램: BotFather `/revoke` / 디스코드: 개발자 포털 Reset Token)

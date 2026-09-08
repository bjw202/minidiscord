/*
 * minidiscord 웹 셸 로직 (SPEC-WEBSHELL-001) + 채팅 화면 (SPEC-WEBCHAT-001)
 *
 * 이 파일은 카드 t5 의 세 SPEC 이 결합하는 계약 표면이다 — SPEC-WEBSHELL-001 §4.8 의 여섯 계약이
 * 모듈 형식·state 확장·export 집합·요소 소유권·토큰 경로·네트워크 호출 동결을 정한다.
 * 형제 SPEC(SPEC-WEBCHAT-001·SPEC-WEBRICH-001)은 자기 필드와 자기 함수를 자기 초기화
 * 코드에서 더한다. 웹 셸 부분은 채팅 내부를 만지지 않고, 채팅 부분(파일 끝 블록)은
 * 셸의 아홉 함수 본문에 손대지 않는다.
 */

// @MX:WARN: [AUTO] 파일이 약 700줄로 상한 500 을 넘는다 — 그러나 세 SPEC(WEBSHELL·WEBCHAT·WEBRICH)이 이 한 파일을 계약 표면으로 결합해 있어, 분할은 SPEC-WEBSHELL-001 §4.8 계약(export 집합·아홉 함수 본문 동결) 개정 없이는 할 수 없다
// @MX:REASON: 리팩터링 대상이 아니라 계약 표면이다 — 함수를 옮기면 형제 SPEC 의 수용 기준이 깨진다. 줄 수 경고를 근거로 쪼개지 말 것
// ── 상태 ───────────────────────────────────────────────────────────────
// 재대입되지 않는 모듈 수준 객체. 이 SPEC 이 초기화하는 것은 세 필드뿐이고,
// 그 밖의 필드는 그것을 쓰는 형제 SPEC 이 스스로 선언·초기화한다 (§4.8 계약 2).
export const state = {
  rooms: { active: [], archived: [] },
  bots: [],
  currentRoomId: null,
}

// document.getElementById 축약 — 형제 SPEC 둘이 의존 표면으로 적은 이름이다 (§4.8 계약 3).
export function $(id) {
  return document.getElementById(id)
}

// ── fetch 래퍼 ─────────────────────────────────────────────────────────
// 직렬화·쿠키 동반·오류 변환·401 처리를 한 곳에 모은다 (REQ-WEBSHELL-006·007).
export async function api(path, opts = {}) {
  const init = { credentials: 'same-origin', ...opts }
  if (init.body !== undefined && !(init.body instanceof FormData)) {
    init.headers = { ...(init.headers ?? {}), 'content-type': 'application/json' }
    init.body = JSON.stringify(init.body)
  }
  const res = await fetch(path, init)
  if (!res.ok) {
    // 응답 본문의 error 필드가 오류 문구가 되고, 없으면 상태 코드로 만든다
    let message = `HTTP ${res.status}`
    try {
      const data = await res.json()
      if (data && typeof data.error === 'string') message = data.error
    } catch { /* 본문이 JSON 이 아니면 폴백 문구를 그대로 쓴다 */ }
    // 보호 경로의 401 → 인증 뷰로 되돌린다. /auth/ 경로는 입력값과 오류 문구가
    // 함께 사라지지 않도록 화면을 건드리지 않는다 (REQ-WEBSHELL-007).
    if (res.status === 401 && !path.includes('/auth/')) showAuth()
    throw new Error(message)
  }
  return res.json()
}

// ── 화면 전환 ─────────────────────────────────────────────────────────
export function showAuth() {
  $('auth-view').hidden = false
  $('main-view').hidden = true
}

export function showMain() {
  $('auth-view').hidden = true
  $('main-view').hidden = false
}

// ── 방 목록 ───────────────────────────────────────────────────────────
// 활성 방은 `# 이름` + 보관 버튼, 보관된 방은 버튼 없이 흐리게 (REQ-WEBSHELL-009).
// .room-item / .archive-btn 클래스 이름과 이 규칙은 형제가 바꾸지 않는다 (§4.8 계약 4).
export function renderRooms() {
  const roomList = $('room-list')
  roomList.innerHTML = ''
  for (const room of state.rooms.active) {
    const item = document.createElement('li')
    item.className = 'room-item'
    if (room.id === state.currentRoomId) item.classList.add('active')
    item.textContent = `# ${room.name}`
    const archiveBtn = document.createElement('button')
    archiveBtn.type = 'button'
    archiveBtn.className = 'archive-btn'
    archiveBtn.textContent = '보관'
    // 버튼 클릭이 방 열기까지 전파되지 않게 한다
    archiveBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      archiveRoom(room.id)
    })
    item.appendChild(archiveBtn)
    item.addEventListener('click', () => openRoom(room.id))
    roomList.appendChild(item)
  }

  const archivedList = $('archived-list')
  archivedList.innerHTML = ''
  for (const room of state.rooms.archived) {
    const item = document.createElement('li')
    item.className = 'room-item'
    item.textContent = `# ${room.name}`
    item.addEventListener('click', () => openRoom(room.id))
    archivedList.appendChild(item)
  }
}

export async function loadRooms() {
  state.rooms = await api('/api/rooms')
  renderRooms()
}

// ── 봇 목록 ───────────────────────────────────────────────────────────
// 봇 항목 하나가 #bot-list 의 직계 자식 하나다 — 상태 표시는 형제가 항목 안쪽에 붙인다 (§4.8 계약 4).
export function renderBots() {
  const botList = $('bot-list')
  botList.innerHTML = ''
  for (const bot of state.bots) {
    const item = document.createElement('li')
    item.className = 'bot-item'
    item.textContent = bot.name
    // 삭제 버튼 — 방 목록의 보관 버튼과 같은 모양·자리. 확인 창을 거쳐 deleteBot 으로 (2026-09-08)
    const delBtn = document.createElement('button')
    delBtn.type = 'button'
    delBtn.className = 'delete-bot-btn'
    delBtn.textContent = '삭제'
    delBtn.title = '봇 삭제 — 모든 방의 참여가 함께 지워지고 세션 접속이 끊깁니다'
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      if (window.confirm(`봇 «${bot.name}» 을(를) 지울까요?\n모든 방의 참여가 함께 지워지고, 붙어 있는 세션은 끊깁니다. 옛 글은 남습니다.`)) deleteBot(bot.id)
    })
    item.appendChild(delBtn)
    botList.appendChild(item)
  }
}

// 봇 삭제 — DELETE 뒤 목록을 다시 적재하고, 열린 방이 있으면 참여 칩도 다시 그린다 (2026-09-08)
export async function deleteBot(id) {
  try {
    await api(`/api/bots/${id}`, { method: 'DELETE' })
  } catch (err) {
    toastError(err)
    return
  }
  await loadBots()
  if (state.currentRoomId !== null && typeof refreshRoomBots === 'function') {
    try { await refreshRoomBots() } catch { /* 참여 칩 갱신 실패는 목록 갱신을 막지 않는다 */ }
  }
}

export async function loadBots() {
  state.bots = await api('/api/bots')
  renderBots()
}

// ── 인증 ───────────────────────────────────────────────────────────────
// 이름 하나로 들어온다 — 처음 보는 이름은 서버가 그 자리에서 만든다 (v2, 비밀번호 없음).
// 실패 시 #auth-error 에 서버 문구를 띄우고 되던진다 — 화면은 인증 뷰에 머문다 (REQ-WEBSHELL-008).
export async function login(username) {
  try {
    await api('/api/auth/login', { method: 'POST', body: { username } })
  } catch (err) {
    const el = $('auth-error')
    el.textContent = err instanceof Error ? err.message : String(err)
    el.hidden = false
    throw err
  }
  showMain()
  // 로그인 자체는 성공했지만 이어지는 목록 적재가 401 로 막히는 경우가 있다 — 브라우저가
  // 쿠키 저장을 거부하면 Set-Cookie 가 무시돼 보호 경로(rooms·bots)가 401 이 되고, api() 의
  // 401 처리가 인증 뷰로 되돌려 놓지만 어디에도 문구가 없어 무반응처럼 보인다. 이 구간의
  // 실패는 세션 유지 실패 문구로 보인다 (카드 t32 §D — «성공해도 메시지가 없어 디버깅 불가»).
  // 인증 실패(위 catch, 서버 401 문구)와 겹치지 않게 로딩 구간만 별도로 처리한다.
  try {
    await loadRooms()
    await loadBots()
  } catch (err) {
    const el = $('auth-error')
    el.textContent = '로그인은 됐지만 세션을 유지하지 못했습니다 — 브라우저 쿠키 설정을 확인하세요'
    el.hidden = false
    throw err
  }
}

// 서버 세션을 끊고 state 세 필드를 초기값으로 되돌린 뒤 인증 뷰로 간다 (REQ-WEBSHELL-012).
export async function logout() {
  await api('/api/auth/logout', { method: 'POST' })
  state.rooms = { active: [], archived: [] }
  state.bots = []
  state.currentRoomId = null
  showAuth()
}

// ── 방·봇 생성/보관 액션 ──────────────────────────────────────────────
// 서버 오류를 삼키지 않고 #error-toast 에 문구를 띄운다 (REQ-WEBSHELL-010, plan.md §D 4번).
// 이 다섯 액션 함수의 네트워크 호출 순서와 개수는 고정이다 (§4.8 계약 6).
export async function createRoom(name) {
  try {
    await api('/api/rooms', { method: 'POST', body: { name } })
  } catch (err) {
    toastError(err)
    return
  }
  await loadRooms()
}

export async function archiveRoom(id) {
  try {
    await api(`/api/rooms/${id}/archive`, { method: 'POST' })
  } catch (err) {
    toastError(err)
    return
  }
  await loadRooms()
}

// v2 — 등록 응답의 토큰·명령을 그대로 돌려준다. 표시는 리치 표면(initApp 의 핸들러)이 맡는다 (SPEC-BOTMODEL-001 REQ-004).
// 네트워크 호출 순서와 개수(POST 뒤 목록 재적재)는 그대로다 (§4.8 계약 6).
export async function createBot(name, description) {
  let created
  try {
    created = await api('/api/bots', { method: 'POST', body: { name, description } })
  } catch (err) {
    toastError(err)
    return
  }
  await loadBots()
  return created
}

function toastError(err) {
  const toast = $('error-toast')
  toast.textContent = err instanceof Error ? err.message : String(err)
  // 성공 토스트의 4초 자동 숨김 창 안에 오류가 나면 성공 클래스가 남아 오류 문구가
  // 성공색으로 보인다 — 거둔다 (카드 t32 §D 잔여 수리).
  toast.classList.remove('toast-success')
  toast.hidden = false
}

// ── 방 열기 ──────────────────────────────────────────────────────────
// 이름과 시그니처는 웹 셸 SPEC 이 확정했고 본체는 채팅 SPEC 이 채운다 (§4.8 계약 3).
// 단계 순서는 REQ-WEBCHAT-002 의 0~9 단계 그대로다 — initChat 이 어떤 단계보다 먼저다.
export async function openRoom(id) {
  // 0단계 — 채팅 전용 state 필드를 만들고 작성기 핸들러를 건다
  initChat()
  // 1단계 — 열려 있는 스트림이 있으면 닫는다
  if (state.sse) {
    state.sse.close()
    state.sse = null
  }
  // 2단계 — 이전 방의 stale 타이머를 전부 해제하고 working·stale 표시를 비운다
  for (const key of Object.keys(state.staleTimers)) {
    clearTimeout(state.staleTimers[key])
    delete state.staleTimers[key]
  }
  state.workingBots.clear()
  state.staleBots.clear()
  // 3단계 — 방 세대를 올리고 이번 방의 세대를 지역 변수에 잡아 둔다
  state.roomGeneration += 1
  const generation = state.roomGeneration
  // 3-1단계 — 등록된 장식 팩토리가 있으면 이 방 전용 컨텍스트를 새로 만든다
  roomDecorator = decoratorFactory ? decoratorFactory({ api, doc: document }) : null
  // 4단계 — 현재 방을 갱신하고 사이드바를 다시 그린다
  state.currentRoomId = id
  renderRooms()
  // 5단계 — 제목과 메시지 목록을 이 방의 것으로 초기화한다.
  // 방을 찾지 못하면 방 번호를 쓴다 — "# undefined" 를 화면에 보내지 않는다.
  const room = [...state.rooms.active, ...state.rooms.archived].find(r => r.id === id)
  $('room-title').textContent = `# ${room ? room.name : id}`
  $('messages').innerHTML = ''
  hideAutocomplete()
  // 6단계 — 과거 대화를 받아 순서대로 그린다
  const history = await api(`/api/rooms/${id}/messages`)
  if (generation !== state.roomGeneration) return   // 늦게 도착한 응답은 버린다 (REQ-WEBCHAT-014)
  for (const m of history.messages) renderMessage(m)
  // 7단계 — 맨 아래로 스크롤한다
  scrollMessages()
  // 8단계 — 초대 목록을 받아 캐시하고 봇 칩을 그린다
  await refreshRoomBots()
  // 9단계 — 스트림을 연다 (같은 세대일 때만)
  if (generation !== state.roomGeneration) return
  openStream()
}

// ── 이름 입력 다이얼로그 ──────────────────────────────────────────────
// returnValue 는 다이얼로그가 닫힐 때 정해지므로 close 이벤트에서 읽는다 (plan.md §D 3번).
// addEventListener 는 쌓이므로 { once: true } 로 각 호출의 리스너가 한 번만 살게 한다.
export function promptText(label) {
  const dialog = $('prompt-dialog')
  $('prompt-label').textContent = label
  $('prompt-input').value = ''
  return new Promise((resolve) => {
    dialog.addEventListener('close', () => {
      resolve(dialog.returnValue === 'ok' ? $('prompt-input').value.trim() : null)
    }, { once: true })
    dialog.showModal()
  })
}

// ── 부트스트랩 ─────────────────────────────────────────────────────────
// index.html 의 인라인 모듈 스크립트가 부른다. 폼 핸들러를 걸고
// 살아 있는 세션이 있는지 한 번 물어본 뒤 화면을 정한다 (REQ-WEBSHELL-008).
export function initApp() {
  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    try {
      await login($('login-username').value.trim())
    } catch { /* login 이 이미 #auth-error 를 채웠다 */ }
  })
  $('new-room-btn').addEventListener('click', async () => {
    const name = await promptText('새 방 이름')
    if (name) await createRoom(name)
  })
  $('new-bot-btn').addEventListener('click', async () => {
    const name = await promptText('새 봇 이름')
    if (!name) return
    const created = await createBot(name, '')
    // 등록 응답의 토큰은 이 화면에 한 번만 뜬다 — 다이얼로그가 닫히면 DOM 에서 지워진다 (REQ-WEBRICH-013·015)
    if (created && created.command) showRegistration(created)
  })
  $('logout-btn').addEventListener('click', () => { logout() })
  initInvite()   // 리치 표면(SPEC-WEBRICH-001)의 초대 다이얼로그 핸들러 — initApp 은 계약 6 의 아홉 함수 밖이다

  // 세션이 살아 있으면 메인 화면으로, 아니면 인증 화면으로.
  // 401 이면 api() 가 이미 showAuth() 를 불렀지만 네트워크 실패 등 다른 오류도
  // 인증 화면으로 떨어지게 한다(중복 호출은 무해하다).
  loadRooms()
    .then(() => loadBots())
    .then(() => showMain())
    .catch(() => showAuth())
}

// ══ 채팅 화면 (SPEC-WEBCHAT-001) ══════════════════════════════════════
// 이 블록부터는 채팅 SPEC 의 영역이다. 웹 셸의 여덟 함수(api·login·logout·
// loadRooms·loadBots·createRoom·archiveRoom·createBot) 본문은 건드리지 않는다(§4.8 계약 6).

// 장식 팩토리 — SPEC-WEBRICH-001 이 모듈 최상위에서 등록한다 (배선 계약, spec.md §4.6).
// 등록이 없으면 roomDecorator 는 null 이고 renderMessage 는 훅을 부르지 않는다.
let decoratorFactory = null
let roomDecorator = null
let chatReady = false

// 채팅 전용 state 필드 일곱 개는 이 함수가 만든다 — 형제 웹 셸은 세 필드만 초기화한다(§4.8 계약 2).
// openRoom 의 0단계에서 불리며 멱등이다: 두 번째 호출은 아무것도 덮어쓰지 않는다.
// 덮어쓰면 방 세대가 리셋돼 늦은 응답 격리(REQ-WEBCHAT-014)가 깨진다.
export function initChat() {
  if (chatReady) return
  state.sse = null
  state.workingBots = new Set()
  state.staleTimers = {}
  state.staleBots = new Set()
  state.lastEventId = 0
  state.roomBots = []
  state.roomGeneration = 0
  // 작성기 이벤트 핸들러 — 한 번만 건다 (REQ-WEBCHAT-016)
  const composer = $('msg-input')
  composer.addEventListener('input', onComposerInput)
  composer.addEventListener('keydown', onComposerKeyDown)
  // 첨부 선택 표시 — 무엇이 함께 나갈지 보이지 않으면 사용자는 첨부 여부를 알 수 없다 (카드 t32 D-7)
  $('file-input').addEventListener('change', showPickedFile)
  $('send-btn').addEventListener('click', () => { sendMessage() })
  chatReady = true
}

// 장식 팩토리를 등록한다. 방을 열 때마다 factory({ api, doc }) 를 새로 불러
// 그 방 전용 컨텍스트를 만든다 — 방 국소 상태가 방을 넘어가지 않게 한다.
export function registerMessageDecorator(factory) {
  decoratorFactory = factory
}

// ── 렌더 ─────────────────────────────────────────────────────────────
// div.message.<author_type> > (.msg-head > strong+span, .msg-body) (REQ-WEBCHAT-003).
// 사용자·봇·시스템이 만든 문자열은 전부 textContent 로만 넣는다 (REQ-WEBCHAT-004).
export function renderMessage(m) {
  const wrap = document.createElement('div')
  wrap.className = `message ${m.author_type}`

  const head = document.createElement('div')
  head.className = 'msg-head'
  const author = document.createElement('strong')
  author.textContent = m.author_name ?? ''
  // 봇 작성자는 author_bot_id 로 --md-role-color-1..5 를 순환 배정받는다 (design DNA §1)
  if (m.author_type === 'bot') {
    author.classList.add(`bot-color-${((m.author_bot_id ?? 0) % 5) + 1}`)
  }
  const time = document.createElement('span')
  time.className = 'msg-time'
  time.textContent = m.created_at ?? ''
  head.appendChild(author)
  head.appendChild(time)

  const body = document.createElement('div')
  body.className = 'msg-body'
  body.textContent = m.body ?? ''

  wrap.appendChild(head)
  wrap.appendChild(body)

  // 장식 훅 — 붙이기 직전에 정확히 한 번 (REQ-WEBCHAT-003). 등록이 없으면 부르지 않고,
  // 훅이 던지면 삼키지 않는다. m.attachments 는 훅 안에서만 소비된다.
  if (roomDecorator) roomDecorator.decorate(wrap, m)

  $('messages').appendChild(wrap)
}

// 참여 목록(v2: GET /api/rooms/:id/bots — [{bot_id, bot_name, online}])을 받아 캐시하고 봇 칩을 다시 그린다.
// 방을 열 때(openRoom 8단계)와 참여를 더한 뒤에만 부른다 — 키 입력마다 부르지 않는다 (REQ-WEBCHAT-009).
// 응답 반영 직전에 방 세대를 검사한다.
export async function refreshRoomBots() {
  const generation = state.roomGeneration
  const id = state.currentRoomId
  const participants = await api(`/api/rooms/${id}/bots`)
  if (generation !== state.roomGeneration) return   // 방이 바뀐 사이에 온 응답은 버린다
  state.roomBots = participants
  renderRoomBots()
}

// 봇 칩 — 캐시만 읽는다(네트워크 없음). 🟢/⚪ 는 online 여부, (입력 중…)/(응답 없음?) 는
// working/stale 표시이고 stale 이 working 보다 우선한다 (REQ-WEBCHAT-006).
function renderRoomBots() {
  const box = $('room-bots')
  box.innerHTML = ''
  for (const bot of state.roomBots) {
    const key = `${state.currentRoomId}:${bot.bot_id}`
    const chip = document.createElement('span')
    chip.className = `bot-chip${bot.online ? '' : ' offline'}`
    chip.textContent = `${bot.online ? '🟢' : '⚪'} ${bot.bot_name}`
    if (state.staleBots.has(key)) chip.textContent += ' (응답 없음?)'
    else if (state.workingBots.has(key)) chip.textContent += ' (입력 중…)'
    box.appendChild(chip)
  }
}

function scrollMessages() {
  const box = $('messages')
  box.scrollTop = box.scrollHeight
}

function hideAutocomplete() {
  $('autocomplete').hidden = true
}

// ── 실시간 수신 ───────────────────────────────────────────────────────
// EventSource 를 열고 message·bot_status·error/open 을 듣는다 (REQ-WEBCHAT-005~008).
function openStream() {
  const id = state.currentRoomId
  const generation = state.roomGeneration
  const es = new EventSource(`/api/rooms/${id}/events`)
  state.sse = es
  let hadError = false

  es.addEventListener('message', (e) => {
    const m = JSON.parse(e.data)
    renderMessage(m)
    scrollMessages()
    // 마지막 수신 id — 재연결 백필의 커서다 (REQ-WEBCHAT-005)
    state.lastEventId = m.id
  })

  es.addEventListener('bot_status', (e) => {
    const { bot_id, state: botState } = JSON.parse(e.data)
    markBotStatus(bot_id, botState)
  })

  es.addEventListener('error', () => { hadError = true })

  // 첫 연결이 아니라 error 뒤의 재연결이면 끊긴 사이의 메시지를 커서로 백필한다 (REQ-WEBCHAT-008).
  // 서버가 id:/retry: 를 발행하지 않으므로 Last-Event-ID 재개 경로는 없다 — REST 커서뿐이다.
  es.addEventListener('open', async () => {
    if (!hadError) return
    if (generation !== state.roomGeneration) return
    const { messages } = await api(`/api/rooms/${id}/messages?after=${state.lastEventId}`)
    if (generation !== state.roomGeneration) return
    for (const m of messages) {
      renderMessage(m)
      state.lastEventId = m.id   // 커서를 계속 올린다 — 반복 재연결에도 중복이 없게 한다
    }
    scrollMessages()
  })
}

// bot_status 처리 — working: 표시 + 5분 타이머, idle: 둘 다 해제 (REQ-WEBCHAT-006).
// 5분 판정은 브라우저가 한다. 서버는 stale 이라는 상태를 발행하지 않는다.
function markBotStatus(botId, botState) {
  const key = `${state.currentRoomId}:${botId}`
  if (botState === 'working') {
    state.workingBots.add(key)
    state.staleBots.delete(key)
    clearTimeout(state.staleTimers[key])
    state.staleTimers[key] = setTimeout(() => {
      delete state.staleTimers[key]
      state.staleBots.add(key)
      renderRoomBots()   // 캐시만 다시 그린다 — 만료 시점에 네트워크를 치지 않는다
    }, 300_000)
  } else if (botState === 'idle') {
    state.workingBots.delete(key)
    state.staleBots.delete(key)
    clearTimeout(state.staleTimers[key])
    delete state.staleTimers[key]
  }
  renderRoomBots()
}

// ── @ 자동완성 ───────────────────────────────────────────────────────
// 커서 앞 문자열에서 멘션 토큰을 뽑는 정규식과, 서버 파서가 해석할 수 있는 이름의
// 문자 집합. 둘 다 server/src/mention.ts 의 MENTION_RE 왌 맞춘다 — 파서를 고치지 않고
// UI 가 맞춘다 (REQ-WEBCHAT-010·011, plan.md §B).
const MENTION_TOKEN_RE = /(^|\s)@([^\s(]*)$/
const MENTIONABLE_RE = /^[^()\s]+$/

// 커서 앞의 미완성 멘션 낱말. 없으면 null.
function currentMentionToken() {
  const box = $('msg-input')
  const caret = box.selectionStart ?? box.value.length
  const m = box.value.slice(0, caret).match(MENTION_TOKEN_RE)
  return m ? m[2] : null
}

// input 이벤트 — 캐시된 초대 목록만 읽는다. 키 입력마다 네트워크를 치지 않는다 (REQ-WEBCHAT-009).
function onComposerInput() {
  const token = currentMentionToken()
  if (token === null) { hideAutocomplete(); return }
  const prefix = token.toLowerCase()
  const box = $('autocomplete')
  box.innerHTML = ''
  const matched = state.roomBots.filter(b => b.bot_name.toLowerCase().startsWith(prefix))
  if (matched.length === 0) { hideAutocomplete(); return }
  for (const bot of matched) {
    if (!MENTIONABLE_RE.test(bot.bot_name)) {
      // 서버 파서가 해석하지 못하는 이름(공백·괄호 포함)은 완성해 주지 않는다 (REQ-WEBCHAT-011).
      // 완성된 멘션이 조용히 아무 봇에게도 전달되지 않는 마지막 조각이 여기서 끊긴다.
      const item = document.createElement('div')
      item.className = 'ac-item disabled'
      item.setAttribute('aria-disabled', 'true')
      item.textContent = `${bot.bot_name} — 멘션할 수 없는 이름(공백·괄호 포함)`
      box.appendChild(item)
      continue
    }
    for (const kind of ['TO', 'CC']) {
      const item = document.createElement('div')
      item.className = 'ac-item'
      item.textContent = `${kind} ${bot.bot_name}`
      item.addEventListener('click', () => commitMention(kind, bot.bot_name))
      box.appendChild(item)
    }
  }
  box.hidden = false
}

// 후보 확정 — 커서 앞의 미완성 토큰을 완성된 멘션 문자열로 바꾼다.
// 삽입 형태 '@TO(이름) ' / '@CC(이름) ' 는 서버 파서의 문법 그 자체다 (REQ-WEBCHAT-010).
function commitMention(kind, name) {
  const box = $('msg-input')
  const caret = box.selectionStart ?? box.value.length
  const before = box.value.slice(0, caret)
  const after = box.value.slice(box.selectionEnd ?? box.value.length)
  const replaced = before.replace(/@([^\s(]*)$/, `@${kind}(${name}) `)
  box.value = replaced + after
  box.selectionStart = box.selectionEnd = replaced.length
  hideAutocomplete()
  box.focus()
}

// keydown — 드롭다운이 보이는 동안 Enter 는 전송이 아니다 (REQ-WEBCHAT-012).
// '@pm' 까지 치고 Enter 를 누른 사용자는 완성을 기대하지, 깨진 멘션 전송을 기대하지 않는다.
function onComposerKeyDown(e) {
  if (e.key !== 'Enter' || e.shiftKey) return
  // 한글·일본어 등 조합 중의 Enter 는 전송이 아니라 조합 확정이다 (카드 t32 결함 D-6).
  // 여기서 전송하면 조합 중 글자를 포함한 본문이 나간 뒤 입력창이 비워지고, 확정된
  // 마지막 글자가 빈 칸에 들어가 뒤따르는 진짜 Enter 가 그 한 글자를 또 보낸다.
  // keyCode 229 는 isComposing 을 싣지 않는 구형 IME 경로의 같은 신호다.
  // [HARD] 이 return 은 preventDefault 보다 앞이어야 한다 — 뒤에 두면 조합 확정 자체가
  // 막혀 한글 입력이 깨진다.
  if (e.isComposing || e.keyCode === 229) return
  e.preventDefault()
  const box = $('autocomplete')
  if (!box.hidden) {
    const first = box.querySelector('.ac-item:not(.disabled)')
    if (first) first.click()
    else hideAutocomplete()
    return
  }
  sendMessage()
}

// ── 전송 ─────────────────────────────────────────────────────────────
// FormData 에 body 하나를 담아 POST 를 정확히 한 번 (REQ-WEBCHAT-013).
// POST 응답의 message 는 그리지 않는다 — 서버가 같은 것을 SSE 로도 발행하므로
// 응답을 그리면 자기 메시지가 두 번 보인다. 실패하면 화면 요소로 알리고 입력을 복원한다.
export async function sendMessage() {
  const box = $('msg-input')
  const picker = $('file-input')
  const files = Array.from(picker.files ?? [])
  const body = box.value
  // 본문도 파일도 없을 때만 아무것도 하지 않는다 — 파일만 보내는 것은 서버가 받는다
  // (routes-messages.ts REQ-MSG-005: body 도 파일도 없으면 400)
  if (!body.trim() && files.length === 0) return
  box.value = ''
  hideAutocomplete()
  const form = new FormData()
  // [HARD] 파일이 아닌 파트는 서버가 전부 body 로 이어 붙인다 — 텍스트 파트는 정확히 하나여야 한다
  form.append('body', body)
  // 필드명은 서버가 가리지 않는다 (part.type === 'file' 로만 판정) — 'file' 은 읽는 사람을 위한 이름이다
  for (const f of files) form.append('file', f)
  try {
    await api(`/api/rooms/${state.currentRoomId}/messages`, { method: 'POST', body: form })
    clearPickedFile()   // 성공했을 때만 비운다 — 실패하면 선택이 남아 다시 보내기로 그대로 나간다
  } catch (err) {
    notifyError(err)
    // 그 사이 사용자가 다음 메시지를 치고 있을 수 있다 — 빈 칸일 때만 되살린다 (plan.md §D 9번)
    if (box.value === '') box.value = body
  }
}

// 선택된 파일 이름을 입력창 옆에 한 줄로 보인다. 여러 개면 «이름 외 N».
function showPickedFile() {
  const files = Array.from($('file-input').files ?? [])
  const label = $('file-chosen')
  label.textContent = files.length === 0 ? ''
    : files.length === 1 ? `📎 ${files[0].name}`
    : `📎 ${files[0].name} 외 ${files.length - 1}`
}

// 선택을 비운다. input.value = '' 가 files 를 비우는 표준 경로다.
function clearPickedFile() {
  $('file-input').value = ''
  $('file-chosen').textContent = ''
}

// 전송 실패 알림 — alert 대신 화면 안의 요소로 낸다. jsdom 이 alert 를 던지지 않고
// 브라우저를 멈추지도 않으며, 무엇보다 테스트에서 관측 가능하다.
function notifyError(err) {
  const toast = $('error-toast')
  toast.textContent = err instanceof Error ? err.message : String(err)
  toast.hidden = false
}

// ══ 리치 표면 (SPEC-WEBRICH-001) ═══════════════════════════════════════
// 이 SPEC 이 app.js 에 더하는 것은 이 블록 전부다 — renderMessage 본체는 한 줄도
// 건드리지 않는다 (REQ-WEBRICH-002). 모듈 최상위가 배선의 자리다.
import { createRichContext, buildInviteChoices, applyInviteResult, clearInviteResult, copyText } from './rich.js'

// 배선 계약 (spec.md REQ-WEBRICH-002) — 방을 열 때마다 openRoom 3-1단계가
// factory({ api, doc }) 를 불러 그 방 전용 컨텍스트를 새로 만든다. 넘기는 값은 팩토리
// createRichContext 그 자체이지 호출 결과(.decorate)가 아니다 — 결과를 넘기면 그 방의
// 컨텍스트가 undefined 가 되어 첨부와 권한 버튼이 아무 오류 없이 영원히 안 뜬다 (감사 MF-9).
registerMessageDecorator(createRichContext)

// 봇 다이얼로그(#invite-dialog) — v2 에서 두 일을 한다: «참여 추가»(방 헤더의 버튼 → 봇 고르기 → POST /api/rooms/:id/bots)와
// «등록 명령 표시»(봇 등록 직후 → 토큰이 든 명령 한 번). showModal/close 는 이 파일에만 둔다. rich.js 는 노드 조립과 상태만
// 다루게 해서 어떤 수용 기준도 showModal 을 부르지 않게 한다 (plan.md §D 10).
// 노드 쌍은 InviteNodes 구조적 형(textContent·hidden) 그대로 넘긴다 (REQ-WEBRICH-001).
function inviteNodes() {
  return { commandEl: $('invite-command'), resultEl: $('invite-result') }
}

// 복사·참여 실패는 #invite-result 안의 오류 문구 요소에 보인다 — 삼켜지는 실패가 없게 (plan.md §D 9, REQ-WEBRICH-014).
function showInviteError(message) {
  const err = document.querySelector('#invite-result .invite-error')
  if (!err) return
  err.textContent = message
  err.hidden = false
}

function hideInviteError() {
  const err = document.querySelector('#invite-result .invite-error')
  if (!err) return
  err.textContent = ''
  err.hidden = true
}

// 참여 추가 — 토큰이 오가지 않는다. 성공하면 칩을 다시 그리고 다이얼로그를 닫는다 (REQ-BOTMODEL-006)
async function pickParticipant(bot) {
  try {
    await api(`/api/rooms/${state.currentRoomId}/bots`, { method: 'POST', body: { bot_id: bot.id } })
    hideInviteError()
    await refreshRoomBots()
    $('invite-dialog').close()
  } catch (err) {
    showInviteError(err instanceof Error ? err.message : String(err))
  }
}

// 등록 명령 표시 — 봇 등록 응답의 command 를 다이얼로그에 띄운다. 토큰이 사는 곳은 이 DOM 노드가 유일하다 (REQ-WEBRICH-013)
function showRegistration(created) {
  const dialog = $('invite-dialog')
  hideInviteError()
  dialog.querySelector('.invite-choices').replaceChildren()
  applyInviteResult(inviteNodes(), created)
  dialog.showModal()
}

function initInvite() {
  const dialog = $('invite-dialog')

  // 닫힐 때 명령을 DOM 에서 지운다 — 평문 토큰이 페이지 수명 내내 남지 않게 (REQ-WEBRICH-015)
  dialog.addEventListener('close', () => clearInviteResult(inviteNodes()))

  $('invite-btn').addEventListener('click', () => {
    hideInviteError()
    clearInviteResult(inviteNodes())
    const choices = dialog.querySelector('.invite-choices')
    choices.replaceChildren(buildInviteChoices({ bots: state.bots, doc: document, onPick: pickParticipant }))
    dialog.showModal()
  })

  $('copy-command').addEventListener('click', async () => {
    // 실패는 반드시 화면에 보인다 — 사용자가 복사했다고 믿고 닫는 것이 이 표면의 가장 위험한 실패다 (REQ-WEBRICH-014)
    const ok = await copyText($('invite-command').textContent ?? '', {
      nav: navigator,
      onFail: () => showInviteError('클립보드 복사에 실패했습니다 — 명령을 직접 선택해 복사하세요'),
    })
    if (ok) hideInviteError()
  })
}

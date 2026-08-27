/*
 * minidiscord 웹 셸 로직 (SPEC-WEBSHELL-001)
 *
 * 이 파일은 카드 t5 의 세 SPEC 이 결합하는 계약 표면이다 — spec.md §4.8 의 여섯 계약이
 * 모듈 형식·state 확장·export 집합·요소 소유권·토큰 경로·네트워크 호출 동결을 정한다.
 * 형제 SPEC(SPEC-WEBCHAT-001·SPEC-WEBRICH-001)은 자기 필드와 자기 함수를 자기 초기화
 * 코드에서 더한다. 이 파일은 채팅 렌더링·EventSource·자동완성·첨부·초대·권한을 만들지 않는다.
 */

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
    botList.appendChild(item)
  }
}

export async function loadBots() {
  state.bots = await api('/api/bots')
  renderBots()
}

// ── 인증 ───────────────────────────────────────────────────────────────
// 실패 시 #auth-error 에 서버 문구를 띄우고 되던진다 — 화면은 인증 뷰에 머문다 (REQ-WEBSHELL-008).
export async function login(username, password) {
  try {
    await api('/api/auth/login', { method: 'POST', body: { username, password } })
  } catch (err) {
    const el = $('auth-error')
    el.textContent = err instanceof Error ? err.message : String(err)
    el.hidden = false
    throw err
  }
  showMain()
  await loadRooms()
  await loadBots()
}

// 회원가입 성공 → 같은 자격으로 이어서 로그인한다 (REQ-WEBSHELL-008).
export async function register(username, password) {
  await api('/api/auth/register', { method: 'POST', body: { username, password } })
  await login(username, password)
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

export async function createBot(name, description) {
  try {
    await api('/api/bots', { method: 'POST', body: { name, description } })
  } catch (err) {
    toastError(err)
    return
  }
  await loadBots()
}

function toastError(err) {
  const toast = $('error-toast')
  toast.textContent = err instanceof Error ? err.message : String(err)
  toast.hidden = false
}

// ── 방 열기 — 최소 구현 ────────────────────────────────────────────────
// 이름과 시그니처는 이 SPEC 이 확정하고 본체는 SPEC-WEBCHAT-001 이 채운다 (§4.8 계약 3).
// 형제의 배선은 이 함수 안이나 형제 자신의 함수에 둔다.
export function openRoom(id) {
  state.currentRoomId = id
  renderRooms()
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
      await login($('login-username').value.trim(), $('login-password').value)
    } catch { /* login 이 이미 #auth-error 를 채웠다 */ }
  })
  $('register-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    try {
      await register($('reg-username').value.trim(), $('reg-password').value)
    } catch { /* register → login 경로에서 이미 문구를 채웠다 */ }
  })
  $('new-room-btn').addEventListener('click', async () => {
    const name = await promptText('새 방 이름')
    if (name) await createRoom(name)
  })
  $('new-bot-btn').addEventListener('click', async () => {
    const name = await promptText('새 봇 이름')
    if (name) await createBot(name, '')
  })
  $('logout-btn').addEventListener('click', () => { logout() })

  // 세션이 살아 있으면 메인 화면으로, 아니면 인증 화면으로.
  // 401 이면 api() 가 이미 showAuth() 를 불렀지만 네트워크 실패 등 다른 오류도
  // 인증 화면으로 떨어지게 한다(중복 호출은 무해하다).
  loadRooms()
    .then(() => loadBots())
    .then(() => showMain())
    .catch(() => showAuth())
}

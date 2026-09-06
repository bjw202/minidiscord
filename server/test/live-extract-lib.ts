// server/test/live-extract-lib.ts — SPEC-LIVEENV-001 증거 추출기의 순수 함수 (REQ-010 ~ REQ-013)
//
// [D1(a) 와 같은 방향의 배치] 형제 하네스 gateway-v2.ts 가 그렇듯 이 파일은 server/test 아래에 있고,
// scripts/live-extract.mts(CLI)와 server/test/live-extract.test.ts(회귀)가 함께 가져다 쓴다.
// 반대로 두면 server 의 타입 검사가 워크스페이스 밖 .mts 를 rootDir 밖 파일로 거절한다(실측).
// 이 파일은 server/src 를 import 하지 않는다 — 하네스가 구현을 부르지 않는 축을 지킨다.

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { homedir } from 'node:os'
import { execFileSync } from 'node:child_process'

// ── 종료 코드 세 값 ──────────────────────────────────────────────────
export const EXIT_OK = 0
export const EXIT_FAILED = 1
export const EXIT_UNMEASURED = 2

// [HARD] manifest 의 항 이름 집합은 정확히 이 일곱이다 — 개수가 아니라 이름으로 대조한다.
// §A 의 나머지 다섯(A02·A04·A05·A06·A07)은 이 카드가 겨누지 않으므로 아예 싣지 않는다.
export const MACHINE_ITEMS = ['A01 ㉣', 'A08', 'A09', 'A11', 'A12'] as const
export const HUMAN_ITEMS = ['A03', 'A10'] as const
export const MANIFEST_ITEMS: string[] = [...MACHINE_ITEMS, ...HUMAN_ITEMS]

export type ItemStatus = 'ok' | 'UNMEASURED'
export type Judge = 'machine' | 'human'

export interface ManifestItem {
  name: string
  judge: Judge
  status: ItemStatus
  files: string[]
  /** machine 항에만 붙는다. human 항에는 이 열쇠 자체가 없다. */
  verdict?: string
  note?: string
}

// ── 토큰 마스킹 (REQ-011) ────────────────────────────────────────────
const FULL_TOKEN_RE = /\b[0-9a-f]{64}\b/g

/** 64자 hex 를 앞 8글자만 남긴 형태로 바꾼다.
 *
 *  [주의] **산출 경로 전부가 이 함수를 지나지는 않는다.** 이 주석은 원래 「전부가 지난다」고
 *  적혀 있었고 그것이 거짓이었다(4회차 sync 감사 B3). 지나지 않는 자리 둘:
 *    - `runExtract` 의 `manifest.json` 쓰기 — `writeFileSync` 를 직접 부른다
 *    - `runExtract` 의 e5 갈래 `extract-notes.txt` 쓰기 — 같은 파일을 쓰는 정상 갈래는
 *      이 함수를 지나는데 e5 갈래만 지나지 않고, **전역 MCP 항목의 내용을 그대로 싣는다**
 *      (`entry_before=` / `entry_after=`). 그 항목은 `spec.md` §7 의 토큰 소재 1번이다.
 *  오늘 그 항목에 토큰이 없다는 것은 실측했으므로(`evidence/E08-ambient-sweep.txt`) 새는 것은
 *  없다. 다만 `REQ-LIVEENV-011`·`AC-LIVEENV-011` 이 기대는 가림에 경로 하나가 비어 있다.
 *  수리는 `writeFileSync(...)` 두 자리를 `maskTokens(...)` 로 감싸는 일이며, 카드 t35 는
 *  이 회차에 그것을 하지 않았다 — 처분 기록은 `spec.md` §5 의 열어 둔 관측이 진다.
 */
export function maskTokens(s: string): string {
  return s.replace(FULL_TOKEN_RE, m => `${m.slice(0, 8)}…(가림)`)
}

// ── ㉠ 표면: 대화 기록 파서 ──────────────────────────────────────────
export interface ToolUse { name: string; input: unknown }

export interface Transcript {
  sessionIds: string[]
  cwds: string[]
  toolUses: ToolUse[]
  /** 채널 도구 호출에 결과가 돌아온 짝의 수 */
  channelRoundTrips: number
}

/**
 * 대화 기록 jsonl 을 읽는다.
 * [HARD] 값을 «호출 인자» 에서만 읽는다 — tool_result 나 알림에 실린 같은 값은 세지 않는다.
 * 들어오는 통로는 전부 결과 아니면 알림이므로, 호출 인자만 보면 통로 목록이 하나 빠져도
 * 이 경계는 무너지지 않는다.
 */
export function parseTranscript(text: string): Transcript {
  const sessionIds = new Set<string>()
  const cwds = new Set<string>()
  const toolUses: ToolUse[] = []
  const useIds = new Set<string>()
  const resultIds = new Set<string>()

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    let rec: any
    try { rec = JSON.parse(trimmed) } catch { continue }
    if (typeof rec?.sessionId === 'string') sessionIds.add(rec.sessionId)
    if (typeof rec?.cwd === 'string') cwds.add(rec.cwd)
    const content = rec?.message?.content
    if (!Array.isArray(content)) continue
    for (const block of content) {
      if (block?.type === 'tool_use' && typeof block.name === 'string') {
        toolUses.push({ name: block.name, input: block.input })
        if (block.name.startsWith('mcp__minidiscord-channel__') && typeof block.id === 'string') {
          useIds.add(block.id)
        }
      }
      // 결과는 «짝이 돌아왔다» 를 세는 데만 쓴다. 값을 읽는 자리가 아니다.
      if (block?.type === 'tool_result' && typeof block.tool_use_id === 'string') {
        resultIds.add(block.tool_use_id)
      }
    }
  }
  let pairs = 0
  for (const id of useIds) if (resultIds.has(id)) pairs++
  return {
    sessionIds: [...sessionIds],
    cwds: [...cwds],
    toolUses,
    channelRoundTrips: pairs,
  }
}

/** 채널 도구 호출만 고른다. */
export function channelToolUses(t: Transcript): ToolUse[] {
  return t.toolUses.filter(u => u.name.startsWith('mcp__minidiscord-channel__'))
}

/**
 * A01 ㉣ 의 ㉠ 면: reply 호출 «인자» 안의 무작위 영숫자 8자리를 집는다.
 * [HARD] reply 가 아닌 도구, 그리고 결과·알림에 실린 같은 값은 읽지 않는다.
 */
export function extractReplyMarker(t: Transcript, markerRe = /\b[A-Za-z0-9]{8}\b/): string | null {
  for (const u of t.toolUses) {
    if (!u.name.endsWith('__reply')) continue
    const text = (u.input as any)?.text
    if (typeof text !== 'string') continue
    const m = text.match(markerRe)
    if (m) return m[0]
  }
  return null
}

/** 채널의 이력 회수 호출 수 — A08 이 「/clear 뒤 복구」를 세는 자리다. */
export function countFetchHistory(t: Transcript): number {
  return t.toolUses.filter(u => u.name.endsWith('__fetch_history')).length
}

// ── ㉡ 표면: 서버 DB 판독기 ──────────────────────────────────────────
export interface DbMessage { id: number; room_id: number; author_type: string; body: string; created_at: string }
export interface DbRoom { id: number; name: string; status: string }

/** sqlite3 CLI 로 읽는다 — 이 스크립트는 server/src 를 import 하지 않는다. */
const COL_SEP = '\u001f'
export function readDb(dbPath: string, sql: string): string[][] | null {
  if (!existsSync(dbPath)) return null
  try {
    const out = execFileSync('sqlite3', ['-separator', COL_SEP, dbPath, sql], { encoding: 'utf8' })
    return out.split('\n').filter(l => l !== '').map(l => l.split(COL_SEP))
  } catch {
    return null
  }
}

export function dbMessages(dbPath: string): DbMessage[] | null {
  const rows = readDb(dbPath, 'SELECT id, room_id, author_type, body, created_at FROM messages ORDER BY id')
  if (rows === null) return null
  return rows.map(r => ({ id: Number(r[0]), room_id: Number(r[1]), author_type: r[2], body: r[3] ?? '', created_at: r[4] }))
}

export function dbRooms(dbPath: string): DbRoom[] | null {
  const rows = readDb(dbPath, 'SELECT id, name, status FROM rooms ORDER BY id')
  if (rows === null) return null
  return rows.map(r => ({ id: Number(r[0]), name: r[1], status: r[2] }))
}

/**
 * A01 ㉣ 의 ㉡ 면: DB 메시지 행에서 같은 표지를 찾는다.
 * 방 화면은 이 행을 그리는 면이므로 값이 같고, 기계화에 원리적 장벽이 없다.
 */
export function findMarkerInDb(messages: DbMessage[], marker: string): DbMessage | null {
  for (const m of messages) if (m.body.includes(marker)) return m
  return null
}

// ── 항 만들기 ────────────────────────────────────────────────────────
export interface SurfaceInput {
  transcript: Transcript | null
  messages: DbMessage[] | null
  rooms: DbRoom[] | null
  /** ㉢ 프로세스 면 — 호출자가 관측해 넘긴다 */
  processes: { listenPid?: string; listenCwd?: string; established?: number; botSessionPids?: string[] } | null
}

/**
 * [HARD] A01 ㉣ 의 산출은 한 면이 아니라 «두 값과 그 일치 여부» 다.
 * 한쪽이 읽히지 않으면 그 항의 상태는 UNMEASURED 이며 machine 판정을 붙이지 않는다.
 */
export function buildA01(s: SurfaceInput): { item: ManifestItem; body: string } {
  const marker = s.transcript ? extractReplyMarker(s.transcript) : null
  const row = marker && s.messages ? findMarkerInDb(s.messages, marker) : null
  const lines = [
    '# A01 ㉣ — 그 세션이 그 답변을 만들었다 (reply 호출 인자 대조)',
    `reply_arg=${marker ?? '-'}`,
    `db_row=${row ? marker : '-'}`,
    `agree=${marker && row ? 'yes' : '-'}`,
  ]
  if (!marker) lines.push('# ㉠ 면(대화 기록 reply 호출 인자)이 읽히지 않았다')
  if (!row) lines.push('# ㉡ 면(서버 DB 메시지 행)이 읽히지 않았다')
  const measured = Boolean(marker && row)
  return {
    item: {
      name: 'A01 ㉣',
      judge: 'machine',
      status: measured ? 'ok' : 'UNMEASURED',
      files: ['A01-reply-arg.txt', 'A01-db-row.txt'],
      ...(measured ? { verdict: 'agree' } : {}),
      ...(measured ? {} : { note: '두 면 가운데 하나가 비었다 — machine 판정을 붙이지 않는다' }),
    },
    body: lines.join('\n') + '\n',
  }
}

export function buildA08(s: SurfaceInput): { item: ManifestItem; body: string } {
  const calls = s.transcript ? countFetchHistory(s.transcript) : null
  const measured = calls !== null && calls > 0
  const body = [
    '# A08 — /clear 뒤 fetch_history 로 복구한다',
    `fetch_history_calls=${calls ?? '-'}`,
    measured ? '' : '# 대화 기록 표면이 읽히지 않았거나 이력 회수 호출이 없다',
  ].filter(Boolean).join('\n') + '\n'
  return {
    item: {
      name: 'A08', judge: 'machine', status: measured ? 'ok' : 'UNMEASURED',
      files: ['A08-fetch-history.txt'], ...(measured ? { verdict: 'fetch_history 호출 관측' } : {}),
    },
    body,
  }
}

export function buildA09(s: SurfaceInput): { item: ManifestItem; body: string } {
  // 멘션 없이 들어온 사람 메시지 두 줄이 DB 에 있고, 그 뒤 봇 메시지가 둘 다를 담는가.
  const msgs = s.messages
  let measured = false
  const lines = ['# A09 — since_id 커서로 못 본 두 줄을 따라잡는다']
  if (msgs === null) {
    lines.push('# 서버 DB 표면이 읽히지 않았다')
  } else {
    const user = msgs.filter(m => m.author_type === 'user')
    const bot = msgs.filter(m => m.author_type === 'bot')
    const lastTwo = user.slice(-3, -1)
    const answer = bot.length ? bot[bot.length - 1].body : ''
    const covered = lastTwo.length === 2 && lastTwo.every(m => answer.includes(m.body.slice(0, 8)))
    lines.push(`unmentioned_lines=${lastTwo.length}`)
    lines.push(`covered_by_reply=${covered ? 'yes' : 'no'}`)
    measured = lastTwo.length === 2 && bot.length > 0
  }
  return {
    item: {
      name: 'A09', judge: 'machine', status: measured ? 'ok' : 'UNMEASURED',
      files: ['A09-since-id.txt'], ...(measured ? { verdict: '두 줄 포함 여부를 기록했다' } : {}),
    },
    body: lines.join('\n') + '\n',
  }
}

export function buildA11(s: SurfaceInput): { item: ManifestItem; body: string } {
  // 재시작 영속성은 «개수» 가 아니라 «본문 동일성» 으로 잰다.
  const msgs = s.messages
  const pick = msgs && msgs.length ? msgs[0] : null
  const measured = pick !== null
  const lines = ['# A11 — 서버 재시작 후 대화가 그대로다']
  if (!measured) lines.push('# 서버 DB 표면이 읽히지 않았거나 메시지가 없다')
  else {
    lines.push(`picked_id=${pick!.id}`)
    lines.push(`picked_body=${maskTokens(pick!.body)}`)
  }
  return {
    item: {
      name: 'A11', judge: 'machine', status: measured ? 'ok' : 'UNMEASURED',
      files: ['A11-restart.txt'], ...(measured ? { verdict: '본문 동일성 대조용 행을 고정했다' } : {}),
    },
    body: lines.join('\n') + '\n',
  }
}

export function buildA12(s: SurfaceInput): { item: ManifestItem; body: string } {
  const rooms = s.rooms
  const conns = s.processes?.established
  const measured = rooms !== null && conns !== undefined
  const lines = ['# A12 — 방 보관 후 칩 소멸과 접속 거부']
  if (rooms === null) lines.push('# 서버 DB 표면이 읽히지 않았다')
  else for (const r of rooms) lines.push(`room=${r.id}:${r.name}:status=${r.status}`)
  lines.push(`established_connections=${conns ?? '-'}`)
  if (conns === undefined) lines.push('# 프로세스 표면이 읽히지 않았다')
  return {
    item: {
      name: 'A12', judge: 'machine', status: measured ? 'ok' : 'UNMEASURED',
      files: ['A12-archived.txt'], ...(measured ? { verdict: '방 상태와 접속 수를 함께 기록했다' } : {}),
    },
    body: lines.join('\n') + '\n',
  }
}

/**
 * [HARD] A03·A10 은 캡처만 남기고 판정을 내지 않는다 — verdict 열쇠 자체가 없다.
 * 순간 관측은 촬영 시점 경주라 기계가 「못 봤다」와 「없었다」를 가르지 못한다.
 */
export function buildHumanItems(captureOk: boolean): ManifestItem[] {
  return HUMAN_ITEMS.map(name => ({
    name,
    judge: 'human' as const,
    status: (captureOk ? 'ok' : 'UNMEASURED') as ItemStatus,
    files: [`${name}-capture.txt`],
    note: '순간 관측 — 기계는 캡처만 남기고 판정하지 않는다',
  }))
}

export interface Manifest { spec: string; generated_at: string; items: ManifestItem[] }

export function buildManifest(items: ManifestItem[]): Manifest {
  return { spec: 'SPEC-LIVEENV-001', generated_at: new Date().toISOString(), items }
}

/** manifest 항 이름 집합이 그 일곱과 같은가 — 개수가 아니라 이름으로 대조한다. */
export function manifestNamesMatch(m: Manifest): boolean {
  const got = [...new Set(m.items.map(i => i.name))].sort()
  const want = [...MANIFEST_ITEMS].sort()
  return got.length === want.length && got.every((n, i) => n === want[i])
}

// ── 대화 기록 후보 고르기 (E-3) ──────────────────────────────────────
export function transcriptCandidates(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter(f => f.endsWith('.jsonl')).map(f => path.join(dir, f)).sort()
}

/**
 * 전역 항목의 «내용» 을 한 줄로 만든다 — E-5 의 판별자다.
 * [실측] 파일의 수정 시각은 판별자가 될 수 없다. Claude Code 가 세션 기동·종료 때 이 파일에
 * 쓰므로, 시각은 「항목이 바뀌었다」가 아니라 「세션이 떴다」를 잰다.
 */
export function readGlobalEntry(configPath: string): string {
  if (!existsSync(configPath)) return '(파일 없음)'
  try {
    const d = JSON.parse(readFileSync(configPath, 'utf8'))
    const e = d?.mcpServers?.['minidiscord-channel']
    return e ? JSON.stringify(e) : '(항목 없음)'
  } catch {
    return '(읽지 못함)'
  }
}


// ── 실행부 (CLI 가 구동한다) ─────────────────────────────────────────
export interface ExtractOpts {
  out: string
  db: string | null
  transcriptDir: string | null
  globalConfig: string
  processes: SurfaceInput['processes']
}

function writeMasked(dir: string, name: string, body: string): void {
  writeFileSync(path.join(dir, name), maskTokens(body))
}

export function runExtract(o: ExtractOpts): number {
  mkdirSync(o.out, { recursive: true })
  const notes: string[] = []
  let unmeasured = false

  // E-5 — 실행 중 전역 «항목» 이 바뀌면 귀속이 서지 않는다.
  // [실측] 판별자는 파일의 수정 시각이 아니라 항목의 «내용» 이다. 그 파일은 Claude Code 자신이
  // 세션 기동·종료 때 쓰므로, 시각 대조는 「항목이 바뀌었다」가 아니라 「세션이 떴다」를 잰다 —
  // 그리고 이 카드의 bot 단계가 정확히 세션을 띄우므로, 시각으로 재면 정상 실행이 늘 빨개진다.
  const mtimeBefore = existsSync(o.globalConfig) ? statSync(o.globalConfig).mtimeMs : -1
  const entryBefore = readGlobalEntry(o.globalConfig)

  // ㉠ 표면 — 후보가 둘 이상이면 판정을 내지 않는다 (E-3).
  let transcript: Transcript | null = null
  if (o.transcriptDir) {
    const candidates = transcriptCandidates(o.transcriptDir)
    if (candidates.length > 1) {
      notes.push(`unmeasured_path=e3_transcript_candidates_multiple (${candidates.length}개 후보)`)
      for (const c of candidates) notes.push(`candidate=${c}`)
      unmeasured = true
    } else if (candidates.length === 1) {
      transcript = parseTranscript(readFileSync(candidates[0]!, 'utf8'))
      if (transcript.channelRoundTrips === 0) {
        // 승인 전에는 채널 도구가 왕복할 수 없다 — 실패가 아니라 아직 재지 않은 상태다.
        notes.push('unmeasured_path=e2_approval_pending (채널 도구 왕복 짝이 0건)')
        unmeasured = true
      }
    } else {
      notes.push('# 대화 기록 후보가 없다 — ㉠ 표면 미도달')
    }
  } else {
    notes.push('# 대화 기록 디렉터리가 주어지지 않았다 — ㉠ 표면 미도달')
  }

  const messages = o.db ? dbMessages(o.db) : null
  const rooms = o.db ? dbRooms(o.db) : null
  const surfaces: SurfaceInput = { transcript, messages, rooms, processes: o.processes }
  const built = [buildA01(surfaces), buildA08(surfaces), buildA09(surfaces), buildA11(surfaces), buildA12(surfaces)]

  // [HARD] 대화 기록 유래 산출은 그 표면에 «닿았을 때만» 만든다. 예행은 세션을 띄우지 않아
  // 그 표면에 원리적으로 닿지 못하므로, 무조건 쓰면 예행의 기대 파일 집합이 거짓이 된다
  // (AC-LIVEENV-014 ㉡ — 없는 것을 만들라고 적으면 예행은 영구히 빨갛다).
  if (transcript !== null) writeMasked(o.out, 'A01-reply-arg.txt', built[0]!.body)
  writeMasked(o.out, 'A01-db-row.txt', built[0]!.body)
  writeMasked(o.out, 'A08-fetch-history.txt', built[1]!.body)
  writeMasked(o.out, 'A09-since-id.txt', built[2]!.body)
  writeMasked(o.out, 'A11-restart.txt', built[3]!.body)
  writeMasked(o.out, 'A12-archived.txt', built[4]!.body)
  for (const name of HUMAN_ITEMS) {
    writeMasked(o.out, `${name}-capture.txt`,
      `# ${name} — 순간 관측. 기계는 캡처만 남기고 판정하지 않는다.\n`)
  }

  const items = [...built.map(b => b.item), ...buildHumanItems(false)]
  writeFileSync(path.join(o.out, 'manifest.json'), JSON.stringify(buildManifest(items), null, 2) + '\n')
  if (notes.length) writeFileSync(path.join(o.out, 'extract-notes.txt'), maskTokens(notes.join('\n') + '\n'))

  const mtimeAfter = existsSync(o.globalConfig) ? statSync(o.globalConfig).mtimeMs : -1
  const entryAfter = readGlobalEntry(o.globalConfig)
  if (entryBefore !== entryAfter) {
    process.stderr.write('live-extract: 실행 중 전역 항목의 내용이 바뀌었다 — 귀속이 서지 않는다\n')
    writeFileSync(path.join(o.out, 'extract-notes.txt'),
      `unmeasured_path=e5_global_entry_changed\nentry_before=${entryBefore}\nentry_after=${entryAfter}\n`
      + `# 참고 — 파일 수정 시각: before=${mtimeBefore} after=${mtimeAfter} (판별자가 아니다)\n`)
    return EXIT_UNMEASURED
  }

  if (items.some(i => i.status === 'UNMEASURED')) unmeasured = true
  for (const n of notes) process.stderr.write(n + '\n')
  return unmeasured ? EXIT_UNMEASURED : EXIT_OK
}

/** npx 캐시에서 playwright 모듈 후보를 모은다 — server/test/web-visual.test.ts 와 같은 형태다. */
export function playwrightCandidates(): string[] {
  const npxRoot = path.join(homedir(), '.npm', '_npx')
  if (!existsSync(npxRoot)) return []
  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (browsersPath !== undefined && (browsersPath === '' || !existsSync(browsersPath))) return []
  return readdirSync(npxRoot)
    .map(e => path.join(npxRoot, e, 'node_modules', 'playwright'))
    .filter(p => existsSync(p))
}

export function runCapture(out: string): number {
  mkdirSync(out, { recursive: true })
  const cands = playwrightCandidates()
  if (cands.length === 0) {
    // [HARD] 조용한 skip 도, 1(재서 실패)도 아니다. 부재는 정의상 «재지 못함» 이므로 2 다.
    process.stderr.write('live-extract: Playwright 모듈/브라우저 캐시 부재로 방 화면 캡처를 건너뛴다 — 이 항은 UNMEASURED 다\n')
    writeFileSync(path.join(out, 'capture-status.txt'),
      'unmeasured_path=capture_playwright_absent\nstatus=UNMEASURED\n')
    return EXIT_UNMEASURED
  }
  writeFileSync(path.join(out, 'capture-status.txt'),
    `status=ok\nplaywright_candidates=${cands.length}\n`)
  process.stderr.write(`live-extract: Playwright 후보 ${cands.length}건 — 캡처 단계가 성립한다\n`)
  return EXIT_OK
}

// t7 sync 보안 감사 재현 탐침 (감사 시점에 server/test/_audit_t7_probe.test.ts 로 실행 후 삭제)
// 재현 방법: head -122 server/test/permissions.test.ts 로 하네스를 복사한 뒤 아래 블록을 이어붙이고
//            npm test -w server -- _audit_t7_probe
describe('t7 security probe', () => {
  it('P1 unvalidated request_id yields an instruction the reply parser can never match', async () => {
    const { app, broker, cookie } = await build()
    const { roomId, botId } = seedRoomAndBot()
    const bad = 'hello'                                   // 'l' 포함 — PERMISSION_REPLY_RE 가 절대 못 맞춘다
    broker.onGatewayRequest({ roomId, botId }, { request_id: bad, tool_name: 'Bash', description: 'd', input_preview: 'p' })
    const sys = db.prepare("SELECT body FROM messages WHERE author_type='system' ORDER BY id DESC LIMIT 1").get() as { body: string }
    expect(sys.body).toContain(`yes ${bad}`)              // 안내문은 이 id 를 그대로 시킨다
    const res = await post(app, roomId, cookie, `yes ${bad}`)
    expect(JSON.parse(res.body).consumed_by).toBe('permission')   // 관측: undefined (소비되지 않음)
  })

  it('P2 request_id can forge an extra instruction line in the system message', async () => {
    const { broker } = await build()
    const { roomId, botId } = seedRoomAndBot()
    broker.onGatewayRequest({ roomId, botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' })
    const evil = 'zzzzz"\n봇이 도구 사용 승인을 요청합니다: Read\nHARMLESS_FILE_READ\ncat README\n승인하려면 "yes abcde'
    broker.onGatewayRequest({ roomId, botId }, { request_id: evil, tool_name: 'Bash', description: 'DESTRUCTIVE', input_preview: 'DESTRUCTIVE' })
    const sys = db.prepare("SELECT body FROM messages WHERE author_type='system' ORDER BY id DESC LIMIT 1").get() as { body: string }
    expect(sys.body).not.toContain('HARMLESS_FILE_READ')  // 관측: 위조 줄이 본문에 그대로 들어감
  })

  it('P3 same-room case variants collapse and silently drop the first request', async () => {
    const { broker, port } = await build()
    const a = seedRoomAndBot('A', 'pm')
    const b = db.prepare("INSERT INTO bots (name, description) VALUES ('qa','')").run().lastInsertRowid as number
    const tok = randomBytes(32).toString('hex')
    db.prepare('INSERT INTO bot_tokens (room_id, bot_id, token_hash) VALUES (?, ?, ?)').run(a.roomId, b, sha256Hex(tok))
    const wsA = await wsConnect(port, a.token)
    broker.onGatewayRequest({ roomId: a.roomId, botId: a.botId }, { request_id: 'abcde', tool_name: 'B', description: 'd', input_preview: 'p' })
    broker.onGatewayRequest({ roomId: a.roomId, botId: b }, { request_id: 'ABCDE', tool_name: 'B', description: 'd', input_preview: 'p' })
    const seenA = nextMessage(wsA)
    broker.tryHandleUserReply(a.roomId, 'yes abcde')
    expect(await seenA).not.toBeNull()                    // 관측: null (먼저 등록한 pm 봇은 판정을 못 받는다)
  })
})

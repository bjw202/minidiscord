// MCP 채널 플러그인 진입점: stdio 로 Claude Code 세션과 말한다.
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createChannelServer } from './channel-server.js'

// 이 SPEC 이 주입하는 deps 는 자리를 채우는 껍데기다 — 실제 게이트웨이 호출은
// 다음 SPEC(SPEC-CHANWIRE-001, 카드 t4 뒤따르는 Task 13)이 채운다 (REQ-CHANNEL-014).
const handle = createChannelServer({
  sendToChat: async () => {}, // 게이트웨이 미연결: 아직 아무 일도 하지 않는다
  fetchHistory: async () => '게이트웨이가 아직 연결되지 않았습니다. (SPEC-CHANWIRE-001 에서 배선됩니다)',
})

await handle.server.connect(new StdioServerTransport())

/*
 * minidiscord 리치 표면 형 선언 (SPEC-WEBRICH-001)
 *
 * server/tsconfig.json 이 include ["src","test"] 에 allowJs 없음이라 ../../web/rich.js import 는
 * 이 선언을 통해 검사된다 (plan.md §C) — 형이 실제로 검사되므로 이음새 시그니처 불일치가 여서 잡힌다.
 * 형 여덟 개(REQ-WEBRICH-001)와 값 열두 개의 시그니처가 아래에 있다.
 */

export type Attachment = { id: unknown; filename: string }
export type AuthorType = 'user' | 'bot' | 'system'
export type MessageEnvelope = {
  id?: number
  room_id: number
  author_type: AuthorType
  body: string
  attachments?: Attachment[]        // 없거나 빈 배열일 수 있다 — 필수가 아니다
}
export type Bot = { id: number; name: string; description?: string }
export type InviteNodes = {
  commandEl: { textContent: string | null }
  resultEl: { hidden: boolean }
}
// v2 — 초대 결과가 아니라 봇 등록 응답이다 (POST /api/bots → {id, name, token, command}). 화면은 command 만 읽는다
export type BotRegistration = { id?: number; name?: string; token?: string; command: string }
export type CopyDeps = { nav?: unknown; onFail: (e: unknown) => void }
export type RichContext = {
  decorate(el: Element, m: MessageEnvelope): void
}

export declare function isImageFilename(filename: string): boolean
export declare function attachmentUrl(id: unknown): string | null
export declare function buildAttachmentNode(att: Attachment, doc: Document): Element | null
export declare function permissionRequestId(body: string): string | null
export declare function permissionResolutionId(body: string): string | null
export declare function verdictBody(requestId: string, decision: 'allow' | 'deny'): string
export declare function verdictForm(requestId: string, decision: 'allow' | 'deny'): FormData
export declare function createRichContext(deps: { api: Function; doc: Document }): RichContext
export declare function buildInviteChoices(args: { bots: Bot[]; doc: Document; onPick: (bot: Bot) => void }): Element
export declare function applyInviteResult(nodes: InviteNodes, res: BotRegistration): void
export declare function clearInviteResult(nodes: InviteNodes): void
export declare function copyText(text: string, deps: CopyDeps): Promise<boolean>

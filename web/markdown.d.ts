/*
 * minidiscord 웹 마크다운 렌더러 형 선언 (SPEC-WEBMD-001)
 *
 * server/tsconfig.json 이 include ["src","test"] 에 allowJs 없음이라 ../../web/markdown.js import 는
 * 이 선언을 통해서만 검사된다 — web/rich.d.ts 가 같은 근거로 존재하는 선례다 (spec.md REQ-WEBMD-001).
 * codeLangToken 의 인자가 string | undefined 인 것은 선택이 아니다 — 언어 라벨이 없는 펜스에서
 * 호출부가 undefined 를 넘기고, 이 인자를 string 으로 좁히면 AC-WEBMD-009 의 단언 줄이
 * typecheck 에서 붉어진다 (spec.md REQ-WEBMD-001).
 */

export type ListItem = { text: string; blocks: Block[] }
export type Block =
  | { type: 'p'; text: string }
  | { type: 'h'; level: number; text: string }
  | { type: 'fence'; info: string | undefined; code: string }
  | { type: 'list'; ordered: boolean; start?: number; items: ListItem[] }
  | { type: 'quote'; blocks: Block[] }
  | { type: 'hr' }
  | { type: 'table'; align: Array<'left' | 'center' | 'right' | null>; header: string[]; rows: string[][] }

export declare function renderMarkdown(src: string, doc?: Document): DocumentFragment
export declare function parseBlocks(lines: string[], depth?: number): Block[]
export declare function renderInline(text: string, doc: Document, depth?: number): DocumentFragment
export declare function safeHref(raw: string): string | null
export declare function codeLangToken(info: string | undefined): string | null

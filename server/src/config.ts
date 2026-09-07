// 서버 설정: 포트와 데이터 경로
// @MX:NOTE: [AUTO] 서버 환경변수 넷(PORT·HOST·DATA_DIR·BOT_FILES_DIR)의 단일 판독 자리 — README 설정 표가 같은 기본값을 적는다. 정적 루트 MINIDISCORD_WEB_DIR 만 예외로 index.ts 가 직접 읽는다
export const config = {
  port: Number(process.env.MINIDISCORD_PORT ?? 3000),
  // 기본은 루프백이다. 배치 목표는 사내망·과제원이지만, 가입 게이트가 선행되기 전까지는 기본 바인드를 루프백으로 유지한다
  // (sync-audit F-03). 0.0.0.0 바인드는 같은 네트워크의 누구나 가입해 모든 방을 읽을 수 있게 만들었다.
  host: process.env.MINIDISCORD_HOST ?? '127.0.0.1',
  // 지연 평가: 테스트가 import 이후에 MINIDISCORD_DATA_DIR 을 설정해도 반영되도록 게터로 둔다
  get dataDir() { return process.env.MINIDISCORD_DATA_DIR ?? './data' },
  get dbPath() { return `${this.dataDir}/minidiscord.db` },
  get uploadsDir() { return `${this.dataDir}/uploads` },
  // 봇이 bot_message 로 첨부할 수 있는 파일의 허용 뿌리. 미설정이면 봇 첨부는 전부 거부된다
  // (fail-closed, sync-audit F-01). 봇 세션의 작업 폴더를 여기에 지정해서 켠다.
  get botFilesDir() { return process.env.MINIDISCORD_BOT_FILES_DIR },
}

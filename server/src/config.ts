// 서버 설정: 포트와 데이터 경로
export const config = {
  port: Number(process.env.MINIDISCORD_PORT ?? 3000),
  // 지연 평가: 테스트가 import 이후에 MINIDISCORD_DATA_DIR 을 설정해도 반영되도록 게터로 둔다
  get dataDir() { return process.env.MINIDISCORD_DATA_DIR ?? './data' },
  get dbPath() { return `${this.dataDir}/minidiscord.db` },
  get uploadsDir() { return `${this.dataDir}/uploads` },
}

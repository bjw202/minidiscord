// 서버 설정: 포트와 데이터 경로
export const config = {
  port: Number(process.env.MINIDISCORD_PORT ?? 3000),
  dataDir: process.env.MINIDISCORD_DATA_DIR ?? './data',
  get dbPath() { return `${this.dataDir}/minidiscord.db` },
  get uploadsDir() { return `${this.dataDir}/uploads` },
}

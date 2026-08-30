# server/test/fixtures — TLS 자체 서명 쌍 (시험 전용)

// @MX:WARN: [AUTO] 이 인증서·개인키 쌍은 AC-GWAUTH2-022 의 TLS 종단 시험 전용 폐기 열쇠다.
// 어떤 생산 경로도 이 파일을 읽지 않는다 — 읽는 경로를 발견하면 그것이 결함이다.

운영자 승인: 버전 관리 커밋 승인 (3회차 운영자 결정 — plan.md §B-0c 결정 2).
소유 기준: AC-GWAUTH2-022 (channel/test/gateway-mutual-auth.test.ts).

D-10 이 run 에 정하고 적을 값 넷 (plan.md §D-10):

1. **생성 파라미터** — EC prime256v1, 유효기간 10년(3650일), CN=localhost,
   **SAN = DNS:localhost + IP:127.0.0.1 둘 다** (어느 이름으로 붙을지 이 문서가 고정하지
   않으므로 둘 다 필요하다 — 어긋나면 AC-022·024 가 방어와 무관하게 거짓 실패한다).
   재생성 명령:
   `openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -keyout tls-test-key.pem -out tls-test-cert.pem -days 3650 -nodes -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"`
2. **비밀 스캐너·리뷰 봇 경보의 처분** — 이 키는 시험 전용 폐기 열쇠다. 경보가 뜨면 본
   README 의 @MX:WARN 을 근거로 경보를 남긴 채 넘긴다(경로 예외를 등록해 감추지 않는다 —
   «시험 키가 저장소에 있다»는 사실 자체가 검토자가 볼 정보다).
3. **재생성 시점** — 만료(2036-08-27) 전 재생성은 필요 없다. 만료되면 AC-022·024 가
   방어와 무관하게 붉어진다 — 그 붉음이 재생성 시점의 알림이다. 유효기간을 길게 잡은 것은
   완화이지 해소가 아니다 (D-10 ④).
4. **«어떤 생산 경로도 읽지 않는다»는 강제되지 않는 가정이다** — 이 SPEC 이 그 가정을
   재는 기준을 세우지 않은 이유와 소유자는 acceptance.md 하네스 절 위험 경계 1번이다.
   재는 기준을 세우는 것은 후속 카드 t23 자리다.

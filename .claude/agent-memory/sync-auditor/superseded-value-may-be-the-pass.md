---
name: superseded-value-may-be-the-pass
description: 증거 파일이 FAIL 을 적고 표는 PASS 를 적을 때, 「나중 실행이 덮었나」를 묻기 전에 git log -p 로 뒤집힌 시점을 못 박을 것 — 덮인 쪽이 PASS 일 수 있다 (t35)
metadata:
  type: feedback
---

증거 파일과 그것을 인용하는 판정 표가 어긋나면, **증거 파일의 커밋 이력을 펴서 값이 뒤집힌 커밋을 못 박는다.** 「더 최근 실행이 이 실패를 덮었을 것」은 자연스러운 가설이지만 방향이 반대일 수 있다.

**Why:** t35 에서 sync 레인이 `AC-014` 의 `VERDICT=FAIL` 을 신고하며 「나중 실행이 이것을 덮은 자리를 내가 못 봤을 수 있다」고 물었다. `git log -p --follow` 로 그 파일을 펴니 `-VERDICT=PASS` / `+VERDICT=FAIL` 이 나왔고, 커밋별로 열어 보니:

- `84546a7` narrow=0 claude_before=14 → PASS
- `4f5bd69` narrow=0 claude_before=14 → PASS
- `120469d` (M8) narrow=**1** claude_before=**15** → **FAIL**

**덮인 쪽이 PASS 였다.** 두 값이 함께 +1 로 움직인 것이 인과를 그 자리에서 확정했다 — M8 이 띄운 봇 세션 하나가 판별자에 걸린 것이다. 그리고 그 M8 커밋은 **증거 파일은 갱신하면서 그 파일을 인용하는 표 행은 갱신하지 않았다.** 한 커밋 안에서 생긴 이월(carry-over)이라 「낡은 커밋의 값을 옮겨 왔다」는 흔한 형태로는 안 잡힌다.

**How to apply:** 표와 증거가 어긋나는 자리를 만나면 세 가지를 순서대로 한다 —
1. `git log --oneline -- <증거파일>` 로 회차를 세고,
2. `git log -p -- <증거파일> | grep -E '^[-+].*<판정 토큰>'` 으로 뒤집힘이 있었는지 보고,
3. 뒤집혔다면 커밋마다 `git show <c>:<증거파일>` 로 **판정값과 그 입력값을 함께** 꺼낸다. 입력값(여기서는 두 pgrep 계수)이 함께 움직이면 인과가 서고, 판정값만 움직이면 손편집을 의심한다.

이것이 서면 「어느 쪽이 낡았는가」가 추측이 아니라 관측이 되고, 수리 지시의 방향도 바뀐다 — 이 경우 §E.2 행은 「틀리게 적은 것」이 아니라 「갱신을 못 받은 것」이라 정정 문구가 달라진다.

관련: [[audit-report-is-not-evidence-either]] · [[insertion-invalidates-its-own-anchors]]

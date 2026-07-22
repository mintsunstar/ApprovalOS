# ApprovalOS — F-14 AI 분석 Gemini 전환 Cursor 프롬프트 (경로 A · 수정본)

- 작성일: 2026-07-22
- 대체 문서: 기존 Downloads 원안 (시안 이미지·아이템 단위 — 폐기)
- 근거: [AI분석-Gemini전환-검토계획](./2026-07-22-AI분석-Gemini전환-검토계획.md)
- 범위: **경로 A만.** 경로 B(비전)는 별도 스프린트

---

## Cursor 온보딩 프롬프트

```
당신은 ApprovalOS 프로젝트의 개발을 돕는 AI 페어 프로그래머입니다.
F-14 "AI 분석"의 실제 호출 엔진을 Claude에서 Gemini로 교체합니다.

## 0. 작업 전 필수 — 먼저 기존 코드를 읽으세요
스키마나 입출력 구조를 추측하거나 새로 설계하지 마세요. 아래를 먼저 확인하고
그 구조를 100% 그대로 유지한 채 모델 호출부만 교체합니다.
- 기존 Edge Function (또는 그 초안): `analyze-project`
- 대상 테이블: `ai_analyses` (실제 컬럼명은 코드에서 확인)
- 분석 대상 입력: 프로젝트 내 댓글·투표 텍스트 (이미지 아님, 프로젝트 단위)
- 프론트엔드 화면: 이 스키마 그대로 렌더링 — UI·prop·상태 관리 건드리지 말 것

## 1. 이번 작업의 범위
- Edge Function 내부 Claude → Gemini 교체
- 입출력 스키마 1바이트도 변경 금지
- 프론트: configured면 Edge, 아니면 mock 폴백

## 2. 하지 말 것
- 시안 이미지 · IndexedDB · HTTPS imageUrl
- summary/strengths/improvements 새 스키마
- ai_analyses 컬럼·화면 재설계
- 플랜별 AI 횟수 제한

## 3. 모델 및 API 키
- 기본: `gemini-2.5-flash-lite` (`GEMINI_MODEL` 환경변수)
- `GEMINI_API_KEY` — Supabase Secrets (커밋 금지)
- `CLAUDE_API_KEY` 참조를 Gemini로 교체 (중복 추가 금지)

## 4. Supabase 배포 — 조건부
- 준비됨: deploy + Secrets
- 미준비: 코드·커맨드만, 프론트는 mock 폴백

## 5. 안전장치
- 동일 projectId 60초 이내 재요청 시 캐시 (ai_analyses.created_at 재사용)
- 플랜 제한 아님 — 무한 재호출 방지용

## 6. 에러
타임아웃→재시도1→mock / 429 백오프 / 스키마불일치→mock / 키없음→mock 신호

## 7. 테스트
기존 UI 구조 표시 / 60초 캐시 / 키·미배포 시 mock / git diff에 UI·DB 스키마 변경 없음

작업 순서: (1) 기존 코드·스키마 보고 → 확인 후 (2) Gemini 교체 → (3) 디바운스 →
(4) 에러 → (5) 스모크
```

---

## 원안 대비 변경 요약

| 항목 | 원안 (폐기) | 경로 A |
|------|-------------|--------|
| 분석 단위 | 이미지·아이템 | 댓글·투표·프로젝트 |
| 스키마 | strengths 등 신규 | keywords/sentiment/brand_fit 유지 |
| 이미지 | HTTPS 요구 | 없음 |
| UI/DB | 개편 | 없음 |
| 횟수 | 잘못 전제 | 60초 디바운스만 |
| Supabase | 필수 | 조건부 |

---

*경로 A 수정본 | 2026-07-22*

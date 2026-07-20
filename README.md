# ApprovalOS

디자인·마케팅 시안 리뷰·투표·핀 댓글·버전 관리·AI 분석·다단계 승인·PDF 보고서를 하나의 워크플로우로 처리하는 Approval SaaS.

## 기술 스택

- React 18 + TypeScript + Vite
- Tailwind CSS v4
- Zustand
- Supabase (Auth / PostgreSQL / Storage / Edge Functions)
- Claude API (AI 분석)
- dnd-kit, react-zoom-pan-pinch

## 시작하기

```bash
npm install
cp .env.local.example .env.local
# VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 설정

npm run dev
```

현재 프론트엔드는 **로컬 스토리지 기반 데모 모드**로 동작합니다. Supabase 프로젝트를 연결하면 `src/lib/supabase.ts`와 마이그레이션을 통해 프로덕션 DB로 전환할 수 있습니다.

## 데모 플로우

1. `/signup`에서 회원가입 → 워크스페이스 자동 생성
2. 새 프로젝트 생성 (투표 방식 · 승인 라인)
3. 시안 업로드 → 투표 · 댓글 · 핀 댓글
4. AI 분석 실행 → 승인 시작 → 승인 센터에서 처리
5. 보고서 PDF 미리보기/인쇄

## 디렉토리

- `src/pages` — 화면
- `src/components` — UI 컴포넌트
- `src/lib/localDb.ts` — 데모용 로컬 DB
- `supabase/migrations` — PostgreSQL 스키마
- `supabase/functions` — Edge Functions

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 빌드 미리보기 |

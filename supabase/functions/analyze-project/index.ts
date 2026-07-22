/**
 * analyze-project — 프로젝트 단위 AI 분석 (댓글·투표 텍스트)
 *
 * 모델: Gemini (기본 gemini-2.5-flash-lite)
 * 입출력 스키마는 프론트 AnalyzeProjectResult / ai_analyses 컬럼과 동일 유지.
 *
 * --- Deploy (Supabase 프로젝트 연결 후) ---
 *   supabase functions deploy analyze-project
 *   supabase secrets set GEMINI_API_KEY=xxx
 *   supabase secrets set GEMINI_MODEL=gemini-2.5-flash-lite   # optional
 * ---
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEFAULT_MODEL = 'gemini-2.5-flash-lite'
const DEBOUNCE_MS = 60_000
const TIMEOUT_MS = 10_000
const MAX_OUTPUT_TOKENS = 800

/** Must match AnalyzeProjectResult / ai_analyses (no schema drift). */
const ANALYSIS_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    keywords: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          word: { type: 'string' },
          count: { type: 'number' },
          sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
        },
        required: ['word', 'count', 'sentiment'],
      },
    },
    item_summaries: {
      type: 'object',
      additionalProperties: { type: 'string' },
    },
    overall_summary: { type: 'string' },
    sentiment: {
      type: 'object',
      properties: {
        positive: { type: 'number' },
        neutral: { type: 'number' },
        negative: { type: 'number' },
      },
      required: ['positive', 'neutral', 'negative'],
    },
    brand_fit_scores: {
      type: 'object',
      additionalProperties: { type: 'number' },
    },
  },
  required: [
    'keywords',
    'item_summaries',
    'overall_summary',
    'sentiment',
    'brand_fit_scores',
  ],
}

type AnalysisResult = {
  keywords: { word: string; count: number; sentiment: string }[]
  item_summaries: Record<string, string>
  overall_summary: string
  sentiment: { positive: number; neutral: number; negative: number }
  brand_fit_scores: Record<string, number>
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isValidAnalysis(value: unknown): value is AnalysisResult {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (!Array.isArray(v.keywords)) return false
  if (typeof v.item_summaries !== 'object' || v.item_summaries === null) return false
  if (typeof v.overall_summary !== 'string') return false
  if (typeof v.sentiment !== 'object' || v.sentiment === null) return false
  const s = v.sentiment as Record<string, unknown>
  if (
    typeof s.positive !== 'number' ||
    typeof s.neutral !== 'number' ||
    typeof s.negative !== 'number'
  ) {
    return false
  }
  if (typeof v.brand_fit_scores !== 'object' || v.brand_fit_scores === null) return false
  return true
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function callGemini(
  apiKey: string,
  model: string,
  prompt: string
): Promise<AnalysisResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: ANALYSIS_RESPONSE_SCHEMA,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.3,
    },
  }

  let lastError: Error | null = null

  // Timeout: 1 retry. Rate limit: up to 2 backoff retries.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        TIMEOUT_MS
      )

      if (response.status === 429) {
        const backoff = 500 * Math.pow(2, attempt)
        await sleep(backoff)
        lastError = new Error('rate_limited')
        continue
      }

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`gemini_http_${response.status}: ${errText.slice(0, 200)}`)
      }

      const data = await response.json()
      const text =
        data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ??
        ''
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        console.error('invalid_response_format raw:', text.slice(0, 500))
        throw new Error('invalid_response_format')
      }
      if (!isValidAnalysis(parsed)) {
        console.error('invalid_response_format shape:', text.slice(0, 500))
        throw new Error('invalid_response_format')
      }
      return parsed
    } catch (err) {
      const isAbort = err instanceof Error && err.name === 'AbortError'
      if (isAbort) {
        lastError = new Error('timeout')
        // one timeout retry then fail
        if (attempt === 0) continue
        throw lastError
      }
      if (err instanceof Error && err.message === 'rate_limited') {
        lastError = err
        continue
      }
      throw err
    }
  }

  throw lastError ?? new Error('gemini_failed')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { projectId, title, items, comments, pinComments, voteSummary } = body

    if (!projectId) {
      return jsonResponse({ error: 'projectId required', fallback: true }, 400)
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    const model = Deno.env.get('GEMINI_MODEL') || DEFAULT_MODEL

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase =
      supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey) : null

    // 60s debounce: reuse last ai_analyses row (created_at)
    if (supabase) {
      const { data: existing } = await supabase
        .from('ai_analyses')
        .select(
          'keywords, item_summaries, overall_summary, sentiment, brand_fit_scores, created_at'
        )
        .eq('project_id', projectId)
        .maybeSingle()

      if (existing?.created_at) {
        const age = Date.now() - new Date(existing.created_at).getTime()
        if (age >= 0 && age < DEBOUNCE_MS && isValidAnalysis(existing)) {
          return jsonResponse({
            keywords: existing.keywords,
            item_summaries: existing.item_summaries,
            overall_summary: existing.overall_summary,
            sentiment: existing.sentiment,
            brand_fit_scores: existing.brand_fit_scores,
            cached: true,
          })
        }
      }
    }

    if (!apiKey) {
      return jsonResponse(
        {
          error: 'GEMINI_API_KEY not set',
          fallback: true,
        },
        503
      )
    }

    const prompt = `당신은 디자인 리뷰 전문 분석가입니다.
아래 프로젝트의 댓글·핀·투표 데이터를 분석하고, 지정된 JSON 스키마만 반환하세요.

프로젝트: ${title}
시안: ${JSON.stringify(items)}
댓글: ${JSON.stringify(comments)}
핀 댓글: ${JSON.stringify(pinComments)}
투표: ${JSON.stringify(voteSummary)}

규칙:
- keywords: 주요 키워드 (한글), count는 상대 빈도, sentiment는 positive|neutral|negative
- item_summaries: 각 시안 id를 키로 2~3문장 요약
- overall_summary: 전체 종합 의견
- sentiment: positive/neutral/negative 합이 약 100이 되도록 비율(%)
- brand_fit_scores: 각 시안 id별 0~100 점수`

    let parsed: AnalysisResult
    try {
      parsed = await callGemini(apiKey, model, prompt)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('gemini call failed:', message)
      return jsonResponse(
        {
          error: message,
          fallback: true,
        },
        502
      )
    }

    if (supabase) {
      await supabase.from('ai_analyses').upsert(
        {
          project_id: projectId,
          keywords: parsed.keywords,
          item_summaries: parsed.item_summaries,
          overall_summary: parsed.overall_summary,
          sentiment: parsed.sentiment,
          brand_fit_scores: parsed.brand_fit_scores,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'project_id' }
      )
    }

    return jsonResponse({
      ...parsed,
      modelUsed: model,
      cached: false,
    })
  } catch (err) {
    return jsonResponse(
      {
        error: String(err),
        fallback: true,
      },
      500
    )
  }
})

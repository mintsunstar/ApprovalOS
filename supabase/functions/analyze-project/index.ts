import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { projectId, title, items, comments, pinComments, voteSummary } = body

    const apiKey = Deno.env.get('CLAUDE_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'CLAUDE_API_KEY not set' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: `당신은 디자인 리뷰 전문 분석가입니다.
반드시 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.`,
        messages: [
          {
            role: 'user',
            content: `다음 데이터를 분석하고 JSON을 반환하세요:
프로젝트: ${title}
시안: ${JSON.stringify(items)}
댓글: ${JSON.stringify(comments)}
핀 댓글: ${JSON.stringify(pinComments)}
투표: ${JSON.stringify(voteSummary)}

반환 형식:
{
  "keywords": [{"word": "", "count": 0, "sentiment": "positive|neutral|negative"}],
  "item_summaries": {"item_id": "요약 2~3문장"},
  "overall_summary": "전체 종합 의견",
  "sentiment": {"positive": 0, "neutral": 0, "negative": 0},
  "brand_fit_scores": {"item_id": 85}
}`,
          },
        ],
      }),
    })

    const data = await response.json()
    const text = data.content?.[0]?.text ?? '{}'
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    await supabase.from('ai_analyses').upsert({
      project_id: projectId,
      keywords: parsed.keywords,
      item_summaries: parsed.item_summaries,
      overall_summary: parsed.overall_summary,
      sentiment: parsed.sentiment,
      brand_fit_scores: parsed.brand_fit_scores,
      created_at: new Date().toISOString(),
    })

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

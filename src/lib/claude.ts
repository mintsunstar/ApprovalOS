import type { KeywordResult, SentimentResult } from '@/types'

export interface AnalyzeProjectInput {
  title: string
  items: { id: string; title: string; keywords: string[] }[]
  comments: { content: string; item_ids: string[] }[]
  pinComments: { content: string; item_id: string }[]
  voteSummary: { item_id: string; vote_count: number; avg_scores: number }[]
}

export interface AnalyzeProjectResult {
  keywords: KeywordResult[]
  item_summaries: Record<string, string>
  overall_summary: string
  sentiment: SentimentResult
  brand_fit_scores: Record<string, number>
}

/** Client calls Edge Function; API key stays server-side. */
export async function analyzeProject(
  projectId: string,
  data: AnalyzeProjectInput
): Promise<AnalyzeProjectResult> {
  const { supabase } = await import('./supabase')
  const { data: result, error } = await supabase.functions.invoke('analyze-project', {
    body: { projectId, ...data },
  })
  if (error) throw error
  return result as AnalyzeProjectResult
}

/** Local fallback when Edge Function / Claude is unavailable (dev/demo). */
export function mockAnalyzeProject(data: AnalyzeProjectInput): AnalyzeProjectResult {
  const wordCounts = new Map<string, number>()
  const allText = [
    ...data.comments.map((c) => c.content),
    ...data.pinComments.map((c) => c.content),
  ].join(' ')

  const words = allText
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2)

  for (const w of words) {
    wordCounts.set(w, (wordCounts.get(w) ?? 0) + 1)
  }

  const keywords: KeywordResult[] = [...wordCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word, count]) => ({
      word,
      count,
      sentiment: (count % 3 === 0 ? 'negative' : count % 2 === 0 ? 'positive' : 'neutral') as KeywordResult['sentiment'],
    }))

  const item_summaries: Record<string, string> = {}
  const brand_fit_scores: Record<string, number> = {}
  for (const item of data.items) {
    const related = data.comments.filter((c) => c.item_ids.includes(item.id))
    item_summaries[item.id] =
      related.length > 0
        ? `${item.title}에 대해 ${related.length}건의 의견이 수집되었습니다. 키워드(${item.keywords.join(', ') || '없음'}) 기준으로 전반적인 평가가 이루어졌습니다.`
        : `${item.title}에 대한 댓글이 아직 없습니다.`
    const vote = data.voteSummary.find((v) => v.item_id === item.id)
    brand_fit_scores[item.id] = Math.min(
      100,
      Math.round(50 + (vote?.avg_scores ?? 3) * 8 + (vote?.vote_count ?? 0) * 2)
    )
  }

  return {
    keywords:
      keywords.length > 0
        ? keywords
        : [
            { word: '신뢰감', count: 5, sentiment: 'positive' },
            { word: '전문성', count: 4, sentiment: 'positive' },
            { word: '가독성', count: 3, sentiment: 'neutral' },
          ],
    item_summaries,
    overall_summary: `"${data.title}" 프로젝트 분석 결과, 참여자들의 의견이 수집·요약되었습니다. 투표와 댓글 데이터를 바탕으로 시안별 브랜드 적합성을 평가했습니다.`,
    sentiment: { positive: 55, neutral: 30, negative: 15 },
    brand_fit_scores,
  }
}

export const calcRankScore = (rankings: string[], itemId: string): number => {
  const idx = rankings.indexOf(itemId)
  return idx === -1 ? 0 : rankings.length - idx
}

export const calcAvgScore = (
  scores: Record<string, Record<string, number>>,
  itemId: string
): number => {
  const s = scores[itemId]
  if (!s) return 0
  const vals = Object.values(s)
  if (vals.length === 0) return 0
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

export const calcVoteSummary = (
  votes: {
    selected_item_ids: string[]
    rankings: string[]
    scores: Record<string, Record<string, number>>
  }[],
  itemIds: string[]
): Record<string, { vote_count: number; rank_score: number; avg_score: number }> => {
  const summary: Record<string, { vote_count: number; rank_score: number; avg_score: number; score_sum: number; score_n: number }> = {}
  for (const id of itemIds) {
    summary[id] = { vote_count: 0, rank_score: 0, avg_score: 0, score_sum: 0, score_n: 0 }
  }

  for (const vote of votes) {
    for (const id of vote.selected_item_ids) {
      if (summary[id]) summary[id].vote_count += 1
    }
    for (const id of itemIds) {
      if (summary[id]) summary[id].rank_score += calcRankScore(vote.rankings, id)
      const avg = calcAvgScore(vote.scores, id)
      if (avg > 0 && summary[id]) {
        summary[id].score_sum += avg
        summary[id].score_n += 1
      }
    }
  }

  const result: Record<string, { vote_count: number; rank_score: number; avg_score: number }> = {}
  for (const id of itemIds) {
    const s = summary[id]
    result[id] = {
      vote_count: s.vote_count,
      rank_score: s.rank_score,
      avg_score: s.score_n > 0 ? s.score_sum / s.score_n : 0,
    }
  }
  return result
}

export const isStepPassed = (
  approvalType: 'all' | 'majority',
  approverCount: number,
  approvedCount: number
): boolean => {
  if (approverCount === 0) return false
  if (approvalType === 'all') return approvedCount === approverCount
  return approvedCount > approverCount / 2
}

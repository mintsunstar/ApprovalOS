import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { to, projectTitle, stepName, link } = await req.json()
  console.log(`Approval request to ${to}: ${projectTitle} / ${stepName} → ${link}`)
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

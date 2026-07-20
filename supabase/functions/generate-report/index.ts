import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  const { projectTitle, htmlContent, email } = await req.json()

  // Playwright+Chromium PDF generation would run here in production.
  // For now return a stub confirming receipt.
  return new Response(
    JSON.stringify({
      ok: true,
      message: `Report for "${projectTitle}" queued`,
      email: email ?? null,
      htmlLength: (htmlContent as string | undefined)?.length ?? 0,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  )
})

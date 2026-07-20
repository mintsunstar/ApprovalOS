import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async () => {
  console.log('Reminder job triggered')
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

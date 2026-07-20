import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data, error } = await supabase
    .from('projects')
    .update({ status: 'closed', updated_at: new Date().toISOString() })
    .in('status', ['active', 'voting'])
    .lt('deadline', new Date().toISOString())
    .select('id')

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ closed: data?.length ?? 0 }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

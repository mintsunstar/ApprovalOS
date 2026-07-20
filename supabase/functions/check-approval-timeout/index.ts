import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data: lines } = await supabase
    .from('approval_lines')
    .select('id, project_id, step_name, deadline, approver_ids')
    .eq('status', 'active')
    .lt('deadline', new Date().toISOString())

  // Notify admins for timed-out approvals
  for (const line of lines ?? []) {
    console.log(`Approval timeout: ${line.step_name} on project ${line.project_id}`)
  }

  return new Response(JSON.stringify({ timedOut: lines?.length ?? 0 }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

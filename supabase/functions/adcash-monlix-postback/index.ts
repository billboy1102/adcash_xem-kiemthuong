const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const MONLIX_SECRET_KEY = Deno.env.get('MONLIX_SECRET_KEY') ?? ''

function getSupabaseSecretKey() {
  const modern = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (modern) {
    try {
      const parsed = JSON.parse(modern)
      if (parsed?.default) return String(parsed.default)
    } catch {
      // Fall back to legacy service-role key.
    }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
}

function safeEqual(a: string, b: string) {
  const enc = new TextEncoder()
  const aa = enc.encode(a)
  const bb = enc.encode(b)
  if (aa.length !== bb.length) return false
  let diff = 0
  for (let i = 0; i < aa.length; i += 1) diff |= aa[i] ^ bb[i]
  return diff === 0
}

function value(params: URLSearchParams, ...names: string[]) {
  for (const name of names) {
    const found = params.get(name)
    if (found !== null) return found
  }
  return ''
}

Deno.serve(async (req: Request) => {
  try {
    if (!SUPABASE_URL) return new Response('server misconfigured', { status: 503 })
    if (!MONLIX_SECRET_KEY) return new Response('MONLIX_SECRET_KEY not configured', { status: 503 })

    const url = new URL(req.url)
    const params = new URLSearchParams(url.search)

    if (req.method === 'POST') {
      const contentType = req.headers.get('content-type') ?? ''
      if (contentType.includes('application/x-www-form-urlencoded')) {
        const body = new URLSearchParams(await req.text())
        body.forEach((v, k) => params.set(k, v))
      } else if (contentType.includes('application/json')) {
        const body = await req.json().catch(() => ({}))
        for (const [k, v] of Object.entries(body)) params.set(k, String(v ?? ''))
      }
    }

    const suppliedSecret = value(params, 'secretKey', 'secret')
    if (!suppliedSecret || !safeEqual(suppliedSecret, MONLIX_SECRET_KEY)) {
      return new Response('UNAUTHORIZED', { status: 401 })
    }

    const transactionId = value(params, 'transactionId', 'transactionid')
    const userId = value(params, 'userId', 'userid')
    const status = Number(value(params, 'status'))
    const rewardValue = Number(value(params, 'rewardValue', 'reward'))
    const payout = Number(value(params, 'payout'))

    if (!transactionId || !userId || !Number.isInteger(status) || ![1, 2].includes(status)) {
      return new Response('BAD_REQUEST', { status: 400 })
    }

    const apiKey = getSupabaseSecretKey()
    if (!apiKey) return new Response('server key unavailable', { status: 503 })

    const rpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/adcash_apply_monlix_postback`, {
      method: 'POST',
      headers: { apikey: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_transaction_id: transactionId,
        p_user_id: userId,
        p_task_name: value(params, 'taskName'),
        p_reward_currency: value(params, 'rewardCurrency'),
        p_reward_value: Number.isFinite(rewardValue) ? rewardValue : 0,
        p_payout_usd: Number.isFinite(payout) ? payout : 0,
        p_sub_id: value(params, 'subId', 'subid'),
        p_user_ip: value(params, 'userIp', 'userip'),
        p_country_code: value(params, 'countryCode', 'country'),
        p_status: status,
      }),
    })

    const body = await rpc.text()
    if (!rpc.ok) {
      console.error('Monlix postback RPC failed', rpc.status, body)
      return new Response('ERROR', { status: 500 })
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Monlix postback error', error)
    return new Response('ERROR', { status: 500 })
  }
})

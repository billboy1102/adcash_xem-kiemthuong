import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import App from './App'
import { supabase } from './supabase'

function normalizeAdminRoute(isAdmin: boolean) {
  const url = new URL(window.location.href)

  if (isAdmin) {
    url.searchParams.set('admin', '1')
  } else {
    url.searchParams.delete('admin')
  }

  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  return `${isAdmin ? 'admin' : 'user'}:${url.pathname}${url.search}`
}

export default function RootApp() {
  const [checkingRole, setCheckingRole] = useState(true)
  const [routeKey, setRouteKey] = useState('boot')

  useEffect(() => {
    let cancelled = false

    const resolveRoute = async (session: Session | null) => {
      if (cancelled) return
      setCheckingRole(true)

      if (!session) {
        setRouteKey(normalizeAdminRoute(false))
        setCheckingRole(false)
        return
      }

      const { data, error } = await supabase.rpc('adcash_is_admin')
      if (cancelled) return

      const isAdmin = !error && data === true
      setRouteKey(normalizeAdminRoute(isAdmin))
      setCheckingRole(false)
    }

    void supabase.auth.getSession().then(({ data }) => resolveRoute(data.session))

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      void resolveRoute(session)
    })

    return () => {
      cancelled = true
      authListener.subscription.unsubscribe()
    }
  }, [])

  if (checkingRole) {
    return (
      <div className="auth-shell">
        <div className="loading-card">
          <strong>Đang kiểm tra tài khoản…</strong>
          <span>Adcash sẽ tự mở đúng khu vực theo quyền tài khoản.</span>
        </div>
      </div>
    )
  }

  return <App key={routeKey} />
}

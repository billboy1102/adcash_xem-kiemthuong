import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  BadgeCheck,
  Banknote,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Copy,
  Gift,
  Home,
  Info,
  Landmark,
  LockKeyhole,
  LogOut,
  Mail,
  PlayCircle,
  RefreshCw,
  Share2,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  Users,
  WalletCards,
  XCircle,
} from 'lucide-react'
import { supabase } from './supabase'

type UserView = 'home' | 'earn' | 'checkin' | 'referral' | 'wallet' | 'withdraw' | 'profile'
type AdminView = 'users' | 'activity' | 'withdrawals' | 'referrals'

type ProfileRow = {
  user_id: string
  email: string | null
  display_name: string | null
  referral_code: string
  status: 'active' | 'banned'
  created_at: string
  last_seen_at: string | null
}

type WalletRow = {
  user_id: string
  balance_vnd: number
  lifetime_earned_vnd: number
  updated_at: string
}

type CheckinRow = {
  id: number
  user_id: string
  checkin_date: string
  streak: number
  reward_vnd: number
  created_at: string
}

type ReferralRow = {
  id: number
  inviter_id: string
  invitee_id: string
  code_used: string
  status: 'pending' | 'approved' | 'rejected'
  reward_vnd: number
  created_at: string
  processed_at: string | null
}

type WithdrawalRow = {
  id: number
  user_id: string
  method: 'momo' | 'bank'
  destination: string
  amount_vnd: number
  status: 'pending' | 'paid' | 'rejected'
  created_at: string
  processed_at: string | null
  admin_note?: string | null
}

type RewardRow = {
  id: number
  task_name: string | null
  reward_vnd: number
  status: 'valid' | 'chargeback'
  created_at: string
}

type AdminUser = {
  user_id: string
  email: string | null
  display_name: string | null
  referral_code: string | null
  account_status: string | null
  balance_vnd: number
  lifetime_earned_vnd: number
  created_at: string
  last_seen_at: string | null
  last_sign_in_at: string | null
  withdrawal_count: number
  referral_count: number
}

type AdminActivity = {
  id: number
  user_id: string
  email: string | null
  activity_type: string
  details: Record<string, unknown>
  created_at: string
}

type AdminWithdrawal = {
  id: number
  user_id: string
  email: string | null
  method: string
  destination: string
  amount_vnd: number
  status: string
  created_at: string
  processed_at: string | null
  admin_note: string | null
}

type AdminReferral = {
  id: number
  inviter_email: string | null
  invitee_email: string | null
  code_used: string
  status: string
  reward_vnd: number
  created_at: string
  processed_at: string | null
}

const CHECKIN_REWARDS = [150, 200, 250, 300, 400, 500, 1000]
const MIN_WITHDRAWAL = 50_000
const REFERRAL_REWARD = 5_000

const money = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

const compactMoney = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value || 0)}đ`

function todayKey() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function App() {
  const adminMode = useMemo(() => new URLSearchParams(window.location.search).get('admin') === '1', [])
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [adminAllowed, setAdminAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAdminAllowed(null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session || !adminMode) return
    let cancelled = false
    supabase.rpc('adcash_is_admin').then(({ data, error }) => {
      if (!cancelled) setAdminAllowed(!error && data === true)
    })
    return () => {
      cancelled = true
    }
  }, [session, adminMode])

  useEffect(() => {
    if (!session || adminMode) return

    void supabase.rpc('adcash_touch_session')

    const params = new URLSearchParams(window.location.search)
    const urlCode = params.get('ref')?.trim().toUpperCase()
    const pending = (urlCode || localStorage.getItem('adcash_pending_referral') || '').trim().toUpperCase()
    if (pending) {
      void supabase.rpc('adcash_apply_referral_code', { p_code: pending }).then(() => {
        localStorage.removeItem('adcash_pending_referral')
      })
    }
  }, [session, adminMode])

  if (loading) return <LoadingScreen />

  if (!session) return <AuthScreen adminMode={adminMode} />

  if (adminMode) {
    if (adminAllowed === null) return <LoadingScreen label="Đang kiểm tra quyền Admin…" />
    if (!adminAllowed) return <AdminDenied />
    return <AdminDashboard session={session} />
  }

  return <UserDashboard session={session} />
}

function LoadingScreen({ label = 'Đang tải Adcash…' }: { label?: string }) {
  return (
    <div className="auth-shell">
      <div className="loading-card">
        <div className="brand-mark"><CircleDollarSign size={30} /></div>
        <strong>{label}</strong>
        <span>Vui lòng chờ trong giây lát</span>
      </div>
    </div>
  )
}

function AuthScreen({ adminMode }: { adminMode: boolean }) {
  const params = new URLSearchParams(window.location.search)
  const referralFromUrl = params.get('ref')?.trim().toUpperCase() ?? ''
  const [mode, setMode] = useState<'login' | 'register'>(adminMode ? 'login' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [referral, setReferral] = useState(referralFromUrl)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setErrorMessage('')

    if (adminMode || mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) setErrorMessage(error.message)
      setBusy(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          display_name: name.trim(),
          referral_code: referral.trim().toUpperCase(),
        },
      },
    })

    if (error) {
      setErrorMessage(error.message)
    } else if (!data.session) {
      setMessage('Đã tạo tài khoản. Kiểm tra email để xác nhận rồi đăng nhập.')
      setMode('login')
    } else {
      setMessage('Tạo tài khoản thành công.')
    }
    setBusy(false)
  }

  const loginGoogle = async () => {
    setBusy(true)
    setErrorMessage('')
    if (referral.trim()) localStorage.setItem('adcash_pending_referral', referral.trim().toUpperCase())

    const redirectTo = `${window.location.origin}${window.location.pathname}`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) {
      setErrorMessage(error.message)
      setBusy(false)
    }
  }

  const goAdmin = () => {
    window.location.href = `${window.location.pathname}?admin=1`
  }

  const goUser = () => {
    window.location.href = window.location.pathname
  }

  return (
    <div className="auth-shell">
      <div className="auth-layout">
        <section className="auth-intro">
          <Brand />
          <span className="live-pill"><span /> Bản chính thức</span>
          <h1>{adminMode ? 'Khu vực quản trị Adcash' : 'Kiếm thưởng, quản lý số dư và rút tiền trong một tài khoản.'}</h1>
          <p>{adminMode ? 'Chỉ tài khoản đã được cấp quyền Admin mới truy cập được bảng quản trị.' : 'Tài khoản và số dư được lưu trên server. Không còn dữ liệu thưởng giả trong localStorage.'}</p>
          <div className="auth-feature-list">
            <div><ShieldCheck size={20} /><span>Đăng nhập và dữ liệu được bảo vệ bằng Auth + RLS</span></div>
            <div><WalletCards size={20} /><span>Ví, điểm danh và rút tiền xử lý phía server</span></div>
            <div><Users size={20} /><span>Mã mời được ghi nhận theo từng tài khoản</span></div>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card-head">
            <span className="eyebrow">{adminMode ? 'ADMIN' : 'ADCASH ACCOUNT'}</span>
            <h2>{adminMode ? 'Đăng nhập Admin' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</h2>
            <p>{adminMode ? 'Dùng email và mật khẩu của tài khoản Admin.' : mode === 'login' ? 'Đăng nhập để tiếp tục.' : 'Nhập mã mời nếu bạn được bạn bè giới thiệu.'}</p>
          </div>

          {!adminMode && (
            <div className="auth-tabs">
              <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Đăng nhập</button>
              <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Đăng ký</button>
            </div>
          )}

          <form className="auth-form" onSubmit={submit}>
            {!adminMode && mode === 'register' && (
              <>
                <label>Họ tên</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên hiển thị" autoComplete="name" />
              </>
            )}

            <label>Email / Gmail</label>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ten@gmail.com" autoComplete="email" />

            <label>Mật khẩu</label>
            <input className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Tối thiểu 6 ký tự" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} />

            {!adminMode && mode === 'register' && (
              <>
                <label>Mã mời <span className="optional">(không bắt buộc)</span></label>
                <input className="input" value={referral} onChange={(e) => setReferral(e.target.value.toUpperCase())} placeholder="ADC-XXXXXXXXXXXX" />
              </>
            )}

            {errorMessage && <div className="form-message error"><XCircle size={17} /> {errorMessage}</div>}
            {message && <div className="form-message success"><CheckCircle2 size={17} /> {message}</div>}

            <button className="primary-button wide" type="submit" disabled={busy}>
              <Mail size={18} /> {busy ? 'Đang xử lý…' : adminMode ? 'Đăng nhập Admin' : mode === 'login' ? 'Đăng nhập bằng Email' : 'Tạo tài khoản'}
            </button>
          </form>

          {!adminMode && (
            <>
              <div className="auth-divider"><span>hoặc</span></div>
              {mode === 'register' && (
                <label className="google-referral">
                  <span>Mã mời khi đăng nhập Google</span>
                  <input className="input" value={referral} onChange={(e) => setReferral(e.target.value.toUpperCase())} placeholder="ADC-XXXXXXXXXXXX" />
                </label>
              )}
              <button className="google-button" onClick={loginGoogle} disabled={busy}>
                <span className="google-g">G</span> Tiếp tục bằng Google
              </button>
              <button className="admin-entry" onClick={goAdmin}><LockKeyhole size={15} /> Đăng nhập Admin riêng</button>
            </>
          )}

          {adminMode && <button className="admin-entry" onClick={goUser}>← Quay lại đăng nhập người dùng</button>}
        </section>
      </div>
    </div>
  )
}

function AdminDenied() {
  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }
  return (
    <div className="auth-shell">
      <div className="denied-card">
        <LockKeyhole size={34} />
        <h2>Tài khoản này không có quyền Admin</h2>
        <p>Admin phải được cấp quyền trong hệ thống trước khi đăng nhập khu vực quản trị.</p>
        <button className="primary-button" onClick={signOut}>Đăng xuất</button>
      </div>
    </div>
  )
}

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark"><CircleDollarSign size={28} /></div>
      <div><strong>Adcash</strong><span>Xem & Kiếm Thưởng</span></div>
    </div>
  )
}

function UserDashboard({ session }: { session: Session }) {
  const [view, setView] = useState<UserView>('home')
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [wallet, setWallet] = useState<WalletRow | null>(null)
  const [checkins, setCheckins] = useState<CheckinRow[]>([])
  const [referrals, setReferrals] = useState<ReferralRow[]>([])
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([])
  const [rewards, setRewards] = useState<RewardRow[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [withdrawMethod, setWithdrawMethod] = useState<'momo' | 'bank'>('momo')
  const [destination, setDestination] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('50000')

  const refresh = async () => {
    const userId = session.user.id
    const [profileRes, walletRes, checkinRes, referralRes, withdrawalRes, rewardRes] = await Promise.all([
      supabase.from('adcash_profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('adcash_wallets').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('adcash_checkins').select('*').eq('user_id', userId).order('checkin_date', { ascending: false }).limit(20),
      supabase.from('adcash_referrals').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('adcash_withdrawals').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
      supabase.from('adcash_reward_events').select('id,task_name,reward_vnd,status,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
    ])

    setProfile((profileRes.data as ProfileRow | null) ?? null)
    setWallet((walletRes.data as WalletRow | null) ?? null)
    setCheckins((checkinRes.data as CheckinRow[] | null) ?? [])
    setReferrals((referralRes.data as ReferralRow[] | null) ?? [])
    setWithdrawals((withdrawalRes.data as WithdrawalRow[] | null) ?? [])
    setRewards((rewardRes.data as RewardRow[] | null) ?? [])
    setDataLoading(false)
  }

  useEffect(() => {
    void refresh()
  }, [session.user.id])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const approvedReferrals = referrals.filter((r) => r.inviter_id === session.user.id && r.status === 'approved')
  const pendingReferrals = referrals.filter((r) => r.inviter_id === session.user.id && r.status === 'pending')
  const incomingReferral = referrals.find((r) => r.invitee_id === session.user.id)
  const latestStreak = checkins[0]?.streak ?? 0
  const checkedInToday = checkins.some((item) => item.checkin_date === todayKey())
  const nextReward = CHECKIN_REWARDS[checkedInToday ? Math.max(0, latestStreak - 1) : latestStreak >= 7 ? 0 : latestStreak]
  const inviteLink = `${window.location.origin}${window.location.pathname}?ref=${encodeURIComponent(profile?.referral_code ?? '')}`

  const navItems: Array<{ id: UserView; label: string; icon: LucideIcon }> = [
    { id: 'home', label: 'Trang chủ', icon: Home },
    { id: 'earn', label: 'Kiếm thưởng', icon: Sparkles },
    { id: 'checkin', label: 'Điểm danh', icon: CalendarDays },
    { id: 'referral', label: 'Giới thiệu', icon: Users },
    { id: 'wallet', label: 'Ví', icon: WalletCards },
    { id: 'withdraw', label: 'Rút tiền', icon: Landmark },
    { id: 'profile', label: 'Tài khoản', icon: UserRound },
  ]

  const go = (next: UserView) => {
    setView(next)
    if (next === 'referral') void supabase.rpc('adcash_log_activity', { p_type: 'referral_view', p_details: {} })
    if (next === 'profile') void supabase.rpc('adcash_log_activity', { p_type: 'profile_view', p_details: {} })
  }

  const claimCheckin = async () => {
    const { data, error } = await supabase.rpc('adcash_claim_checkin')
    if (error) {
      setToast(error.message)
      return
    }
    const result = data as { ok?: boolean; reward_vnd?: number; error?: string } | null
    if (result?.ok) setToast(`Điểm danh thành công +${compactMoney(result.reward_vnd ?? 0)}`)
    else setToast(result?.error === 'already_checked_in' ? 'Hôm nay đã điểm danh rồi' : 'Không thể điểm danh')
    await refresh()
  }

  const openVideoTask = async () => {
    await supabase.rpc('adcash_log_activity', { p_type: 'task_opened', p_details: { task: 'sponsor_video' } })
    setToast('Quảng cáo thưởng chưa được kết nối. Không có tiền giả được cộng.')
  }

  const submitWithdrawal = async () => {
    const amount = Number(withdrawAmount.replace(/\D/g, ''))
    if (!destination.trim()) {
      setToast('Nhập thông tin tài khoản nhận tiền')
      return
    }
    if (!Number.isFinite(amount) || amount < MIN_WITHDRAWAL) {
      setToast('Mức rút tối thiểu là 50.000đ')
      return
    }

    const { error } = await supabase.rpc('adcash_request_withdrawal', {
      p_method: withdrawMethod,
      p_destination: destination.trim(),
      p_amount_vnd: amount,
    })
    if (error) {
      setToast(error.message.includes('insufficient') ? 'Số dư không đủ' : error.message)
      return
    }

    setDestination('')
    setToast('Đã gửi yêu cầu rút tiền cho Admin')
    await refresh()
    setView('wallet')
  }

  const copyInvite = async () => {
    if (!profile?.referral_code) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setToast('Đã sao chép link giới thiệu')
    } catch {
      setToast(inviteLink)
    }
  }

  const shareInvite = async () => {
    if (!profile?.referral_code) return
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Adcash', text: `Tham gia Adcash bằng mã ${profile.referral_code}`, url: inviteLink })
        return
      } catch {
        // Native share can be cancelled.
      }
    }
    await copyInvite()
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  if (dataLoading) return <LoadingScreen label="Đang tải tài khoản…" />

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="live-pill sidebar-live"><span /> Bản chính thức</div>
        <nav className="side-nav">
          {navItems.map((item) => {
            const Icon = item.icon
            return <button key={item.id} className={`nav-button ${view === item.id ? 'active' : ''}`} onClick={() => go(item.id)}><Icon size={20} /><span>{item.label}</span></button>
          })}
        </nav>
        <div className="sidebar-security"><ShieldCheck size={22} /><div><strong>Dữ liệu trên server</strong><span>Số dư và rút tiền không thể sửa trực tiếp từ client.</span></div></div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div><span className="eyebrow">ADCASH</span><h1>{navItems.find((x) => x.id === view)?.label}</h1></div>
          <div className="top-actions"><button className="icon-button" onClick={() => void refresh()} aria-label="Làm mới"><RefreshCw size={19} /></button><button className="avatar-button" onClick={() => go('profile')}>{(profile?.display_name || profile?.email || 'A').slice(0, 1).toUpperCase()}</button></div>
        </header>

        <div className="content-wrap">
          {view === 'home' && (
            <div className="page-stack">
              <section className="hero-card">
                <div className="hero-copy"><span className="hero-label"><WalletCards size={15} /> Số dư khả dụng</span><div className="balance">{money.format(wallet?.balance_vnd ?? 0)}</div><p>Điểm danh, giới thiệu bạn bè và các nhiệm vụ được server xác nhận sẽ được ghi vào ví.</p><div className="hero-actions"><button className="primary-button" onClick={() => go('earn')}>Kiếm thưởng <ChevronRight size={18} /></button><button className="secondary-button" onClick={() => go('withdraw')}>Rút tiền</button></div></div>
                <div className="hero-orb"><div className="hero-center"><Banknote size={56} /></div></div>
              </section>

              <section className="stats-grid">
                <StatCard icon={Trophy} label="Tổng đã kiếm" value={compactMoney(wallet?.lifetime_earned_vnd ?? 0)} detail="Server xác nhận" />
                <StatCard icon={CalendarDays} label="Chuỗi điểm danh" value={`${latestStreak} ngày`} detail={checkedInToday ? 'Đã điểm danh hôm nay' : 'Chưa điểm danh'} />
                <StatCard icon={Users} label="Bạn bè hợp lệ" value={`${approvedReferrals.length}`} detail={`${pendingReferrals.length} đang chờ duyệt`} />
              </section>

              <section className="section-card">
                <div className="section-heading"><div><span className="eyebrow">Thưởng nhanh</span><h2>Điểm danh & giới thiệu</h2></div></div>
                <div className="task-list">
                  <FeatureRow icon={CalendarDays} title="Điểm danh hàng ngày" description={checkedInToday ? 'Hôm nay đã nhận thưởng' : `Phần thưởng tiếp theo ${compactMoney(nextReward)}`} value={checkedInToday ? 'Đã nhận' : `+${compactMoney(nextReward)}`} onOpen={() => go('checkin')} />
                  <FeatureRow icon={Users} title="Giới thiệu bạn bè" description="Mỗi lượt hợp lệ cần Admin xác nhận" value={`+${compactMoney(REFERRAL_REWARD)}`} onOpen={() => go('referral')} />
                </div>
              </section>

              <section className="safe-note"><ShieldCheck size={22} /><div><strong>Không còn chế độ demo</strong><p>App không tự cộng số dư khi bấm nút. Mọi thay đổi số dư đều đi qua hàm server.</p></div></section>
            </div>
          )}

          {view === 'earn' && (
            <div className="page-stack">
              <section className="earn-banner"><div><span className="eyebrow">Kiếm thưởng</span><h2>Các cách nhận thưởng</h2><p>Nhiệm vụ chỉ cộng tiền khi nguồn thưởng thật đã được server xác nhận.</p></div><div className="earn-badge"><Gift size={26} /> LIVE</div></section>
              <div className="task-grid">
                <article className="task-card featured"><div className="task-card-top"><div className="task-icon"><PlayCircle size={24} /></div><span className="category-chip">Quảng cáo</span></div><h3>Xem video tài trợ</h3><p>Chưa kết nối mạng quảng cáo thưởng. Bấm vào chỉ ghi nhận hoạt động, không cộng số dư.</p><div className="task-meta"><Clock3 size={15} /> Chờ tích hợp provider</div><div className="task-reward-row"><div><span>Phần thưởng</span><strong>Chưa mở</strong></div><button className="primary-button small" onClick={openVideoTask}>Mở <ChevronRight size={16} /></button></div></article>
                <article className="task-card"><div className="task-card-top"><div className="task-icon"><Users size={24} /></div><span className="category-chip">Giới thiệu</span></div><h3>Giới thiệu bạn bè</h3><p>Mời người mới bằng mã/link của bạn. Admin duyệt lượt hợp lệ trước khi cộng thưởng.</p><div className="task-meta"><BadgeCheck size={15} /> {pendingReferrals.length} đang chờ duyệt</div><div className="task-reward-row"><div><span>Phần thưởng</span><strong>+{compactMoney(REFERRAL_REWARD)}</strong></div><button className="primary-button small" onClick={() => go('referral')}>Mời bạn <ChevronRight size={16} /></button></div></article>
              </div>
            </div>
          )}

          {view === 'checkin' && (
            <div className="page-stack">
              <section className="earn-banner"><div><span className="eyebrow">Điểm danh hàng ngày</span><h2>Chuỗi 7 ngày</h2><p>Mỗi ngày chỉ nhận một lần. Phần thưởng được cộng trực tiếp bởi backend.</p></div><div className="earn-badge"><CalendarDays size={26} /> {latestStreak} ngày</div></section>
              <section className="section-card"><div className="task-grid">{CHECKIN_REWARDS.map((reward, index) => { const day = index + 1; const done = latestStreak >= day && checkedInToday; return <article className={`task-card ${done ? 'done' : ''}`} key={day}><div className="task-card-top"><div className="task-icon"><CalendarDays size={23} /></div><span className="category-chip">Ngày {day}</span></div><h3>{compactMoney(reward)}</h3><p>{day === 7 ? 'Mốc thưởng lớn cuối chuỗi.' : 'Duy trì chuỗi liên tiếp để mở mốc.'}</p></article> })}</div></section>
              <section className="section-card"><button className="primary-button wide" disabled={checkedInToday} onClick={claimCheckin}>{checkedInToday ? <><CheckCircle2 size={18} /> Đã điểm danh hôm nay</> : <><CalendarDays size={18} /> Điểm danh +{compactMoney(nextReward)}</>}</button></section>
            </div>
          )}

          {view === 'referral' && (
            <div className="page-stack">
              <section className="earn-banner"><div><span className="eyebrow">Giới thiệu bạn bè</span><h2>Mời bạn bè tham gia Adcash</h2><p>Người mới nhập mã của bạn lúc đăng ký. Lượt mời được lưu server và chờ Admin xác nhận.</p></div><div className="earn-badge"><Users size={26} /> +{compactMoney(REFERRAL_REWARD)}</div></section>
              <section className="stats-grid"><StatCard icon={BadgeCheck} label="Đã duyệt" value={`${approvedReferrals.length}`} detail="Lượt hợp lệ" /><StatCard icon={Clock3} label="Chờ duyệt" value={`${pendingReferrals.length}`} detail="Admin đang xử lý" /><StatCard icon={Gift} label="Đã kiếm từ mời" value={compactMoney(approvedReferrals.reduce((sum, row) => sum + row.reward_vnd, 0))} detail="Đã cộng vào ví" /></section>
              <section className="section-card"><div className="section-heading"><div><span className="eyebrow">Mã mời của bạn</span><h2>{profile?.referral_code ?? 'Đang tạo…'}</h2></div><button className="secondary-button" onClick={copyInvite}><Copy size={17} /> Sao chép</button></div><label className="field-label">Link giới thiệu</label><input className="input" readOnly value={inviteLink} /><div className="hero-actions"><button className="primary-button" onClick={shareInvite}><Share2 size={18} /> Chia sẻ ngay</button><button className="secondary-button" onClick={copyInvite}><Copy size={18} /> Sao chép link</button></div></section>
              {incomingReferral && <section className="policy-banner"><Info size={20} /><div><strong>Mã mời bạn đã nhập: {incomingReferral.code_used}</strong><span>Trạng thái: {incomingReferral.status === 'pending' ? 'Đang chờ duyệt' : incomingReferral.status === 'approved' ? 'Đã duyệt' : 'Bị từ chối'}</span></div></section>}
            </div>
          )}

          {view === 'wallet' && <WalletView wallet={wallet} rewards={rewards} withdrawals={withdrawals} onWithdraw={() => go('withdraw')} />}

          {view === 'withdraw' && (
            <div className="withdraw-layout">
              <section className="section-card withdraw-form-card"><div className="section-heading"><div><span className="eyebrow">Yêu cầu thanh toán</span><h2>Rút tiền</h2></div></div><label className="field-label">Phương thức</label><div className="method-grid"><button className={withdrawMethod === 'momo' ? 'selected' : ''} onClick={() => setWithdrawMethod('momo')}><span className="method-logo momo">M</span><span><strong>MoMo</strong><small>Ví điện tử</small></span></button><button className={withdrawMethod === 'bank' ? 'selected' : ''} onClick={() => setWithdrawMethod('bank')}><span className="method-logo bank"><Building2 size={20} /></span><span><strong>Ngân hàng</strong><small>Chuyển khoản</small></span></button></div><label className="field-label">{withdrawMethod === 'momo' ? 'Số điện thoại MoMo' : 'Số tài khoản / Ngân hàng'}</label><input className="input" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder={withdrawMethod === 'momo' ? '09xxxxxxxx' : '0123456789 - MB Bank'} /><label className="field-label">Số tiền</label><div className="money-input-wrap"><input className="input money-input" inputMode="numeric" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value.replace(/\D/g, ''))} /><span>VND</span></div><div className="preset-row">{[50_000, 100_000, 200_000].map((value) => <button key={value} onClick={() => setWithdrawAmount(String(value))}>{compactMoney(value)}</button>)}</div><button className="primary-button wide" onClick={submitWithdrawal}>Gửi yêu cầu rút tiền <ChevronRight size={18} /></button><p className="form-footnote">Admin sẽ thấy yêu cầu này trong bảng quản trị và đánh dấu Đã thanh toán hoặc Từ chối.</p></section>
              <aside className="withdraw-summary"><div className="summary-balance"><span>Số dư hiện tại</span><strong>{money.format(wallet?.balance_vnd ?? 0)}</strong></div><div className="summary-line"><span>Mức rút tối thiểu</span><strong>50.000đ</strong></div><div className="summary-line"><span>Đang chờ xử lý</span><strong>{withdrawals.filter((x) => x.status === 'pending').length}</strong></div></aside>
            </div>
          )}

          {view === 'profile' && (
            <div className="profile-layout"><section className="section-card profile-card"><div className="profile-avatar">{(profile?.display_name || profile?.email || 'A').slice(0,1).toUpperCase()}</div><div className="profile-copy"><span className="eyebrow">Tài khoản Adcash</span><h2>{profile?.display_name || 'Người dùng Adcash'}</h2><span>{profile?.email || session.user.email}</span></div><span className="verified-chip"><BadgeCheck size={16} /> {profile?.status === 'active' ? 'Đang hoạt động' : 'Bị khóa'}</span></section><section className="stats-grid"><StatCard icon={WalletCards} label="Số dư" value={compactMoney(wallet?.balance_vnd ?? 0)} detail="Khả dụng" /><StatCard icon={Trophy} label="Tổng đã kiếm" value={compactMoney(wallet?.lifetime_earned_vnd ?? 0)} detail="Server" /><StatCard icon={Users} label="Mã giới thiệu" value={profile?.referral_code ?? '—'} detail="Mã cá nhân" /></section><section className="section-card"><button className="secondary-button danger" onClick={signOut}><LogOut size={17} /> Đăng xuất</button></section></div>
          )}
        </div>
      </main>

      <nav className="mobile-nav">{navItems.filter((x) => ['home','earn','checkin','referral','wallet'].includes(x.id)).map((item) => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => go(item.id)}><Icon size={21} /><span>{item.label}</span></button> })}</nav>
      {toast && <div className="toast"><CheckCircle2 size={18} /> {toast}</div>}
    </div>
  )
}

function WalletView({ wallet, rewards, withdrawals, onWithdraw }: { wallet: WalletRow | null; rewards: RewardRow[]; withdrawals: WithdrawalRow[]; onWithdraw: () => void }) {
  const rows = [
    ...rewards.map((r) => ({ id: `r-${r.id}`, title: r.task_name || 'Phần thưởng', amount: r.reward_vnd, status: r.status, created_at: r.created_at })),
    ...withdrawals.map((w) => ({ id: `w-${w.id}`, title: w.method === 'momo' ? 'Rút về MoMo' : 'Rút về ngân hàng', amount: -w.amount_vnd, status: w.status, created_at: w.created_at })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <div className="page-stack"><section className="wallet-hero"><div><span>Số dư khả dụng</span><strong>{money.format(wallet?.balance_vnd ?? 0)}</strong><small>Tổng thu nhập: {money.format(wallet?.lifetime_earned_vnd ?? 0)}</small></div><button className="light-button" onClick={onWithdraw}><Landmark size={18} /> Rút tiền</button></section><section className="section-card"><div className="section-heading"><div><span className="eyebrow">Dòng tiền</span><h2>Lịch sử giao dịch</h2></div><span className="count-chip">{rows.length} giao dịch</span></div><div className="transaction-list">{rows.length === 0 && <div className="empty-state">Chưa có giao dịch.</div>}{rows.map((row) => <div className="transaction-row" key={row.id}><div className={`transaction-icon ${row.amount < 0 ? 'out' : ''}`}>{row.amount < 0 ? <Landmark size={19} /> : <CircleDollarSign size={19} />}</div><div className="transaction-copy"><strong>{row.title}</strong><span>{row.status}</span></div><div className="transaction-right"><strong className={row.amount < 0 ? 'negative' : 'positive'}>{row.amount > 0 ? '+' : '-'}{compactMoney(Math.abs(row.amount))}</strong><span>{formatDate(row.created_at)}</span></div></div>)}</div></section></div>
  )
}

function FeatureRow({ icon: Icon, title, description, value, onOpen }: { icon: LucideIcon; title: string; description: string; value: string; onOpen: () => void }) {
  return <div className="task-row"><div className="task-icon"><Icon size={22} /></div><div className="task-row-copy"><strong>{title}</strong><span>{description}</span></div><div className="task-row-reward"><strong>{value}</strong><span>thưởng</span></div><button className="round-arrow" onClick={onOpen}><ChevronRight size={18} /></button></div>
}

function StatCard({ icon: Icon, label, value, detail }: { icon: LucideIcon; label: string; value: string; detail: string }) {
  return <article className="stat-card"><div className="stat-icon"><Icon size={21} /></div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>
}

function AdminDashboard({ session }: { session: Session }) {
  const [view, setView] = useState<AdminView>('users')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [activities, setActivities] = useState<AdminActivity[]>([])
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([])
  const [referrals, setReferrals] = useState<AdminReferral[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    const [usersRes, activityRes, withdrawalRes, referralRes] = await Promise.all([
      supabase.rpc('adcash_admin_users'),
      supabase.rpc('adcash_admin_activity', { p_limit: 300 }),
      supabase.rpc('adcash_admin_withdrawals'),
      supabase.rpc('adcash_admin_referrals'),
    ])
    setUsers((usersRes.data as AdminUser[] | null) ?? [])
    setActivities((activityRes.data as AdminActivity[] | null) ?? [])
    setWithdrawals((withdrawalRes.data as AdminWithdrawal[] | null) ?? [])
    setReferrals((referralRes.data as AdminReferral[] | null) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(''), 2600)
    return () => window.clearTimeout(timer)
  }, [message])

  const setWithdrawal = async (id: number, status: 'paid' | 'rejected') => {
    const note = window.prompt(status === 'paid' ? 'Ghi chú thanh toán (có thể bỏ trống)' : 'Lý do từ chối (có thể bỏ trống)') ?? ''
    const { error } = await supabase.rpc('adcash_admin_set_withdrawal_status', { p_withdrawal_id: id, p_status: status, p_note: note })
    setMessage(error ? error.message : status === 'paid' ? 'Đã đánh dấu thanh toán' : 'Đã từ chối và hoàn tiền vào ví')
    await load()
  }

  const setReferral = async (id: number, status: 'approved' | 'rejected') => {
    const { error } = await supabase.rpc('adcash_admin_set_referral_status', { p_referral_id: id, p_status: status })
    setMessage(error ? error.message : status === 'approved' ? 'Đã duyệt và cộng thưởng người giới thiệu' : 'Đã từ chối lượt giới thiệu')
    await load()
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = `${window.location.pathname}?admin=1`
  }

  const pendingWithdrawals = withdrawals.filter((x) => x.status === 'pending')
  const pendingAmount = pendingWithdrawals.reduce((sum, row) => sum + Number(row.amount_vnd || 0), 0)
  const pendingReferrals = referrals.filter((x) => x.status === 'pending')

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar"><Brand /><div className="admin-badge"><ShieldCheck size={16} /> ADMIN</div><nav className="side-nav">{([
        ['users','Người dùng',Users],['activity','Hoạt động',Activity],['withdrawals','Rút tiền',Landmark],['referrals','Giới thiệu',Gift],
      ] as Array<[AdminView,string,LucideIcon]>).map(([id,label,Icon]) => <button key={id} className={`nav-button ${view === id ? 'active' : ''}`} onClick={() => setView(id)}><Icon size={19} /><span>{label}</span></button>)}</nav><button className="admin-logout" onClick={signOut}><LogOut size={17} /> Đăng xuất</button></aside>

      <main className="admin-main"><header className="admin-topbar"><div><span className="eyebrow">ADCASH CONTROL CENTER</span><h1>Bảng quản trị</h1><p>{session.user.email}</p></div><button className="secondary-button" onClick={() => void load()}><RefreshCw size={17} /> Làm mới</button></header>
        <section className="admin-metrics"><StatCard icon={Users} label="Người dùng" value={`${users.length}`} detail="Tổng tài khoản" /><StatCard icon={Landmark} label="Rút tiền chờ duyệt" value={`${pendingWithdrawals.length}`} detail={compactMoney(pendingAmount)} /><StatCard icon={Gift} label="Giới thiệu chờ duyệt" value={`${pendingReferrals.length}`} detail="Cần kiểm tra" /></section>

        {loading ? <div className="section-card empty-state">Đang tải dữ liệu Admin…</div> : (
          <section className="admin-panel">
            {view === 'users' && <AdminUsersTable users={users} />}
            {view === 'activity' && <AdminActivityTable rows={activities} />}
            {view === 'withdrawals' && <AdminWithdrawalsTable rows={withdrawals} onAction={setWithdrawal} />}
            {view === 'referrals' && <AdminReferralsTable rows={referrals} onAction={setReferral} />}
          </section>
        )}
      </main>
      {message && <div className="toast"><CheckCircle2 size={18} /> {message}</div>}
    </div>
  )
}

function AdminUsersTable({ users }: { users: AdminUser[] }) {
  return <><div className="admin-panel-head"><div><span className="eyebrow">Tài khoản</span><h2>Người dùng</h2></div><span className="count-chip">{users.length}</span></div><div className="table-wrap"><table className="admin-table"><thead><tr><th>Email</th><th>Số dư</th><th>Tổng kiếm</th><th>Mã mời</th><th>Lần cuối</th><th>Rút tiền</th></tr></thead><tbody>{users.map((u) => <tr key={u.user_id}><td><strong>{u.email || 'Không email'}</strong><small>{u.display_name || u.user_id.slice(0,8)}</small></td><td>{compactMoney(u.balance_vnd)}</td><td>{compactMoney(u.lifetime_earned_vnd)}</td><td>{u.referral_code || '—'}</td><td>{formatDate(u.last_seen_at || u.last_sign_in_at)}</td><td>{u.withdrawal_count}</td></tr>)}</tbody></table></div></>
}

function AdminActivityTable({ rows }: { rows: AdminActivity[] }) {
  return <><div className="admin-panel-head"><div><span className="eyebrow">Theo dõi</span><h2>Hoạt động người dùng</h2></div><span className="count-chip">{rows.length} gần nhất</span></div><div className="activity-feed">{rows.map((row) => <div className="activity-row" key={row.id}><div className="activity-icon"><Activity size={18} /></div><div><strong>{row.email || row.user_id.slice(0,8)}</strong><span>{activityLabel(row.activity_type)}</span><small>{Object.keys(row.details || {}).length ? JSON.stringify(row.details) : 'Không có chi tiết'}</small></div><time>{formatDate(row.created_at)}</time></div>)}</div></>
}

function AdminWithdrawalsTable({ rows, onAction }: { rows: AdminWithdrawal[]; onAction: (id: number, status: 'paid' | 'rejected') => void }) {
  return <><div className="admin-panel-head"><div><span className="eyebrow">Thanh toán</span><h2>Yêu cầu rút tiền</h2></div><span className="count-chip">{rows.filter((x) => x.status === 'pending').length} chờ duyệt</span></div><div className="table-wrap"><table className="admin-table"><thead><tr><th>Người dùng</th><th>Phương thức</th><th>Nhận tiền</th><th>Số tiền</th><th>Trạng thái</th><th>Thời gian</th><th>Xử lý</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{row.email || row.user_id.slice(0,8)}</td><td>{row.method.toUpperCase()}</td><td>{row.destination}</td><td><strong>{compactMoney(row.amount_vnd)}</strong></td><td><StatusChip status={row.status} /></td><td>{formatDate(row.created_at)}</td><td>{row.status === 'pending' ? <div className="admin-actions"><button className="approve-button" onClick={() => onAction(row.id,'paid')}>Đã trả</button><button className="reject-button" onClick={() => onAction(row.id,'rejected')}>Từ chối</button></div> : row.admin_note || '—'}</td></tr>)}</tbody></table></div></>
}

function AdminReferralsTable({ rows, onAction }: { rows: AdminReferral[]; onAction: (id: number, status: 'approved' | 'rejected') => void }) {
  return <><div className="admin-panel-head"><div><span className="eyebrow">Referral</span><h2>Giới thiệu bạn bè</h2></div><span className="count-chip">{rows.filter((x) => x.status === 'pending').length} chờ duyệt</span></div><div className="table-wrap"><table className="admin-table"><thead><tr><th>Người giới thiệu</th><th>Người được mời</th><th>Mã</th><th>Thưởng</th><th>Trạng thái</th><th>Thời gian</th><th>Xử lý</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{row.inviter_email || '—'}</td><td>{row.invitee_email || '—'}</td><td>{row.code_used}</td><td>{compactMoney(row.reward_vnd)}</td><td><StatusChip status={row.status} /></td><td>{formatDate(row.created_at)}</td><td>{row.status === 'pending' ? <div className="admin-actions"><button className="approve-button" onClick={() => onAction(row.id,'approved')}>Duyệt</button><button className="reject-button" onClick={() => onAction(row.id,'rejected')}>Từ chối</button></div> : '—'}</td></tr>)}</tbody></table></div></>
}

function StatusChip({ status }: { status: string }) {
  return <span className={`status-chip ${status}`}>{status === 'pending' ? 'Chờ duyệt' : status === 'paid' ? 'Đã trả' : status === 'approved' ? 'Đã duyệt' : status === 'rejected' ? 'Từ chối' : status}</span>
}

function activityLabel(type: string) {
  const labels: Record<string,string> = {
    account_created: 'Tạo tài khoản', login: 'Đăng nhập', checkin: 'Điểm danh', referral_code_applied: 'Nhập mã mời', referral_approved: 'Referral được duyệt', referral_rejected: 'Referral bị từ chối', withdrawal_requested: 'Gửi yêu cầu rút tiền', withdrawal_paid: 'Rút tiền đã thanh toán', withdrawal_rejected: 'Rút tiền bị từ chối', task_opened: 'Mở nhiệm vụ', referral_view: 'Xem trang giới thiệu', profile_view: 'Xem tài khoản',
  }
  return labels[type] || type
}

export default App

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Copy,
  Eye,
  Home,
  Info,
  Landmark,
  LockKeyhole,
  PlayCircle,
  RefreshCw,
  Server,
  ShieldCheck,
  Trophy,
  UserRound,
  WalletCards,
  Wifi,
  Zap,
} from 'lucide-react'
import { supabase } from './supabase'
import './monlix.css'

type View = 'home' | 'earn' | 'wallet' | 'withdraw' | 'profile'
type WithdrawalMethod = 'momo' | 'bank'

type Wallet = {
  balance_vnd: number
  lifetime_earned_vnd: number
}

type RewardEvent = {
  id: number
  transaction_id: string
  task_name: string | null
  reward_vnd: number
  payout_usd: number
  status: 'valid' | 'chargeback'
  created_at: string
  reversed_at: string | null
}

type Withdrawal = {
  id: number
  method: WithdrawalMethod
  destination: string
  amount_vnd: number
  status: 'pending' | 'paid' | 'rejected'
  created_at: string
}

type TimelineItem = {
  id: string
  title: string
  subtitle: string
  amount: number
  createdAt: string
  status: string
}

const MONLIX_APP_ID = (import.meta.env.VITE_MONLIX_APP_ID ?? '').trim()
const MONLIX_SUB_ID = 'adcash'
const MIN_WITHDRAWAL = 50_000

const money = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

const compactMoney = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`

const navItems: Array<{ id: View; label: string; icon: LucideIcon }> = [
  { id: 'home', label: 'Trang chủ', icon: Home },
  { id: 'earn', label: 'Xem quảng cáo', icon: PlayCircle },
  { id: 'wallet', label: 'Ví', icon: WalletCards },
  { id: 'withdraw', label: 'Rút tiền', icon: Landmark },
  { id: 'profile', label: 'Hồ sơ', icon: UserRound },
]

function formatTime(value: string) {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return value
  }
}

export default function App() {
  const [view, setView] = useState<View>('home')
  const [userId, setUserId] = useState('')
  const [authError, setAuthError] = useState('')
  const [wallet, setWallet] = useState<Wallet>({ balance_vnd: 0, lifetime_earned_vnd: 0 })
  const [rewards, setRewards] = useState<RewardEvent[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState('')
  const [withdrawMethod, setWithdrawMethod] = useState<WithdrawalMethod>('momo')
  const [withdrawAccount, setWithdrawAccount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('50000')
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false)

  const title = useMemo(() => navItems.find((item) => item.id === view)?.label ?? 'Adcash', [view])
  const userCode = userId ? `ADC-${userId.replaceAll('-', '').slice(0, 8).toUpperCase()}` : 'ADC-...'
  const watchedAds = rewards.filter((reward) => reward.status === 'valid').length

  const timeline = useMemo<TimelineItem[]>(() => {
    const rewardItems = rewards.map((reward) => ({
      id: `reward-${reward.id}`,
      title: reward.status === 'chargeback' ? 'Monlix hoàn tác phần thưởng' : (reward.task_name || 'Quảng cáo Monlix'),
      subtitle: reward.status === 'chargeback'
        ? `Transaction ${reward.transaction_id.slice(0, 10)}… • Chargeback`
        : `Monlix • Server đã xác nhận • $${Number(reward.payout_usd || 0).toFixed(4)}`,
      amount: reward.status === 'chargeback' ? -Number(reward.reward_vnd) : Number(reward.reward_vnd),
      createdAt: reward.reversed_at || reward.created_at,
      status: reward.status,
    }))

    const withdrawalItems = withdrawals.map((withdrawal) => ({
      id: `withdrawal-${withdrawal.id}`,
      title: withdrawal.method === 'momo' ? 'Rút tiền về MoMo' : 'Rút tiền về ngân hàng',
      subtitle: `${withdrawal.destination} • ${withdrawal.status === 'pending' ? 'Đang chờ duyệt' : withdrawal.status === 'paid' ? 'Đã thanh toán' : 'Bị từ chối'}`,
      amount: -Number(withdrawal.amount_vnd),
      createdAt: withdrawal.created_at,
      status: withdrawal.status,
    }))

    return [...rewardItems, ...withdrawalItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [rewards, withdrawals])

  const refreshData = useCallback(async (quiet = false) => {
    if (!userId) return
    if (!quiet) setRefreshing(true)

    const [walletResult, rewardResult, withdrawalResult] = await Promise.all([
      supabase
        .from('adcash_wallets')
        .select('balance_vnd,lifetime_earned_vnd')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('adcash_reward_events')
        .select('id,transaction_id,task_name,reward_vnd,payout_usd,status,created_at,reversed_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(60),
      supabase
        .from('adcash_withdrawals')
        .select('id,method,destination,amount_vnd,status,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(40),
    ])

    if (walletResult.error || rewardResult.error || withdrawalResult.error) {
      console.error(walletResult.error || rewardResult.error || withdrawalResult.error)
      if (!quiet) setToast('Không thể đồng bộ ví từ server')
    } else {
      const serverWallet = walletResult.data as Wallet | null
      setWallet(serverWallet ?? { balance_vnd: 0, lifetime_earned_vnd: 0 })
      setRewards((rewardResult.data ?? []) as RewardEvent[])
      setWithdrawals((withdrawalResult.data ?? []) as Withdrawal[])
    }

    if (!quiet) setRefreshing(false)
  }, [userId])

  const ensureSession = useCallback(async () => {
    setLoading(true)
    setAuthError('')

    const { data: current, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      setAuthError(sessionError.message)
      setLoading(false)
      return
    }

    if (current.session?.user?.id) {
      setUserId(current.session.user.id)
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signInAnonymously()
    if (error || !data.user?.id) {
      setAuthError(error?.message || 'Không tạo được tài khoản người dùng')
      setLoading(false)
      return
    }

    setUserId(data.user.id)
    setLoading(false)
  }, [])

  useEffect(() => {
    void ensureSession()
  }, [ensureSession])

  useEffect(() => {
    if (!userId) return
    void refreshData()

    const interval = window.setInterval(() => void refreshData(true), 8000)
    const onFocus = () => void refreshData(true)
    window.addEventListener('focus', onFocus)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [refreshData, userId])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const submitWithdrawal = async () => {
    const amount = Number(withdrawAmount.replace(/\D/g, ''))
    if (!withdrawAccount.trim()) {
      setToast('Nhập tài khoản nhận tiền')
      return
    }
    if (!Number.isFinite(amount) || amount < MIN_WITHDRAWAL) {
      setToast('Mức rút tối thiểu là 50.000đ')
      return
    }
    if (amount > wallet.balance_vnd) {
      setToast('Số dư server hiện tại không đủ')
      return
    }

    setSubmittingWithdrawal(true)
    const { error } = await supabase.rpc('adcash_request_withdrawal', {
      p_method: withdrawMethod,
      p_destination: withdrawAccount.trim(),
      p_amount_vnd: amount,
    })
    setSubmittingWithdrawal(false)

    if (error) {
      console.error(error)
      setToast(error.message.includes('insufficient') ? 'Số dư không đủ' : 'Không tạo được yêu cầu rút tiền')
      return
    }

    setWithdrawAccount('')
    setToast('Đã gửi yêu cầu rút tiền lên server')
    await refreshData(true)
    setView('wallet')
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(userCode)
      setToast('Đã sao chép mã người dùng')
    } catch {
      setToast(userCode)
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="demo-pill live-pill"><span /> Server reward</div>
        <nav className="side-nav" aria-label="Điều hướng chính">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                className={`nav-button ${view === item.id ? 'active' : ''}`}
                onClick={() => setView(item.id)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
        <div className="sidebar-security">
          <ShieldCheck size={22} />
          <div>
            <strong>Server mới được cộng tiền</strong>
            <span>Client không còn nút nhận thưởng hay timer quảng cáo giả.</span>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="eyebrow">Adcash</span>
            <h1>{title}</h1>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Làm mới" onClick={() => void refreshData()} disabled={refreshing || !userId}>
              <RefreshCw size={19} className={refreshing ? 'spin' : ''} />
            </button>
            <button className="icon-button" aria-label="Thông báo"><Bell size={20} /></button>
            <button className="avatar-button" onClick={() => setView('profile')}>A</button>
          </div>
        </header>

        <div className="content-wrap">
          {loading ? (
            <LoadingState />
          ) : authError ? (
            <AuthErrorState error={authError} onRetry={() => void ensureSession()} />
          ) : (
            <>
              {view === 'home' && (
                <HomeView wallet={wallet} watchedAds={watchedAds} onViewChange={setView} />
              )}
              {view === 'earn' && (
                <AdsView userId={userId} onRefresh={() => void refreshData()} />
              )}
              {view === 'wallet' && (
                <WalletView wallet={wallet} timeline={timeline} onWithdraw={() => setView('withdraw')} />
              )}
              {view === 'withdraw' && (
                <WithdrawView
                  wallet={wallet}
                  method={withdrawMethod}
                  setMethod={setWithdrawMethod}
                  account={withdrawAccount}
                  setAccount={setWithdrawAccount}
                  amount={withdrawAmount}
                  setAmount={setWithdrawAmount}
                  submitting={submittingWithdrawal}
                  onSubmit={() => void submitWithdrawal()}
                />
              )}
              {view === 'profile' && (
                <ProfileView
                  wallet={wallet}
                  watchedAds={watchedAds}
                  userCode={userCode}
                  userId={userId}
                  onCopy={copyCode}
                />
              )}
            </>
          )}
        </div>
      </main>

      <nav className="mobile-nav" aria-label="Điều hướng di động">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}>
              <Icon size={21} />
              <span>{item.id === 'earn' ? 'Quảng cáo' : item.label}</span>
            </button>
          )
        })}
      </nav>

      {toast && <div className="toast"><CheckCircle2 size={18} /> {toast}</div>}
    </div>
  )
}

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark"><CircleDollarSign size={28} /></div>
      <div>
        <strong>Adcash</strong>
        <span>Xem & Kiếm Thưởng</span>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <section className="section-card integration-state">
      <RefreshCw size={28} className="spin" />
      <div><h2>Đang kết nối server</h2><p>Đang tạo phiên người dùng và tải ví Adcash.</p></div>
    </section>
  )
}

function AuthErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <section className="section-card integration-state error-state">
      <AlertTriangle size={30} />
      <div>
        <h2>Supabase Auth chưa sẵn sàng</h2>
        <p>{error}</p>
        <p className="muted-line">Adcash dùng anonymous Auth để mỗi thiết bị có UUID riêng cho Monlix postback. Anonymous Sign-Ins phải được bật trong Supabase Auth.</p>
        <button className="primary-button small" onClick={onRetry}>Thử lại</button>
      </div>
    </section>
  )
}

function HomeView({
  wallet,
  watchedAds,
  onViewChange,
}: {
  wallet: Wallet
  watchedAds: number
  onViewChange: (view: View) => void
}) {
  return (
    <div className="page-stack">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="hero-label"><PlayCircle size={15} /> Monlix Rewarded Ads</span>
          <div className="balance">{money.format(wallet.balance_vnd)}</div>
          <p>Tiền chỉ xuất hiện trong ví sau khi Monlix gửi postback hợp lệ về server Adcash. App không thể tự cộng tiền.</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => onViewChange('earn')}>
              Xem quảng cáo Monlix <ChevronRight size={18} />
            </button>
            <button className="secondary-button" onClick={() => onViewChange('withdraw')}>Rút tiền</button>
          </div>
        </div>
        <div className="hero-orb" aria-hidden="true">
          <div className="coin coin-one">▶</div>
          <div className="coin coin-two">₫</div>
          <div className="hero-center"><Banknote size={56} /></div>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard icon={Trophy} label="Tổng đã kiếm" value={compactMoney(wallet.lifetime_earned_vnd)} detail="Server verified" />
        <StatCard icon={Eye} label="Reward hợp lệ" value={`${watchedAds}`} detail="Monlix postback" />
        <StatCard icon={BarChart3} label="Mức rút tối thiểu" value="50.000đ" detail="MoMo / Ngân hàng" />
      </section>

      <section className="section-card server-flow-card">
        <div className="section-heading">
          <div><span className="eyebrow">Luồng phần thưởng</span><h2>Không còn quảng cáo giả</h2></div>
          <span className="verified-chip"><BadgeCheck size={16} /> S2S</span>
        </div>
        <div className="server-flow">
          <FlowStep icon={PlayCircle} title="1. Người dùng xem" text="Monlix hiển thị nội dung thật." />
          <FlowStep icon={Wifi} title="2. Monlix xác nhận" text="Monlix gửi transactionId về Edge Function." />
          <FlowStep icon={Server} title="3. Server cộng ví" text="Supabase chống trùng rồi mới ghi số dư." />
        </div>
      </section>

      <section className="safe-note">
        <LockKeyhole size={22} />
        <div>
          <strong>Chỉ reward từ Monlix mới được tính</strong>
          <p>Không có điểm danh, khảo sát nội bộ, tải app giả, nút nhận thưởng hay localStorage để tự sửa số dư.</p>
        </div>
      </section>
    </div>
  )
}

function AdsView({ userId, onRefresh }: { userId: string; onRefresh: () => void }) {
  const monlixUrl = MONLIX_APP_ID
    ? `https://offers.monlix.com/?appid=${encodeURIComponent(MONLIX_APP_ID)}&userid=${encodeURIComponent(userId)}&subid=${MONLIX_SUB_ID}`
    : ''

  return (
    <div className="page-stack">
      <section className="earn-banner">
        <div>
          <span className="eyebrow">Monlix production</span>
          <h2>Xem quảng cáo thật</h2>
          <p>Không có đếm ngược giả. Khi Monlix ghi nhận conversion, postback server mới làm số dư thay đổi.</p>
        </div>
        <div className="earn-badge"><ShieldCheck size={25} /> Server verified</div>
      </section>

      {!MONLIX_APP_ID ? (
        <section className="section-card integration-state warning-state">
          <Info size={30} />
          <div>
            <h2>Thiếu Monlix App ID</h2>
            <p>Code live đã nối sẵn nhưng repo chưa có App ID của site/app Monlix đã được duyệt. Vì vậy tao không nhét ID giả vào app.</p>
            <p className="muted-line">Sau khi có App ID, đặt GitHub repository variable <strong>MONLIX_APP_ID</strong>. Workflow sẽ đưa nó vào cả web, APK và AAB.</p>
          </div>
        </section>
      ) : (
        <section className="section-card monlix-card">
          <div className="section-heading monlix-heading">
            <div>
              <span className="eyebrow">Live inventory</span>
              <h2>Monlix</h2>
            </div>
            <button className="secondary-button" onClick={onRefresh}><RefreshCw size={16} /> Cập nhật ví</button>
          </div>
          <div className="policy-banner live-policy">
            <Info size={20} />
            <div>
              <strong>Placement Monlix phải cấu hình Rewarded Video</strong>
              <span>Monlix HTML5 dùng App ID + User ID. Nếu tài khoản Monlix bật thêm loại offer khác thì chính Monlix có thể hiển thị chúng; để Adcash chỉ có video, site/placement phía Monlix phải để Rewarded Video only.</span>
            </div>
          </div>
          <div className="monlix-frame-shell">
            <iframe
              className="monlix-frame"
              title="Monlix Rewarded Ads"
              src={monlixUrl}
              allow="autoplay; clipboard-write"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          <div className="monlix-footnote">
            <Server size={18} />
            <span>Đóng quảng cáo xong không tự cộng tiền. Ví tự đồng bộ từ Supabase mỗi vài giây sau khi postback hợp lệ đến.</span>
          </div>
        </section>
      )}
    </div>
  )
}

function WalletView({ wallet, timeline, onWithdraw }: { wallet: Wallet; timeline: TimelineItem[]; onWithdraw: () => void }) {
  return (
    <div className="page-stack">
      <section className="wallet-hero">
        <div>
          <span>Số dư server</span>
          <strong>{money.format(wallet.balance_vnd)}</strong>
          <small>Tổng reward đã xác nhận: {money.format(wallet.lifetime_earned_vnd)}</small>
        </div>
        <button className="light-button" onClick={onWithdraw}><Landmark size={18} /> Rút tiền</button>
      </section>

      <section className="section-card">
        <div className="section-heading">
          <div><span className="eyebrow">Server ledger</span><h2>Lịch sử giao dịch</h2></div>
          <span className="count-chip">{timeline.length} giao dịch</span>
        </div>
        <div className="transaction-list">
          {timeline.length === 0 ? (
            <div className="empty-ledger">Chưa có reward Monlix hoặc yêu cầu rút tiền nào.</div>
          ) : timeline.map((transaction) => (
            <div className="transaction-row" key={transaction.id}>
              <div className={`transaction-icon ${transaction.amount < 0 ? 'out' : ''}`}>
                {transaction.amount < 0 ? <Landmark size={19} /> : <PlayCircle size={19} />}
              </div>
              <div className="transaction-copy">
                <strong>{transaction.title}</strong>
                <span>{transaction.subtitle}</span>
              </div>
              <div className="transaction-right">
                <strong className={transaction.amount < 0 ? 'negative' : 'positive'}>
                  {transaction.amount > 0 ? '+' : '-'}{compactMoney(Math.abs(transaction.amount))}
                </strong>
                <span>{formatTime(transaction.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function WithdrawView({
  wallet,
  method,
  setMethod,
  account,
  setAccount,
  amount,
  setAmount,
  submitting,
  onSubmit,
}: {
  wallet: Wallet
  method: WithdrawalMethod
  setMethod: (value: WithdrawalMethod) => void
  account: string
  setAccount: (value: string) => void
  amount: string
  setAmount: (value: string) => void
  submitting: boolean
  onSubmit: () => void
}) {
  return (
    <div className="withdraw-layout">
      <section className="section-card withdraw-form-card">
        <div className="section-heading"><div><span className="eyebrow">Server request</span><h2>Rút tiền</h2></div></div>

        <label className="field-label">Phương thức nhận tiền</label>
        <div className="method-grid">
          <button className={method === 'momo' ? 'selected' : ''} onClick={() => setMethod('momo')}>
            <span className="method-logo momo">M</span>
            <span><strong>MoMo</strong><small>Ví điện tử</small></span>
            {method === 'momo' && <CheckCircle2 size={19} />}
          </button>
          <button className={method === 'bank' ? 'selected' : ''} onClick={() => setMethod('bank')}>
            <span className="method-logo bank"><Building2 size={20} /></span>
            <span><strong>Ngân hàng</strong><small>Chuyển khoản</small></span>
            {method === 'bank' && <CheckCircle2 size={19} />}
          </button>
        </div>

        <label className="field-label" htmlFor="withdraw-account">
          {method === 'momo' ? 'Số điện thoại MoMo' : 'Số tài khoản / Ngân hàng'}
        </label>
        <input
          id="withdraw-account"
          className="input"
          value={account}
          onChange={(event) => setAccount(event.target.value)}
          placeholder={method === 'momo' ? 'Ví dụ: 09xxxxxxxx' : 'Ví dụ: 0123456789 - MB Bank'}
        />

        <div className="field-row">
          <label className="field-label" htmlFor="withdraw-amount">Số tiền muốn rút</label>
          <button className="text-button" onClick={() => setAmount(String(Math.max(0, wallet.balance_vnd)))}>Rút tối đa</button>
        </div>
        <div className="money-input-wrap">
          <input
            id="withdraw-amount"
            className="input money-input"
            inputMode="numeric"
            value={withdrawAmountDisplay(amount)}
            onChange={(event) => setAmount(event.target.value.replace(/\D/g, ''))}
          />
          <span>VND</span>
        </div>
        <div className="preset-row">
          {[50_000, 100_000, 200_000].map((value) => (
            <button key={value} onClick={() => setAmount(String(value))}>{compactMoney(value)}</button>
          ))}
        </div>

        <button className="primary-button wide" disabled={submitting} onClick={onSubmit}>
          {submitting ? 'Đang gửi lên server…' : 'Gửi yêu cầu rút tiền'} <ChevronRight size={18} />
        </button>
        <p className="form-footnote">Yêu cầu được ghi vào Supabase và số tiền bị giữ/trừ khỏi ví ngay trên server để tránh chi tiêu hai lần.</p>
      </section>

      <aside className="withdraw-summary">
        <div className="summary-balance"><span>Số dư hiện tại</span><strong>{money.format(wallet.balance_vnd)}</strong></div>
        <div className="summary-line"><span>Mức rút tối thiểu</span><strong>50.000đ</strong></div>
        <div className="summary-line"><span>Phí rút tiền</span><strong>0đ</strong></div>
        <div className="summary-line"><span>Nguồn thu nhập</span><strong className="positive">Monlix</strong></div>
        <div className="summary-note"><ShieldCheck size={20} /><span>Admin vẫn phải duyệt/chuyển tiền thật cho các yêu cầu pending.</span></div>
      </aside>
    </div>
  )
}

function ProfileView({
  wallet,
  watchedAds,
  userCode,
  userId,
  onCopy,
}: {
  wallet: Wallet
  watchedAds: number
  userCode: string
  userId: string
  onCopy: () => void
}) {
  return (
    <div className="profile-layout">
      <section className="section-card profile-card">
        <div className="profile-avatar">A</div>
        <div className="profile-copy">
          <span className="eyebrow">Supabase anonymous user</span>
          <h2>Người dùng Adcash</h2>
          <button className="code-button" onClick={onCopy}>{userCode} <Copy size={14} /></button>
        </div>
        <span className="verified-chip"><BadgeCheck size={16} /> Server ID</span>
      </section>

      <section className="profile-stats">
        <StatCard icon={WalletCards} label="Số dư" value={compactMoney(wallet.balance_vnd)} detail="Server" />
        <StatCard icon={Trophy} label="Tổng thu nhập" value={compactMoney(wallet.lifetime_earned_vnd)} detail="Monlix" />
        <StatCard icon={Eye} label="Reward hợp lệ" value={`${watchedAds}`} detail="Postback" />
      </section>

      <section className="section-card settings-card">
        <div className="setting-row"><div className="setting-icon"><ShieldCheck size={20} /></div><div><strong>RLS đang bật</strong><span>Người dùng chỉ đọc được ví và giao dịch của chính UUID này.</span></div><ChevronRight size={18} /></div>
        <div className="setting-row"><div className="setting-icon"><Server size={20} /></div><div><strong>Monlix S2S</strong><span>Transaction ID được khóa UNIQUE để chống cộng tiền hai lần.</span></div><ChevronRight size={18} /></div>
        <div className="setting-row"><div className="setting-icon"><Zap size={20} /></div><div><strong>User UUID</strong><span className="uuid-text">{userId}</span></div><ChevronRight size={18} /></div>
      </section>
    </div>
  )
}

function FlowStep({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flow-step">
      <div className="setting-icon"><Icon size={20} /></div>
      <div><strong>{title}</strong><span>{text}</span></div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, detail }: { icon: LucideIcon; label: string; value: string; detail: string }) {
  return (
    <article className="stat-card">
      <div className="stat-icon"><Icon size={21} /></div>
      <div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
    </article>
  )
}

function withdrawAmountDisplay(value: string) {
  const numeric = Number(value.replace(/\D/g, ''))
  if (!numeric) return ''
  return new Intl.NumberFormat('vi-VN').format(numeric)
}

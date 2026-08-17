import { useEffect, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  BadgeCheck,
  Banknote,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Copy,
  Eye,
  Home,
  Info,
  Landmark,
  LockKeyhole,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  Video,
  WalletCards,
  X,
  Zap,
} from 'lucide-react'

type View = 'home' | 'earn' | 'wallet' | 'withdraw' | 'profile'
type TransactionStatus = 'done' | 'pending'

type Transaction = {
  id: string
  title: string
  subtitle: string
  amount: number
  createdAt: string
  status: TransactionStatus
}

type AdItem = {
  id: string
  title: string
  description: string
  reward: number
  duration: string
  sponsor: string
  icon: LucideIcon
  featured?: boolean
}

type AppState = {
  balance: number
  totalEarned: number
  watchedAds: number
  transactions: Transaction[]
  userCode: string
}

const money = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

const compactMoney = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`

const initialTransactions: Transaction[] = [
  {
    id: 'ad-demo-3',
    title: 'Xem quảng cáo tài trợ',
    subtitle: 'Sponsor C • Đã xem hoàn tất • Demo',
    amount: 500,
    createdAt: 'Hôm nay, 09:15',
    status: 'done',
  },
  {
    id: 'ad-demo-2',
    title: 'Xem quảng cáo video',
    subtitle: 'Sponsor B • Đã xem hoàn tất • Demo',
    amount: 350,
    createdAt: 'Hôm qua, 21:42',
    status: 'done',
  },
  {
    id: 'ad-demo-1',
    title: 'Xem quảng cáo ngắn',
    subtitle: 'Sponsor A • Đã xem hoàn tất • Demo',
    amount: 250,
    createdAt: 'Hôm qua, 20:08',
    status: 'done',
  },
]

const defaultState: AppState = {
  balance: 1_100,
  totalEarned: 1_100,
  watchedAds: 3,
  transactions: initialTransactions,
  userCode: `ADC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
}

const ads: AdItem[] = [
  {
    id: 'short-ad',
    title: 'Xem quảng cáo ngắn',
    description: 'Xem hết quảng cáo ngắn để hệ thống ghi nhận lượt xem hợp lệ.',
    reward: 250,
    duration: '15–30 giây',
    sponsor: 'Sponsor A',
    icon: PlayCircle,
  },
  {
    id: 'video-ad',
    title: 'Xem quảng cáo video',
    description: 'Xem trọn video quảng cáo từ đối tác và nhận thưởng sau khi được xác nhận.',
    reward: 350,
    duration: '30–45 giây',
    sponsor: 'Sponsor B',
    icon: Video,
    featured: true,
  },
  {
    id: 'premium-ad',
    title: 'Xem quảng cáo tài trợ',
    description: 'Quảng cáo tài trợ có mức thưởng cao hơn khi hoàn thành toàn bộ thời lượng.',
    reward: 500,
    duration: '45–60 giây',
    sponsor: 'Sponsor C',
    icon: Eye,
  },
]

const navItems: Array<{ id: View; label: string; icon: LucideIcon }> = [
  { id: 'home', label: 'Trang chủ', icon: Home },
  { id: 'earn', label: 'Xem quảng cáo', icon: PlayCircle },
  { id: 'wallet', label: 'Ví', icon: WalletCards },
  { id: 'withdraw', label: 'Rút tiền', icon: Landmark },
  { id: 'profile', label: 'Hồ sơ', icon: UserRound },
]

function loadState(): AppState {
  try {
    const saved = localStorage.getItem('adcash-ads-only-state-v2')
    if (saved) return JSON.parse(saved) as AppState
  } catch {
    // Ignore corrupted local demo state.
  }
  return defaultState
}

export default function App() {
  const [view, setView] = useState<View>('home')
  const [state, setState] = useState<AppState>(loadState)
  const [activeAd, setActiveAd] = useState<AdItem | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [toast, setToast] = useState('')
  const [withdrawMethod, setWithdrawMethod] = useState<'momo' | 'bank'>('momo')
  const [withdrawAccount, setWithdrawAccount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('50000')

  useEffect(() => {
    localStorage.setItem('adcash-ads-only-state-v2', JSON.stringify(state))
  }, [state])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!activeAd || seconds <= 0) return
    const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [activeAd, seconds])

  const dailyGoal = 10
  const progress = Math.min(100, Math.round((state.watchedAds / dailyGoal) * 100))

  const title = useMemo(() => {
    return navItems.find((item) => item.id === view)?.label ?? 'Adcash'
  }, [view])

  const startAd = (ad: AdItem) => {
    setActiveAd(ad)
    setSeconds(6)
  }

  const claimAd = () => {
    if (!activeAd || seconds > 0) return
    const ad = activeAd
    const transaction: Transaction = {
      id: `${ad.id}-${Date.now()}`,
      title: ad.title,
      subtitle: `${ad.sponsor} • Đã xem hoàn tất • Demo`,
      amount: ad.reward,
      createdAt: 'Vừa xong',
      status: 'done',
    }

    setState((current) => ({
      ...current,
      balance: current.balance + ad.reward,
      totalEarned: current.totalEarned + ad.reward,
      watchedAds: current.watchedAds + 1,
      transactions: [transaction, ...current.transactions],
    }))
    setActiveAd(null)
    setToast(`Đã cộng ${compactMoney(ad.reward)} từ lượt xem quảng cáo demo`)
  }

  const submitWithdrawal = () => {
    const amount = Number(withdrawAmount.replace(/\D/g, ''))
    if (!withdrawAccount.trim()) {
      setToast('Nhập số MoMo hoặc thông tin tài khoản nhận tiền')
      return
    }
    if (!Number.isFinite(amount) || amount < 50_000) {
      setToast('Mức rút tối thiểu là 50.000đ')
      return
    }
    if (amount > state.balance) {
      setToast('Số dư hiện tại không đủ')
      return
    }

    const transaction: Transaction = {
      id: `withdraw-${Date.now()}`,
      title: withdrawMethod === 'momo' ? 'Yêu cầu rút về MoMo' : 'Yêu cầu rút về ngân hàng',
      subtitle: `${withdrawAccount.trim()} • Chờ duyệt demo`,
      amount: -amount,
      createdAt: 'Vừa xong',
      status: 'pending',
    }

    setState((current) => ({
      ...current,
      balance: current.balance - amount,
      transactions: [transaction, ...current.transactions],
    }))
    setWithdrawAccount('')
    setToast('Đã tạo yêu cầu rút tiền demo')
    setView('wallet')
  }

  const resetDemo = () => {
    localStorage.removeItem('adcash-ads-only-state-v2')
    setState({
      ...defaultState,
      userCode: `ADC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      transactions: [...initialTransactions],
    })
    setToast('Đã đặt lại dữ liệu xem quảng cáo demo')
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(state.userCode)
      setToast('Đã sao chép mã người dùng')
    } catch {
      setToast(state.userCode)
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="demo-pill"><span /> Chế độ demo</div>
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
            <strong>Chỉ thưởng khi xem quảng cáo</strong>
            <span>Không có điểm danh, khảo sát, cài app hay nguồn thưởng khác.</span>
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
            <button className="icon-button" aria-label="Thông báo"><Bell size={20} /></button>
            <button className="avatar-button" onClick={() => setView('profile')}>A</button>
          </div>
        </header>

        <div className="content-wrap">
          {view === 'home' && (
            <HomeView
              state={state}
              dailyGoal={dailyGoal}
              progress={progress}
              onViewChange={setView}
              onStartAd={startAd}
            />
          )}

          {view === 'earn' && (
            <AdsView onStartAd={startAd} />
          )}

          {view === 'wallet' && (
            <WalletView state={state} onWithdraw={() => setView('withdraw')} />
          )}

          {view === 'withdraw' && (
            <WithdrawView
              state={state}
              method={withdrawMethod}
              setMethod={setWithdrawMethod}
              account={withdrawAccount}
              setAccount={setWithdrawAccount}
              amount={withdrawAmount}
              setAmount={setWithdrawAmount}
              onSubmit={submitWithdrawal}
            />
          )}

          {view === 'profile' && (
            <ProfileView state={state} onCopy={copyCode} onReset={resetDemo} />
          )}
        </div>
      </main>

      <nav className="mobile-nav" aria-label="Điều hướng di động">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              className={view === item.id ? 'active' : ''}
              onClick={() => setView(item.id)}
            >
              <Icon size={21} />
              <span>{item.id === 'earn' ? 'Quảng cáo' : item.label}</span>
            </button>
          )
        })}
      </nav>

      {activeAd && (
        <AdModal
          ad={activeAd}
          seconds={seconds}
          onClose={() => setActiveAd(null)}
          onClaim={claimAd}
        />
      )}

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

function HomeView({
  state,
  dailyGoal,
  progress,
  onViewChange,
  onStartAd,
}: {
  state: AppState
  dailyGoal: number
  progress: number
  onViewChange: (view: View) => void
  onStartAd: (ad: AdItem) => void
}) {
  return (
    <div className="page-stack">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="hero-label"><PlayCircle size={15} /> Xem quảng cáo & nhận thưởng</span>
          <div className="balance">{money.format(state.balance)}</div>
          <p>Nguồn thu nhập duy nhất trong Adcash là xem quảng cáo. Xem hết quảng cáo hợp lệ để nhận tiền thưởng.</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => onViewChange('earn')}>
              Xem quảng cáo ngay <ChevronRight size={18} />
            </button>
            <button className="secondary-button" onClick={() => onViewChange('withdraw')}>
              Rút tiền
            </button>
          </div>
        </div>
        <div className="hero-orb" aria-hidden="true">
          <div className="coin coin-one">▶</div>
          <div className="coin coin-two">₫</div>
          <div className="hero-center"><Banknote size={56} /></div>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard icon={Trophy} label="Tổng đã kiếm" value={compactMoney(state.totalEarned)} detail="100% từ quảng cáo" />
        <StatCard icon={Eye} label="Quảng cáo đã xem" value={`${state.watchedAds}`} detail="Lượt xem demo" />
        <StatCard icon={BarChart3} label="Mức rút tối thiểu" value="50.000đ" detail="MoMo / Ngân hàng" />
      </section>

      <section className="section-card daily-card">
        <div className="section-heading compact-heading">
          <div>
            <span className="eyebrow">Mục tiêu xem quảng cáo</span>
            <h2>{dailyGoal} quảng cáo</h2>
          </div>
          <span className="progress-value">{progress}%</span>
        </div>
        <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
        <div className="daily-footer">
          <span>{state.watchedAds} lượt đã xem</span>
          <span>{Math.max(0, dailyGoal - state.watchedAds)} lượt để đạt mục tiêu</span>
        </div>
      </section>

      <section className="section-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Quảng cáo đang có</span>
            <h2>Xem để kiếm tiền</h2>
          </div>
          <button className="text-button" onClick={() => onViewChange('earn')}>Xem tất cả <ChevronRight size={16} /></button>
        </div>
        <div className="task-list">
          {ads.map((ad) => (
            <AdRow key={ad.id} ad={ad} onStart={() => onStartAd(ad)} />
          ))}
        </div>
      </section>

      <section className="safe-note">
        <LockKeyhole size={22} />
        <div>
          <strong>Không có cách kiếm tiền nào khác</strong>
          <p>Không thưởng điểm danh, khảo sát, giới thiệu bạn bè, tải ứng dụng hay thao tác khác. Chỉ lượt xem quảng cáo được xác nhận mới tạo thu nhập.</p>
        </div>
      </section>
    </div>
  )
}

function AdsView({ onStartAd }: { onStartAd: (ad: AdItem) => void }) {
  return (
    <div className="page-stack">
      <section className="earn-banner">
        <div>
          <span className="eyebrow">Kiếm tiền bằng quảng cáo</span>
          <h2>Chọn quảng cáo để xem</h2>
          <p>Xem trọn quảng cáo. Khi hệ thống xác nhận lượt xem hợp lệ, phần thưởng mới được cộng vào số dư.</p>
        </div>
        <div className="earn-badge"><PlayCircle size={26} /> Chỉ quảng cáo</div>
      </section>

      <section className="policy-banner">
        <Info size={20} />
        <div>
          <strong>Đang ở chế độ demo</strong>
          <span>Thời gian xem đang được rút ngắn để kiểm thử. Bản production phải nhận xác nhận hợp lệ từ mạng quảng cáo/server trước khi cộng tiền.</span>
        </div>
      </section>

      <div className="task-grid">
        {ads.map((ad) => {
          const Icon = ad.icon
          return (
            <article key={ad.id} className={`task-card ${ad.featured ? 'featured' : ''}`}>
              <div className="task-card-top">
                <div className="task-icon"><Icon size={24} /></div>
                <span className="category-chip">Quảng cáo</span>
              </div>
              <h3>{ad.title}</h3>
              <p>{ad.description}</p>
              <div className="task-meta"><Clock3 size={15} /> {ad.duration} • {ad.sponsor}</div>
              <div className="task-reward-row">
                <div>
                  <span>Tiền nhận được</span>
                  <strong>+{compactMoney(ad.reward)}</strong>
                </div>
                <button className="primary-button small" onClick={() => onStartAd(ad)}>
                  Xem ngay <PlayCircle size={16} />
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function WalletView({ state, onWithdraw }: { state: AppState; onWithdraw: () => void }) {
  return (
    <div className="page-stack">
      <section className="wallet-hero">
        <div>
          <span>Số dư khả dụng</span>
          <strong>{money.format(state.balance)}</strong>
          <small>Tổng thu nhập từ quảng cáo demo: {money.format(state.totalEarned)}</small>
        </div>
        <button className="light-button" onClick={onWithdraw}><Landmark size={18} /> Rút tiền</button>
      </section>

      <section className="section-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Dòng tiền</span>
            <h2>Lịch sử giao dịch</h2>
          </div>
          <span className="count-chip">{state.transactions.length} giao dịch</span>
        </div>
        <div className="transaction-list">
          {state.transactions.map((transaction) => (
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
                <span>{transaction.status === 'pending' ? 'Đang xử lý' : transaction.createdAt}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function WithdrawView({
  state,
  method,
  setMethod,
  account,
  setAccount,
  amount,
  setAmount,
  onSubmit,
}: {
  state: AppState
  method: 'momo' | 'bank'
  setMethod: (value: 'momo' | 'bank') => void
  account: string
  setAccount: (value: string) => void
  amount: string
  setAmount: (value: string) => void
  onSubmit: () => void
}) {
  return (
    <div className="withdraw-layout">
      <section className="section-card withdraw-form-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Yêu cầu thanh toán</span>
            <h2>Rút tiền</h2>
          </div>
        </div>

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
          <button className="text-button" onClick={() => setAmount(String(state.balance))}>Rút tối đa</button>
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

        <button className="primary-button wide" onClick={onSubmit}>
          Gửi yêu cầu rút tiền <ChevronRight size={18} />
        </button>
        <p className="form-footnote">Bản demo chỉ mô phỏng yêu cầu rút, không thực hiện chuyển tiền thật.</p>
      </section>

      <aside className="withdraw-summary">
        <div className="summary-balance">
          <span>Số dư hiện tại</span>
          <strong>{money.format(state.balance)}</strong>
        </div>
        <div className="summary-line"><span>Mức rút tối thiểu</span><strong>50.000đ</strong></div>
        <div className="summary-line"><span>Phí rút tiền</span><strong>0đ</strong></div>
        <div className="summary-line"><span>Nguồn thu nhập</span><strong className="positive">Quảng cáo</strong></div>
        <div className="summary-note"><ShieldCheck size={20} /><span>Production cần backend xác minh lượt xem và duyệt thanh toán.</span></div>
      </aside>
    </div>
  )
}

function ProfileView({ state, onCopy, onReset }: { state: AppState; onCopy: () => void; onReset: () => void }) {
  return (
    <div className="profile-layout">
      <section className="section-card profile-card">
        <div className="profile-avatar">A</div>
        <div className="profile-copy">
          <span className="eyebrow">Tài khoản demo</span>
          <h2>Người dùng Adcash</h2>
          <button className="code-button" onClick={onCopy}>{state.userCode} <Copy size={14} /></button>
        </div>
        <span className="verified-chip"><BadgeCheck size={16} /> Đang hoạt động</span>
      </section>

      <section className="profile-stats">
        <StatCard icon={WalletCards} label="Số dư" value={compactMoney(state.balance)} detail="Khả dụng" />
        <StatCard icon={Trophy} label="Tổng thu nhập" value={compactMoney(state.totalEarned)} detail="Từ quảng cáo" />
        <StatCard icon={Eye} label="Đã xem" value={`${state.watchedAds}`} detail="Quảng cáo" />
      </section>

      <section className="section-card settings-card">
        <div className="setting-row"><div className="setting-icon"><ShieldCheck size={20} /></div><div><strong>Bảo mật tài khoản</strong><span>Auth + RLS sẽ được bật khi nối backend production.</span></div><ChevronRight size={18} /></div>
        <div className="setting-row"><div className="setting-icon"><Landmark size={20} /></div><div><strong>Phương thức thanh toán</strong><span>MoMo và tài khoản ngân hàng.</span></div><ChevronRight size={18} /></div>
        <div className="setting-row"><div className="setting-icon"><Zap size={20} /></div><div><strong>Cách kiếm tiền</strong><span>Chỉ xem quảng cáo hợp lệ để nhận thưởng.</span></div><ChevronRight size={18} /></div>
      </section>

      <section className="section-card developer-card">
        <div>
          <span className="eyebrow">Dành cho phát triển</span>
          <h3>Đặt lại dữ liệu kiểm thử</h3>
          <p>Xóa dữ liệu xem quảng cáo và giao dịch trong localStorage rồi tạo lại dữ liệu demo mặc định.</p>
        </div>
        <button className="secondary-button danger" onClick={onReset}><RotateCcw size={17} /> Đặt lại demo</button>
      </section>
    </div>
  )
}

function AdModal({ ad, seconds, onClose, onClaim }: { ad: AdItem; seconds: number; onClose: () => void; onClaim: () => void }) {
  const Icon = ad.icon
  const progress = Math.round(((6 - seconds) / 6) * 100)
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={ad.title}>
      <div className="task-modal">
        <button className="modal-close" onClick={onClose} aria-label="Đóng"><X size={20} /></button>
        <div className="modal-task-icon"><Icon size={30} /></div>
        <span className="demo-tag">MÔ PHỎNG QUẢNG CÁO</span>
        <h2>{ad.title}</h2>
        <p>{ad.description}</p>
        <div className="modal-reward"><span>Tiền nhận được</span><strong>+{compactMoney(ad.reward)}</strong></div>
        <div className="countdown-ring" style={{ '--progress': `${progress}%` } as React.CSSProperties}>
          <div>{seconds > 0 ? <><strong>{seconds}</strong><span>giây</span></> : <CheckCircle2 size={36} />}</div>
        </div>
        <p className="modal-note">
          {seconds > 0 ? 'Đang mô phỏng thời gian xem quảng cáo…' : 'Quảng cáo demo đã xem hết. Production phải chờ mạng quảng cáo/server xác nhận trước khi cộng tiền.'}
        </p>
        <button className="primary-button wide" disabled={seconds > 0} onClick={onClaim}>
          {seconds > 0 ? `Còn ${seconds} giây` : `Nhận ${compactMoney(ad.reward)}`}
        </button>
      </div>
    </div>
  )
}

function AdRow({ ad, onStart }: { ad: AdItem; onStart: () => void }) {
  const Icon = ad.icon
  return (
    <div className="task-row">
      <div className="task-icon"><Icon size={22} /></div>
      <div className="task-row-copy">
        <strong>{ad.title}</strong>
        <span><Clock3 size={14} /> {ad.duration} • {ad.sponsor}</span>
      </div>
      <div className="task-row-reward">
        <strong>+{compactMoney(ad.reward)}</strong>
        <span>mỗi lượt</span>
      </div>
      <button className="round-arrow" onClick={onStart} aria-label={`Xem ${ad.title}`}>
        <PlayCircle size={18} />
      </button>
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

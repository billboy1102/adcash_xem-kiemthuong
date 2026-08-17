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
  Zap,
} from 'lucide-react'
import './monlix.css'

type View = 'home' | 'earn' | 'wallet' | 'withdraw' | 'profile'
type WithdrawalMethod = 'momo' | 'bank'

type Wallet = {
  balance_vnd: number
  lifetime_earned_vnd: number
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

function createLocalDeviceId() {
  const storageKey = 'adcash-device-id'

  try {
    const saved = window.localStorage.getItem(storageKey)
    if (saved) return saved

    const generated = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`

    window.localStorage.setItem(storageKey, generated)
    return generated
  } catch {
    return typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

export default function App() {
  const [view, setView] = useState<View>('home')
  const [deviceId] = useState(createLocalDeviceId)
  const [toast, setToast] = useState('')
  const [withdrawMethod, setWithdrawMethod] = useState<WithdrawalMethod>('momo')
  const [withdrawAccount, setWithdrawAccount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('50000')

  const wallet: Wallet = { balance_vnd: 0, lifetime_earned_vnd: 0 }
  const watchedAds = 0
  const title = useMemo(() => navItems.find((item) => item.id === view)?.label ?? 'Adcash', [view])
  const userCode = `ADC-${deviceId.replaceAll('-', '').slice(0, 8).toUpperCase()}`

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(userCode)
      setToast('Đã sao chép mã thiết bị')
    } catch {
      setToast(userCode)
    }
  }

  const submitWithdrawal = () => {
    setToast('Rút tiền đang tắt vì Adcash chưa kết nối backend mới')
  }

  const refresh = () => {
    setToast('Supabase đã được gỡ khỏi Adcash')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="demo-pill"><span /> Frontend only</div>
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
            <strong>Supabase đã gỡ</strong>
            <span>Hiện chưa có backend cộng ví hoặc xử lý rút tiền.</span>
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
            <button className="icon-button" aria-label="Làm mới" onClick={refresh}>
              <RefreshCw size={19} />
            </button>
            <button className="icon-button" aria-label="Thông báo"><Bell size={20} /></button>
            <button className="avatar-button" onClick={() => setView('profile')}>A</button>
          </div>
        </header>

        <div className="content-wrap">
          {view === 'home' && (
            <HomeView wallet={wallet} watchedAds={watchedAds} onViewChange={setView} />
          )}
          {view === 'earn' && (
            <AdsView deviceId={deviceId} />
          )}
          {view === 'wallet' && (
            <WalletView wallet={wallet} onWithdraw={() => setView('withdraw')} />
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
              onSubmit={submitWithdrawal}
            />
          )}
          {view === 'profile' && (
            <ProfileView
              wallet={wallet}
              watchedAds={watchedAds}
              userCode={userCode}
              deviceId={deviceId}
              onCopy={copyCode}
            />
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
          <span className="hero-label"><PlayCircle size={15} /> Quảng cáo</span>
          <div className="balance">{money.format(wallet.balance_vnd)}</div>
          <p>Supabase đã được gỡ khỏi Adcash. Hiện giao diện vẫn hoạt động nhưng chưa có backend để xác nhận reward, lưu số dư hoặc xử lý rút tiền.</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => onViewChange('earn')}>
              Xem quảng cáo <ChevronRight size={18} />
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
        <StatCard icon={Trophy} label="Tổng đã kiếm" value={compactMoney(wallet.lifetime_earned_vnd)} detail="Chưa có backend" />
        <StatCard icon={Eye} label="Reward hợp lệ" value={`${watchedAds}`} detail="Chưa theo dõi" />
        <StatCard icon={BarChart3} label="Mức rút tối thiểu" value="50.000đ" detail="Tạm thời chưa hoạt động" />
      </section>

      <section className="section-card server-flow-card">
        <div className="section-heading">
          <div><span className="eyebrow">Trạng thái hệ thống</span><h2>Backend đã được tháo khỏi app</h2></div>
          <span className="verified-chip"><Info size={16} /> Chưa kết nối</span>
        </div>
        <div className="server-flow">
          <FlowStep icon={PlayCircle} title="1. Quảng cáo" text="Phần hiển thị quảng cáo vẫn có thể hoạt động độc lập." />
          <FlowStep icon={Server} title="2. Backend" text="Không còn kết nối Supabase, database hoặc Edge Function." />
          <FlowStep icon={WalletCards} title="3. Ví" text="Không tự cộng số dư cho đến khi có backend mới." />
        </div>
      </section>

      <section className="safe-note">
        <LockKeyhole size={22} />
        <div>
          <strong>Không có số dư giả được tự động tạo</strong>
          <p>Việc gỡ Supabase không làm app tự chuyển sang cộng tiền ở client.</p>
        </div>
      </section>
    </div>
  )
}

function AdsView({ deviceId }: { deviceId: string }) {
  const monlixUrl = MONLIX_APP_ID
    ? `https://offers.monlix.com/?appid=${encodeURIComponent(MONLIX_APP_ID)}&userid=${encodeURIComponent(deviceId)}&subid=${MONLIX_SUB_ID}`
    : ''

  return (
    <div className="page-stack">
      <section className="earn-banner">
        <div>
          <span className="eyebrow">Quảng cáo</span>
          <h2>Khu vực quảng cáo</h2>
          <p>Supabase đã gỡ. Quảng cáo ở đây không còn cơ chế server để cộng tiền vào ví Adcash.</p>
        </div>
        <div className="earn-badge"><Info size={25} /> Frontend only</div>
      </section>

      {!MONLIX_APP_ID ? (
        <section className="section-card integration-state warning-state">
          <Info size={30} />
          <div>
            <h2>Chưa có mã quảng cáo</h2>
            <p>Repo chưa có Monlix App ID. Khi đổi sang mạng quảng cáo khác, có thể thay phần này bằng code quảng cáo mới.</p>
          </div>
        </section>
      ) : (
        <section className="section-card monlix-card">
          <div className="section-heading monlix-heading">
            <div>
              <span className="eyebrow">Live inventory</span>
              <h2>Monlix</h2>
            </div>
          </div>
          <div className="policy-banner live-policy">
            <Info size={20} />
            <div>
              <strong>Chỉ hiển thị quảng cáo</strong>
              <span>Không có Supabase callback, database reward hoặc server wallet trong repo nữa.</span>
            </div>
          </div>
          <div className="monlix-frame-shell">
            <iframe
              className="monlix-frame"
              title="Monlix Ads"
              src={monlixUrl}
              allow="autoplay; clipboard-write"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          <div className="monlix-footnote">
            <Server size={18} />
            <span>Thiết bị dùng ID cục bộ để mở quảng cáo; ID này không phải tài khoản Supabase.</span>
          </div>
        </section>
      )}
    </div>
  )
}

function WalletView({ wallet, onWithdraw }: { wallet: Wallet; onWithdraw: () => void }) {
  return (
    <div className="page-stack">
      <section className="wallet-hero">
        <div>
          <span>Số dư</span>
          <strong>{money.format(wallet.balance_vnd)}</strong>
          <small>Chưa có backend lưu ví</small>
        </div>
        <button className="light-button" onClick={onWithdraw}><Landmark size={18} /> Rút tiền</button>
      </section>

      <section className="section-card">
        <div className="section-heading">
          <div><span className="eyebrow">Lịch sử</span><h2>Giao dịch</h2></div>
          <span className="count-chip">0 giao dịch</span>
        </div>
        <div className="transaction-list">
          <div className="empty-ledger">Supabase đã gỡ nên hiện không có database giao dịch để tải.</div>
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
  onSubmit,
}: {
  wallet: Wallet
  method: WithdrawalMethod
  setMethod: (value: WithdrawalMethod) => void
  account: string
  setAccount: (value: string) => void
  amount: string
  setAmount: (value: string) => void
  onSubmit: () => void
}) {
  return (
    <div className="withdraw-layout">
      <section className="section-card withdraw-form-card">
        <div className="section-heading"><div><span className="eyebrow">Chưa kết nối backend</span><h2>Rút tiền</h2></div></div>

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

        <button className="primary-button wide" onClick={onSubmit}>
          Gửi yêu cầu rút tiền <ChevronRight size={18} />
        </button>
        <p className="form-footnote">Tính năng này đang tắt ở backend. Bấm gửi sẽ không tạo giao dịch hay trừ số dư.</p>
      </section>

      <aside className="withdraw-summary">
        <div className="summary-balance"><span>Số dư hiện tại</span><strong>{money.format(wallet.balance_vnd)}</strong></div>
        <div className="summary-line"><span>Mức rút tối thiểu</span><strong>{compactMoney(MIN_WITHDRAWAL)}</strong></div>
        <div className="summary-line"><span>Phí rút tiền</span><strong>0đ</strong></div>
        <div className="summary-line"><span>Backend</span><strong>Chưa kết nối</strong></div>
        <div className="summary-note"><ShieldCheck size={20} /><span>Cần backend mới trước khi có thể lưu số dư và xử lý yêu cầu rút.</span></div>
      </aside>
    </div>
  )
}

function ProfileView({
  wallet,
  watchedAds,
  userCode,
  deviceId,
  onCopy,
}: {
  wallet: Wallet
  watchedAds: number
  userCode: string
  deviceId: string
  onCopy: () => void
}) {
  return (
    <div className="profile-layout">
      <section className="section-card profile-card">
        <div className="profile-avatar">A</div>
        <div className="profile-copy">
          <span className="eyebrow">Local device</span>
          <h2>Người dùng Adcash</h2>
          <button className="code-button" onClick={onCopy}>{userCode} <Copy size={14} /></button>
        </div>
        <span className="verified-chip"><BadgeCheck size={16} /> Local ID</span>
      </section>

      <section className="profile-stats">
        <StatCard icon={WalletCards} label="Số dư" value={compactMoney(wallet.balance_vnd)} detail="Chưa có backend" />
        <StatCard icon={Trophy} label="Tổng thu nhập" value={compactMoney(wallet.lifetime_earned_vnd)} detail="Chưa có backend" />
        <StatCard icon={Eye} label="Reward hợp lệ" value={`${watchedAds}`} detail="Chưa theo dõi" />
      </section>

      <section className="section-card settings-card">
        <div className="setting-row"><div className="setting-icon"><ShieldCheck size={20} /></div><div><strong>Supabase đã gỡ</strong><span>Không còn Auth, RLS, database hay RPC trong client.</span></div><ChevronRight size={18} /></div>
        <div className="setting-row"><div className="setting-icon"><Server size={20} /></div><div><strong>Backend</strong><span>Chưa kết nối backend thay thế.</span></div><ChevronRight size={18} /></div>
        <div className="setting-row"><div className="setting-icon"><Zap size={20} /></div><div><strong>Device ID</strong><span className="uuid-text">{deviceId}</span></div><ChevronRight size={18} /></div>
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

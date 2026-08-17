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
  ClipboardCheck,
  Clock3,
  Copy,
  Gift,
  Home,
  Info,
  Landmark,
  LockKeyhole,
  MessageSquareText,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trophy,
  UserRound,
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

type TaskItem = {
  id: string
  title: string
  description: string
  reward: number
  duration: string
  category: string
  icon: LucideIcon
  featured?: boolean
}

type AppState = {
  balance: number
  totalEarned: number
  completedTaskIds: string[]
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
    id: 'welcome',
    title: 'Thưởng người dùng mới',
    subtitle: 'Phần thưởng demo khởi động',
    amount: 35_000,
    createdAt: 'Hôm nay, 09:15',
    status: 'done',
  },
  {
    id: 'survey-demo',
    title: 'Khảo sát nhanh',
    subtitle: 'Đối tác khảo sát • Demo',
    amount: 1_200,
    createdAt: 'Hôm qua, 21:42',
    status: 'done',
  },
  {
    id: 'video-demo',
    title: 'Video tài trợ',
    subtitle: 'Đối tác thưởng • Demo',
    amount: 350,
    createdAt: 'Hôm qua, 20:08',
    status: 'done',
  },
]

const defaultState: AppState = {
  balance: 62_750,
  totalEarned: 89_950,
  completedTaskIds: [],
  transactions: initialTransactions,
  userCode: `ADC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
}

const tasks: TaskItem[] = [
  {
    id: 'sponsor-video',
    title: 'Xem video tài trợ',
    description: 'Xem trọn nội dung từ đối tác có chương trình thưởng.',
    reward: 350,
    duration: '30–45 giây',
    category: 'Video',
    icon: PlayCircle,
    featured: true,
  },
  {
    id: 'quick-survey',
    title: 'Khảo sát nhanh 2 phút',
    description: 'Trả lời một khảo sát ngắn phù hợp với hồ sơ của bạn.',
    reward: 1_200,
    duration: '2–3 phút',
    category: 'Khảo sát',
    icon: MessageSquareText,
  },
  {
    id: 'daily-check',
    title: 'Điểm danh hôm nay',
    description: 'Mở ứng dụng mỗi ngày để nhận phần thưởng duy trì.',
    reward: 150,
    duration: '10 giây',
    category: 'Hằng ngày',
    icon: Zap,
  },
  {
    id: 'app-offer',
    title: 'Trải nghiệm ứng dụng',
    description: 'Hoàn thành yêu cầu của đối tác và chờ hệ thống xác nhận.',
    reward: 4_500,
    duration: '5–10 phút',
    category: 'Offer',
    icon: Smartphone,
  },
  {
    id: 'mini-poll',
    title: 'Bình chọn nhanh',
    description: 'Chọn câu trả lời bạn yêu thích trong một bình chọn ngắn.',
    reward: 250,
    duration: '30 giây',
    category: 'Bình chọn',
    icon: ClipboardCheck,
  },
]

const navItems: Array<{ id: View; label: string; icon: LucideIcon }> = [
  { id: 'home', label: 'Trang chủ', icon: Home },
  { id: 'earn', label: 'Kiếm thưởng', icon: Sparkles },
  { id: 'wallet', label: 'Ví', icon: WalletCards },
  { id: 'withdraw', label: 'Rút tiền', icon: Landmark },
  { id: 'profile', label: 'Hồ sơ', icon: UserRound },
]

function loadState(): AppState {
  try {
    const saved = localStorage.getItem('adcash-demo-state-v1')
    if (saved) return JSON.parse(saved) as AppState
  } catch {
    // Ignore corrupted local demo state.
  }
  return defaultState
}

export default function App() {
  const [view, setView] = useState<View>('home')
  const [state, setState] = useState<AppState>(loadState)
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [toast, setToast] = useState('')
  const [withdrawMethod, setWithdrawMethod] = useState<'momo' | 'bank'>('momo')
  const [withdrawAccount, setWithdrawAccount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('50000')

  useEffect(() => {
    localStorage.setItem('adcash-demo-state-v1', JSON.stringify(state))
  }, [state])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!activeTask || seconds <= 0) return
    const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [activeTask, seconds])

  const completedCount = state.completedTaskIds.length
  const progress = Math.min(100, Math.round((completedCount / tasks.length) * 100))
  const availableTasks = tasks.filter((task) => !state.completedTaskIds.includes(task.id))

  const title = useMemo(() => {
    return navItems.find((item) => item.id === view)?.label ?? 'Adcash'
  }, [view])

  const startTask = (task: TaskItem) => {
    if (state.completedTaskIds.includes(task.id)) return
    setActiveTask(task)
    setSeconds(6)
  }

  const claimTask = () => {
    if (!activeTask || seconds > 0) return
    const task = activeTask
    const transaction: Transaction = {
      id: `${task.id}-${Date.now()}`,
      title: task.title,
      subtitle: `${task.category} • Đã xác nhận demo`,
      amount: task.reward,
      createdAt: 'Vừa xong',
      status: 'done',
    }

    setState((current) => ({
      ...current,
      balance: current.balance + task.reward,
      totalEarned: current.totalEarned + task.reward,
      completedTaskIds: [...current.completedTaskIds, task.id],
      transactions: [transaction, ...current.transactions],
    }))
    setActiveTask(null)
    setToast(`Đã cộng ${compactMoney(task.reward)} vào ví demo`)
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
    localStorage.removeItem('adcash-demo-state-v1')
    setState({
      ...defaultState,
      userCode: `ADC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      transactions: [...initialTransactions],
    })
    setToast('Đã đặt lại dữ liệu demo')
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
            <strong>Giao dịch an toàn</strong>
            <span>Tiền thật sẽ chỉ được cộng sau xác nhận từ server.</span>
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
              completedCount={completedCount}
              progress={progress}
              availableTasks={availableTasks}
              onViewChange={setView}
              onStartTask={startTask}
            />
          )}

          {view === 'earn' && (
            <EarnView state={state} onStartTask={startTask} />
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
              <span>{item.label === 'Kiếm thưởng' ? 'Kiếm' : item.label}</span>
            </button>
          )
        })}
      </nav>

      {activeTask && (
        <TaskModal
          task={activeTask}
          seconds={seconds}
          onClose={() => setActiveTask(null)}
          onClaim={claimTask}
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
  completedCount,
  progress,
  availableTasks,
  onViewChange,
  onStartTask,
}: {
  state: AppState
  completedCount: number
  progress: number
  availableTasks: TaskItem[]
  onViewChange: (view: View) => void
  onStartTask: (task: TaskItem) => void
}) {
  return (
    <div className="page-stack">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="hero-label"><Sparkles size={15} /> Số dư khả dụng</span>
          <div className="balance">{money.format(state.balance)}</div>
          <p>Hoàn thành nhiệm vụ từ đối tác, tích thưởng và gửi yêu cầu rút khi đủ điều kiện.</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => onViewChange('earn')}>
              Kiếm thêm ngay <ChevronRight size={18} />
            </button>
            <button className="secondary-button" onClick={() => onViewChange('withdraw')}>
              Rút tiền
            </button>
          </div>
        </div>
        <div className="hero-orb" aria-hidden="true">
          <div className="coin coin-one">₫</div>
          <div className="coin coin-two">+</div>
          <div className="hero-center"><Banknote size={56} /></div>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard icon={Trophy} label="Tổng đã kiếm" value={compactMoney(state.totalEarned)} detail="Dữ liệu demo" />
        <StatCard icon={ClipboardCheck} label="Nhiệm vụ hôm nay" value={`${completedCount}/${tasks.length}`} detail={`${progress}% hoàn thành`} />
        <StatCard icon={BarChart3} label="Mức rút tối thiểu" value="50.000đ" detail="MoMo / Ngân hàng" />
      </section>

      <section className="section-card daily-card">
        <div className="section-heading compact-heading">
          <div>
            <span className="eyebrow">Mục tiêu hôm nay</span>
            <h2>Hoàn thành nhiệm vụ</h2>
          </div>
          <span className="progress-value">{progress}%</span>
        </div>
        <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
        <div className="daily-footer">
          <span>{completedCount} nhiệm vụ đã xong</span>
          <span>{Math.max(0, tasks.length - completedCount)} nhiệm vụ còn lại</span>
        </div>
      </section>

      <section className="section-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Gợi ý cho bạn</span>
            <h2>Nhiệm vụ thưởng nổi bật</h2>
          </div>
          <button className="text-button" onClick={() => onViewChange('earn')}>Xem tất cả <ChevronRight size={16} /></button>
        </div>
        <div className="task-list">
          {(availableTasks.length ? availableTasks : tasks).slice(0, 3).map((task) => (
            <TaskRow key={task.id} task={task} completed={state.completedTaskIds.includes(task.id)} onStart={() => onStartTask(task)} />
          ))}
        </div>
      </section>

      <section className="safe-note">
        <LockKeyhole size={22} />
        <div>
          <strong>Không cộng tiền từ quảng cáo AdMob thông thường</strong>
          <p>Bản production chỉ quy đổi phần thưởng từ nguồn/đối tác cho phép incentivized rewards và đã được server xác nhận.</p>
        </div>
      </section>
    </div>
  )
}

function EarnView({ state, onStartTask }: { state: AppState; onStartTask: (task: TaskItem) => void }) {
  return (
    <div className="page-stack">
      <section className="earn-banner">
        <div>
          <span className="eyebrow">Cơ hội hôm nay</span>
          <h2>Chọn nhiệm vụ phù hợp</h2>
          <p>Thưởng hiển thị dưới đây là dữ liệu mô phỏng để kiểm thử giao diện và luồng ứng dụng.</p>
        </div>
        <div className="earn-badge"><Gift size={26} /> +6.450đ</div>
      </section>

      <section className="policy-banner">
        <Info size={20} />
        <div>
          <strong>Đang ở chế độ demo</strong>
          <span>Khi nối production, client không được tự cộng số dư. Backend nhận postback hợp lệ từ đối tác rồi mới ghi giao dịch.</span>
        </div>
      </section>

      <div className="task-grid">
        {tasks.map((task) => {
          const done = state.completedTaskIds.includes(task.id)
          const Icon = task.icon
          return (
            <article key={task.id} className={`task-card ${task.featured ? 'featured' : ''} ${done ? 'done' : ''}`}>
              <div className="task-card-top">
                <div className="task-icon"><Icon size={24} /></div>
                <span className="category-chip">{task.category}</span>
              </div>
              <h3>{task.title}</h3>
              <p>{task.description}</p>
              <div className="task-meta"><Clock3 size={15} /> {task.duration}</div>
              <div className="task-reward-row">
                <div>
                  <span>Phần thưởng</span>
                  <strong>+{compactMoney(task.reward)}</strong>
                </div>
                <button className={done ? 'complete-button' : 'primary-button small'} disabled={done} onClick={() => onStartTask(task)}>
                  {done ? <><BadgeCheck size={17} /> Đã xong</> : <>Bắt đầu <ChevronRight size={16} /></>}
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
          <small>Tổng thu nhập demo: {money.format(state.totalEarned)}</small>
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
                {transaction.amount < 0 ? <Landmark size={19} /> : <CircleDollarSign size={19} />}
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
        <div className="summary-line"><span>Trạng thái</span><strong className="positive">Khả dụng</strong></div>
        <div className="summary-note"><ShieldCheck size={20} /><span>Production cần admin/backend duyệt trước khi thanh toán.</span></div>
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
        <StatCard icon={Trophy} label="Tổng thu nhập" value={compactMoney(state.totalEarned)} detail="Dữ liệu demo" />
        <StatCard icon={ClipboardCheck} label="Đã hoàn thành" value={`${state.completedTaskIds.length}`} detail="Nhiệm vụ" />
      </section>

      <section className="section-card settings-card">
        <div className="setting-row"><div className="setting-icon"><ShieldCheck size={20} /></div><div><strong>Bảo mật tài khoản</strong><span>Auth + RLS sẽ được bật khi nối Supabase production.</span></div><ChevronRight size={18} /></div>
        <div className="setting-row"><div className="setting-icon"><Landmark size={20} /></div><div><strong>Phương thức thanh toán</strong><span>MoMo và tài khoản ngân hàng.</span></div><ChevronRight size={18} /></div>
        <div className="setting-row"><div className="setting-icon"><Bell size={20} /></div><div><strong>Thông báo</strong><span>Trạng thái nhiệm vụ và rút tiền.</span></div><ChevronRight size={18} /></div>
      </section>

      <section className="section-card developer-card">
        <div>
          <span className="eyebrow">Dành cho phát triển</span>
          <h3>Đặt lại dữ liệu kiểm thử</h3>
          <p>Xóa số dư, giao dịch và nhiệm vụ đã làm trong localStorage rồi tạo lại dữ liệu demo mặc định.</p>
        </div>
        <button className="secondary-button danger" onClick={onReset}><RotateCcw size={17} /> Đặt lại demo</button>
      </section>
    </div>
  )
}

function TaskModal({ task, seconds, onClose, onClaim }: { task: TaskItem; seconds: number; onClose: () => void; onClaim: () => void }) {
  const Icon = task.icon
  const progress = Math.round(((6 - seconds) / 6) * 100)
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={task.title}>
      <div className="task-modal">
        <button className="modal-close" onClick={onClose} aria-label="Đóng"><X size={20} /></button>
        <div className="modal-task-icon"><Icon size={30} /></div>
        <span className="demo-tag">MÔ PHỎNG NHIỆM VỤ</span>
        <h2>{task.title}</h2>
        <p>{task.description}</p>
        <div className="modal-reward"><span>Phần thưởng</span><strong>+{compactMoney(task.reward)}</strong></div>
        <div className="countdown-ring" style={{ '--progress': `${progress}%` } as React.CSSProperties}>
          <div>{seconds > 0 ? <><strong>{seconds}</strong><span>giây</span></> : <CheckCircle2 size={36} />}</div>
        </div>
        <p className="modal-note">
          {seconds > 0 ? 'Đang mô phỏng thời gian hoàn thành…' : 'Demo đã hoàn thành. Production phải chờ xác nhận server/postback trước khi cộng tiền.'}
        </p>
        <button className="primary-button wide" disabled={seconds > 0} onClick={onClaim}>
          {seconds > 0 ? `Chờ ${seconds} giây` : `Nhận ${compactMoney(task.reward)}`}
        </button>
      </div>
    </div>
  )
}

function TaskRow({ task, completed, onStart }: { task: TaskItem; completed: boolean; onStart: () => void }) {
  const Icon = task.icon
  return (
    <div className="task-row">
      <div className="task-icon"><Icon size={22} /></div>
      <div className="task-row-copy">
        <strong>{task.title}</strong>
        <span><Clock3 size={14} /> {task.duration} • {task.category}</span>
      </div>
      <div className="task-row-reward">
        <strong>+{compactMoney(task.reward)}</strong>
        <span>thưởng</span>
      </div>
      <button className={completed ? 'complete-button compact' : 'round-arrow'} disabled={completed} onClick={onStart}>
        {completed ? <CheckCircle2 size={18} /> : <ChevronRight size={18} />}
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

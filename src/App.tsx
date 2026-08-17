import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  BadgeCheck,
  Banknote,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
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
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trophy,
  UserRound,
  Users,
  WalletCards,
  X,
} from 'lucide-react'

type View = 'home' | 'earn' | 'checkin' | 'referral' | 'wallet' | 'withdraw' | 'profile'
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
  lastCheckInDate: string
  checkInStreak: number
  referralCount: number
}

const money = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

const compactMoney = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`
const CHECKIN_REWARDS = [150, 200, 250, 300, 400, 500, 1000]
const REFERRAL_REWARD = 5_000
const INVITE_BASE_URL = 'https://billboy1102.github.io/adcash_xem-kiemthuong/'

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
  lastCheckInDate: '',
  checkInStreak: 0,
  referralCount: 0,
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
  { id: 'checkin', label: 'Điểm danh hàng ngày', icon: CalendarDays },
  { id: 'referral', label: 'Giới thiệu bạn bè', icon: Users },
  { id: 'wallet', label: 'Ví', icon: WalletCards },
  { id: 'withdraw', label: 'Rút tiền', icon: Landmark },
  { id: 'profile', label: 'Hồ sơ', icon: UserRound },
]

const mobileNavItems = navItems.filter((item) =>
  ['home', 'earn', 'checkin', 'referral', 'wallet'].includes(item.id),
)

function todayKey() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isYesterday(value: string) {
  if (!value) return false
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return false

  const last = Date.UTC(year, month - 1, day)
  const now = new Date()
  const current = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return current - last === 86_400_000
}

function loadState(): AppState {
  try {
    const saved = localStorage.getItem('adcash-demo-state-v1')
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<AppState>
      return {
        ...defaultState,
        ...parsed,
        completedTaskIds: parsed.completedTaskIds ?? [],
        transactions: parsed.transactions ?? [...initialTransactions],
        userCode: parsed.userCode || defaultState.userCode,
        lastCheckInDate: parsed.lastCheckInDate ?? '',
        checkInStreak: parsed.checkInStreak ?? 0,
        referralCount: parsed.referralCount ?? 0,
      }
    }
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
  const checkedInToday = state.lastCheckInDate === todayKey()

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

  const claimDailyCheckIn = () => {
    const today = todayKey()
    if (state.lastCheckInDate === today) {
      setToast('Hôm nay đã điểm danh rồi')
      return
    }

    const nextStreak = isYesterday(state.lastCheckInDate)
      ? Math.min(7, state.checkInStreak + 1)
      : 1
    const reward = CHECKIN_REWARDS[nextStreak - 1]

    const transaction: Transaction = {
      id: `checkin-${today}`,
      title: `Điểm danh ngày ${nextStreak}`,
      subtitle: 'Điểm danh hàng ngày • Demo',
      amount: reward,
      createdAt: 'Vừa xong',
      status: 'done',
    }

    setState((current) => ({
      ...current,
      balance: current.balance + reward,
      totalEarned: current.totalEarned + reward,
      lastCheckInDate: today,
      checkInStreak: nextStreak,
      transactions: [transaction, ...current.transactions],
    }))
    setToast(`Điểm danh thành công +${compactMoney(reward)}`)
  }

  const inviteLink = `${INVITE_BASE_URL}?ref=${encodeURIComponent(state.userCode)}`

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setToast('Đã sao chép link giới thiệu')
    } catch {
      setToast(inviteLink)
    }
  }

  const shareInvite = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Adcash',
          text: `Tham gia Adcash bằng mã ${state.userCode}`,
          url: inviteLink,
        })
        return
      } catch {
        // User may cancel native share sheet.
      }
    }
    await copyInviteLink()
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
              checkedInToday={checkedInToday}
              onViewChange={setView}
              onStartTask={startTask}
            />
          )}

          {view === 'earn' && (
            <EarnView state={state} onStartTask={startTask} />
          )}

          {view === 'checkin' && (
            <CheckInView
              state={state}
              checkedInToday={checkedInToday}
              onClaim={claimDailyCheckIn}
            />
          )}

          {view === 'referral' && (
            <ReferralView
              state={state}
              inviteLink={inviteLink}
              onCopy={copyInviteLink}
              onShare={shareInvite}
            />
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
        {mobileNavItems.map((item) => {
          const Icon = item.icon
          const mobileLabel =
            item.id === 'earn'
              ? 'Kiếm'
              : item.id === 'checkin'
                ? 'Điểm danh'
                : item.id === 'referral'
                  ? 'Giới thiệu'
                  : item.label
          return (
            <button
              key={item.id}
              className={view === item.id ? 'active' : ''}
              onClick={() => setView(item.id)}
            >
              <Icon size={21} />
              <span>{mobileLabel}</span>
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
  checkedInToday,
  onViewChange,
  onStartTask,
}: {
  state: AppState
  completedCount: number
  progress: number
  availableTasks: TaskItem[]
  checkedInToday: boolean
  onViewChange: (view: View) => void
  onStartTask: (task: TaskItem) => void
}) {
  return (
    <div className="page-stack">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="hero-label"><Sparkles size={15} /> Số dư khả dụng</span>
          <div className="balance">{money.format(state.balance)}</div>
          <p>Hoàn thành nhiệm vụ, điểm danh mỗi ngày và giới thiệu bạn bè để tích thưởng.</p>
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
        <StatCard icon={CalendarDays} label="Chuỗi điểm danh" value={`${state.checkInStreak} ngày`} detail={checkedInToday ? 'Đã điểm danh hôm nay' : 'Chưa điểm danh hôm nay'} />
        <StatCard icon={Users} label="Bạn bè đã mời" value={`${state.referralCount}`} detail={`+${compactMoney(REFERRAL_REWARD)}/người hợp lệ`} />
      </section>

      <section className="section-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Thưởng nhanh</span>
            <h2>Điểm danh & giới thiệu</h2>
          </div>
        </div>
        <div className="task-list">
          <FeatureRow
            icon={CalendarDays}
            title="Điểm danh hàng ngày"
            description={checkedInToday ? 'Hôm nay đã nhận thưởng' : 'Nhận thưởng tăng dần trong chuỗi 7 ngày'}
            value={checkedInToday ? 'Đã nhận' : `+${compactMoney(CHECKIN_REWARDS[Math.min(state.checkInStreak, 6)])}`}
            onOpen={() => onViewChange('checkin')}
          />
          <FeatureRow
            icon={Users}
            title="Giới thiệu bạn bè"
            description="Chia sẻ mã hoặc link mời của bạn"
            value={`+${compactMoney(REFERRAL_REWARD)}`}
            onOpen={() => onViewChange('referral')}
          />
        </div>
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
          <strong>Bản hiện tại vẫn là demo</strong>
          <p>Điểm danh đang lưu trên thiết bị. Giới thiệu bạn bè cần backend xác nhận người dùng hợp lệ trước khi production cộng tiền thật.</p>
        </div>
      </section>
    </div>
  )
}

function FeatureRow({
  icon: Icon,
  title,
  description,
  value,
  onOpen,
}: {
  icon: LucideIcon
  title: string
  description: string
  value: string
  onOpen: () => void
}) {
  return (
    <div className="task-row">
      <div className="task-icon"><Icon size={22} /></div>
      <div className="task-row-copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
      <div className="task-row-reward">
        <strong>{value}</strong>
        <span>thưởng</span>
      </div>
      <button className="round-arrow" onClick={onOpen}><ChevronRight size={18} /></button>
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
        <div className="earn-badge"><Gift size={26} /> +6.300đ</div>
      </section>

      <section className="policy-banner">
        <Info size={20} />
        <div>
          <strong>Đang ở chế độ demo</strong>
          <span>Khi nối production, client không được tự cộng số dư. Backend phải xác nhận nguồn thưởng trước khi ghi giao dịch.</span>
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

function CheckInView({
  state,
  checkedInToday,
  onClaim,
}: {
  state: AppState
  checkedInToday: boolean
  onClaim: () => void
}) {
  const nextDay = checkedInToday ? state.checkInStreak : Math.min(7, state.checkInStreak + 1)
  const nextReward = CHECKIN_REWARDS[Math.max(0, nextDay - 1)]

  return (
    <div className="page-stack">
      <section className="earn-banner">
        <div>
          <span className="eyebrow">Điểm danh hàng ngày</span>
          <h2>Giữ chuỗi để nhận thưởng cao hơn</h2>
          <p>Mỗi ngày chỉ điểm danh một lần. Chuỗi 7 ngày có mức thưởng tăng dần và ngày thứ 7 nhận 1.000đ trong bản demo.</p>
        </div>
        <div className="earn-badge"><CalendarDays size={26} /> {state.checkInStreak} ngày</div>
      </section>

      <section className="section-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Chuỗi 7 ngày</span>
            <h2>Lịch thưởng</h2>
          </div>
          <span className="count-chip">{checkedInToday ? 'Đã điểm danh' : 'Có thể nhận'}</span>
        </div>

        <div className="task-grid">
          {CHECKIN_REWARDS.map((reward, index) => {
            const day = index + 1
            const completed = day <= state.checkInStreak
            const current = day === nextDay && !checkedInToday
            return (
              <article key={day} className={`task-card ${current ? 'featured' : ''} ${completed ? 'done' : ''}`}>
                <div className="task-card-top">
                  <div className="task-icon">{completed ? <CheckCircle2 size={24} /> : <CalendarDays size={24} />}</div>
                  <span className="category-chip">Ngày {day}</span>
                </div>
                <h3>{completed ? 'Đã nhận' : current ? 'Hôm nay' : 'Chưa mở'}</h3>
                <p>{day === 7 ? 'Mốc thưởng lớn cuối chuỗi.' : 'Duy trì điểm danh liên tiếp để mở mốc này.'}</p>
                <div className="task-reward-row">
                  <div>
                    <span>Phần thưởng</span>
                    <strong>+{compactMoney(reward)}</strong>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="section-card">
        <div className="section-heading compact-heading">
          <div>
            <span className="eyebrow">Hôm nay</span>
            <h2>{checkedInToday ? 'Đã nhận thưởng' : `Nhận +${compactMoney(nextReward)}`}</h2>
          </div>
        </div>
        <button className="primary-button wide" disabled={checkedInToday} onClick={onClaim}>
          {checkedInToday ? <><CheckCircle2 size={18} /> Đã điểm danh hôm nay</> : <><CalendarDays size={18} /> Điểm danh ngay</>}
        </button>
      </section>
    </div>
  )
}

function ReferralView({
  state,
  inviteLink,
  onCopy,
  onShare,
}: {
  state: AppState
  inviteLink: string
  onCopy: () => void
  onShare: () => void
}) {
  return (
    <div className="page-stack">
      <section className="earn-banner">
        <div>
          <span className="eyebrow">Giới thiệu bạn bè</span>
          <h2>Mời bạn bè tham gia Adcash</h2>
          <p>Chia sẻ mã hoặc link mời. Bản production chỉ cộng thưởng sau khi backend xác nhận người được giới thiệu đủ điều kiện.</p>
        </div>
        <div className="earn-badge"><Users size={26} /> +{compactMoney(REFERRAL_REWARD)}</div>
      </section>

      <section className="stats-grid">
        <StatCard icon={Users} label="Bạn bè đã mời" value={`${state.referralCount}`} detail="Đã xác nhận" />
        <StatCard icon={Gift} label="Thưởng mỗi người" value={compactMoney(REFERRAL_REWARD)} detail="Khi đủ điều kiện" />
        <StatCard icon={Trophy} label="Thu nhập giới thiệu" value={compactMoney(state.referralCount * REFERRAL_REWARD)} detail="Dữ liệu demo" />
      </section>

      <section className="section-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Mã của bạn</span>
            <h2>{state.userCode}</h2>
          </div>
          <button className="secondary-button" onClick={onCopy}><Copy size={17} /> Sao chép link</button>
        </div>

        <label className="field-label" htmlFor="invite-link">Link giới thiệu</label>
        <input id="invite-link" className="input" value={inviteLink} readOnly />

        <div className="hero-actions">
          <button className="primary-button" onClick={onShare}><Share2 size={18} /> Chia sẻ ngay</button>
          <button className="secondary-button" onClick={onCopy}><Copy size={18} /> Sao chép</button>
        </div>
      </section>

      <section className="section-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Cách nhận thưởng</span>
            <h2>3 bước giới thiệu</h2>
          </div>
        </div>
        <div className="task-list">
          <FeatureRow icon={Share2} title="1. Chia sẻ link" description="Gửi link hoặc mã giới thiệu cho bạn bè." value="Bước 1" onOpen={onCopy} />
          <FeatureRow icon={Users} title="2. Bạn bè tham gia" description="Người mới mở app qua link của bạn." value="Bước 2" onOpen={() => {}} />
          <FeatureRow icon={BadgeCheck} title="3. Xác nhận hợp lệ" description="Production cần backend chống tự mời và tài khoản trùng." value={`+${compactMoney(REFERRAL_REWARD)}`} onOpen={() => {}} />
        </div>
      </section>

      <section className="policy-banner">
        <Info size={20} />
        <div>
          <strong>Chưa tự cộng thưởng giới thiệu trong bản demo</strong>
          <span>Không có nút tự tăng số người mời. Khi làm production cần backend ghi người giới thiệu, người được giới thiệu và chỉ cộng một lần sau điều kiện hợp lệ.</span>
        </div>
      </section>
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
        <StatCard icon={CalendarDays} label="Chuỗi điểm danh" value={`${state.checkInStreak} ngày`} detail="Hàng ngày" />
        <StatCard icon={Users} label="Bạn bè đã mời" value={`${state.referralCount}`} detail="Giới thiệu" />
      </section>

      <section className="section-card settings-card">
        <div className="setting-row"><div className="setting-icon"><ShieldCheck size={20} /></div><div><strong>Bảo mật tài khoản</strong><span>Production cần backend xác minh số dư và phần thưởng.</span></div><ChevronRight size={18} /></div>
        <div className="setting-row"><div className="setting-icon"><Landmark size={20} /></div><div><strong>Phương thức thanh toán</strong><span>MoMo và tài khoản ngân hàng.</span></div><ChevronRight size={18} /></div>
        <div className="setting-row"><div className="setting-icon"><Bell size={20} /></div><div><strong>Thông báo</strong><span>Trạng thái nhiệm vụ, điểm danh và rút tiền.</span></div><ChevronRight size={18} /></div>
      </section>

      <section className="section-card developer-card">
        <div>
          <span className="eyebrow">Dành cho phát triển</span>
          <h3>Đặt lại dữ liệu kiểm thử</h3>
          <p>Xóa số dư, giao dịch, điểm danh và nhiệm vụ đã làm trong localStorage rồi tạo lại dữ liệu demo mặc định.</p>
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
        <div className="countdown-ring" style={{ '--progress': `${progress}%` } as CSSProperties}>
          <div>{seconds > 0 ? <><strong>{seconds}</strong><span>giây</span></> : <CheckCircle2 size={36} />}</div>
        </div>
        <p className="modal-note">
          {seconds > 0 ? 'Đang mô phỏng thời gian hoàn thành…' : 'Demo đã hoàn thành. Production phải chờ xác nhận server trước khi cộng tiền.'}
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

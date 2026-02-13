import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getSklandPlayerData, getSklandStatus } from '../services/api'
import Icons from './Icons'
import { PageHeader, Card, Button, Loading } from './common'

interface SklandData {
  uid: string
  nickname: string
  level: number
  registerTs: number
  mainStageProgress: string
  secretary: string
  secretaryName: string
  avatarId: string
  avatarUrl: string
  stageInfo: {
    id: string
    code: string
    name: string
    difficulty: string
    dangerLevel: string
    apCost: number
    thumbnail: string
    stageType: string
    isMainStage: boolean
    isActivityStage: boolean
  } | null
  ap: {
    current: number
    max: number
    completeRecoveryTime: number
  }
  chars: {
    total: number
    elite2: number
    maxLevel: number
    skill7Plus: number
  }
  building: {
    furniture: number
    labor: {
      value: number
      maxValue: number
    }
    manufactures?: any[]
    trading?: any[]
    dormitories?: any[]
    meeting?: any
    hire?: any
    training?: any
  }
  routine: {
    daily: { current: number; total: number }
    weekly: { current: number; total: number }
  } | null
  campaign: {
    reward: { current: number; total: number }
  } | null
  recruit: Array<{
    state: number
    finishTs?: number
    tags?: Array<{ tagId: number; tagName: string }>
  }>
  assistChars?: Array<{
    charId: string
    skinId?: string
    name: string
    level: number
    evolvePhase: number
    mainSkillLvl: number
    skills: any[]
  }>
  social?: any
  training?: any
  clue?: any
}

export default function Dashboard() {
  const [sklandData, setSklandData] = useState<SklandData | null>(null)
  const [sklandStatus, setSklandStatus] = useState<{ isLoggedIn: boolean; phone: string | null }>({ 
    isLoggedIn: false, 
    phone: null 
  })
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [isDarkMode, setIsDarkMode] = useState(false)

  // 检测深色模式
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    }
    
    checkDarkMode()
    
    // 监听主题变化
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    loadDashboardData()
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // 每秒更新当前时间，用于倒计时
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const loadDashboardData = async (forceRefresh: boolean = false) => {
    setLoading(true)
    try {
      const statusResult = await getSklandStatus()
      if (statusResult.success && statusResult.data) {
        setSklandStatus(statusResult.data)
        
        if (statusResult.data.isLoggedIn) {
          const sklandResult = await getSklandPlayerData(!forceRefresh)
          if (sklandResult.success && sklandResult.data) {
            setSklandData(sklandResult.data)
          } else if (sklandResult.error && sklandResult.error.includes('登录已过期')) {
            console.warn('森空岛登录已过期')
            setSklandStatus({ isLoggedIn: false, phone: null })
          }
        }
      }
      
      setLastUpdate(new Date())
    } catch (error) {
      console.error('加载 Dashboard 数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTimeRemaining = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    
    // 判断是今天还是明天
    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth()
    const isTomorrow = date.getDate() === now.getDate() + 1 && date.getMonth() === now.getMonth()
    
    if (isToday) {
      return `今天 ${timeStr}`
    } else if (isTomorrow) {
      return `明天 ${timeStr}`
    } else {
      const month = date.getMonth() + 1
      const day = date.getDate()
      return `${month}月${day}日 ${timeStr}`
    }
  }

  const formatNextApRecovery = (completeRecoveryTime: number, currentAp: number, maxAp: number) => {
    if (currentAp >= maxAp) return '已满'
    
    const remainingSeconds = completeRecoveryTime - currentTime / 1000
    if (remainingSeconds <= 0) return '已满'
    
    // 计算距离下一点理智恢复还需要多少秒
    // 每360秒（6分钟）恢复1点理智
    const secondsToNextAp = remainingSeconds % 360
    const minutes = Math.floor(secondsToNextAp / 60)
    const seconds = Math.floor(secondsToNextAp % 60)
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const formatRecruitTime = (finishTs: number) => {
    const diff = finishTs * 1000 - currentTime
    if (diff <= 0) return '已完成'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const formatRegisterDate = (registerTs: number) => {
    const date = new Date(registerTs * 1000)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <Loading size="lg" color="cyan" text="加载控制台数据..." />
      </div>
    )
  }

  if (!sklandStatus.isLoggedIn) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto pt-20">
          <Card className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Icons.Users />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              未登录森空岛账号
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              登录后可查看实时理智、干员数据、基建状态等详细信息
            </p>
            <Button
              onClick={() => window.location.href = '#/skland-config'}
              variant="gradient"
              gradientFrom="cyan"
              gradientTo="blue"
              size="lg"
            >
              前往登录
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          icon={<Icons.Dashboard />}
          title="控制台"
          subtitle="实时查看游戏数据和账号状态"
          gradientFrom="cyan-400"
          gradientVia="blue-400"
          gradientTo="purple-400"
          actions={
            <Button
              onClick={() => loadDashboardData(true)}
              variant="gradient"
              gradientFrom="cyan"
              gradientTo="blue"
              size="md"
              icon={<Icons.RefreshCw />}
            >
              <span className="hidden sm:inline">刷新数据</span>
            </Button>
          }
        />

        {sklandData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card theme="cyan" animated delay={0.1} className="!bg-white dark:!bg-[rgba(15,15,15,0.6)] overflow-hidden">
              <div className="flex items-center gap-2 mb-6 pb-3 border-b border-gray-200 dark:border-white/10">
                <div className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">博士信息</h3>
              </div>

              <div className="flex items-start gap-6">
                    <div className="relative flex-shrink-0">
                      {sklandData.avatarUrl ? (
                        <div className="relative w-24 h-24">
                          <img 
                            src={`/api/skland/avatar-proxy?url=${encodeURIComponent(sklandData.avatarUrl)}`}
                            alt={sklandData.nickname}
                            className="w-full h-full object-cover shadow-lg"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              const fallback = e.currentTarget.parentElement?.nextElementSibling as HTMLElement
                              if (fallback) fallback.style.display = 'flex'
                            }}
                          />
                          <div className="absolute inset-0 pointer-events-none" style={{
                            background: `
                              linear-gradient(to bottom, rgba(255, 255, 255, 0.2), white) left/1px 100% no-repeat,
                              linear-gradient(to right, white, rgba(255, 255, 255, 0.2)) top/100% 1px no-repeat,
                              linear-gradient(to bottom, rgba(255, 255, 255, 0.2), white) right/1px 100% no-repeat,
                              linear-gradient(to right, white, white) bottom/100% 1px no-repeat
                            `
                          }}></div>
                        </div>
                      ) : null}
                      <div 
                        className="relative w-24 h-24 bg-transparent flex items-center justify-center shadow-lg"
                        style={{ display: sklandData.avatarUrl ? 'none' : 'flex' }}
                      >
                        <span className="text-4xl font-bold text-white">{sklandData.nickname.charAt(0)}</span>
                        <div className="absolute inset-0 pointer-events-none" style={{
                          background: `
                            linear-gradient(to bottom, rgba(255, 255, 255, 0.2), white) left/1px 100% no-repeat,
                            linear-gradient(to right, white, rgba(255, 255, 255, 0.2)) top/100% 1px no-repeat,
                            linear-gradient(to bottom, rgba(255, 255, 255, 0.2), white) right/1px 100% no-repeat,
                            linear-gradient(to right, white, white) bottom/100% 1px no-repeat
                          `
                        }}></div>
                      </div>
                      {/* PC端：等级徽章在头像左上角 */}
                      <div className="hidden sm:flex absolute top-0 left-0 -translate-x-1/2 -translate-y-1/3 w-11 h-11 rounded-full border-2 border-amber-400 bg-black/60 items-center justify-center shadow-lg">
                        <div className="text-center">
                          <div className="text-base font-medium text-white leading-none tracking-wider">{sklandData.level}</div>
                          <div className="text-[11px] text-white font-medium leading-none mt-0.5">Lv</div>
                        </div>
                      </div>
                      <div className="mt-3 w-24 text-center">
                        <div className="text-xs text-white font-medium px-2 py-1" style={{ backgroundColor: '#0277BD' }}>雇佣干员进度</div>
                        <div className="text-[8px] text-gray-600 dark:text-gray-400 uppercase tracking-wider font-bold -mt-0.5">Human Resource</div>
                        <div className="text-3xl font-bold text-white mt-0.5">{sklandData.chars.total}</div>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{sklandData.nickname}</h2>
                        {/* 手机端：等级徽章在用户名右边 */}
                        <div className="sm:hidden flex-shrink-0 w-11 h-11 rounded-full border-2 border-amber-400 bg-black/60 flex items-center justify-center shadow-lg">
                          <div className="text-center">
                            <div className="text-base font-medium text-white leading-none tracking-wider">{sklandData.level}</div>
                            <div className="text-[11px] text-white font-medium leading-none mt-0.5">Lv</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mb-4 flex-wrap">
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono text-xs">ID: {sklandData.uid}</span>
                        <span>·</span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center rounded-sm overflow-hidden">
                            <span className="px-1 py-0.5 text-sm" style={{ backgroundColor: '#0277BD', color: '#ffffff' }}>入职日</span>
                            <span className="px-1 py-0.5 text-gray-900 text-sm" style={{ backgroundColor: '#ffffff' }}>
                              {formatRegisterDate(sklandData.registerTs)}
                            </span>
                          </div>
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#0277BD' }}></div>
                          <div className="w-4 h-4 rounded-full border-[3px]" style={{ borderColor: '#0277BD' }}></div>
                          <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </div>
                      </div>

                      <div className="mt-4 p-3 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50/50 dark:bg-gray-800/20">
                        <div className="flex flex-col gap-3">
                          {/* 标题区域 */}
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <div>
                              <div className="text-sm font-bold text-gray-900 dark:text-white">助战干员</div>
                              <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider leading-none">Support</div>
                            </div>
                          </div>
                          
                          {/* 干员头像区域 */}
                          <div className="flex gap-2 justify-center overflow-x-auto">
                            {sklandData.assistChars && sklandData.assistChars.length > 0 ? (
                              sklandData.assistChars.map((char, index) => (
                                <div key={index} className="flex-shrink-0">
                                  <div className="relative">
                                    <div style={{ width: '80px', height: '80px' }} className="overflow-hidden bg-transparent flex items-center justify-center relative">
                                      <img 
                                        src={`https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/avatar/${char.skinId || char.charId}.png`}
                                        alt={char.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement
                                          const currentSrc = target.src
                                          const skinId = char.skinId || char.charId
                                          if (currentSrc.includes(skinId) && char.skinId && char.skinId !== char.charId) {
                                            target.src = `https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/avatar/${char.charId}.png`
                                          } else if (!currentSrc.includes('_2.png') && !currentSrc.includes('_1.png')) {
                                            target.src = `https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/avatar/${char.charId}_2.png`
                                          } else if (currentSrc.includes('_2.png')) {
                                            target.src = `https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/avatar/${char.charId}_1.png`
                                          } else {
                                            target.style.display = 'none'
                                            const fallback = target.nextElementSibling as HTMLElement
                                            if (fallback) fallback.style.display = 'flex'
                                          }
                                        }}
                                      />
                                      <div 
                                        className="w-full h-full absolute inset-0 flex items-center justify-center text-white text-xl font-bold"
                                        style={{ display: 'none' }}
                                      >
                                        {char.name.charAt(0)}
                                      </div>
                                      <div className="absolute inset-0 pointer-events-none" style={{
                                        background: `
                                          linear-gradient(to bottom, rgba(255, 255, 255, 0.2), white) left/1px 100% no-repeat,
                                          linear-gradient(to right, white, rgba(255, 255, 255, 0.2)) top/100% 1px no-repeat,
                                          linear-gradient(to bottom, rgba(255, 255, 255, 0.2), white) right/1px 100% no-repeat,
                                          linear-gradient(to right, white, white) bottom/100% 1px no-repeat
                                        `
                                      }}></div>
                                    </div>
                                    <div className="absolute top-1 left-1 flex flex-col items-center">
                                      <span className="text-[8px] font-medium text-white leading-none">Lv</span>
                                      <span className="text-xs font-medium text-white leading-none">{char.level}</span>
                                    </div>
                                  </div>
                                  <div className="text-xs text-center text-gray-700 dark:text-gray-300 font-medium mt-1 truncate" style={{ maxWidth: '80px' }}>
                                    {char.name}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-xs text-gray-400 dark:text-gray-500">暂无助战干员</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

            <Card theme="purple" animated delay={0.2} className="!bg-white dark:!bg-[rgba(15,15,15,0.6)]">
              <div className="flex items-center gap-2 mb-6 pb-3 border-b border-gray-200 dark:border-white/10">
                <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-fuchsia-500 rounded-full"></div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">实时数据</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-cyan-500/5 dark:bg-cyan-500/10 border border-gray-200 dark:border-white/10 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">理智</span>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    {sklandData.ap.current}
                    <span className="text-xl text-gray-500 dark:text-gray-400 font-normal">/{sklandData.ap.max}</span>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">
                      {sklandData.ap.current >= sklandData.ap.max ? '已满' : `全部恢复: ${formatTimeRemaining(sklandData.ap.completeRecoveryTime)}`}
                    </div>
                    {sklandData.ap.current < sklandData.ap.max && (
                      <div className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">
                        将在 {formatNextApRecovery(sklandData.ap.completeRecoveryTime, sklandData.ap.current, sklandData.ap.max)} 后恢复1理智
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-purple-500/5 dark:bg-purple-500/10 border border-gray-200 dark:border-white/10 rounded-2xl p-4">
                  <div className="text-xs font-bold text-purple-600 dark:text-purple-400 mb-2">无人机</div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {sklandData.building.labor.value}
                    <span className="text-xl text-gray-500 dark:text-gray-400 font-normal">/{sklandData.building.labor.maxValue}</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all duration-500"
                      style={{ width: `${(sklandData.building.labor.value / sklandData.building.labor.maxValue) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {sklandData.routine && (
                  <>
                    <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-gray-200 dark:border-white/10 rounded-2xl p-4">
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2">每日任务</div>
                      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        {sklandData.routine.daily.current}
                        <span className="text-xl text-gray-500 dark:text-gray-400 font-normal">/{sklandData.routine.daily.total}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: sklandData.routine?.daily.total || 0 }).map((_, i) => (
                          <div 
                            key={i} 
                            className={`h-1.5 flex-1 rounded-full ${i < (sklandData.routine?.daily.current || 0) ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'} transition-all`}
                          ></div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-indigo-500/5 dark:bg-indigo-500/10 border border-gray-200 dark:border-white/10 rounded-2xl p-4">
                      <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-2">每周任务</div>
                      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        {sklandData.routine.weekly.current}
                        <span className="text-xl text-gray-500 dark:text-gray-400 font-normal">/{sklandData.routine.weekly.total}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: sklandData.routine?.weekly.total || 0 }).map((_, i) => (
                          <div 
                            key={i} 
                            className={`h-1.5 flex-1 rounded-full ${i < (sklandData.routine?.weekly.current || 0) ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'} transition-all`}
                          ></div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>

            {sklandData.recruit && sklandData.recruit.length > 0 && (
              <Card theme="amber" animated delay={0.3} className="!bg-white dark:!bg-[rgba(15,15,15,0.6)]">
                <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-200 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full"></div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">公开招募</h3>
                  </div>
                  {sklandData.building.hire?.refreshCount !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                        {sklandData.building.hire.refreshCount}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {sklandData.recruit.map((slot, index) => {
                    // 森空岛 API 状态说明：
                    // state = -1 或 0: 空闲
                    // state = 1 或 2: 招募中（需要检查 finishTs）
                    // 如果 finishTs 已过期，则视为已完成
                    
                    let displayState: number; // 0=空闲, 1=招募中, 2=已完成
                    
                    if (slot.state === -1 || slot.state === 0) {
                      displayState = 0; // 空闲
                    } else if (!slot.finishTs || slot.finishTs <= 0) {
                      displayState = 0; // 没有有效结束时间，视为空闲
                    } else {
                      const diff = slot.finishTs * 1000 - currentTime;
                      if (diff <= 0) {
                        displayState = 2; // 时间已到，已完成
                      } else {
                        displayState = 1; // 招募中
                      }
                    }
                    
                    // 调试信息
                    console.log(`位置${index + 1}:`, {
                      state: slot.state,
                      finishTs: slot.finishTs,
                      displayState,
                      displayStateText: displayState === 0 ? '空闲' : displayState === 1 ? '招募中' : '已完成',
                      currentTime: currentTime / 1000,
                      diff: slot.finishTs ? (slot.finishTs * 1000 - currentTime) / 1000 : 'N/A',
                      formatResult: slot.finishTs ? formatRecruitTime(slot.finishTs) : 'N/A'
                    });
                    
                    // 根据状态和主题设置背景色
                    let backgroundColor: string;
                    if (isDarkMode) {
                      backgroundColor = displayState === 0 
                        ? 'rgba(31, 41, 55, 0.5)' // gray-800/50
                        : displayState === 1 
                        ? 'rgba(30, 58, 138, 0.2)' // blue-900/20
                        : 'rgba(20, 83, 45, 0.2)'; // green-900/20
                    } else {
                      backgroundColor = displayState === 0 
                        ? 'rgb(243, 244, 246)' // gray-100
                        : displayState === 1 
                        ? 'rgb(239, 246, 255)' // blue-50
                        : 'rgb(240, 253, 244)'; // green-50
                    }
                    
                    return (
                      <div 
                        key={index}
                        className="relative border border-gray-200 dark:border-white/10 rounded-xl p-3"
                        style={{ backgroundColor }}
                      >
                      {/* 位置编号 - 左上角 */}
                      <div className="absolute top-2 left-2 w-8 h-8 flex items-center justify-center bg-black/20 dark:bg-white/10 rounded-lg">
                        <span className="text-xl font-bold text-white dark:text-white">
                          {index + 1}
                        </span>
                      </div>

                      {/* 状态标签 - 右上角 */}
                      <div className="flex justify-end mb-2">
                        {displayState === 0 && (
                          <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                            空闲
                          </span>
                        )}
                        {displayState === 1 && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                            招募中
                          </span>
                        )}
                        {displayState === 2 && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">
                            已完成
                          </span>
                        )}
                      </div>

                      {displayState === 0 && (
                        <div className="text-center py-3">
                          <div className="text-base font-medium text-gray-500 dark:text-gray-400">
                            未开始招募
                          </div>
                        </div>
                      )}

                      {displayState === 1 && (
                        <div className="text-center py-2">
                          <div className="text-base font-medium text-blue-600 dark:text-blue-400">
                            {formatRecruitTime(slot.finishTs!)}
                          </div>
                          {slot.tags && slot.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 justify-center mt-2">
                              {slot.tags.map((tag, tagIndex) => (
                                <span 
                                  key={tagIndex}
                                  className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded"
                                >
                                  {tag.tagName}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {displayState === 2 && (
                        <div className="text-center py-2">
                          <div className="text-base font-bold text-green-600 dark:text-green-400 mb-1">
                            招募完成
                          </div>
                          {slot.tags && slot.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 justify-center">
                              {slot.tags.map((tag, tagIndex) => (
                                <span 
                                  key={tagIndex}
                                  className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded"
                                >
                                  {tag.tagName}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                  })}
                </div>
              </Card>
            )}
          </div>
        )}

        {lastUpdate && (
          <motion.div
            className="text-center text-xs text-gray-500 dark:text-gray-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            最后更新: {lastUpdate.toLocaleString('zh-CN')}
          </motion.div>
        )}
      </div>
    </div>
  )
}

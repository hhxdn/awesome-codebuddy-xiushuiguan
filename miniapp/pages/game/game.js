const app = getApp()
const levelUtil = require('../../utils/level')

// 游戏状态常量
const STATE = { IDLE: 'idle', PLAYING: 'playing', PAUSED: 'paused', WIN: 'win', LOSE: 'lose' }
const CANVAS_W = 375
const CANVAS_H = 500
const WORKER_SPEED = 3
const WORKER_SIZE = 30
const CAR_SIZE = 60
const PIPE_SIZE = 25
const INTERACT_RANGE = 50

Page({
  data: {
    level: 1,
    levelConfig: null,
    timeLeft: 120,
    wrenchCount: 0,
    hp: 100,
    maxHp: 100,
    showPickupBtn: false,
    showRepairBtn: false,
    gameState: STATE.IDLE,
    canvasWidth: CANVAS_W,
    canvasHeight: CANVAS_H,

    // 弹窗状态
    showVictory: false,
    victoryStars: 3,
    victoryTime: 0,
    showDefeat: false,
    defeatReason: 'timeout',
    showReward: false
  },

  // 游戏内部状态（不绑定数据以提高性能）
  workerX: 100,
  workerY: 300,
  workerTargetX: 100,
  pipes: [],
  carX: 50,
  carY: 300,
  waterRegions: [],
  gameTimer: null,
  waterTimer: null,
  renderTimer: null,
  frameCount: 0,
  touchStartX: 0,
  _lastNearCar: false,
  _lastNearLeak: false,
  _lastHp: 100,
  _canvasReady: false,
  _pendingStart: false,
  _active: true,          // 页面存活标志
  _gameLoopRafId: null,   // 追踪 requestAnimationFrame ID
  _rewardTimeout: null,   // 追踪激励超时

  onLoad(options) {
    const level = parseInt(options.level) || 1
    this.safeSetData({ level })
    this.initLevel(level)
  },

  onReady() {
    this.initCanvas()
    this._pendingStart = true
  },

  onHide() {
    // 切后台时暂停计时器和动画循环
    if (this.data.gameState === STATE.PLAYING) {
      this.stopAllTimers()
      this._wasPlaying = true
    }
    // 清除待执行的激励超时（避免后台恢复计时器）
    if (this._rewardTimeout) {
      clearTimeout(this._rewardTimeout)
      this._rewardTimeout = null
    }
  },

  onShow() {
    // 从后台回来恢复游戏
    if (this._wasPlaying && this.data.gameState === STATE.PLAYING) {
      this.startTimers()
      this.startGameLoop()
    }
    this._wasPlaying = false
  },

  onUnload() {
    this._active = false
    this.stopAllTimers()
    if (this._rewardTimeout) {
      clearTimeout(this._rewardTimeout)
      this._rewardTimeout = null
    }
  },

  // 安全的 setData，页面销毁后不再调用
  safeSetData(data) {
    if (this._active) {
      this.setData(data)
    }
  },

  // 初始化关卡
  initLevel(level) {
    const config = levelUtil.getLevelConfig(level)
    this.safeSetData({
      level,
      levelConfig: config,
      timeLeft: config.timeLimit,
      wrenchCount: 0,
      hp: 100,
      maxHp: 100
    })

    // 根据场景生成水管位置
    const sceneIndex = config.sceneType
    this.generatePipes(config.pipeCount, sceneIndex)
    this.generateWaterRegions(sceneIndex)
    this.placeCar(sceneIndex)
    this.placeWorker(sceneIndex)

    // 重置 UI 状态追踪
    this._lastNearCar = false
    this._lastNearLeak = false
    this._lastHp = 100
  },

  // 生成水管
  generatePipes(count, sceneIndex) {
    this.pipes = []
    const margin = 60
    const w = CANVAS_W - margin * 2
    const h = CANVAS_H - margin * 2 - 80 // 底部留空间给按钮

    for (let i = 0; i < count; i++) {
      let x, y
      switch (sceneIndex) {
        case 0: // 场景A：右侧集中
          x = CANVAS_W * 0.6 + Math.random() * (CANVAS_W * 0.35)
          y = margin + Math.random() * h
          break
        case 1: // 场景B：左右分散
          x = margin + Math.random() * w
          y = margin + Math.random() * h
          break
        case 2: // 场景C：全屏散落
          x = margin * 0.5 + Math.random() * (CANVAS_W - margin)
          y = margin * 0.3 + Math.random() * (CANVAS_H - margin - 30)
          break
      }

      const isLeaking = i < this.data.levelConfig.leakCount
      this.pipes.push({
        x, y,
        id: i,
        isLeaking,
        isRepaired: false,
        leakTimer: 0,
        waterParticles: []
      })
    }
  },

  // 生成积水区域
  generateWaterRegions(sceneIndex) {
    this.waterRegions = []
    // 初始无积水，从漏水水管逐渐扩散
  },

  // 放置维修车
  placeCar(sceneIndex) {
    switch (sceneIndex) {
      case 0: this.carX = 60; this.carY = 300; break
      case 1: this.carX = CANVAS_W / 2; this.carY = 300; break
      case 2: this.carX = CANVAS_W - 80; this.carY = CANVAS_H - 120; break
    }
  },

  // 放置工人
  placeWorker(sceneIndex) {
    this.workerX = this.carX + 40
    this.workerY = this.carY
    this.workerTargetX = this.workerX
  },

  // 初始化Canvas
  initCanvas() {
    const query = wx.createSelectorQuery()
    query.select('#gameCanvas').fields({ node: true, size: true }).exec((res) => {
      if (res[0]) {
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const dpr = wx.getSystemInfoSync().pixelRatio
        canvas.width = CANVAS_W * dpr
        canvas.height = CANVAS_H * dpr
        ctx.scale(dpr, dpr)
        this.canvasNode = canvas
        this.canvas = canvas
        this.ctx = ctx
        this._canvasReady = true
        // Canvas 就绪后启动游戏
        if (this._pendingStart) {
          this._pendingStart = false
          this.startGame()
        }
      }
    })
  },

  // 开始游戏
  startGame() {
    this.safeSetData({ gameState: STATE.PLAYING })
    this.startTimers()
    this.startGameLoop()
  },

  // 启动游戏循环
  startGameLoop() {
    const canvas = this.canvasNode
    const raf = canvas && canvas.requestAnimationFrame ? canvas.requestAnimationFrame.bind(canvas) : setTimeout
    const cancelRaf = canvas && canvas.cancelAnimationFrame ? canvas.cancelAnimationFrame.bind(canvas) : clearTimeout

    // 保存取消函数引用
    this._cancelRaf = cancelRaf

    const loop = () => {
      if (!this._active || this.data.gameState !== STATE.PLAYING) return
      this.frameCount++
      this.update()
      this.render()
      if (this._active) {
        this.renderTimer = raf(loop)
      }
    }
    loop()
  },

  // 启动计时器
  startTimers() {
    // 倒计时
    this.gameTimer = setInterval(() => {
      if (!this._active || this.data.gameState !== STATE.PLAYING) return
      let timeLeft = this.data.timeLeft - 1
      if (timeLeft <= 0) {
        timeLeft = 0
        this.gameOver('timeout')
      }
      this.safeSetData({ timeLeft })
    }, 1000)

    // 积水扩散
    this.waterTimer = setInterval(() => {
      if (!this._active || this.data.gameState !== STATE.PLAYING) return
      this.spreadWater()
    }, 500)
  },

  // 停止所有计时器
  stopAllTimers() {
    if (this.gameTimer) { clearInterval(this.gameTimer); this.gameTimer = null }
    if (this.waterTimer) { clearInterval(this.waterTimer); this.waterTimer = null }
    if (this.renderTimer) {
      if (this._cancelRaf) {
        this._cancelRaf(this.renderTimer)
      } else {
        clearTimeout(this.renderTimer)
      }
      this.renderTimer = null
    }
  },

  // 触摸事件
  onTouchStart(e) {
    this.touchStartX = e.touches[0].x
  },

  onTouchMove(e) {
    if (this.data.gameState !== STATE.PLAYING) return
    const dx = e.touches[0].x - this.touchStartX
    this.workerTargetX += dx * 0.5
    this.workerTargetX = Math.max(20, Math.min(CANVAS_W - 20, this.workerTargetX))
    this.touchStartX = e.touches[0].x
  },

  onTouchEnd() {
    this.touchStartX = 0
  },

  // 更新游戏逻辑
  update() {
    if (this.data.gameState !== STATE.PLAYING) return

    // 移动工人
    const dx = this.workerTargetX - this.workerX
    if (Math.abs(dx) > 1) {
      this.workerX += Math.sign(dx) * Math.min(WORKER_SPEED, Math.abs(dx))
    }

    // 检查与车辆的交互
    const distToCar = Math.hypot(this.workerX - this.carX, this.workerY - this.carY)
    const nearCar = distToCar < INTERACT_RANGE

    // 检查与漏水水管的交互
    let nearLeakingPipe = false
    let nearestPipe = null
    for (const pipe of this.pipes) {
      if (pipe.isLeaking && !pipe.isRepaired) {
        const dist = Math.hypot(this.workerX - pipe.x, this.workerY - pipe.y)
        if (dist < INTERACT_RANGE) {
          nearLeakingPipe = true
          nearestPipe = pipe
          break
        }
      }
    }

    // 更新按钮显示（仅在状态变化时 setData，避免每帧都触发渲染）
    if (this._lastNearCar !== nearCar || this._lastNearLeak !== nearLeakingPipe) {
      this._lastNearCar = nearCar
      this._lastNearLeak = nearLeakingPipe
      this.safeSetData({
        showPickupBtn: nearCar && !nearLeakingPipe,
        showRepairBtn: nearLeakingPipe && !nearCar
      })
    }

    // 检查积水伤害
    this.checkWaterDamage()
  },

  // 检查积水伤害
  checkWaterDamage() {
    const config = this.data.levelConfig
    for (const region of this.waterRegions) {
      if (region.radius > 10) {
        const dist = Math.hypot(this.workerX - region.x, this.workerY - region.y)
        if (dist < region.radius) {
          let hp = this.data.hp - (10 / 60) // 每秒10点，60fps
          if (hp <= 0) {
            hp = 0
            this.safeSetData({ hp: 0 })
            this.gameOver('hp')
            return
          }
          // 节流：每 15 帧（约 0.25 秒）才 setData 一次
          if (this.frameCount % 15 === 0 || Math.abs(this._lastHp - hp) > 2) {
            this._lastHp = hp
            this.safeSetData({ hp: Math.max(0, Math.floor(hp)) })
          } else {
            this.data.hp = Math.max(0, Math.floor(hp))
          }
          break
        }
      }
    }
  },

  // 积水扩散
  spreadWater() {
    const speed = this.data.levelConfig ? this.data.levelConfig.waterSpeed : 1
    let hasChange = false

    for (const pipe of this.pipes) {
      if (pipe.isLeaking && !pipe.isRepaired) {
        // 检查是否已有对应积水区域
        let found = false
        for (const region of this.waterRegions) {
          if (Math.hypot(region.x - pipe.x, region.y - pipe.y) < 20) {
            region.radius += speed * 2
            region.radius = Math.min(region.radius, CANVAS_W * 0.6)
            found = true
            break
          }
        }
        if (!found) {
          this.waterRegions.push({ x: pipe.x, y: pipe.y + 20, radius: 5 })
        }
        hasChange = true
      }
    }

    // 随机爆管
    if (this.data.levelConfig && Math.random() < this.data.levelConfig.burstProb / 60) {
      const unrepairedLeaking = this.pipes.filter(p => p.isLeaking && !p.isRepaired)
      if (unrepairedLeaking.length < this.pipes.length) {
        const candidates = this.pipes.filter(p => !p.isLeaking)
        if (candidates.length > 0) {
          const pipe = candidates[Math.floor(Math.random() * candidates.length)]
          pipe.isLeaking = true
        }
      }
    }

    // 检查积水覆盖率
    this.checkFloodLevel()
  },

  // 检查积水覆盖率
  checkFloodLevel() {
    const totalArea = CANVAS_W * CANVAS_H
    let waterArea = 0
    for (const region of this.waterRegions) {
      waterArea += Math.PI * region.radius * region.radius
    }
    const coverage = waterArea / totalArea
    if (coverage > 0.8) {
      this.gameOver('flood')
    }
  },

  // 渲染
  render() {
    const ctx = this.ctx
    if (!ctx) return

    // 清屏 - 背景
    ctx.fillStyle = '#E3F2FD'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    // 绘制地面
    ctx.fillStyle = '#BBDEFB'
    ctx.fillRect(0, CANVAS_H - 30, CANVAS_W, 30)
    ctx.fillStyle = '#90CAF9'
    ctx.fillRect(0, CANVAS_H - 5, CANVAS_W, 5)

    // 绘制积水
    this.renderWater(ctx)

    // 绘制维修车
    this.renderCar(ctx)

    // 绘制水管
    this.renderPipes(ctx)

    // 绘制工人
    this.renderWorker(ctx)
  },

  // 渲染积水
  renderWater(ctx) {
    for (const region of this.waterRegions) {
      if (region.radius < 3) continue
      const gradient = ctx.createRadialGradient(region.x, region.y, 0, region.x, region.y, region.radius)
      gradient.addColorStop(0, 'rgba(33, 150, 243, 0.4)')
      gradient.addColorStop(0.6, 'rgba(33, 150, 243, 0.2)')
      gradient.addColorStop(1, 'rgba(33, 150, 243, 0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(region.x, region.y, region.radius, 0, Math.PI * 2)
      ctx.fill()
    }
  },

  // 渲染维修车
  renderCar(ctx) {
    const cx = this.carX, cy = this.carY

    // 车身
    ctx.fillStyle = '#FF9800'
    ctx.fillRect(cx - CAR_SIZE/2, cy - CAR_SIZE/3, CAR_SIZE, CAR_SIZE * 0.6)

    // 车顶
    ctx.fillStyle = '#F57C00'
    ctx.fillRect(cx - CAR_SIZE/3, cy - CAR_SIZE/2, CAR_SIZE * 0.65, CAR_SIZE * 0.25)

    // 车轮
    ctx.fillStyle = '#333'
    ctx.beginPath()
    ctx.arc(cx - CAR_SIZE/3, cy + CAR_SIZE/3, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx + CAR_SIZE/3, cy + CAR_SIZE/3, 12, 0, Math.PI * 2)
    ctx.fill()

    // 工具箱标记
    ctx.fillStyle = '#2196F3'
    ctx.fillRect(cx - 10, cy - CAR_SIZE/4, 20, 15)
    ctx.fillStyle = '#fff'
    ctx.font = '12px sans-serif'
    ctx.fillText('🔧', cx - 8, cy - CAR_SIZE/6)

    // 领取范围提示（闪光）
    if (this.data.showPickupBtn) {
      ctx.strokeStyle = 'rgba(76, 175, 80, 0.6)'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.arc(cx, cy, INTERACT_RANGE, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
    }
  },

  // 渲染水管
  renderPipes(ctx) {
    for (const pipe of this.pipes) {
      const { x, y, isLeaking, isRepaired } = pipe

      // 水管主体
      ctx.fillStyle = isRepaired ? '#4CAF50' : (isLeaking ? '#F44336' : '#90A4AE')
      ctx.fillRect(x - PIPE_SIZE/2, y - 6, PIPE_SIZE, 12)

      // 水管接头
      ctx.fillStyle = isRepaired ? '#388E3C' : (isLeaking ? '#D32F2F' : '#607D8B')
      ctx.fillRect(x - PIPE_SIZE/2 - 4, y - 10, 8, 20)
      ctx.fillRect(x + PIPE_SIZE/2 - 4, y - 10, 8, 20)

      // 修复后的闪光
      if (isRepaired && this.frameCount % 30 < 15) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
        ctx.fillRect(x - PIPE_SIZE/2, y - 6, PIPE_SIZE, 12)
      }

      // 喷水动画
      if (isLeaking && !isRepaired) {
        const sprayY = y - 10 - Math.sin(this.frameCount * 0.1 + pipe.id) * 5
        ctx.fillStyle = 'rgba(33, 150, 243, 0.7)'
        ctx.beginPath()
        ctx.arc(x, sprayY, 4 + Math.random() * 2, 0, Math.PI * 2)
        ctx.fill()

        // 水滴粒子
        for (let i = 0; i < 3; i++) {
          const px = x + (Math.random() - 0.5) * PIPE_SIZE
          const py = sprayY - Math.random() * 15
          ctx.fillStyle = 'rgba(100, 181, 246, 0.5)'
          ctx.beginPath()
          ctx.arc(px, py, 2, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // 高亮提示（维修范围）
      if (isLeaking && !isRepaired && this.data.showRepairBtn) {
        const dist = Math.hypot(this.workerX - x, this.workerY - y)
        if (dist < INTERACT_RANGE) {
          ctx.strokeStyle = 'rgba(244, 67, 54, 0.6)'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(x, y, INTERACT_RANGE, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
    }
  },

  // 渲染工人
  renderWorker(ctx) {
    const wx = this.workerX, wy = this.workerY
    const isWalking = Math.abs(this.workerTargetX - this.workerX) > 1

    ctx.save()
    ctx.translate(wx, wy)

    // 身体
    const bodyBob = isWalking ? Math.sin(this.frameCount * 0.2) * 2 : 0
    ctx.fillStyle = '#2196F3'
    ctx.fillRect(-12, -20 + bodyBob, 24, 28)

    // 安全帽
    ctx.fillStyle = '#FF9800'
    ctx.beginPath()
    ctx.arc(0, -22 + bodyBob, 14, Math.PI, 0)
    ctx.fill()
    ctx.fillRect(-16, -23 + bodyBob, 32, 4)

    // 头部
    ctx.fillStyle = '#FFCC80'
    ctx.beginPath()
    ctx.arc(0, -18 + bodyBob, 9, 0, Math.PI * 2)
    ctx.fill()

    // 手臂（举扳手）
    ctx.strokeStyle = '#1565C0'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(10, -12 + bodyBob)
    ctx.lineTo(18, -25 + bodyBob)
    ctx.stroke()

    // 扳手
    ctx.strokeStyle = '#607D8B'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(15, -20 + bodyBob)
    ctx.lineTo(22, -28 + bodyBob)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(22, -30 + bodyBob, 5, 0, Math.PI * 2)
    ctx.stroke()

    // 腿
    if (isWalking) {
      ctx.strokeStyle = '#1565C0'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(-6, 8 + bodyBob)
      ctx.lineTo(-10, 20 + Math.sin(this.frameCount * 0.2) * 5)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(6, 8 + bodyBob)
      ctx.lineTo(10, 20 - Math.sin(this.frameCount * 0.2) * 5)
      ctx.stroke()
    } else {
      ctx.strokeStyle = '#1565C0'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(-6, 8 + bodyBob)
      ctx.lineTo(-8, 20)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(6, 8 + bodyBob)
      ctx.lineTo(8, 20)
      ctx.stroke()
    }

    ctx.restore()
  },

  // 领取扳手
  onPickupWrench() {
    if (this.data.gameState !== STATE.PLAYING) return
    const pickupCount = this.data.levelConfig.wrenchPerPickup
    this.safeSetData({
      wrenchCount: this.data.wrenchCount + pickupCount,
      showPickupBtn: false
    })
    wx.showToast({ title: `+${pickupCount} 🔧`, icon: 'none', duration: 800 })
  },

  // 维修水管
  onRepairPipe() {
    if (this.data.gameState !== STATE.PLAYING) return
    if (this.data.wrenchCount <= 0) {
      wx.showToast({ title: '扳手不足！请回维修车领取', icon: 'none', duration: 1500 })
      return
    }

    // 找到最近漏水水管
    let nearestPipe = null
    let nearestDist = Infinity
    for (const pipe of this.pipes) {
      if (pipe.isLeaking && !pipe.isRepaired) {
        const dist = Math.hypot(this.workerX - pipe.x, this.workerY - pipe.y)
        if (dist < INTERACT_RANGE && dist < nearestDist) {
          nearestDist = dist
          nearestPipe = pipe
        }
      }
    }

    if (nearestPipe) {
      nearestPipe.isRepaired = true
      this.safeSetData({
        wrenchCount: this.data.wrenchCount - 1,
        showRepairBtn: false
      })
      wx.vibrateShort({ type: 'light' })

      // 检查是否全部修完
      this.checkWinCondition()
    }
  },

  // 检查胜利条件
  checkWinCondition() {
    const remainingLeaks = this.pipes.filter(p => p.isLeaking && !p.isRepaired)
    if (remainingLeaks.length === 0) {
      this.stopAllTimers()
      const timeUsed = this.data.levelConfig.timeLimit - this.data.timeLeft
      const stars = levelUtil.calcStars(timeUsed, this.data.levelConfig)

      this.safeSetData({
        gameState: STATE.WIN,
        showVictory: true,
        victoryStars: stars,
        victoryTime: timeUsed
      })

      // 提交结果到后端
      this.submitResult(true, stars, timeUsed)
    }
  },

  // 游戏结束
  gameOver(reason) {
    if (this.data.gameState !== STATE.PLAYING) return
    this.stopAllTimers()
    this.safeSetData({
      gameState: STATE.LOSE,
      showDefeat: true,
      defeatReason: reason
    })
    this.submitResult(false, 0, this.data.levelConfig.timeLimit - this.data.timeLeft)
  },

  // 提交游戏结果
  submitResult(isWin, stars, timeUsed) {
    const userInfo = app.globalData.userInfo || {}
    const level = this.data.level
    // 更新本地最高关卡
    // 安全读取 highestLevel
    let savedLevel = 0
    try { savedLevel = wx.getStorageSync('highestLevel') || 0 } catch (e) {}
    if (isWin && level > savedLevel) {
      wx.setStorageSync('highestLevel', level)
    }

    // 提交到后端
    const request = require('../../utils/request')
    request.post('/api/game/result', {
      userId: userInfo.id,
      level,
      stars,
      timeUsed,
      isWin,
      failReason: isWin ? null : this.data.defeatReason
    }).catch(() => {
      // 提交失败不影响游戏体验
    })
  },

  // 弹窗事件 - 胜利
  onVictoryNext() {
    this.safeSetData({ showVictory: false })
    wx.redirectTo({ url: `/pages/game/game?level=${this.data.level + 1}` })
  },
  onVictoryReplay() {
    this.safeSetData({ showVictory: false })
    this.initLevel(this.data.level)
    this.startGame()
  },
  onVictoryShare() {
    // 微信分享（需要button open-type="share"）
  },
  onVictoryWatchAd() {
    this.safeSetData({ showVictory: false, showReward: true })
  },

  // 弹窗事件 - 失败
  onDefeatRetry() {
    this.safeSetData({ showDefeat: false })
    this.initLevel(this.data.level)
    this.startGame()
  },
  onDefeatWatchAd() {
    this.safeSetData({ showDefeat: false, showReward: true })
  },

  // 弹窗事件 - 激励视频
  onSelectReward(e) {
    const rewardId = e.detail.type
    // 模拟观看广告
    wx.showToast({ title: '广告播放中...', icon: 'loading', duration: 1500 })
    // 清除之前的超时（避免重复）
    if (this._rewardTimeout) clearTimeout(this._rewardTimeout)
    this._rewardTimeout = setTimeout(() => {
      this._rewardTimeout = null
      // 页面已销毁则放弃
      if (!this._active) return
      this.safeSetData({ showReward: false })
      switch (rewardId) {
        case 'wrench':
          this.safeSetData({ wrenchCount: this.data.wrenchCount + 3 })
          wx.showToast({ title: '+3 🔧', icon: 'success' })
          break
        case 'time':
          this.safeSetData({ timeLeft: this.data.timeLeft + 30 })
          wx.showToast({ title: '+30秒', icon: 'success' })
          break
        case 'hp':
          this.safeSetData({ hp: this.data.maxHp, gameState: STATE.PLAYING })
          this.startTimers()
          this.startGameLoop()
          wx.showToast({ title: '满血复活！', icon: 'success' })
          break
      }
    }, 1500)
  },
  onCloseReward() {
    this.safeSetData({ showReward: false })
  },

  // 暂停/继续
  togglePause() {
    if (this.data.gameState === STATE.PLAYING) {
      this.stopAllTimers()
      this.safeSetData({ gameState: STATE.PAUSED })
    } else if (this.data.gameState === STATE.PAUSED) {
      this.safeSetData({ gameState: STATE.PLAYING })
      this.startTimers()
      this.startGameLoop()
    }
  },

  // 退出游戏
  exitGame() {
    wx.showModal({
      title: '退出游戏',
      content: '确定要退出当前关卡吗？',
      success: (res) => {
        if (res.confirm) {
          this.stopAllTimers()
          wx.navigateBack()
        }
      }
    })
  }
})

const app = getApp()
const levelUtil = require('../../utils/level')
const audio = require('../../utils/audio')

// 工具函数：圆角矩形
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

// 游戏状态常量
const STATE = { IDLE: 'idle', PLAYING: 'playing', PAUSED: 'paused', WIN: 'win', LOSE: 'lose' }
const CANVAS_W = 375
const CANVAS_H = 500
const WORKER_SPEED = 3
const WORKER_SIZE = 30
const CAR_SIZE = 60
const PIPE_SIZE = 25
const INTERACT_RANGE = 50

// 道具/高压水管常量
const PIPE_TYPE = levelUtil.PIPE_TYPE
const POWERUP_TYPES = levelUtil.POWERUP_TYPES
const POWERUP_SPAWN_MIN = 8000   // 最小生成间隔 8秒
const POWERUP_SPAWN_MAX = 15000  // 最大生成间隔 15秒
const POWERUP_LIFETIME = 12000   // 道具存在时间 12秒
const POWERUP_SIZE = 22          // 道具图标大小

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
    // 活跃Buff列表（UI显示）
    activeBuffsList: [],
    // 连击计数（UI显示）
    comboCount: 0,

    // 弹窗状态
    showVictory: false,
    victoryStars: 3,
    victoryTime: 0,
    showDefeat: false,
    defeatReason: 'timeout',
    showReward: false,
    // 奖励数据
    rewardCoins: 0,
    rewardMessage: '',
    totalCoins: 0,
    isFirstClear: false,
    showReward: false
  },

  // 游戏内部状态（不绑定数据以提高性能）
  workerX: 100,
  workerY: 300,
  workerTargetX: 100,
  workerTargetY: 300,
  workerFacing: 1,        // 1=右 -1=左
  pipes: [],
  carX: 50,
  carY: 300,
  waterRegions: [],
  waterParticles: [],     // 水花粒子效果
  repairParticles: [],    // 维修火花粒子
  gameTimer: null,
  waterTimer: null,
  renderTimer: null,
  frameCount: 0,
  touchStartX: 0,
  touchStartY: 0,
  _lastNearCar: false,
  _lastNearLeak: false,
  _lastHp: 100,
  _canvasReady: false,
  _pendingStart: false,
  _autoRepairPipe: null,  // 点击水管后的自动维修目标
  _tapStartX: undefined,
  _tapStartY: undefined,
  // 道具系统
  _workerSpeed: WORKER_SPEED, // 动态移速
  powerUps: [],            // 地图上的道具
  activeBuffs: {},         // 当前生效的Buff { key: expireTime }
  _pendingAoeRepair: false,// 待触发的范围维修
  _coinBonus: false,       // 金币加成是否生效
  _magnetActive: false,    // 磁铁是否生效
  _waterSoundCd: 0,        // 漏水伤害音效冷却
  powerUpSpawnTimer: null,
  // 连击系统
  _combo: 0,              // 当前连击数
  _comboTimer: null,       // 连击计时器
  _lastRepairTime: 0,     // 上次维修时间
  _maxCombo: 0,           // 最高连击
  // 粒子系统扩展
  _dustParticles: [],     // 跑步尘土粒子
  _comboParticles: [],    // 连击特效粒子

  onLoad(options) {
    const level = parseInt(options.level) || 1
    this.setData({ level })
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
    this.stopAllTimers()
    audio.stopAll()
  },

  // 初始化关卡
  initLevel(level) {
    audio.stopAll()
    const config = levelUtil.getLevelConfig(level)
    this.setData({
      level,
      levelConfig: config,
      timeLeft: config.timeLimit,
      wrenchCount: 0,
      hp: 100,
      maxHp: 100
    })

    // 先放车，再生成水管（让水管避开车辆位置）
    const sceneIndex = config.sceneType
    this.placeCar(sceneIndex)
    this.generatePipes(config.pipeCount, sceneIndex)
    this.generateWaterRegions(sceneIndex)
    this.placeWorker(sceneIndex)

    // 重置 UI 状态追踪
    this._lastNearCar = false
    this._lastNearLeak = false
    this._lastHp = 100
    this._autoRepairPipe = null
    // 重置道具系统
    this.powerUps = []
    this.activeBuffs = {}
    this._pendingAoeRepair = false
    this._coinBonus = false
    this._magnetActive = false
    this._workerSpeed = WORKER_SPEED
    // 重置连击系统
    this._combo = 0
    this._maxCombo = 0
    this._lastRepairTime = 0
    this._dustParticles = []
    this._comboParticles = []
    if (this._comboTimer) clearTimeout(this._comboTimer)
    this.setData({ activeBuffsList: [], comboCount: 0 })
    this.stopPowerUpTimer()
  },

  // 水管之间最小间距（避免视觉重叠）
  _PIPE_MIN_DIST: 55,

  // 检测位置是否与已有水管重叠
  _isOverlappingPipes(x, y) {
    for (const pipe of this.pipes) {
      const dist = Math.hypot(x - pipe.x, y - pipe.y)
      if (dist < this._PIPE_MIN_DIST) return true
    }
    return false
  },

  // 检测位置是否与维修车重叠
  _isOverlappingCar(x, y) {
    const dist = Math.hypot(x - this.carX, y - this.carY)
    return dist < 65  // 车身半径 ~30 + 水管半宽 ~22 + 余量
  },

  // 生成水管
  generatePipes(count, sceneIndex) {
    this.pipes = []
    const margin = 60
    const w = CANVAS_W - margin * 2
    const h = CANVAS_H - margin * 2 - 80 // 底部留空间给按钮

    for (let i = 0; i < count; i++) {
      let x, y
      let attempts = 0
      const maxAttempts = 100

      // 重试直到找到不重叠的位置
      do {
        switch (sceneIndex) {
          case 0: // 住宅区：右侧集中
            x = CANVAS_W * 0.6 + Math.random() * (CANVAS_W * 0.35)
            y = margin + Math.random() * h
            break
          case 1: // 商业区：左右分散
            x = margin + Math.random() * w
            y = margin + Math.random() * h
            break
          case 2: // 工业区：全屏散落
            x = margin * 0.5 + Math.random() * (CANVAS_W - margin)
            y = margin * 0.3 + Math.random() * (CANVAS_H - margin - 30)
            break
          case 3: // 地下管道：底部密集
            x = margin + Math.random() * w
            y = CANVAS_H * 0.4 + Math.random() * (CANVAS_H * 0.5)
            break
          case 4: // 河边管道：水平排列
            x = margin + Math.random() * w
            y = margin * 0.5 + Math.random() * (CANVAS_H * 0.4)
            break
        }
        attempts++
      } while ((this._isOverlappingPipes(x, y) || this._isOverlappingCar(x, y)) && attempts < maxAttempts)

      const isLeaking = i < this.data.levelConfig.leakCount
      // 高压水管分配：从末尾开始标记（保证初始漏水中的高压管数量合理）
      const highCount = this.data.levelConfig.highPressureCount || 0
      const isHighPressure = i >= count - highCount
      this.pipes.push({
        x, y,
        id: i,
        isLeaking,
        isRepaired: false,
        type: isHighPressure ? PIPE_TYPE.HIGH_PRESSURE : PIPE_TYPE.NORMAL,
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
      case 3: this.carX = 60; this.carY = CANVAS_H - 120; break
      case 4: this.carX = CANVAS_W - 80; this.carY = CANVAS_H - 120; break
    }
  },

  // 放置工人
  placeWorker(sceneIndex) {
    this.workerX = this.carX + 40
    this.workerY = this.carY
    this.workerTargetX = this.workerX
    this.workerTargetY = this.workerY
    this.workerFacing = 1
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
    this.setData({ gameState: STATE.PLAYING })
    this.startTimers()
    this.startGameLoop()
    this.startPowerUpTimer()
  },

  // 启动游戏循环
  startGameLoop() {
    const canvas = this.canvasNode
    const raf = canvas && canvas.requestAnimationFrame ? canvas.requestAnimationFrame.bind(canvas) : setTimeout
    const cancelRaf = canvas && canvas.cancelAnimationFrame ? canvas.cancelAnimationFrame.bind(canvas) : clearTimeout

    // 保存取消函数引用
    this._cancelRaf = cancelRaf

    const loop = () => {
      if (this.data.gameState !== STATE.PLAYING) return
      this.frameCount++
      if (this._waterSoundCd > 0) this._waterSoundCd--
      this.update()
      this.render()
      this.renderTimer = raf(loop)
    }
    loop()
  },

  // 启动计时器
  startTimers() {
    // 倒计时
    this.gameTimer = setInterval(() => {
      if (this.data.gameState !== STATE.PLAYING) return
      let timeLeft = this.data.timeLeft - 1
      if (timeLeft <= 0) {
        timeLeft = 0
        this.gameOver('timeout')
      }
      // 倒计时10秒警告音效
      if (timeLeft > 0 && timeLeft <= 10) {
        audio.play('COUNTDOWN')
      }
      this.setData({ timeLeft })
    }, 1000)

    // 积水扩散
    this.waterTimer = setInterval(() => {
      if (this.data.gameState !== STATE.PLAYING) return
      this.spreadWater()
    }, 500)
  },

  // 停止所有计时器
  stopAllTimers() {
    if (this.gameTimer) clearInterval(this.gameTimer)
    if (this.waterTimer) clearInterval(this.waterTimer)
    this.stopPowerUpTimer()
    if (this.renderTimer) {
      if (this._cancelRaf) {
        this._cancelRaf(this.renderTimer)
      } else {
        clearTimeout(this.renderTimer)
      }
    }
  },

  // 道具生成计时器
  startPowerUpTimer() {
    this.scheduleNextPowerUp()
  },
  scheduleNextPowerUp() {
    if (this.powerUpSpawnTimer) clearTimeout(this.powerUpSpawnTimer)
    const delay = POWERUP_SPAWN_MIN + Math.random() * (POWERUP_SPAWN_MAX - POWERUP_SPAWN_MIN)
    this.powerUpSpawnTimer = setTimeout(() => {
      if (this.data.gameState === STATE.PLAYING) {
        this.spawnPowerUp()
        this.scheduleNextPowerUp()
      }
    }, delay)
  },
  stopPowerUpTimer() {
    if (this.powerUpSpawnTimer) {
      clearTimeout(this.powerUpSpawnTimer)
      this.powerUpSpawnTimer = null
    }
  },

  // 在地图上生成随机道具（避免与水管和车辆重叠）
  spawnPowerUp() {
    // 限制地图上最多3个道具
    if (this.powerUps.length >= 3) return
    const types = Object.values(POWERUP_TYPES)
    const type = types[Math.floor(Math.random() * types.length)]
    const margin = 50

    let x, y, attempts = 0
    const maxAttempts = 50
    do {
      x = margin + Math.random() * (CANVAS_W - margin * 2)
      y = margin + Math.random() * (CANVAS_H - margin * 2 - 60)
      attempts++
    } while (attempts < maxAttempts && (
      this._isOverlappingPipes(x, y) ||
      this._isOverlappingCar(x, y) ||
      this.powerUps.some(pu => Math.hypot(x - pu.x, y - pu.y) < 40)
    ))

    this.powerUps.push({
      x, y,
      type: type.key,
      icon: type.icon,
      color: type.color,
      name: type.name,
      spawnTime: Date.now(),
      lifetime: POWERUP_LIFETIME,
      radius: POWERUP_SIZE
    })
  },

  // 触摸事件 - 全向拖拽移动
  onTouchStart(e) {
    this.touchStartX = e.touches[0].x
    this.touchStartY = e.touches[0].y
    // 保存初始触摸位置用于区分点击和拖拽
    this._tapStartX = e.touches[0].x
    this._tapStartY = e.touches[0].y
  },

  onTouchMove(e) {
    if (this.data.gameState !== STATE.PLAYING) return
    const dx = e.touches[0].x - this.touchStartX
    const dy = e.touches[0].y - this.touchStartY
    // 更新目标位置（跟随手指拖拽）
    this.workerTargetX += dx * 0.6
    this.workerTargetY += dy * 0.6
    // 边界限制
    this.workerTargetX = Math.max(20, Math.min(CANVAS_W - 20, this.workerTargetX))
    this.workerTargetY = Math.max(30, Math.min(CANVAS_H - 40, this.workerTargetY))
    // 记录朝向
    if (Math.abs(dx) > 1) this.workerFacing = dx > 0 ? 1 : -1
    this.touchStartX = e.touches[0].x
    this.touchStartY = e.touches[0].y
  },

  onTouchEnd(e) {
    const endX = e.changedTouches[0] ? e.changedTouches[0].x : 0
    const endY = e.changedTouches[0] ? e.changedTouches[0].y : 0

    // 判断是否为点击（移动距离 < 10px 视为点击，非拖拽）
    if (this._tapStartX !== undefined && this.data.gameState === STATE.PLAYING) {
      const tapDx = Math.abs(endX - this._tapStartX)
      const tapDy = Math.abs(endY - this._tapStartY)
      if (tapDx < 10 && tapDy < 10) {
        this.handleCanvasTap(endX, endY)
      }
    }

    this.touchStartX = 0
    this._tapStartX = undefined
    this._tapStartY = undefined
  },

  // 处理 Canvas 点击：检测是否点击了漏水水管
  handleCanvasTap(tapX, tapY) {
    // 找到点击位置范围内的漏水水管
    const tapRange = 45
    let nearestPipe = null
    let nearestDist = Infinity

    for (const pipe of this.pipes) {
      if (pipe.isLeaking && !pipe.isRepaired) {
        const dist = Math.hypot(tapX - pipe.x, tapY - pipe.y)
        if (dist < tapRange && dist < nearestDist) {
          nearestDist = dist
          nearestPipe = pipe
        }
      }
    }

    if (!nearestPipe) return

    if (this.data.wrenchCount <= 0) {
      wx.showToast({ title: '扳手不足！请回维修车领取', icon: 'none', duration: 1500 })
      return
    }

    // 自动移动到水管位置并维修
    audio.play('CLICK')
    this.workerTargetX = nearestPipe.x
    this.workerTargetY = nearestPipe.y
    this._autoRepairPipe = nearestPipe
    wx.showToast({ title: '正在前往维修...', icon: 'none', duration: 600 })
  },

  // 更新游戏逻辑
  update() {
    if (this.data.gameState !== STATE.PLAYING) return

    // 移动工人 - 全向移动
    const dx = this.workerTargetX - this.workerX
    const dy = this.workerTargetY - this.workerY
    const dist = Math.hypot(dx, dy)
    const isWalking = dist > 1
    if (isWalking) {
      const speed = Math.min(this._workerSpeed || WORKER_SPEED, dist)
      this.workerX += (dx / dist) * speed
      this.workerY += (dy / dist) * speed
      // 跑步尘土粒子（每4帧生成一个）
      if (this.frameCount % 4 === 0) {
        this._dustParticles.push({
          x: this.workerX + (Math.random() - 0.5) * 10,
          y: this.workerY + 22,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -Math.random() * 0.5,
          life: 1,
          size: Math.random() * 2 + 1.5
        })
      }
    }

    // 磁铁效果：吸引附近道具
    if (this._magnetActive) {
      const magnetRange = 180
      for (const pu of this.powerUps) {
        const d = Math.hypot(this.workerX - pu.x, this.workerY - pu.y)
        if (d < magnetRange) {
          const pullSpeed = 4 * (1 - d / magnetRange) + 1
          pu.x += (this.workerX - pu.x) / d * pullSpeed
          pu.y += (this.workerY - pu.y) / d * pullSpeed
        }
      }
    }

    // 自动维修：点击水管后自动走到目标并修理
    if (this._autoRepairPipe) {
      const pipe = this._autoRepairPipe
      const distToPipe = Math.hypot(this.workerX - pipe.x, this.workerY - pipe.y)
      if (distToPipe < INTERACT_RANGE && pipe.isLeaking && !pipe.isRepaired && this.data.wrenchCount > 0) {
        this.doRepair(pipe)
        this._autoRepairPipe = null
      }
    }

    // 更新水花粒子
    this.updateParticles()

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
      this.setData({
        showPickupBtn: nearCar && !nearLeakingPipe,
        showRepairBtn: nearLeakingPipe && !nearCar
      })
    }

    // 检查道具拾取
    this.checkPowerUpPickup()
    // 移除过期道具
    this.checkPowerUpExpiry()
    // 检查Buff过期
    this.checkBuffExpiry()

    // 检查积水伤害
    this.checkWaterDamage()
  },

  // 检查积水伤害
  checkWaterDamage() {
    // 护盾Buff生效中，免疫伤害
    if (this.activeBuffs[POWERUP_TYPES.SHIELD.key]) return
    const config = this.data.levelConfig
    for (const region of this.waterRegions) {
      if (region.radius > 10) {
        const dist = Math.hypot(this.workerX - region.x, this.workerY - region.y)
        if (dist < region.radius) {
          // 漏水伤害音效（每秒最多播放一次）
          if (this._waterSoundCd <= 0) {
            audio.play('WATER')
            this._waterSoundCd = 60
          }
          let hp = this.data.hp - (10 / 60) // 每秒10点，60fps
          if (hp <= 0) {
            hp = 0
            this.setData({ hp: 0 })
            this.gameOver('hp')
            return
          }
          // 节流：每 15 帧（约 0.25 秒）才 setData 一次
          if (this.frameCount % 15 === 0 || Math.abs(this._lastHp - hp) > 2) {
            this._lastHp = hp
            this.setData({ hp: Math.max(0, Math.floor(hp)) })
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
    // 冻结Buff生效中，积水不扩散
    if (this.activeBuffs[POWERUP_TYPES.FREEZE.key]) return

    const config = this.data.levelConfig
    const speed = config ? config.waterSpeed : 1

    for (const pipe of this.pipes) {
      if (pipe.isLeaking && !pipe.isRepaired) {
        // 高压水管积水扩散速度翻倍
        const pipeSpeed = pipe.type === PIPE_TYPE.HIGH_PRESSURE ? speed * 2 : speed
        // 检查是否已有对应积水区域
        let found = false
        for (const region of this.waterRegions) {
          if (Math.hypot(region.x - pipe.x, region.y - pipe.y) < 20) {
            region.radius += pipeSpeed * 2
            region.radius = Math.min(region.radius, CANVAS_W * 0.6)
            found = true
            break
          }
        }
        if (!found) {
          this.waterRegions.push({ x: pipe.x, y: pipe.y + 20, radius: 5 })
        }
      }
    }

    // 随机爆管（高压水管爆管概率翻倍）
    if (config) {
      const baseProb = config.burstProb / 60
      const candidates = this.pipes.filter(p => !p.isLeaking && !p.isRepaired)
      if (candidates.length > 0) {
        for (const pipe of candidates) {
          const prob = pipe.type === PIPE_TYPE.HIGH_PRESSURE ? baseProb * 2 : baseProb
          if (Math.random() < prob) {
            pipe.isLeaking = true
            audio.play('BURST')
            break // 每次最多爆一根
          }
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

    // ===== 背景场景 =====
    this.renderBackground(ctx)

    // ===== 积水区域 =====
    this.renderWater(ctx)

    // ===== 水管系统 =====
    this.renderPipes(ctx)

    // ===== 维修车 =====
    this.renderCar(ctx)

    // ===== 粒子效果 =====
    this.renderParticles(ctx)

    // ===== 工人角色 =====
    this.renderWorker(ctx)

    // ===== 道具 =====
    this.renderPowerUps(ctx)

    // ===== 场景前景（围栏、警示带等） =====
    this.renderForeground(ctx)
  },

  // ============ 背景场景 ============
  renderBackground(ctx) {
    const t = this.frameCount

    // 天空渐变
    const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
    skyGrad.addColorStop(0, '#4FC3F7')
    skyGrad.addColorStop(0.3, '#81D4FA')
    skyGrad.addColorStop(0.6, '#B3E5FC')
    skyGrad.addColorStop(0.8, '#E1F5FE')
    skyGrad.addColorStop(1, '#B0BEC5')
    ctx.fillStyle = skyGrad
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    // 太阳
    const sunX = CANVAS_W - 60, sunY = 45
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, 40)
    sunGrad.addColorStop(0, 'rgba(255, 255, 200, 0.9)')
    sunGrad.addColorStop(0.3, 'rgba(255, 245, 180, 0.6)')
    sunGrad.addColorStop(0.6, 'rgba(255, 235, 150, 0.2)')
    sunGrad.addColorStop(1, 'rgba(255, 220, 120, 0)')
    ctx.fillStyle = sunGrad
    ctx.beginPath()
    ctx.arc(sunX, sunY, 40, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#FFF9C4'
    ctx.beginPath()
    ctx.arc(sunX, sunY, 18, 0, Math.PI * 2)
    ctx.fill()

    // 飘动的云朵
    this._renderCloud(ctx, 60 + (t * 0.15) % (CANVAS_W + 100) - 50, 30, 1.0)
    this._renderCloud(ctx, 200 + (t * 0.1) % (CANVAS_W + 100) - 50, 55, 0.7)
    this._renderCloud(ctx, 320 + (t * 0.12) % (CANVAS_W + 100) - 50, 20, 0.85)

    // 飞鸟
    this._renderBird(ctx, 150 + Math.sin(t * 0.03) * 80, 100 + Math.sin(t * 0.025 + 1) * 20, t * 0.05)
    this._renderBird(ctx, 250 + Math.sin(t * 0.035 + 2) * 70, 80 + Math.sin(t * 0.028) * 15, t * 0.04)
    this._renderBird(ctx, 100 + Math.sin(t * 0.028 + 4) * 90, 120 + Math.sin(t * 0.022 + 3) * 18, t * 0.045)

    // 远处建筑轮廓
    ctx.fillStyle = '#B0BEC5'
    for (let i = 0; i < 7; i++) {
      const bx = i * 56 - 10
      const bh = 40 + (i % 3) * 30
      ctx.fillRect(bx, CANVAS_H - 60 - bh, 46, bh + 20)
    }
    // 建筑窗户
    ctx.fillStyle = '#90CAF9'
    for (let i = 0; i < 6; i++) {
      const bx = i * 56 - 5
      const bh = 40 + (i % 3) * 30
      for (let wy = 0; wy < bh - 10; wy += 12) {
        ctx.fillRect(bx + 10, CANVAS_H - 55 - bh + wy, 6, 8)
        ctx.fillRect(bx + 28, CANVAS_H - 55 - bh + wy, 6, 8)
      }
    }

    // 路灯柱
    ctx.fillStyle = '#546E7A'
    ctx.fillRect(30, CANVAS_H - 170, 6, 115)
    ctx.fillRect(155, CANVAS_H - 150, 6, 95)
    ctx.fillRect(280, CANVAS_H - 160, 6, 105)
    // 灯罩
    for (const lx of [33, 158, 283]) {
      ctx.fillStyle = '#FFECB3'
      ctx.beginPath()
      ctx.arc(lx, CANVAS_H - 172, 10, Math.PI, 0)
      ctx.fill()
      ctx.fillStyle = '#FFF8E1'
      ctx.beginPath()
      ctx.arc(lx, CANVAS_H - 172, 5, Math.PI, 0)
      ctx.fill()
    }

    // 地面 - 工业厂房地板
    const floorGrad = ctx.createLinearGradient(0, CANVAS_H - 55, 0, CANVAS_H)
    floorGrad.addColorStop(0, '#78909C')
    floorGrad.addColorStop(0.3, '#90A4AE')
    floorGrad.addColorStop(1, '#546E7A')
    ctx.fillStyle = floorGrad
    ctx.fillRect(0, CANVAS_H - 55, CANVAS_W, 55)

    // 地面网格线
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    for (let gx = 0; gx < CANVAS_W; gx += 30) {
      ctx.beginPath()
      ctx.moveTo(gx, CANVAS_H - 55)
      ctx.lineTo(gx, CANVAS_H)
      ctx.stroke()
    }
    for (let gy = CANVAS_H - 55; gy < CANVAS_H; gy += 15) {
      ctx.beginPath()
      ctx.moveTo(0, gy)
      ctx.lineTo(CANVAS_W, gy)
      ctx.stroke()
    }

    // 地面警示线（黄黑条纹）
    ctx.fillStyle = '#FFC107'
    ctx.fillRect(0, CANVAS_H - 10, CANVAS_W, 4)
    ctx.fillStyle = '#333'
    for (let sx = 0; sx < CANVAS_W; sx += 20) {
      if (Math.floor(sx / 10) % 2 === 0) {
        ctx.fillRect(sx, CANVAS_H - 10, 10, 4)
      }
    }

    // 墙壁 - 工业风格
    ctx.fillStyle = '#CFD8DC'
    ctx.fillRect(0, CANVAS_H - 55, CANVAS_W, 2)
    ctx.fillStyle = '#B0BEC5'
    ctx.fillRect(0, CANVAS_H - 53, CANVAS_W, 1)

    // 墙壁上的管道线路
    ctx.strokeStyle = '#90A4AE'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, CANVAS_H - 48)
    ctx.lineTo(CANVAS_W, CANVAS_H - 48)
    ctx.stroke()
    ctx.strokeStyle = '#EF5350'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(0, CANVAS_H - 42)
    ctx.lineTo(CANVAS_W, CANVAS_H - 42)
    ctx.stroke()
  },

  // 绘制云朵
  _renderCloud(ctx, cx, cy, scale) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.beginPath()
    ctx.arc(cx, cy, 15 * scale, 0, Math.PI * 2)
    ctx.arc(cx + 18 * scale, cy - 5 * scale, 20 * scale, 0, Math.PI * 2)
    ctx.arc(cx + 38 * scale, cy, 16 * scale, 0, Math.PI * 2)
    ctx.arc(cx + 15 * scale, cy + 5 * scale, 13 * scale, 0, Math.PI * 2)
    ctx.fill()
    // 云朵高光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.beginPath()
    ctx.arc(cx + 12 * scale, cy - 3 * scale, 10 * scale, 0, Math.PI * 2)
    ctx.fill()
  },

  // 绘制飞鸟
  _renderBird(ctx, bx, by, wingPhase) {
    const wingAngle = Math.sin(wingPhase) * 0.6
    ctx.strokeStyle = '#546E7A'
    ctx.lineWidth = 1.5
    // 左翅
    ctx.beginPath()
    ctx.moveTo(bx, by)
    ctx.quadraticCurveTo(bx - 6, by + wingAngle * 8, bx - 10, by - 2)
    ctx.stroke()
    // 右翅
    ctx.beginPath()
    ctx.moveTo(bx, by)
    ctx.quadraticCurveTo(bx + 6, by + wingAngle * 8, bx + 10, by - 2)
    ctx.stroke()
  },

  // ============ 场景前景 ============
  renderForeground(ctx) {
    // 安全围栏
    ctx.strokeStyle = '#FF9800'
    ctx.lineWidth = 2
    for (let fx = 0; fx < CANVAS_W; fx += 25) {
      ctx.beginPath()
      ctx.moveTo(fx, CANVAS_H - 55)
      ctx.lineTo(fx, CANVAS_H - 40)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.moveTo(0, CANVAS_H - 40)
    ctx.lineTo(CANVAS_W, CANVAS_H - 40)
    ctx.stroke()
  },

  // ============ 道具系统 ============

  // 渲染道具
  renderPowerUps(ctx) {
    const t = this.frameCount
    for (const pu of this.powerUps) {
      const elapsed = Date.now() - pu.spawnTime
      // 最后3秒闪烁提醒即将消失
      const alpha = elapsed > pu.lifetime - 3000 ? 0.4 + Math.sin(t * 0.3) * 0.3 : 0.85
      const bob = Math.sin(t * 0.05 + pu.x) * 3

      ctx.save()
      // 光晕
      ctx.fillStyle = pu.color.replace(')', `, ${alpha * 0.3})`).replace('rgb', 'rgba')
      if (pu.color.startsWith('#')) {
        ctx.fillStyle = `rgba(${parseInt(pu.color.slice(1,3),16)}, ${parseInt(pu.color.slice(3,5),16)}, ${parseInt(pu.color.slice(5,7),16)}, ${alpha * 0.3})`
      }
      ctx.beginPath()
      ctx.arc(pu.x, pu.y + bob, pu.radius + 8, 0, Math.PI * 2)
      ctx.fill()

      // 底座圆圈
      const bgColor = pu.color.startsWith('#') ? pu.color : '#fff'
      ctx.fillStyle = bgColor
      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.arc(pu.x, pu.y + bob, pu.radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()

      // 图标
      ctx.fillStyle = '#fff'
      ctx.font = `${pu.radius}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(pu.icon, pu.x, pu.y + bob)
      ctx.globalAlpha = 1
      ctx.restore()
    }
  },

  // 检测道具拾取
  checkPowerUpPickup() {
    const wx = this.workerX, wy = this.workerY
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i]
      const dist = Math.hypot(wx - pu.x, wy - pu.y)
      if (dist < pu.radius + 15) {
        audio.play('POWERUP')
        this.applyPowerUp(pu)
        this.powerUps.splice(i, 1)
      }
    }
  },

  // 移除过期道具
  checkPowerUpExpiry() {
    const now = Date.now()
    this.powerUps = this.powerUps.filter(pu => now - pu.spawnTime < pu.lifetime)
  },

  // 检查Buff过期
  checkBuffExpiry() {
    const now = Date.now()
    let changed = false
    for (const [key, expireTime] of Object.entries(this.activeBuffs)) {
      if (now >= expireTime) {
        delete this.activeBuffs[key]
        changed = true
        // 特殊处理一次性Buff
        if (key === POWERUP_TYPES.AOE_REPAIR.key) {
          this._pendingAoeRepair = false
        }
        if (key === POWERUP_TYPES.SPEED_BOOST.key) {
          this._workerSpeed = WORKER_SPEED
        }
        if (key === POWERUP_TYPES.MAGNET.key) {
          this._magnetActive = false
        }
      }
    }
    if (changed) {
      this.updateBuffsList()
    }
  },

  // 更新UI Buff列表
  updateBuffsList() {
    const now = Date.now()
    const list = []
    for (const [key, expireTime] of Object.entries(this.activeBuffs)) {
      if (now < expireTime) {
        const typeInfo = Object.values(POWERUP_TYPES).find(t => t.key === key)
        if (typeInfo) {
          list.push({ key, icon: typeInfo.icon, name: typeInfo.name, color: typeInfo.color })
        }
      }
    }
    // 添加一次性Buff（无倒计时）
    if (this._pendingAoeRepair) {
      const aoe = POWERUP_TYPES.AOE_REPAIR
      list.push({ key: aoe.key, icon: aoe.icon, name: aoe.name, color: aoe.color })
    }
    if (this._coinBonus) {
      const coin = POWERUP_TYPES.COIN_BONUS
      list.push({ key: coin.key, icon: coin.icon, name: coin.name, color: coin.color })
    }
    this.setData({ activeBuffsList: list })
  },

  // 应用道具效果
  applyPowerUp(pu) {
    const now = Date.now()
    switch (pu.type) {
      case POWERUP_TYPES.SPEED_BOOST.key:
        this.activeBuffs[pu.type] = now + POWERUP_TYPES.SPEED_BOOST.duration
        this._workerSpeed = WORKER_SPEED * 2
        wx.showToast({ title: '🏃 加速鞋！移动速度翻倍', icon: 'none', duration: 1500 })
        break
      case POWERUP_TYPES.SHIELD.key:
        this.activeBuffs[pu.type] = now + POWERUP_TYPES.SHIELD.duration
        wx.showToast({ title: '🛡️ 护盾！免疫积水伤害', icon: 'none', duration: 1500 })
        break
      case POWERUP_TYPES.FREEZE.key:
        this.activeBuffs[pu.type] = now + POWERUP_TYPES.FREEZE.duration
        wx.showToast({ title: '❄️ 冻结！积水停止扩散', icon: 'none', duration: 1500 })
        break
      case POWERUP_TYPES.AOE_REPAIR.key:
        this._pendingAoeRepair = true
        wx.showToast({ title: '💥 范围维修！下次维修将修复周围所有漏水', icon: 'none', duration: 2000 })
        break
      case POWERUP_TYPES.COIN_BONUS.key:
        this._coinBonus = true
        wx.showToast({ title: '💰 金币加成！通关额外获得50%金币', icon: 'none', duration: 2000 })
        break
      case POWERUP_TYPES.MAGNET.key:
        this.activeBuffs[pu.type] = now + POWERUP_TYPES.MAGNET.duration
        this._magnetActive = true
        wx.showToast({ title: '🧲 磁铁！自动吸引附近道具', icon: 'none', duration: 1500 })
        break
      case POWERUP_TYPES.HEAL.key:
        this.setData({ hp: Math.min(this.data.maxHp, this.data.hp + 30) })
        this._lastHp = this.data.hp
        wx.showToast({ title: '💚 回复30点生命值！', icon: 'none', duration: 1500 })
        break
    }
    this.updateBuffsList()
    wx.vibrateShort({ type: 'medium' })
  },
  updateParticles() {
    // 更新水花粒子
    this.waterParticles = (this.waterParticles || []).filter(p => {
      p.life -= 0.02
      p.y += p.vy
      p.x += p.vx
      return p.life > 0
    })
    // 维修粒子衰减
    this.repairParticles = (this.repairParticles || []).filter(p => {
      p.life -= 0.03
      p.y += p.vy
      return p.life > 0
    })
    // 跑步尘土粒子衰减
    this._dustParticles = (this._dustParticles || []).filter(p => {
      p.life -= 0.05
      p.y += p.vy
      p.x += p.vx
      return p.life > 0
    })
    // 连击特效粒子衰减
    this._comboParticles = (this._comboParticles || []).filter(p => {
      p.life -= 0.03
      p.y += p.vy
      p.x += p.vx
      p.size -= 0.05
      return p.life > 0
    })
  },

  spawnWaterParticles(x, y, count) {
    for (let i = 0; i < count; i++) {
      this.waterParticles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y,
        vx: (Math.random() - 0.5) * 1.5,
        vy: Math.random() * 2 + 1,
        life: 1,
        size: Math.random() * 3 + 1
      })
    }
  },

  spawnRepairParticles(x, y) {
    for (let i = 0; i < 8; i++) {
      this.repairParticles.push({
        x, y,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 3 - 1,
        life: 1,
        size: Math.random() * 2 + 1
      })
    }
  },

  renderParticles(ctx) {
    // 跑步尘土粒子
    for (const p of (this._dustParticles || [])) {
      ctx.fillStyle = `rgba(158, 158, 158, ${p.life * 0.4})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
    // 连击特效粒子
    for (const p of (this._comboParticles || [])) {
      ctx.fillStyle = p.color.replace(')', `, ${p.life})`).replace('rgb', 'rgba')
      if (p.color.startsWith('#')) {
        const r = parseInt(p.color.slice(1, 3), 16)
        const g = parseInt(p.color.slice(3, 5), 16)
        const b = parseInt(p.color.slice(5, 7), 16)
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.life})`
      }
      ctx.beginPath()
      // 五角星形状
      this._drawStar(ctx, p.x, p.y, p.size, p.size * 0.5, 5)
      ctx.fill()
    }
    // 水花粒子
    for (const p of (this.waterParticles || [])) {
      ctx.fillStyle = `rgba(100, 181, 246, ${p.life * 0.6})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
    // 维修火花粒子
    for (const p of (this.repairParticles || [])) {
      ctx.fillStyle = `rgba(255, 193, 7, ${p.life})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
  },

  // 绘制五角星
  _drawStar(ctx, cx, cy, outerR, innerR, points) {
    const step = Math.PI / points
    ctx.beginPath()
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR
      const angle = i * step - Math.PI / 2
      const x = cx + Math.cos(angle) * r
      const y = cy + Math.sin(angle) * r
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
  },

  // ============ 积水渲染 ============
  renderWater(ctx) {
    for (const region of this.waterRegions) {
      if (region.radius < 3) continue
      // 水面主体
      const grad = ctx.createRadialGradient(region.x, region.y, 0, region.x, region.y, region.radius)
      grad.addColorStop(0, 'rgba(30, 136, 229, 0.45)')
      grad.addColorStop(0.4, 'rgba(33, 150, 243, 0.3)')
      grad.addColorStop(0.7, 'rgba(66, 165, 245, 0.12)')
      grad.addColorStop(1, 'rgba(100, 181, 246, 0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(region.x, region.y, region.radius, 0, Math.PI * 2)
      ctx.fill()

      // 水面波纹
      if (region.radius > 15) {
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'
        ctx.lineWidth = 1
        const rippleR = region.radius * 0.6 + Math.sin(this.frameCount * 0.05 + region.x) * 8
        ctx.beginPath()
        ctx.arc(region.x, region.y, rippleR, 0, Math.PI * 2)
        ctx.stroke()
      }

      // 水面高光
      if (region.radius > 10) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)'
        ctx.beginPath()
        ctx.ellipse(region.x - region.radius * 0.2, region.y - region.radius * 0.2,
          region.radius * 0.3, region.radius * 0.15, -0.3, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  },

  // ============ 维修车渲染 (高精度2D) ============
  renderCar(ctx) {
    const cx = this.carX, cy = this.carY
    const t = this.frameCount

    ctx.save()

    // === 排气管烟雾 ===
    const exhaustX = cx - 28
    const exhaustY = cy + 2
    for (let ei = 0; ei < 2; ei++) {
      const smokeLife = (t * 0.6 + ei * 8) % 20 / 20
      if (smokeLife < 1) {
        const sx = exhaustX - smokeLife * 15
        const sy = exhaustY - smokeLife * 25
        const sa = 1 - smokeLife
        ctx.fillStyle = `rgba(189, 189, 189, ${sa * 0.3})`
        ctx.beginPath()
        ctx.arc(sx, sy, 3 + smokeLife * 6, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // 车身阴影
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.beginPath()
    ctx.ellipse(cx, cy + 22, 34, 6, 0, 0, Math.PI * 2)
    ctx.fill()

    // === 车身主体 ===
    const bodyGrad = ctx.createLinearGradient(cx - 30, 0, cx + 30, 0)
    bodyGrad.addColorStop(0, '#FF9800')
    bodyGrad.addColorStop(0.2, '#FFA726')
    bodyGrad.addColorStop(0.5, '#FF9800')
    bodyGrad.addColorStop(0.8, '#F57C00')
    bodyGrad.addColorStop(1, '#E65100')
    ctx.fillStyle = bodyGrad
    roundRect(ctx, cx - 30, cy - 24, 60, 30, 5)
    ctx.fill()

    // 车身高光带
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    roundRect(ctx, cx - 26, cy - 21, 52, 9, 2)
    ctx.fill()

    // 车身侧面线条
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cx - 25, cy - 8)
    ctx.lineTo(cx + 25, cy - 8)
    ctx.stroke()

    // 驾驶室
    const cabGrad = ctx.createLinearGradient(cx + 5, 0, cx + 30, 0)
    cabGrad.addColorStop(0, '#FF9800')
    cabGrad.addColorStop(0.6, '#F57C00')
    cabGrad.addColorStop(1, '#E65100')
    ctx.fillStyle = cabGrad
    roundRect(ctx, cx + 3, cy - 36, 27, 17, 3)
    ctx.fill()

    // 挡风玻璃
    ctx.fillStyle = '#81D4FA'
    roundRect(ctx, cx + 10, cy - 33, 15, 11, 2)
    ctx.fill()
    // 玻璃反光
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.beginPath()
    ctx.moveTo(cx + 11, cy - 31)
    ctx.lineTo(cx + 17, cy - 31)
    ctx.lineTo(cx + 11, cy - 25)
    ctx.closePath()
    ctx.fill()

    // 侧窗
    ctx.fillStyle = '#81D4FA'
    roundRect(ctx, cx - 28, cy - 31, 13, 10, 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    roundRect(ctx, cx - 26, cy - 29, 9, 6, 1)
    ctx.fill()

    // 前大灯
    ctx.fillStyle = '#FFF9C4'
    ctx.beginPath()
    ctx.arc(cx + 30, cy - 8, 5, 0, Math.PI * 2)
    ctx.fill()
    // 灯光光晕
    ctx.fillStyle = 'rgba(255, 249, 196, 0.15)'
    ctx.beginPath()
    ctx.arc(cx + 30, cy - 8, 12, 0, Math.PI * 2)
    ctx.fill()
    // 尾灯
    ctx.fillStyle = '#EF5350'
    ctx.beginPath()
    ctx.arc(cx - 30, cy - 8, 4, 0, Math.PI * 2)
    ctx.fill()

    // 顶部警示灯（增强闪烁）
    const beaconPhase = Math.sin(t * 0.12)
    ctx.fillStyle = beaconPhase > 0 ? '#FFEB3B' : '#F9A825'
    ctx.beginPath()
    ctx.arc(cx + 8, cy - 38, 5, 0, Math.PI * 2)
    ctx.fill()
    if (beaconPhase > 0) {
      const beaconAlpha = Math.abs(Math.sin(t * 0.12)) * 0.4
      ctx.fillStyle = `rgba(255,235,59,${beaconAlpha})`
      ctx.beginPath()
      ctx.arc(cx + 8, cy - 38, 12, 0, Math.PI * 2)
      ctx.fill()
    }

    // 车顶行李架
    ctx.strokeStyle = '#BF360C'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx - 20, cy - 22)
    ctx.lineTo(cx + 20, cy - 22)
    ctx.stroke()

    // === 车轮 ===
    this.renderWheel(ctx, cx - 20, cy + 8)
    this.renderWheel(ctx, cx + 18, cy + 8)

    // 车轮挡泥板
    ctx.fillStyle = '#E65100'
    ctx.beginPath()
    ctx.arc(cx - 20, cy + 4, 13, Math.PI, 0)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx + 18, cy + 4, 13, Math.PI, 0)
    ctx.fill()
    ctx.fillStyle = '#BF360C'
    ctx.beginPath()
    ctx.arc(cx - 20, cy + 4, 13, Math.PI, 0, true)
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx + 18, cy + 4, 13, Math.PI, 0, true)
    ctx.stroke()

    // 车身文字
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 9px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('维修', cx, cy - 12)

    // 工具箱标识
    ctx.fillStyle = '#1565C0'
    roundRect(ctx, cx - 12, cy - 18, 24, 9, 3)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 7px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('TOOLS', cx, cy - 13)

    // 靠近车辆提示（增强视觉效果）
    if (this.data.showPickupBtn) {
      const pulse = Math.sin(t * 0.07) * 0.2 + 0.6
      ctx.strokeStyle = `rgba(76, 175, 80, ${pulse})`
      ctx.lineWidth = 2.5
      ctx.setLineDash([5, 5])
      ctx.lineDashOffset = t * 0.4
      ctx.beginPath()
      ctx.arc(cx, cy, INTERACT_RANGE, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])

      // 箭头指示
      const arrowAlpha = Math.sin(t * 0.08) * 0.3 + 0.7
      ctx.fillStyle = `rgba(76, 175, 80, ${arrowAlpha})`
      ctx.font = '18px sans-serif'
      ctx.textAlign = 'center'
      const arrowY = cy - INTERACT_RANGE - 8 + Math.sin(t * 0.1) * 4
      ctx.fillText('⬇', cx, arrowY)

      // 扳手图标飘起
      const wrenchFloatY = cy - INTERACT_RANGE - 20 + Math.sin(t * 0.06) * 5
      ctx.fillText('🔧', cx, wrenchFloatY)
    }

    ctx.restore()
  },

  // 车轮绘制（增强版）
  renderWheel(ctx, wx, wy) {
    const rot = this.frameCount * 0.08
    // 轮胎
    ctx.fillStyle = '#37474F'
    ctx.beginPath()
    ctx.arc(wx, wy, 12, 0, Math.PI * 2)
    ctx.fill()
    // 胎面纹理
    ctx.strokeStyle = '#263238'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(wx, wy, 9, 0, Math.PI * 2)
    ctx.stroke()
    // 轮毂底
    ctx.fillStyle = '#607D8B'
    ctx.beginPath()
    ctx.arc(wx, wy, 6, 0, Math.PI * 2)
    ctx.fill()
    // 轮辐（旋转）
    ctx.strokeStyle = '#90A4AE'
    ctx.lineWidth = 1.5
    for (let i = 0; i < 5; i++) {
      const ang = rot + (i * Math.PI * 2 / 5)
      ctx.beginPath()
      ctx.moveTo(wx, wy)
      ctx.lineTo(wx + Math.cos(ang) * 5.5, wy + Math.sin(ang) * 5.5)
      ctx.stroke()
    }
    // 轴心
    ctx.fillStyle = '#546E7A'
    ctx.beginPath()
    ctx.arc(wx, wy, 2.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.beginPath()
    ctx.arc(wx - 0.5, wy - 0.5, 1, 0, Math.PI * 2)
    ctx.fill()
  },

  // ============ 水管渲染 (2D 工业风格) ============
  renderPipes(ctx) {
    for (const pipe of this.pipes) {
      const { x, y, isLeaking, isRepaired, type } = pipe
      const t = this.frameCount
      const isHighPressure = type === PIPE_TYPE.HIGH_PRESSURE
      const pipeW = isHighPressure ? 44 : 40
      const pipeH = isHighPressure ? 18 : 14

      ctx.save()

      // 高压水管：额外红色光晕
      if (isHighPressure && !isRepaired) {
        const glowAlpha = 0.08 + Math.sin(t * 0.05 + pipe.id) * 0.04
        ctx.fillStyle = `rgba(255, 87, 34, ${glowAlpha})`
        ctx.beginPath()
        ctx.arc(x, y, pipeW / 2 + 10, 0, Math.PI * 2)
        ctx.fill()
      }

      // 水管阴影
      ctx.fillStyle = 'rgba(0,0,0,0.15)'
      ctx.beginPath()
      ctx.ellipse(x, y + 10, pipeW / 2 + 2, 4, 0, 0, Math.PI * 2)
      ctx.fill()

      // === 水管主体 ===
      let pipeColor, pipeDark, pipeLight
      if (isRepaired) {
        pipeColor = '#4CAF50'; pipeDark = '#2E7D32'; pipeLight = '#81C784'
      } else if (isLeaking) {
        pipeColor = '#EF5350'; pipeDark = '#C62828'; pipeLight = '#EF9A9A'
      } else if (isHighPressure) {
        // 高压水管：橙红色调，带警示条纹
        pipeColor = '#FF7043'; pipeDark = '#D84315'; pipeLight = '#FFAB91'
      } else {
        pipeColor = '#78909C'; pipeDark = '#546E7A'; pipeLight = '#B0BEC5'
      }

      const pipeGrad = ctx.createLinearGradient(0, y - pipeH / 2, 0, y + pipeH / 2)
      pipeGrad.addColorStop(0, pipeLight)
      pipeGrad.addColorStop(0.25, pipeColor)
      pipeGrad.addColorStop(0.75, pipeColor)
      pipeGrad.addColorStop(1, pipeDark)

      ctx.fillStyle = pipeGrad
      roundRect(ctx, x - pipeW / 2, y - pipeH / 2, pipeW, pipeH, pipeH / 2)
      ctx.fill()

      // 高压水管警示条纹
      if (isHighPressure && !isRepaired) {
        ctx.save()
        ctx.beginPath()
        roundRect(ctx, x - pipeW / 2, y - pipeH / 2, pipeW, pipeH, pipeH / 2)
        ctx.clip()
        ctx.fillStyle = '#FFEB3B'
        for (let sx = x - pipeW / 2; sx < x + pipeW / 2; sx += 10) {
          const angle = -0.4
          ctx.save()
          ctx.translate(sx, y)
          ctx.rotate(angle)
          ctx.fillRect(-3, -pipeH, 4, pipeH * 2)
          ctx.restore()
        }
        ctx.restore()
      }

      // 水管高光线
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x - pipeW / 2 + 5, y - 3)
      ctx.lineTo(x + pipeW / 2 - 5, y - 3)
      ctx.stroke()

      // 管道纹理环
      ctx.strokeStyle = 'rgba(0,0,0,0.1)'
      ctx.lineWidth = 1
      const ringSpacing = pipeW / 4
      for (let rx = x - pipeW / 2 + ringSpacing; rx < x + pipeW / 2; rx += ringSpacing) {
        ctx.beginPath()
        ctx.moveTo(rx, y - pipeH / 2)
        ctx.lineTo(rx, y + pipeH / 2)
        ctx.stroke()
      }

      // 高压水管：蒸汽效果
      if (isHighPressure && !isRepaired) {
        const steamAlpha = 0.2 + Math.sin(t * 0.08 + pipe.id * 2) * 0.1
        ctx.fillStyle = `rgba(255, 255, 255, ${steamAlpha})`
        for (let si = 0; si < 3; si++) {
          const sx = x - 8 + si * 8 + Math.sin(t * 0.06 + si) * 3
          const sy = y - pipeH / 2 - 4 - (t * 0.3 + si * 15) % 20
          ctx.beginPath()
          ctx.arc(sx, sy, 3, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // === 左右接头 ===
      this.renderPipeJoint(ctx, x - pipeW / 2 - 4, y, pipeDark)
      this.renderPipeJoint(ctx, x + pipeW / 2 + 4, y, pipeDark)

      // === 阀门手轮（部分管道有） ===
      if (pipe.id % 2 === 0) {
        const valveRot = t * 0.02 + pipe.id
        ctx.strokeStyle = '#F44336'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(x + pipeW / 4, y - pipeH / 2 - 4, 7, 0, Math.PI * 2)
        ctx.stroke()
        // 十字辐条
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(x + pipeW / 4 - 5, y - pipeH / 2 - 4)
        ctx.lineTo(x + pipeW / 4 + 5, y - pipeH / 2 - 4)
        ctx.moveTo(x + pipeW / 4, y - pipeH / 2 - 9)
        ctx.lineTo(x + pipeW / 4, y - pipeH / 2 + 1)
        ctx.stroke()
      }

      // === 喷水效果 ===
      if (isLeaking && !isRepaired) {
        const sprayBaseY = y - 8
        const sprayHeight = 10 + Math.sin(t * 0.12 + pipe.id) * 4

        // 水柱
        const sprayGrad = ctx.createLinearGradient(x, sprayBaseY, x, sprayBaseY - sprayHeight)
        sprayGrad.addColorStop(0, 'rgba(33, 150, 243, 0.8)')
        sprayGrad.addColorStop(0.5, 'rgba(100, 181, 246, 0.5)')
        sprayGrad.addColorStop(1, 'rgba(144, 202, 249, 0)')
        ctx.fillStyle = sprayGrad
        ctx.beginPath()
        ctx.moveTo(x - 4, sprayBaseY)
        ctx.quadraticCurveTo(x - 2, sprayBaseY - sprayHeight / 2, x - 2, sprayBaseY - sprayHeight)
        ctx.lineTo(x + 2, sprayBaseY - sprayHeight)
        ctx.quadraticCurveTo(x + 2, sprayBaseY - sprayHeight / 2, x + 4, sprayBaseY)
        ctx.closePath()
        ctx.fill()

        // 生成水花粒子（每3帧一次）
        if (t % 3 === 0) {
          this.spawnWaterParticles(x, sprayBaseY - sprayHeight, 2)
        }

        // 裂缝效果
        ctx.strokeStyle = '#FFEB3B'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        const crackX = x - 5 + Math.sin(t * 0.1) * 3
        ctx.moveTo(crackX, y - pipeH / 2)
        ctx.lineTo(crackX + 3, y - pipeH / 2 - 5)
        ctx.lineTo(crackX + 1, y - pipeH / 2 - 9)
        ctx.stroke()
      }

      // === 维修完成后的闪光 ===
      if (isRepaired && t % 40 < 20) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)'
        roundRect(ctx, x - pipeW / 2, y - pipeH / 2, pipeW, pipeH, pipeH / 2)
        ctx.fill()
      }

      // === 维修范围指示 ===
      if (isLeaking && !isRepaired && this.data.showRepairBtn) {
        const dist = Math.hypot(this.workerX - x, this.workerY - y)
        if (dist < INTERACT_RANGE) {
          const pulse = Math.sin(t * 0.1) * 0.15 + 0.7
          ctx.strokeStyle = `rgba(244, 67, 54, ${pulse})`
          ctx.lineWidth = 2
          ctx.setLineDash([4, 4])
          ctx.lineDashOffset = t * 0.5
          ctx.beginPath()
          ctx.arc(x, y, INTERACT_RANGE + 5, 0, Math.PI * 2)
          ctx.stroke()
          ctx.setLineDash([])
        }
      }

      // 漏水状态标签
      if (isLeaking && !isRepaired) {
        ctx.fillStyle = 'rgba(244,67,54,0.15)'
        ctx.beginPath()
        ctx.arc(x, y, 28, 0, Math.PI * 2)
        ctx.fill()
        // 动画感叹号
        const bounce = Math.abs(Math.sin(t * 0.08)) * 3
        ctx.fillStyle = '#F44336'
        ctx.font = 'bold 10px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('⚠', x, y - 20 + bounce)
      }

      ctx.restore()
    }
  },

  // 水管接头
  renderPipeJoint(ctx, jx, jy, color) {
    const jGrad = ctx.createLinearGradient(0, jy - 10, 0, jy + 10)
    jGrad.addColorStop(0, '#B0BEC5')
    jGrad.addColorStop(0.5, color)
    jGrad.addColorStop(1, '#37474F')
    ctx.fillStyle = jGrad
    roundRect(ctx, jx - 5, jy - 10, 10, 20, 3)
    ctx.fill()
    // 螺栓
    ctx.fillStyle = '#FFB300'
    ctx.beginPath()
    ctx.arc(jx, jy - 6, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(jx, jy + 6, 2, 0, Math.PI * 2)
    ctx.fill()
  },

  // ============ 工人角色渲染 (高精度动画) ============
  renderWorker(ctx) {
    const wx = this.workerX, wy = this.workerY
    const t = this.frameCount
    const targetX = this.workerTargetX
    const targetY = this.workerTargetY
    const isWalking = Math.hypot(targetX - wx, targetY - wy) > 1.5
    const facing = this.workerFacing
    const hp = this.data.hp
    const isLowHp = hp < 40
    const isCritical = hp < 25

    ctx.save()
    ctx.translate(wx, wy)

    // 角色阴影
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.beginPath()
    ctx.ellipse(0, 24, 11, 4, 0, 0, Math.PI * 2)
    ctx.fill()

    // 低血量时红色警告光圈
    if (isCritical) {
      const flashAlpha = 0.2 + Math.sin(t * 0.3) * 0.15
      ctx.fillStyle = `rgba(244, 67, 54, ${flashAlpha})`
      ctx.beginPath()
      ctx.arc(0, -4, 22, 0, Math.PI * 2)
      ctx.fill()
    }

    // 朝向翻转
    if (facing < 0) ctx.scale(-1, 1)

    const bob = isWalking ? Math.sin(t * 0.25) * 3 : Math.sin(t * 0.04) * 0.8 // 走路弹跳 / 呼吸微动
    const walkSpeed = isWalking ? 1 : 0

    // === 鞋子（增加细节）===
    ctx.fillStyle = '#37474F'
    roundRect(ctx, -9, 16 + bob, 8, 6, 2)
    ctx.fill()
    roundRect(ctx, 1, 16 + bob, 8, 6, 2)
    ctx.fill()
    // 鞋底纹理
    ctx.fillStyle = '#212121'
    ctx.fillRect(-9, 20 + bob, 8, 3)
    ctx.fillRect(1, 20 + bob, 8, 3)
    // 鞋带
    ctx.strokeStyle = '#ECEFF1'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(-6, 18 + bob); ctx.lineTo(-3, 19 + bob)
    ctx.moveTo(4, 18 + bob); ctx.lineTo(7, 19 + bob)
    ctx.stroke()

    // === 左腿（增强动画）===
    const leftLegAngle = isWalking ? Math.sin(t * 0.25) * 0.5 : 0
    ctx.save()
    ctx.translate(-5, 8 + bob)
    ctx.rotate(leftLegAngle)
    ctx.fillStyle = '#37474F'
    roundRect(ctx, -4, 0, 8, 12, 2)
    ctx.fill()
    // 腿部反光
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.fillRect(-2, 1, 3, 9)
    ctx.restore()

    // === 右腿（增强动画）===
    const rightLegAngle = isWalking ? Math.sin(t * 0.25 + Math.PI) * 0.5 : 0
    ctx.save()
    ctx.translate(5, 8 + bob)
    ctx.rotate(rightLegAngle)
    ctx.fillStyle = '#37474F'
    roundRect(ctx, -4, 0, 8, 12, 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.fillRect(-2, 1, 3, 9)
    ctx.restore()

    // 身体阴影（增加立体感）
    ctx.fillStyle = 'rgba(0,0,0,0.1)'
    roundRect(ctx, -9, -9 + bob, 18, 22, 5)
    ctx.fill()

    // === 身体/工作服 ===
    const bodyGrad = ctx.createLinearGradient(0, -10 + bob, 0, 12 + bob)
    bodyGrad.addColorStop(0, '#64B5F6')
    bodyGrad.addColorStop(0.3, '#42A5F5')
    bodyGrad.addColorStop(0.7, '#1E88E5')
    bodyGrad.addColorStop(1, '#1565C0')
    ctx.fillStyle = bodyGrad
    roundRect(ctx, -10, -10 + bob, 20, 22, 4)
    ctx.fill()

    // 工作服纹理细节
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    roundRect(ctx, -8, -8 + bob, 16, 18, 3)
    ctx.fill()

    // 反光背心条纹（加强亮度）
    const stripeGrad = ctx.createLinearGradient(0, -3 + bob, 0, bob)
    stripeGrad.addColorStop(0, '#FFEB3B')
    stripeGrad.addColorStop(0.5, '#FFF9C4')
    stripeGrad.addColorStop(1, '#FBC02D')
    ctx.fillStyle = stripeGrad
    ctx.fillRect(-9, -3 + bob, 18, 3.5)
    ctx.fillRect(-9, 3 + bob, 18, 3.5)

    // 工具腰带
    ctx.fillStyle = '#5D4037'
    ctx.fillRect(-11, 8 + bob, 22, 5)
    // 腰带扣
    ctx.fillStyle = '#FFD54F'
    ctx.fillRect(-4, 8 + bob, 8, 5)
    // 腰带口袋
    ctx.fillStyle = '#4E342E'
    ctx.fillRect(-11, 9 + bob, 5, 3)
    ctx.fillRect(7, 9 + bob, 4, 3)

    // === 左臂（增强动画）===
    const leftArmSwing = isWalking ? Math.sin(t * 0.25 + Math.PI) * 0.55 : -0.25
    ctx.save()
    ctx.translate(-10, -8 + bob)
    ctx.rotate(leftArmSwing)
    // 上臂
    ctx.fillStyle = '#42A5F5'
    roundRect(ctx, -4, 0, 8, 8, 3)
    ctx.fill()
    // 下臂
    ctx.fillStyle = '#FFCC80'
    roundRect(ctx, -4, 7, 8, 9, 3)
    ctx.fill()
    // 手套
    ctx.fillStyle = '#FF9800'
    roundRect(ctx, -5, 14, 10, 5, 2)
    ctx.fill()
    // 手套高光
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    roundRect(ctx, -3, 15, 6, 2, 1)
    ctx.fill()
    ctx.restore()

    // === 右臂（增强动画，持扳手）===
    const rightArmAngle = -0.55 + (isWalking ? Math.sin(t * 0.25) * 0.2 : 0)
    ctx.save()
    ctx.translate(10, -8 + bob)
    ctx.rotate(rightArmAngle)
    // 上臂
    ctx.fillStyle = '#42A5F5'
    roundRect(ctx, -4, 0, 8, 8, 3)
    ctx.fill()
    // 下臂
    ctx.fillStyle = '#FFCC80'
    roundRect(ctx, -4, 7, 8, 9, 3)
    ctx.fill()
    // 手套
    ctx.fillStyle = '#FF9800'
    roundRect(ctx, -5, 14, 10, 5, 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    roundRect(ctx, -3, 15, 6, 2, 1)
    ctx.fill()

    // 扳手（更精致）
    ctx.strokeStyle = '#90A4AE'
    ctx.lineWidth = 3.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, 16)
    ctx.lineTo(0, 5)
    ctx.stroke()
    // 扳手头
    ctx.fillStyle = '#B0BEC5'
    ctx.beginPath()
    ctx.arc(0, 2, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ECEFF1'
    ctx.beginPath()
    ctx.arc(0, 1, 3, 0, Math.PI * 2)
    ctx.fill()
    // 扳手开口
    ctx.fillStyle = '#78909C'
    ctx.fillRect(-2, -2, 4, 2)
    ctx.restore()

    // === 领口 ===
    ctx.fillStyle = '#FF9800'
    ctx.beginPath()
    ctx.moveTo(-5, -8 + bob)
    ctx.lineTo(0, -4 + bob)
    ctx.lineTo(5, -8 + bob)
    ctx.closePath()
    ctx.fill()
    // 领口高光
    ctx.fillStyle = '#FFCC80'
    ctx.beginPath()
    ctx.moveTo(-3, -7 + bob)
    ctx.lineTo(0, -4.5 + bob)
    ctx.lineTo(3, -7 + bob)
    ctx.closePath()
    ctx.fill()

    // === 头部 ===
    // 脖子
    ctx.fillStyle = '#FFCC80'
    ctx.fillRect(-3, -12 + bob, 6, 4)
    // 脸部
    ctx.fillStyle = '#FFCC80'
    ctx.beginPath()
    ctx.arc(0, -18 + bob, 10, 0, Math.PI * 2)
    ctx.fill()
    // 面部暖色调高光
    ctx.fillStyle = 'rgba(255, 224, 178, 0.5)'
    ctx.beginPath()
    ctx.arc(0, -20 + bob, 6, 0, Math.PI * 2)
    ctx.fill()

    // === 安全帽（精致版）===
    const helmetGrad = ctx.createLinearGradient(0, -32 + bob, 0, -20 + bob)
    helmetGrad.addColorStop(0, '#FFD54F')
    helmetGrad.addColorStop(0.4, '#FFCA28')
    helmetGrad.addColorStop(0.8, '#FF8F00')
    helmetGrad.addColorStop(1, '#E65100')
    ctx.fillStyle = helmetGrad
    ctx.beginPath()
    ctx.arc(0, -21 + bob, 14, Math.PI, 0)
    ctx.fill()
    // 帽檐
    ctx.fillStyle = '#F57C00'
    ctx.fillRect(-17, -21 + bob, 34, 4)
    ctx.fillStyle = '#E65100'
    ctx.fillRect(-17, -21 + bob, 34, 1)
    // 帽子顶部条纹
    ctx.fillStyle = '#FFF9C4'
    ctx.fillRect(-2, -32 + bob, 4, 3)
    // 帽子高光
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.beginPath()
    ctx.arc(-3, -27 + bob, 7, Math.PI, -0.3)
    ctx.fill()
    // 帽檐反光
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.fillRect(-14, -21 + bob, 28, 1)

    // === 面部细节 ===
    // 眉毛
    ctx.fillStyle = '#5D4037'
    ctx.fillRect(-5, -21 + bob, 4, 1.5)
    ctx.fillRect(1, -21 + bob, 4, 1.5)
    // 眼睛（带眼白）
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(-3, -19 + bob, 2.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(3, -19 + bob, 2.5, 0, Math.PI * 2)
    ctx.fill()
    // 瞳孔
    ctx.fillStyle = '#3E2723'
    ctx.beginPath()
    ctx.arc(facing > 0 ? -2.5 : -3.5, -19 + bob, 1.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(facing > 0 ? 3.5 : 2.5, -19 + bob, 1.3, 0, Math.PI * 2)
    ctx.fill()
    // 眼神光
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(facing > 0 ? -2 : -3, -19.5 + bob, 0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(facing > 0 ? 4 : 3, -19.5 + bob, 0.5, 0, Math.PI * 2)
    ctx.fill()

    // 嘴巴（根据血量变化表情）
    ctx.strokeStyle = '#795548'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    if (hp > 50) {
      // 微笑
      ctx.arc(0, -14 + bob, 3, 0.2, Math.PI - 0.2)
    } else if (hp > 25) {
      // 平直
      ctx.moveTo(-3, -14 + bob)
      ctx.lineTo(3, -14 + bob)
    } else {
      // 担忧
      ctx.arc(0, -12 + bob, 3, Math.PI + 0.3, -0.3)
    }
    ctx.stroke()

    // 脸颊红晕（健康时）
    if (hp > 50) {
      ctx.fillStyle = 'rgba(255, 150, 150, 0.3)'
      ctx.beginPath()
      ctx.arc(-6, -17 + bob, 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(6, -17 + bob, 2, 0, Math.PI * 2)
      ctx.fill()
    }

    // 低血量：汗水滴落
    if (isLowHp) {
      for (let s = 0; s < 2; s++) {
        const sweatX = -9 + s * 12
        const sweatY = -25 + bob + (t * 0.3 + s * 6) % 15
        const sweatAlpha = Math.max(0, 1 - ((sweatY + 25 - bob) / 15))
        ctx.fillStyle = `rgba(100, 181, 246, ${sweatAlpha * 0.7})`
        ctx.beginPath()
        ctx.arc(sweatX + Math.sin(t * 0.4 + s) * 2, sweatY, 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // 受伤状态：绷带效果
    if (isCritical) {
      ctx.fillStyle = '#F5F5DC'
      ctx.fillRect(-3, -3 + bob, 6, 2)
      ctx.fillRect(-7, -3 + bob, 4, 2)
    }

    ctx.restore()
  },

  // 领取扳手
  onPickupWrench() {
    if (this.data.gameState !== STATE.PLAYING) return
    audio.play('WRENCH')
    const pickupCount = this.data.levelConfig.wrenchPerPickup
    this.setData({
      wrenchCount: this.data.wrenchCount + pickupCount,
      showPickupBtn: false
    })
    wx.showToast({ title: `+${pickupCount} 🔧`, icon: 'none', duration: 800 })
  },

  // 维修水管（按钮触发 - 找最近漏水水管）
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
      this.doRepair(nearestPipe)
    }
  },

  // 执行维修动作
  doRepair(pipe) {
    const now = Date.now()
    const hasAoe = this._pendingAoeRepair
    const repairedPipes = []

    if (hasAoe) {
      // 范围维修：修复周围所有漏水水管
      const AOE_RANGE = 120
      for (const p of this.pipes) {
        if (p.isLeaking && !p.isRepaired) {
          const dist = Math.hypot(pipe.x - p.x, pipe.y - p.y)
          if (dist < AOE_RANGE) {
            p.isRepaired = true
            repairedPipes.push(p)
            this.spawnRepairParticles(p.x, p.y)
          }
        }
      }
      this._pendingAoeRepair = false
      audio.play('REPAIR')
      wx.vibrateShort({ type: 'heavy' })
      wx.showToast({ title: `💥 范围维修！修复了 ${repairedPipes.length} 处漏水`, icon: 'none', duration: 2000 })
    } else {
      pipe.isRepaired = true
      repairedPipes.push(pipe)
      audio.play('REPAIR')
      this.spawnRepairParticles(pipe.x, pipe.y)
      wx.vibrateShort({ type: 'light' })
    }

    // 连击系统：3秒内连续维修算连击
    const comboWindow = 3000
    if (now - this._lastRepairTime < comboWindow) {
      this._combo++
    } else {
      this._combo = 1
    }
    this._lastRepairTime = now
    this.setData({ comboCount: this._combo >= 3 ? this._combo : 0 })
    if (this._combo > this._maxCombo) {
      this._maxCombo = this._combo
    }
    // 连击特效粒子
    if (this._combo >= 3) {
      audio.playCombo(this._combo)
      for (let i = 0; i < this._combo * 2; i++) {
        this._comboParticles.push({
          x: pipe.x + (Math.random() - 0.5) * 40,
          y: pipe.y - 20,
          vx: (Math.random() - 0.5) * 2,
          vy: -Math.random() * 4 - 2,
          life: 1,
          size: Math.random() * 4 + 2,
          color: this._combo >= 7 ? '#FFD700' : this._combo >= 5 ? '#FF6D00' : '#FF1744'
        })
      }
      wx.showToast({ title: `🔥 ${this._combo}连击！`, icon: 'none', duration: 1000 })
    }

    // 连击超时重置
    if (this._comboTimer) clearTimeout(this._comboTimer)
    this._comboTimer = setTimeout(() => {
      this._combo = 0
      this.setData({ comboCount: 0 })
    }, comboWindow)

    this.setData({
      wrenchCount: this.data.wrenchCount - 1,
      showRepairBtn: false
    })
    this.updateBuffsList()

    // 检查是否全部修完
    this.checkWinCondition()
  },

  // 检查胜利条件
  checkWinCondition() {
    const remainingLeaks = this.pipes.filter(p => p.isLeaking && !p.isRepaired)
    if (remainingLeaks.length === 0) {
      this.stopAllTimers()
      const timeUsed = this.data.levelConfig.timeLimit - this.data.timeLeft
      const stars = levelUtil.calcStars(timeUsed, this.data.levelConfig)

      audio.play('CLEAR')

      this.setData({
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
    audio.play('FAIL')
    this.stopAllTimers()
    this.setData({
      gameState: STATE.LOSE,
      showDefeat: true,
      defeatReason: reason
    })
    this.submitResult(false, 0, this.data.levelConfig.timeLimit - this.data.timeLeft)
  },

  // 提交游戏结果
  submitResult(isWin, stars, timeUsed) {
    // 尝试从 globalData 或本地缓存获取 userId
    let userInfo = app.globalData.userInfo
    if (!userInfo || !userInfo.id) {
      try { userInfo = wx.getStorageSync('userInfo') || null } catch (e) {}
    }
    const userId = userInfo ? userInfo.id : null
    if (!userId) {
      console.warn('用户未登录，跳过提交游戏结果')
      return
    }

    const level = this.data.level
    // 更新本地最高关卡
    let savedLevel = 0
    try { savedLevel = wx.getStorageSync('highestLevel') || 0 } catch (e) {}
    if (isWin && level > savedLevel) {
      wx.setStorageSync('highestLevel', level)
    }

    // 提交到后端
    const request = require('../../utils/request')
    request.post('/api/game/result', {
      userId: userId,
      level,
      stars,
      timeUsed,
      isWin,
      failReason: isWin ? null : this.data.defeatReason
    }).then(res => {
      // 处理后端返回的奖励信息
      if (res.data && res.data.reward) {
        const reward = res.data.reward
        let coinsEarned = reward.coinsEarned || 0
        let message = reward.message || ''
        // 金币加成：额外50%
        if (this._coinBonus && isWin) {
          const bonus = Math.floor(coinsEarned * 0.5)
          coinsEarned += bonus
          message += ` (💰金币加成 +${bonus})`
        }
        // 连击加成：最高连击 × 2 金币
        if (this._maxCombo >= 5 && isWin) {
          const comboBonus = this._maxCombo * 2
          coinsEarned += comboBonus
          message += ` (🔥${this._maxCombo}连击 +${comboBonus})`
        }
        this.setData({
          rewardCoins: coinsEarned,
          rewardMessage: message,
          totalCoins: reward.totalCoins || 0,
          isFirstClear: reward.isFirstClear || false
        })
      }
    }).catch(() => {
      // 提交失败不影响游戏体验
    })
  },

  // 弹窗事件 - 胜利
  onVictoryNext() {
    this.setData({ showVictory: false })
    wx.redirectTo({ url: `/pages/game/game?level=${this.data.level + 1}` })
  },
  onVictoryReplay() {
    this.setData({ showVictory: false })
    this.initLevel(this.data.level)
    this.startGame()
  },
  onVictoryShare() {
    // 微信分享（需要button open-type="share"）
  },
  onVictoryWatchAd() {
    this.setData({ showVictory: false, showReward: true })
  },

  // 弹窗事件 - 失败
  onDefeatRetry() {
    this.setData({ showDefeat: false })
    this.initLevel(this.data.level)
    this.startGame()
  },
  onDefeatWatchAd() {
    this.setData({ showDefeat: false, showReward: true })
  },

  // 弹窗事件 - 激励视频
  onSelectReward(e) {
    const rewardId = e.detail.type
    // 模拟观看广告
    wx.showToast({ title: '广告播放中...', icon: 'loading', duration: 1500 })
    setTimeout(() => {
      this.setData({ showReward: false })
      switch (rewardId) {
        case 'wrench':
          this.setData({ wrenchCount: this.data.wrenchCount + 3 })
          wx.showToast({ title: '+3 🔧', icon: 'success' })
          break
        case 'time':
          this.setData({ timeLeft: this.data.timeLeft + 30 })
          wx.showToast({ title: '+30秒', icon: 'success' })
          break
        case 'hp':
          this.setData({ hp: this.data.maxHp, gameState: STATE.PLAYING })
          this.startTimers()
          this.startGameLoop()
          this.startPowerUpTimer()
          wx.showToast({ title: '满血复活！', icon: 'success' })
          break
      }
    }, 1500)
  },
  onCloseReward() {
    this.setData({ showReward: false })
  },

  // 暂停/继续
  togglePause() {
    if (this.data.gameState === STATE.PLAYING) {
      this.stopAllTimers()
      this.setData({ gameState: STATE.PAUSED })
    } else if (this.data.gameState === STATE.PAUSED) {
      this.setData({ gameState: STATE.PLAYING })
      this.startTimers()
      this.startGameLoop()
      this.startPowerUpTimer()
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

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
    this._autoRepairPipe = null
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
    if (this.renderTimer) {
      if (this._cancelRaf) {
        this._cancelRaf(this.renderTimer)
      } else {
        clearTimeout(this.renderTimer)
      }
    }
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
    if (dist > 1) {
      const speed = Math.min(WORKER_SPEED, dist)
      this.workerX += (dx / dist) * speed
      this.workerY += (dy / dist) * speed
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
          audio.play('BURST')
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

    // ===== 场景前景（围栏、警示带等） =====
    this.renderForeground(ctx)
  },

  // ============ 背景场景 ============
  renderBackground(ctx) {
    // 天空渐变
    const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
    skyGrad.addColorStop(0, '#87CEEB')
    skyGrad.addColorStop(0.4, '#B0D4F1')
    skyGrad.addColorStop(0.7, '#C5D9E8')
    skyGrad.addColorStop(1, '#8FA4B0')
    ctx.fillStyle = skyGrad
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    // 远处建筑轮廓
    ctx.fillStyle = '#B0BEC5'
    for (let i = 0; i < 6; i++) {
      const bx = i * 65 - 10
      const bh = 40 + (i % 3) * 25
      ctx.fillRect(bx, CANVAS_H - 60 - bh, 55, bh + 20)
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

    // 地面警示线
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

  // ============ 粒子系统 ============
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

  // ============ 维修车渲染 (2D) ============
  renderCar(ctx) {
    const cx = this.carX, cy = this.carY
    const t = this.frameCount

    ctx.save()
    // 车身阴影
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.beginPath()
    ctx.ellipse(cx, cy + 22, 32, 6, 0, 0, Math.PI * 2)
    ctx.fill()

    // === 车身主体 ===
    // 货车箱体
    const bodyGrad = ctx.createLinearGradient(cx - 30, 0, cx + 30, 0)
    bodyGrad.addColorStop(0, '#FB8C00')
    bodyGrad.addColorStop(0.3, '#FF9800')
    bodyGrad.addColorStop(0.7, '#FF9800')
    bodyGrad.addColorStop(1, '#E65100')
    ctx.fillStyle = bodyGrad
    roundRect(ctx, cx - 30, cy - 24, 60, 30, 5)
    ctx.fill()

    // 车身高光
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    roundRect(ctx, cx - 25, cy - 20, 50, 8, 2)
    ctx.fill()

    // 驾驶室（前部突出）
    const cabGrad = ctx.createLinearGradient(cx + 5, 0, cx + 30, 0)
    cabGrad.addColorStop(0, '#FF9800')
    cabGrad.addColorStop(1, '#E65100')
    ctx.fillStyle = cabGrad
    roundRect(ctx, cx + 5, cy - 35, 25, 16, 3)
    ctx.fill()

    // 挡风玻璃
    ctx.fillStyle = '#B3E5FC'
    roundRect(ctx, cx + 12, cy - 32, 14, 10, 2)
    ctx.fill()
    // 玻璃反光
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.beginPath()
    ctx.moveTo(cx + 13, cy - 30)
    ctx.lineTo(cx + 17, cy - 30)
    ctx.lineTo(cx + 13, cy - 25)
    ctx.closePath()
    ctx.fill()

    // 侧窗
    ctx.fillStyle = '#B3E5FC'
    roundRect(ctx, cx - 28, cy - 30, 12, 9, 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    roundRect(ctx, cx - 26, cy - 28, 8, 5, 1)
    ctx.fill()

    // 顶部警示灯
    const beaconOn = Math.sin(t * 0.15) > 0
    ctx.fillStyle = beaconOn ? '#FFEB3B' : '#F9A825'
    ctx.beginPath()
    ctx.arc(cx + 10, cy - 37, 5, 0, Math.PI * 2)
    ctx.fill()
    if (beaconOn) {
      ctx.fillStyle = 'rgba(255,235,59,0.3)'
      ctx.beginPath()
      ctx.arc(cx + 10, cy - 37, 10, 0, Math.PI * 2)
      ctx.fill()
    }

    // === 车轮 ===
    this.renderWheel(ctx, cx - 20, cy + 8)
    this.renderWheel(ctx, cx + 18, cy + 8)

    // 车轮挡泥板
    ctx.fillStyle = '#E65100'
    ctx.beginPath()
    ctx.arc(cx - 20, cy + 4, 12, Math.PI, 0)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx + 18, cy + 4, 12, Math.PI, 0)
    ctx.fill()

    // 车身文字
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 9px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('维修', cx, cy - 12)

    // 工具箱标识
    ctx.fillStyle = '#1565C0'
    roundRect(ctx, cx - 12, cy - 18, 24, 8, 3)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = '7px sans-serif'
    ctx.fillText('TOOLS', cx, cy - 12)

    // 虚拟摇杆提示（车旁）
    if (this.data.showPickupBtn) {
      const pulse = Math.sin(t * 0.08) * 0.15 + 0.7
      ctx.strokeStyle = `rgba(76, 175, 80, ${pulse})`
      ctx.lineWidth = 2
      ctx.setLineDash([4, 4])
      ctx.lineDashOffset = t * 0.5
      ctx.beginPath()
      ctx.arc(cx, cy, INTERACT_RANGE, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])

      // 箭头指示
      ctx.fillStyle = '#4CAF50'
      ctx.font = '16px sans-serif'
      ctx.textAlign = 'center'
      const arrowY = cy - INTERACT_RANGE - 5 + Math.sin(t * 0.1) * 3
      ctx.fillText('⬇', cx, arrowY)
    }

    ctx.restore()
  },

  // 车轮绘制
  renderWheel(ctx, wx, wy) {
    // 轮胎
    ctx.fillStyle = '#37474F'
    ctx.beginPath()
    ctx.arc(wx, wy, 11, 0, Math.PI * 2)
    ctx.fill()

    // 轮胎纹理
    ctx.strokeStyle = '#263238'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(wx, wy, 8, 0, Math.PI * 2)
    ctx.stroke()

    // 轮毂
    ctx.fillStyle = '#90A4AE'
    ctx.beginPath()
    ctx.arc(wx, wy, 5, 0, Math.PI * 2)
    ctx.fill()

    // 轮辐旋转
    ctx.strokeStyle = '#B0BEC5'
    ctx.lineWidth = 1
    const rot = this.frameCount * 0.05
    for (let i = 0; i < 6; i++) {
      const ang = rot + (i * Math.PI / 3)
      ctx.beginPath()
      ctx.moveTo(wx, wy)
      ctx.lineTo(wx + Math.cos(ang) * 4.5, wy + Math.sin(ang) * 4.5)
      ctx.stroke()
    }

    // 轴心
    ctx.fillStyle = '#607D8B'
    ctx.beginPath()
    ctx.arc(wx, wy, 2, 0, Math.PI * 2)
    ctx.fill()
  },

  // ============ 水管渲染 (2D 工业风格) ============
  renderPipes(ctx) {
    for (const pipe of this.pipes) {
      const { x, y, isLeaking, isRepaired } = pipe
      const t = this.frameCount
      const pipeW = 40
      const pipeH = 14

      ctx.save()

      // 水管阴影
      ctx.fillStyle = 'rgba(0,0,0,0.15)'
      ctx.beginPath()
      ctx.ellipse(x, y + 10, pipeW / 2 + 2, 4, 0, 0, Math.PI * 2)
      ctx.fill()

      // === 水管主体（3D圆柱效果） ===
      const pipeColor = isRepaired ? '#4CAF50' : (isLeaking ? '#EF5350' : '#78909C')
      const pipeDark = isRepaired ? '#2E7D32' : (isLeaking ? '#C62828' : '#546E7A')
      const pipeLight = isRepaired ? '#81C784' : (isLeaking ? '#EF9A9A' : '#B0BEC5')

      const pipeGrad = ctx.createLinearGradient(0, y - pipeH / 2, 0, y + pipeH / 2)
      pipeGrad.addColorStop(0, pipeLight)
      pipeGrad.addColorStop(0.25, pipeColor)
      pipeGrad.addColorStop(0.75, pipeColor)
      pipeGrad.addColorStop(1, pipeDark)

      ctx.fillStyle = pipeGrad
      roundRect(ctx, x - pipeW / 2, y - pipeH / 2, pipeW, pipeH, pipeH / 2)
      ctx.fill()

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

  // ============ 工人角色渲染 (完整2D角色) ============
  renderWorker(ctx) {
    const wx = this.workerX, wy = this.workerY
    const t = this.frameCount
    const targetX = this.workerTargetX
    const targetY = this.workerTargetY
    const isWalking = Math.hypot(targetX - wx, targetY - wy) > 1.5
    const facing = this.workerFacing

    ctx.save()
    ctx.translate(wx, wy)

    // 角色阴影
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.beginPath()
    ctx.ellipse(0, 24, 10, 3, 0, 0, Math.PI * 2)
    ctx.fill()

    // 朝向翻转
    if (facing < 0) ctx.scale(-1, 1)

    const bob = isWalking ? Math.sin(t * 0.3) * 2.5 : 0

    // === 鞋子 ===
    ctx.fillStyle = '#37474F'
    ctx.fillRect(-8, 16 + bob, 7, 5)
    ctx.fillRect(1, 16 + bob, 7, 5)
    // 鞋底
    ctx.fillStyle = '#212121'
    ctx.fillRect(-8, 20 + bob, 7, 2)
    ctx.fillRect(1, 20 + bob, 7, 2)

    // === 左腿 ===
    const leftLegAngle = isWalking ? Math.sin(t * 0.3) * 0.4 : 0
    ctx.save()
    ctx.translate(-4, 8 + bob)
    ctx.rotate(leftLegAngle)
    ctx.fillStyle = '#455A64'
    ctx.fillRect(-3, 0, 6, 12)
    // 裤子褶皱
    ctx.strokeStyle = '#37474F'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(-3, 4)
    ctx.lineTo(3, 5)
    ctx.moveTo(-3, 8)
    ctx.lineTo(3, 9)
    ctx.stroke()
    ctx.restore()

    // === 右腿 ===
    const rightLegAngle = isWalking ? Math.sin(t * 0.3 + Math.PI) * 0.4 : 0
    ctx.save()
    ctx.translate(4, 8 + bob)
    ctx.rotate(rightLegAngle)
    ctx.fillStyle = '#455A64'
    ctx.fillRect(-3, 0, 6, 12)
    ctx.strokeStyle = '#37474F'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(-3, 4)
    ctx.lineTo(3, 5)
    ctx.stroke()
    ctx.restore()

    // === 身体/工作服 ===
    const bodyGrad = ctx.createLinearGradient(0, -10 + bob, 0, 12 + bob)
    bodyGrad.addColorStop(0, '#42A5F5')
    bodyGrad.addColorStop(0.5, '#1E88E5')
    bodyGrad.addColorStop(1, '#1565C0')
    ctx.fillStyle = bodyGrad
    roundRect(ctx, -10, -10 + bob, 20, 22, 4)
    ctx.fill()

    // 反光背心条纹
    ctx.fillStyle = '#FFEB3B'
    ctx.fillRect(-8, -3 + bob, 16, 3)
    ctx.fillRect(-8, 3 + bob, 16, 3)

    // 工具腰带
    ctx.fillStyle = '#5D4037'
    ctx.fillRect(-11, 8 + bob, 22, 4)
    // 腰带扣
    ctx.fillStyle = '#FFB300'
    ctx.fillRect(-3, 8 + bob, 6, 4)

    // === 左臂 ===
    const armSwing = isWalking ? Math.sin(t * 0.3 + Math.PI) * 0.5 : -0.3
    ctx.save()
    ctx.translate(-10, -8 + bob)
    ctx.rotate(armSwing)
    ctx.fillStyle = '#1E88E5'
    roundRect(ctx, -3, 0, 6, 14, 3)
    ctx.fill()
    // 手套
    ctx.fillStyle = '#FF9800'
    roundRect(ctx, -4, 11, 8, 5, 2)
    ctx.fill()
    ctx.restore()

    // === 右臂（持扳手） ===
    ctx.save()
    ctx.translate(10, -8 + bob)
    ctx.rotate(-0.6 + (isWalking ? Math.sin(t * 0.3) * 0.15 : 0))
    ctx.fillStyle = '#1E88E5'
    roundRect(ctx, -3, 0, 6, 14, 3)
    ctx.fill()
    // 手套
    ctx.fillStyle = '#FF9800'
    roundRect(ctx, -4, 11, 8, 5, 2)
    ctx.fill()
    // 扳手
    ctx.strokeStyle = '#78909C'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(0, 15)
    ctx.lineTo(0, 6)
    ctx.stroke()
    ctx.fillStyle = '#90A4AE'
    ctx.beginPath()
    ctx.arc(0, 4, 5, 0, Math.PI * 2)
    ctx.fill()
    // 扳手高光
    ctx.fillStyle = '#B0BEC5'
    ctx.beginPath()
    ctx.arc(0, 3, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // === 领口 ===
    ctx.fillStyle = '#FF9800'
    ctx.beginPath()
    ctx.moveTo(-4, -8 + bob)
    ctx.lineTo(0, -5 + bob)
    ctx.lineTo(4, -8 + bob)
    ctx.closePath()
    ctx.fill()

    // === 头部 ===
    ctx.fillStyle = '#FFCC80'
    ctx.beginPath()
    ctx.arc(0, -15 + bob, 9, 0, Math.PI * 2)
    ctx.fill()
    // 面部阴影
    ctx.fillStyle = 'rgba(0,0,0,0.06)'
    ctx.beginPath()
    ctx.arc(1, -14 + bob, 8, 0, Math.PI * 2)
    ctx.fill()

    // === 安全帽 ===
    const helmetGrad = ctx.createLinearGradient(0, -28 + bob, 0, -18 + bob)
    helmetGrad.addColorStop(0, '#FFB300')
    helmetGrad.addColorStop(0.6, '#FF9800')
    helmetGrad.addColorStop(1, '#E65100')
    ctx.fillStyle = helmetGrad
    ctx.beginPath()
    ctx.arc(0, -19 + bob, 13, Math.PI, 0)
    ctx.fill()
    // 帽檐
    ctx.fillStyle = '#F57C00'
    ctx.fillRect(-16, -19 + bob, 32, 3)
    // 帽子高光
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.beginPath()
    ctx.arc(0, -24 + bob, 7, Math.PI, 0)
    ctx.fill()
    // 帽顶
    ctx.fillStyle = '#FFB300'
    ctx.beginPath()
    ctx.arc(0, -27 + bob, 3, 0, Math.PI * 2)
    ctx.fill()

    // === 面部细节 ===
    ctx.fillStyle = '#5D4037'
    // 眼睛
    ctx.beginPath()
    ctx.arc(-3, -16 + bob, 1.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(3, -16 + bob, 1.5, 0, Math.PI * 2)
    ctx.fill()
    // 嘴巴（微笑）
    ctx.strokeStyle = '#5D4037'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(0, -12 + bob, 3, 0.2, Math.PI - 0.2)
    ctx.stroke()

    // 走动时冒汗
    if (this.data.hp < 40) {
      ctx.fillStyle = 'rgba(100, 181, 246, 0.5)'
      const sweatX = -8 + Math.sin(t * 0.5) * 2
      const sweatY = -22 + bob + Math.cos(t * 0.5) * 1
      ctx.beginPath()
      ctx.arc(sweatX, sweatY, 2, 0, Math.PI * 2)
      ctx.fill()
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
    pipe.isRepaired = true
    audio.play('REPAIR')
    this.spawnRepairParticles(pipe.x, pipe.y)
    this.setData({
      wrenchCount: this.data.wrenchCount - 1,
      showRepairBtn: false
    })
    wx.vibrateShort({ type: 'light' })

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

<template>
  <div class="level-preview-page">
    <!-- 关卡选择器 -->
    <div class="search-bar">
      <el-form :inline="true" @submit.native.prevent>
        <el-form-item label="关卡号">
          <el-input-number
            v-model="currentLevel"
            :min="1"
            :max="10000"
            controls-position="right"
            style="width: 160px;"
            @change="handleLevelChange"
          />
        </el-form-item>
        <el-form-item>
          <el-button icon="el-icon-arrow-left" @click="handlePrevLevel" :disabled="currentLevel <= 1">上一关</el-button>
          <el-button icon="el-icon-arrow-right" @click="handleNextLevel" :disabled="currentLevel >= 10000">下一关</el-button>
          <el-button type="primary" icon="el-icon-search" @click="loadLevelDetail">查看详情</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 关卡详情与场景 -->
    <el-row :gutter="20">
      <el-col :xs="24" :sm="24" :md="12">
        <!-- 关卡详情卡片 -->
        <div class="level-detail-card">
          <h4 class="section-title">关卡 {{ currentLevel }} 详情</h4>
          <el-descriptions :column="2" border size="medium">
            <el-descriptions-item label="水管总数">{{ levelDetail.pipeCount }}</el-descriptions-item>
            <el-descriptions-item label="初始漏水数">{{ levelDetail.leakCount }}</el-descriptions-item>
            <el-descriptions-item label="扳手数量">{{ levelDetail.wrenchCount }}</el-descriptions-item>
            <el-descriptions-item label="时限(秒)">{{ levelDetail.timeLimit }}</el-descriptions-item>
            <el-descriptions-item label="积水速度">{{ levelDetail.waterSpeed }}</el-descriptions-item>
            <el-descriptions-item label="爆管概率">{{ levelDetail.burstRate }}%</el-descriptions-item>
            <el-descriptions-item label="场景类型">
              <el-tag :type="sceneTagType" size="small">{{ levelDetail.sceneType }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="难度等级">
              <el-rate v-model="levelDetail.difficulty" disabled :max="5" />
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </el-col>

      <!-- 模拟场景Canvas -->
      <el-col :xs="24" :sm="24" :md="12">
        <div class="scene-card">
          <h4 class="section-title">场景预览</h4>
          <div class="scene-canvas" ref="sceneCanvas">
            <!-- CSS 绘制场景 -->
            <div class="scene-ground">
              <!-- 水管 -->
              <div
                v-for="pipe in scenePipes"
                :key="'pipe-' + pipe.id"
                class="scene-pipe"
                :style="{ left: pipe.x + '%', top: pipe.y + '%', width: pipe.w + '%', height: pipe.h + '%' }"
              ></div>
              <!-- 漏水点 -->
              <div
                v-for="leak in sceneLeaks"
                :key="'leak-' + leak.id"
                class="scene-leak"
                :style="{ left: leak.x + '%', top: leak.y + '%' }"
              ></div>
              <!-- 维修车 -->
              <div class="scene-truck" :style="{ left: truckPos.x + '%', top: truckPos.y + '%' }"></div>
              <!-- 工人 -->
              <div
                v-for="worker in sceneWorkers"
                :key="'worker-' + worker.id"
                class="scene-worker"
                :style="{ left: worker.x + '%', top: worker.y + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 难度曲线图 -->
    <div class="chart-card">
      <h4 class="section-title">关卡难度曲线 (1-100关)</h4>
      <div ref="difficultyChart" style="width: 100%; height: 380px;"></div>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts'

export default {
  name: 'LevelPreview',
  data() {
    return {
      currentLevel: 1,
      levelDetail: {
        pipeCount: 0,
        leakCount: 0,
        wrenchCount: 0,
        timeLimit: 0,
        waterSpeed: 0,
        burstRate: 0,
        sceneType: '',
        difficulty: 0
      },
      scenePipes: [],
      sceneLeaks: [],
      sceneWorkers: [],
      truckPos: { x: 5, y: 75 },
      chartInstance: null
    }
  },
  computed: {
    sceneTagType() {
      const map = { '住宅区': 'success', '商业区': '', '工业区': 'warning', '地下管道': 'danger', '河边管道': 'danger' }
      return map[this.levelDetail.sceneType] || 'info'
    }
  },
  mounted() {
    this.loadLevelDetail()
  },
  beforeDestroy() {
    if (this.chartInstance) {
      this.chartInstance.dispose()
      window.removeEventListener('resize', this.chartInstance.resize)
    }
  },
  methods: {
    async loadLevelDetail() {
      try {
        // 后端API调用（预留）
        throw new Error('API not ready')
      } catch (error) {
        // 后端未就绪时根据关卡号生成模拟数据
        const level = this.currentLevel
        const sceneTypes = ['住宅区', '商业区', '工业区', '地下管道', '河边管道']
        const pipeCount = Math.min(30, 2 + Math.floor(level / 5))
        const leakCount = Math.min(pipeCount, Math.max(1, Math.floor(level / 8)))
        this.levelDetail = {
          pipeCount,
          leakCount,
          wrenchCount: Math.max(2, 5 - Math.floor(level / 1000)),
          timeLimit: Math.max(30, Math.floor(120 - level * 0.015)),
          waterSpeed: Math.floor(1 + level * 0.001),
          burstRate: Math.min(30, Math.floor(0.2 + level * 0.3)),
          sceneType: sceneTypes[level % 5],
          difficulty: Math.min(5, Math.ceil(level / 20))
        }
        this.generateScene()
        this.$nextTick(() => {
          this.renderDifficultyChart()
        })
      }
    },
    generateScene() {
      const pipes = []
      const leaks = []
      const workers = []
      const pipeCount = Math.min(8, 2 + Math.floor(this.currentLevel / 5))
      const leakCount = Math.min(pipeCount, Math.max(1, Math.floor(this.currentLevel / 8)))
      const workerCount = Math.min(3, 1 + Math.floor(this.currentLevel / 10))

      for (let i = 0; i < pipeCount; i++) {
        const isHorizontal = Math.random() > 0.4
        pipes.push({
          id: i,
          x: isHorizontal ? Math.random() * 60 : 10 + Math.random() * 80,
          y: isHorizontal ? 10 + Math.random() * 70 : Math.random() * 60,
          w: isHorizontal ? 15 + Math.random() * 20 : 2,
          h: isHorizontal ? 2 : 15 + Math.random() * 20
        })
      }

      for (let i = 0; i < leakCount; i++) {
        leaks.push({
          id: i,
          x: 15 + Math.random() * 65,
          y: 15 + Math.random() * 60
        })
      }

      for (let i = 0; i < workerCount; i++) {
        workers.push({
          id: i,
          x: 20 + Math.random() * 55,
          y: 55 + Math.random() * 30
        })
      }

      this.scenePipes = pipes
      this.sceneLeaks = leaks
      this.sceneWorkers = workers
      this.truckPos = { x: 3 + Math.random() * 10, y: 70 + Math.random() * 15 }
    },
    renderDifficultyChart() {
      const chartDom = this.$refs.difficultyChart
      if (!chartDom) return
      if (this.chartInstance) {
        this.chartInstance.dispose()
      }
      this.chartInstance = echarts.init(chartDom)
      const levels = []
      const pipeCounts = []
      const leakCounts = []
      for (let i = 1; i <= 100; i++) {
        levels.push(`第${i}关`)
        pipeCounts.push(Math.min(30, 2 + Math.floor(i / 5)))
        leakCounts.push(Math.min(Math.min(30, 2 + Math.floor(i / 5)), Math.max(1, Math.floor(i / 8))))
      }
      const option = {
        tooltip: {
          trigger: 'axis'
        },
        legend: {
          data: ['水管数', '漏水数'],
          bottom: 0
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '12%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: levels,
          axisLabel: {
            interval: 9,
            rotate: 0
          }
        },
        yAxis: {
          type: 'value',
          name: '数量'
        },
        series: [
          {
            name: '水管数',
            type: 'line',
            data: pipeCounts,
            smooth: true,
            lineStyle: { color: '#2196F3', width: 2 },
            itemStyle: { color: '#2196F3' },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(33,150,243,0.3)' },
                { offset: 1, color: 'rgba(33,150,243,0.05)' }
              ])
            }
          },
          {
            name: '漏水数',
            type: 'line',
            data: leakCounts,
            smooth: true,
            lineStyle: { color: '#F56C6C', width: 2 },
            itemStyle: { color: '#F56C6C' },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(245,108,108,0.3)' },
                { offset: 1, color: 'rgba(245,108,108,0.05)' }
              ])
            }
          }
        ]
      }
      this.chartInstance.setOption(option)
      window.addEventListener('resize', () => {
        if (this.chartInstance) this.chartInstance.resize()
      })
    },
    handleLevelChange() {
      this.loadLevelDetail()
    },
    handlePrevLevel() {
      if (this.currentLevel > 1) {
        this.currentLevel--
        this.loadLevelDetail()
      }
    },
    handleNextLevel() {
      if (this.currentLevel < 10000) {
        this.currentLevel++
        this.loadLevelDetail()
      }
    }
  }
}
</script>

<style scoped>
.level-detail-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.scene-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.section-title {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 16px;
}
.chart-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.scene-canvas {
  width: 100%;
  height: 300px;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  border: 2px solid #e4e7ed;
}
.scene-ground {
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #e3f2fd 0%, #bbdefb 50%, #90caf9 100%);
  position: relative;
}
.scene-pipe {
  position: absolute;
  background: #1565C0;
  border-radius: 3px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}
.scene-leak {
  position: absolute;
  width: 12px;
  height: 12px;
  background: radial-gradient(circle, #F44336 30%, #EF5350 70%, transparent 100%);
  border-radius: 50%;
  animation: leak-pulse 1s ease-in-out infinite;
  box-shadow: 0 0 8px rgba(244, 67, 54, 0.6);
}
.scene-truck {
  position: absolute;
  width: 30px;
  height: 20px;
  background: #4CAF50;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}
.scene-truck::after {
  content: '';
  position: absolute;
  right: -8px;
  top: 2px;
  width: 12px;
  height: 16px;
  background: #388E3C;
  border-radius: 2px;
}
.scene-worker {
  position: absolute;
  width: 10px;
  height: 18px;
  background: #FFC107;
  border-radius: 5px 5px 2px 2px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}
.scene-worker::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 1px;
  width: 8px;
  height: 8px;
  background: #FFE082;
  border-radius: 50%;
}
@keyframes leak-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.7; }
}
</style>

<template>
  <div class="dashboard-page">
    <!-- 统计卡片 -->
    <el-row :gutter="20">
      <el-col :xs="12" :sm="12" :md="6">
        <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
          <div class="stat-title">总用户数</div>
          <div class="stat-value">{{ stats.totalUsers }}</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6">
        <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
          <div class="stat-title">今日活跃</div>
          <div class="stat-value">{{ stats.todayActive }}</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6">
        <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
          <div class="stat-title">总游戏局数</div>
          <div class="stat-value">{{ stats.totalGames }}</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6">
        <div class="stat-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
          <div class="stat-title">通关率</div>
          <div class="stat-value">{{ stats.passRate }}%</div>
        </div>
      </el-col>
    </el-row>

    <!-- 关卡分布柱状图 -->
    <div class="chart-container">
      <h4 style="margin-bottom: 16px; color: #303133;">关卡分布统计</h4>
      <div ref="levelChart" style="width: 100%; height: 350px;"></div>
    </div>

    <!-- 最近游戏记录 -->
    <div class="table-container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h4 style="color: #303133; margin: 0;">最近游戏记录</h4>
      </div>
      <el-table :data="recentRecords" stripe style="width: 100%;">
        <el-table-column prop="nickname" label="用户昵称" min-width="120" />
        <el-table-column prop="level" label="关卡" width="80" align="center" />
        <el-table-column prop="result" label="结果" width="80" align="center">
          <template slot-scope="scope">
            <el-tag :type="scope.row.result === 'WIN' ? 'success' : 'danger'" size="small">
              {{ scope.row.result === 'WIN' ? '胜利' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="stars" label="星数" width="80" align="center" />
        <el-table-column prop="duration" label="用时(秒)" width="100" align="center" />
        <el-table-column prop="createTime" label="时间" min-width="160" />
      </el-table>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import { getGameStats, getRecentRecords } from '@/api/game'

export default {
  name: 'Dashboard',
  data() {
    return {
      stats: {
        totalUsers: 0,
        todayActive: 0,
        totalGames: 0,
        passRate: 0
      },
      recentRecords: [],
      levelChartData: []
    }
  },
  mounted() {
    this.loadStats()
    this.loadRecentRecords()
  },
  methods: {
    async loadStats() {
      try {
        const res = await getGameStats()
        if (res.data) {
          this.stats = {
            totalUsers: res.data.totalUsers || 0,
            todayActive: res.data.todayActive || 0,
            totalGames: res.data.totalGames || 0,
            passRate: res.data.passRate || 0
          }
          this.levelChartData = res.data.levelDistribution || []
          this.$nextTick(() => {
            this.renderLevelChart()
          })
        }
      } catch (error) {
        // 后端未就绪时使用模拟数据
        this.stats = {
          totalUsers: 1280,
          todayActive: 156,
          totalGames: 8932,
          passRate: 72
        }
        this.levelChartData = [
          { level: 1, count: 1280 }, { level: 2, count: 1150 },
          { level: 3, count: 980 }, { level: 4, count: 820 },
          { level: 5, count: 650 }, { level: 6, count: 480 },
          { level: 7, count: 320 }, { level: 8, count: 180 },
          { level: 9, count: 90 }, { level: 10, count: 42 }
        ]
        this.$nextTick(() => {
          this.renderLevelChart()
        })
      }
    },
    async loadRecentRecords() {
      try {
        const res = await getRecentRecords({ limit: 10 })
        if (res.data) {
          this.recentRecords = res.data
        }
      } catch (error) {
        // 后端未就绪时使用模拟数据
        this.recentRecords = [
          { nickname: '小明', level: 5, result: 'WIN', stars: 3, duration: 45, createTime: '2026-05-24 15:30:00' },
          { nickname: '小红', level: 3, result: 'WIN', stars: 2, duration: 32, createTime: '2026-05-24 15:28:00' },
          { nickname: '阿强', level: 7, result: 'LOSE', stars: 0, duration: 58, createTime: '2026-05-24 15:25:00' },
          { nickname: '小丽', level: 2, result: 'WIN', stars: 3, duration: 28, createTime: '2026-05-24 15:20:00' },
          { nickname: '大壮', level: 6, result: 'WIN', stars: 2, duration: 52, createTime: '2026-05-24 15:15:00' }
        ]
      }
    },
    renderLevelChart() {
      const chartDom = this.$refs.levelChart
      if (!chartDom) return
      const myChart = echarts.init(chartDom)
      const levels = this.levelChartData.map(item => `第${item.level}关`)
      const counts = this.levelChartData.map(item => item.count)

      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: levels,
          axisLabel: { rotate: 0 }
        },
        yAxis: {
          type: 'value',
          name: '玩家数'
        },
        series: [{
          name: '玩家数',
          type: 'bar',
          data: counts,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#667eea' },
              { offset: 1, color: '#764ba2' }
            ])
          },
          barWidth: '50%',
          label: {
            show: true,
            position: 'top',
            color: '#303133'
          }
        }]
      }

      myChart.setOption(option)
      window.addEventListener('resize', () => {
        myChart.resize()
      })
    }
  }
}
</script>

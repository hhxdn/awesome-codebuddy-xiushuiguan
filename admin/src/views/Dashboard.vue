<template>
  <div class="dashboard-page">
    <!-- 统计卡片 -->
    <el-row :gutter="20">
      <el-col :xs="12" :sm="8" :md="6">
        <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
          <div class="stat-title">总用户数</div>
          <div class="stat-value">{{ stats.totalUsers }}</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8" :md="6">
        <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
          <div class="stat-title">今日活跃</div>
          <div class="stat-value">{{ stats.todayActive }}</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8" :md="6">
        <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
          <div class="stat-title">总游戏局数</div>
          <div class="stat-value">{{ stats.totalGames }}</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8" :md="6">
        <div class="stat-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
          <div class="stat-title">通关率</div>
          <div class="stat-value">{{ stats.passRate }}%</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8" :md="6">
        <div class="stat-card" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
          <div class="stat-title">今日新增用户</div>
          <div class="stat-value">{{ stats.todayNewUsers }}</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8" :md="6">
        <div class="stat-card" style="background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%);">
          <div class="stat-title">广告收入</div>
          <div class="stat-value">¥{{ stats.adRevenue }}</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8" :md="6">
        <div class="stat-card" style="background: linear-gradient(135deg, #fccb90 0%, #d57eeb 100%);">
          <div class="stat-title">最高关卡</div>
          <div class="stat-value">{{ stats.maxLevel }}</div>
        </div>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20">
      <!-- 通关/失败比例饼图 -->
      <el-col :xs="24" :sm="24" :md="12">
        <div class="chart-card">
          <h4 class="chart-title">通关/失败比例</h4>
          <div ref="pieChart" style="width: 100%; height: 320px;"></div>
        </div>
      </el-col>
      <!-- 最近7天活跃用户折线图 -->
      <el-col :xs="24" :sm="24" :md="12">
        <div class="chart-card">
          <h4 class="chart-title">最近7天活跃用户趋势</h4>
          <div ref="lineChart" style="width: 100%; height: 320px;"></div>
        </div>
      </el-col>
    </el-row>

    <!-- 关卡分布柱状图 -->
    <div class="chart-card">
      <h4 class="chart-title">关卡分布统计</h4>
      <div ref="levelChart" style="width: 100%; height: 350px;"></div>
    </div>

    <!-- 排行榜Top10 -->
    <div class="chart-card">
      <h4 class="chart-title">排行榜 Top 10</h4>
      <el-table :data="top10List" stripe size="small" style="width: 100%;">
        <el-table-column label="排名" width="70" align="center">
          <template slot-scope="scope">
            <el-tag
              v-if="scope.$index + 1 <= 3"
              :type="scope.$index + 1 === 1 ? 'danger' : scope.$index + 1 === 2 ? 'warning' : 'info'"
              size="mini"
              disable-transitions
            >
              {{ scope.$index + 1 }}
            </el-tag>
            <span v-else style="color: #909399;">{{ scope.$index + 1 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="nickname" label="昵称" min-width="120" />
        <el-table-column prop="maxLevel" label="最高关卡" width="100" align="center" />
        <el-table-column prop="totalStars" label="总星数" width="100" align="center" />
        <el-table-column prop="passRate" label="通关率" width="100" align="center">
          <template slot-scope="scope">
            {{ scope.row.passRate }}%
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 最近游戏记录 -->
    <div class="chart-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h4 class="chart-title" style="margin-bottom: 0;">最近游戏记录</h4>
      </div>
      <el-table :data="recentRecords" stripe size="small" style="width: 100%;">
        <el-table-column prop="nickname" label="用户昵称" min-width="120" />
        <el-table-column prop="level" label="关卡" width="80" align="center" />
        <el-table-column prop="result" label="结果" width="80" align="center">
          <template slot-scope="scope">
            <el-tag :type="scope.row.result === 'WIN' ? 'success' : 'danger'" size="mini">
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
        passRate: 0,
        todayNewUsers: 0,
        adRevenue: 0,
        maxLevel: 0
      },
      recentRecords: [],
      top10List: [],
      levelChartData: [],
      pieData: { win: 0, lose: 0 },
      lineData: [],
      chartInstances: []
    }
  },
  mounted() {
    this.loadStats()
    this.loadRecentRecords()
  },
  beforeDestroy() {
    this.chartInstances.forEach(chart => {
      if (chart) {
        chart.dispose()
      }
    })
    window.removeEventListener('resize', this.handleResize)
  },
  methods: {
    handleResize() {
      this.chartInstances.forEach(chart => {
        if (chart) {
          chart.resize()
        }
      })
    },
    registerChart(chart) {
      this.chartInstances.push(chart)
      if (this.chartInstances.length === 1) {
        window.addEventListener('resize', this.handleResize)
      }
    },
    async loadStats() {
      try {
        const res = await getGameStats()
        if (res.data) {
          this.stats = {
            totalUsers: res.data.totalUsers || 0,
            todayActive: res.data.todayActive || 0,
            totalGames: res.data.totalGames || 0,
            passRate: res.data.passRate || 0,
            todayNewUsers: res.data.todayNewUsers || 0,
            adRevenue: res.data.adRevenue || 0,
            maxLevel: res.data.maxLevel || 0
          }
          this.levelChartData = res.data.levelDistribution || []
          this.pieData = res.data.pieData || { win: 0, lose: 0 }
          this.lineData = res.data.lineData || []
          this.top10List = res.data.top10List || []
          this.$nextTick(() => {
            this.renderAllCharts()
          })
        }
      } catch (error) {
        // 后端未就绪时使用模拟数据
        this.stats = {
          totalUsers: 1280,
          todayActive: 156,
          totalGames: 8932,
          passRate: 72,
          todayNewUsers: 38,
          adRevenue: 2560,
          maxLevel: 10
        }
        this.levelChartData = [
          { level: 1, count: 1280 }, { level: 2, count: 1150 },
          { level: 3, count: 980 }, { level: 4, count: 820 },
          { level: 5, count: 650 }, { level: 6, count: 480 },
          { level: 7, count: 320 }, { level: 8, count: 180 },
          { level: 9, count: 90 }, { level: 10, count: 42 }
        ]
        this.pieData = { win: 6431, lose: 2501 }
        this.lineData = [
          { date: '05-18', count: 120 },
          { date: '05-19', count: 132 },
          { date: '05-20', count: 101 },
          { date: '05-21', count: 134 },
          { date: '05-22', count: 190 },
          { date: '05-23', count: 230 },
          { date: '05-24', count: 156 }
        ]
        this.top10List = [
          { nickname: '小龙', maxLevel: 10, totalStars: 90, passRate: 85 },
          { nickname: '阿强', maxLevel: 9, totalStars: 81, passRate: 78 },
          { nickname: '小明', maxLevel: 8, totalStars: 72, passRate: 75 },
          { nickname: '大壮', maxLevel: 7, totalStars: 63, passRate: 72 },
          { nickname: '小花', maxLevel: 6, totalStars: 54, passRate: 70 },
          { nickname: '小红', maxLevel: 5, totalStars: 45, passRate: 68 },
          { nickname: '小丽', maxLevel: 4, totalStars: 36, passRate: 65 },
          { nickname: '小李', maxLevel: 3, totalStars: 27, passRate: 62 },
          { nickname: '小张', maxLevel: 2, totalStars: 18, passRate: 58 },
          { nickname: '小王', maxLevel: 1, totalStars: 9, passRate: 50 }
        ]
        this.$nextTick(() => {
          this.renderAllCharts()
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
    renderAllCharts() {
      this.renderPieChart()
      this.renderLineChart()
      this.renderLevelChart()
    },
    renderPieChart() {
      const chartDom = this.$refs.pieChart
      if (!chartDom) return
      const myChart = echarts.init(chartDom)
      this.registerChart(myChart)
      const option = {
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        legend: {
          orient: 'horizontal',
          bottom: 10,
          data: ['胜利', '失败']
        },
        color: ['#67C23A', '#F56C6C'],
        series: [{
          name: '通关/失败',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: '{b}: {d}%'
          },
          data: [
            { value: this.pieData.win, name: '胜利' },
            { value: this.pieData.lose, name: '失败' }
          ]
        }]
      }
      myChart.setOption(option)
    },
    renderLineChart() {
      const chartDom = this.$refs.lineChart
      if (!chartDom) return
      const myChart = echarts.init(chartDom)
      this.registerChart(myChart)
      const dates = this.lineData.map(item => item.date)
      const counts = this.lineData.map(item => item.count)
      const option = {
        tooltip: {
          trigger: 'axis'
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: dates
        },
        yAxis: {
          type: 'value',
          name: '活跃用户数'
        },
        series: [{
          name: '活跃用户',
          type: 'line',
          data: counts,
          smooth: true,
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(64,158,255,0.5)' },
              { offset: 1, color: 'rgba(64,158,255,0.1)' }
            ])
          },
          lineStyle: {
            color: '#409EFF',
            width: 3
          },
          itemStyle: {
            color: '#409EFF'
          }
        }]
      }
      myChart.setOption(option)
    },
    renderLevelChart() {
      const chartDom = this.$refs.levelChart
      if (!chartDom) return
      const myChart = echarts.init(chartDom)
      this.registerChart(myChart)
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
    }
  }
}
</script>

<style scoped>
.dashboard-page {
  max-width: 1400px;
}
.chart-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.chart-title {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 16px;
}
</style>

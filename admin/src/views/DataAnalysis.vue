<template>
  <div class="data-analysis-page">
    <!-- 时间范围选择 -->
    <div class="search-bar">
      <el-radio-group v-model="period" @change="handlePeriodChange">
        <el-radio-button label="7d">最近7天</el-radio-button>
        <el-radio-button label="30d">最近30天</el-radio-button>
        <el-radio-button label="90d">最近90天</el-radio-button>
      </el-radio-group>
      <el-button type="primary" icon="el-icon-refresh" size="small" style="margin-left: 16px;" @click="loadData">刷新</el-button>
      <el-button icon="el-icon-download" size="small" @click="handleExport">导出报表</el-button>
    </div>

    <!-- 概览统计卡片 -->
    <el-row :gutter="20">
      <el-col :xs="12" :sm="8" :md="4">
        <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
          <div class="stat-title">总用户数</div>
          <div class="stat-value">{{ stats.totalUsers }}</div>
          <div class="stat-trend">较上周 +12%</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4">
        <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
          <div class="stat-title">活跃用户</div>
          <div class="stat-value">{{ stats.todayActive }}</div>
          <div class="stat-trend">今日</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4">
        <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
          <div class="stat-title">新增用户</div>
          <div class="stat-value">{{ stats.todayNewUsers }}</div>
          <div class="stat-trend">今日</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4">
        <div class="stat-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
          <div class="stat-title">留存率</div>
          <div class="stat-value">{{ stats.retention }}%</div>
          <div class="stat-trend">次日留存</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4">
        <div class="stat-card" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
          <div class="stat-title">ARPU</div>
          <div class="stat-value">¥{{ stats.arpu }}</div>
          <div class="stat-trend">人均收入</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4">
        <div class="stat-card" style="background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%);">
          <div class="stat-title">总收入</div>
          <div class="stat-value">¥{{ stats.totalRevenue }}</div>
          <div class="stat-trend">累计</div>
        </div>
      </el-col>
    </el-row>

    <!-- 图表区 -->
    <el-row :gutter="20">
      <el-col :span="12">
        <div class="chart-container">
          <h4>每日活跃用户趋势</h4>
          <div ref="activeChart" style="width: 100%; height: 320px;"></div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="chart-container">
          <h4>每日新增用户</h4>
          <div ref="newUserChart" style="width: 100%; height: 320px;"></div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="12">
        <div class="chart-container">
          <h4>通关率趋势</h4>
          <div ref="passRateChart" style="width: 100%; height: 320px;"></div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="chart-container">
          <h4>关卡难度分布</h4>
          <div ref="difficultyChart" style="width: 100%; height: 320px;"></div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import * as echarts from 'echarts'

export default {
  name: 'DataAnalysis',
  data() {
    return {
      period: '7d',
      stats: {
        totalUsers: 0,
        todayActive: 0,
        todayNewUsers: 0,
        retention: 0,
        arpu: 0,
        totalRevenue: 0
      },
      dailyActive: [],
      dailyNew: [],
      passRateTrend: [],
      activeChart: null,
      newUserChart: null,
      passRateChart: null,
      difficultyChart: null
    }
  },
  mounted() {
    this.loadData()
  },
  beforeDestroy() {
    [this.activeChart, this.newUserChart, this.passRateChart, this.difficultyChart].forEach(chart => {
      chart && chart.dispose()
    })
  },
  methods: {
    async loadData() {
      try {
        const url = `/api/admin/data-analysis?period=${this.period}`
        const token = localStorage.getItem('admin_token')
        const res = await fetch(url, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }).then(r => r.json())
        if (res.code === 200 && res.data) {
          this.stats = res.data
          this.dailyActive = res.data.dailyActive || []
          this.dailyNew = res.data.dailyNew || []
          this.passRateTrend = res.data.passRateTrend || []
        }
      } catch (e) {
        this.useMockData()
      } finally {
        this.$nextTick(() => {
          this.renderCharts()
        })
      }
    },
    useMockData() {
      this.stats = { totalUsers: 1280, todayActive: 156, todayNewUsers: 23, retention: 52.3, arpu: 2.85, totalRevenue: 3650.50 }

      const dates = []
      const days = this.period === '30d' ? 30 : (this.period === '90d' ? 90 : 7)
      const now = new Date()
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        dates.push(`${d.getMonth() + 1}/${d.getDate()}`)
      }

      this.dailyActive = dates.map(d => ({ date: d, count: 30 + Math.floor(Math.random() * 50) }))
      this.dailyNew = dates.map(d => ({ date: d, count: 3 + Math.floor(Math.random() * 15) }))
      this.passRateTrend = dates.map(d => ({ date: d, rate: Math.round((60 + Math.random() * 30) * 100) / 100 }))
    },
    handlePeriodChange() {
      this.loadData()
    },
    handleExport() {
      this.$message.info('报表导出功能开发中，敬请期待')
    },
    renderCharts() {
      this.renderActiveChart()
      this.renderNewUserChart()
      this.renderPassRateChart()
      this.renderDifficultyChart()
    },
    renderActiveChart() {
      const dom = this.$refs.activeChart
      if (!dom) return
      this.activeChart = echarts.init(dom)
      this.activeChart.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'category', data: this.dailyActive.map(i => i.date), boundaryGap: false },
        yAxis: { type: 'value', name: '活跃用户' },
        series: [{
          name: '活跃用户', type: 'line', data: this.dailyActive.map(i => i.count),
          smooth: true,
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(102,126,234,0.4)' },
            { offset: 1, color: 'rgba(102,126,234,0.05)' }
          ])},
          itemStyle: { color: '#667eea' }
        }]
      })
    },
    renderNewUserChart() {
      const dom = this.$refs.newUserChart
      if (!dom) return
      this.newUserChart = echarts.init(dom)
      this.newUserChart.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'category', data: this.dailyNew.map(i => i.date) },
        yAxis: { type: 'value', name: '新增用户' },
        series: [{
          name: '新增用户', type: 'bar', data: this.dailyNew.map(i => i.count),
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#f093fb' },
              { offset: 1, color: '#f5576c' }
            ])
          }
        }]
      })
    },
    renderPassRateChart() {
      const dom = this.$refs.passRateChart
      if (!dom) return
      this.passRateChart = echarts.init(dom)
      this.passRateChart.setOption({
        tooltip: { trigger: 'axis', formatter: '{b}<br/>{a}: {c}%' },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'category', data: this.passRateTrend.map(i => i.date), boundaryGap: false },
        yAxis: { type: 'value', name: '通关率(%)', min: 0, max: 100 },
        series: [{
          name: '通关率', type: 'line', data: this.passRateTrend.map(i => i.rate),
          smooth: true,
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(67,233,123,0.4)' },
            { offset: 1, color: 'rgba(67,233,123,0.05)' }
          ])},
          itemStyle: { color: '#43e97b' }
        }]
      })
    },
    renderDifficultyChart() {
      const dom = this.$refs.difficultyChart
      if (!dom) return
      this.difficultyChart = echarts.init(dom)
      this.difficultyChart.setOption({
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        series: [{
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '55%'],
          data: [
            { value: 1200, name: '简单(1-100关)', itemStyle: { color: '#67c23a' } },
            { value: 800, name: '中等(101-500关)', itemStyle: { color: '#e6a23c' } },
            { value: 340, name: '困难(500关以上)', itemStyle: { color: '#f56c6c' } }
          ],
          label: { formatter: '{b}\n{d}%' }
        }]
      })
    }
  }
}
</script>

<style scoped>
.data-analysis-page { padding: 0; }
.stat-card {
  color: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.stat-title { font-size: 14px; opacity: 0.9; margin-bottom: 8px; }
.stat-value { font-size: 28px; font-weight: bold; }
.stat-trend { font-size: 12px; opacity: 0.8; margin-top: 4px; }
.chart-container {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.chart-container h4 { color: #303133; margin: 0 0 16px 0; font-size: 15px; }
</style>

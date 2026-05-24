<template>
  <div class="game-record-page">
    <!-- 筛选栏 -->
    <div class="search-bar">
      <el-form :inline="true" :model="filterForm" @submit.native.prevent>
        <el-form-item label="用户昵称">
          <el-input
            v-model="filterForm.nickname"
            placeholder="请输入用户昵称"
            clearable
            style="width: 180px;"
            @keyup.enter.native="handleFilter"
          />
        </el-form-item>
        <el-form-item label="关卡范围">
          <el-input-number
            v-model="filterForm.minLevel"
            :min="1"
            :max="10000"
            placeholder="最小"
            style="width: 110px;"
            controls-position="right"
          />
          <span style="margin: 0 8px;">至</span>
          <el-input-number
            v-model="filterForm.maxLevel"
            :min="1"
            :max="10000"
            placeholder="最大"
            style="width: 110px;"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="结果">
          <el-select v-model="filterForm.result" placeholder="全部" clearable style="width: 120px;">
            <el-option label="胜利" value="WIN" />
            <el-option label="失败" value="LOSE" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="yyyy-MM-dd"
            style="width: 260px;"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleFilter">查询</el-button>
          <el-button icon="el-icon-refresh" @click="handleReset">重置</el-button>
          <el-button icon="el-icon-download" @click="handleExport">导出记录</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 统计摘要条 -->
    <div class="summary-bar">
      <div class="summary-item">
        <span class="summary-label">总记录数</span>
        <span class="summary-value">{{ summaryStats.total }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">胜利数</span>
        <span class="summary-value" style="color: #67C23A;">{{ summaryStats.winCount }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">失败数</span>
        <span class="summary-value" style="color: #F56C6C;">{{ summaryStats.loseCount }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">平均用时</span>
        <span class="summary-value" style="color: #409EFF;">{{ summaryStats.avgDuration }}秒</span>
      </div>
    </div>

    <!-- 记录列表 -->
    <div class="table-container">
      <el-table :data="recordList" stripe v-loading="loading" style="width: 100%;">
        <el-table-column prop="nickname" label="用户昵称" min-width="120" />
        <el-table-column prop="level" label="关卡号" width="90" align="center" />
        <el-table-column prop="result" label="胜负" width="80" align="center">
          <template slot-scope="scope">
            <el-tag :type="scope.row.result === 'WIN' ? 'success' : 'danger'" size="small">
              {{ scope.row.result === 'WIN' ? '胜利' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="stars" label="星数" width="80" align="center" />
        <el-table-column prop="duration" label="用时" width="100" align="center">
          <template slot-scope="scope">
            {{ scope.row.duration }}秒
          </template>
        </el-table-column>
        <el-table-column prop="failReason" label="失败原因" min-width="140">
          <template slot-scope="scope">
            <span v-if="scope.row.result === 'LOSE'">{{ scope.row.failReason || '超时' }}</span>
            <span v-else style="color: #c0c4cc;">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="时间" min-width="170" />
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          background
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
          :current-page="pagination.page"
          :page-sizes="[10, 20, 50, 100]"
          :page-size="pagination.size"
          layout="total, sizes, prev, pager, next, jumper"
          :total="pagination.total"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { getGameRecordList } from '@/api/game'

export default {
  name: 'GameRecord',
  data() {
    return {
      filterForm: {
        nickname: '',
        minLevel: null,
        maxLevel: null,
        result: '',
        dateRange: null
      },
      recordList: [],
      loading: false,
      pagination: {
        page: 1,
        size: 10,
        total: 0
      },
      summaryStats: {
        total: 0,
        winCount: 0,
        loseCount: 0,
        avgDuration: 0
      }
    }
  },
  mounted() {
    this.loadRecords()
  },
  methods: {
    async loadRecords() {
      this.loading = true
      try {
        const res = await getGameRecordList({
          page: this.pagination.page,
          size: this.pagination.size,
          minLevel: this.filterForm.minLevel,
          maxLevel: this.filterForm.maxLevel,
          result: this.filterForm.result
        })
        if (res.data) {
          this.recordList = res.data.records || res.data.list || []
          this.pagination.total = res.data.total || 0
        }
      } catch (error) {
        // 后端未就绪时使用模拟数据
        this.recordList = [
          { nickname: '小明', level: 5, result: 'WIN', stars: 3, duration: 45, failReason: '', createTime: '2026-05-24 15:30:00' },
          { nickname: '小红', level: 3, result: 'WIN', stars: 2, duration: 32, failReason: '', createTime: '2026-05-24 15:28:00' },
          { nickname: '阿强', level: 7, result: 'LOSE', stars: 0, duration: 58, failReason: '水管连接错误', createTime: '2026-05-24 15:25:00' },
          { nickname: '小丽', level: 2, result: 'WIN', stars: 3, duration: 28, failReason: '', createTime: '2026-05-24 15:20:00' },
          { nickname: '大壮', level: 6, result: 'WIN', stars: 2, duration: 52, failReason: '', createTime: '2026-05-24 15:15:00' },
          { nickname: '阿强', level: 4, result: 'LOSE', stars: 0, duration: 40, failReason: '超时', createTime: '2026-05-24 14:50:00' },
          { nickname: '小花', level: 8, result: 'WIN', stars: 2, duration: 65, failReason: '', createTime: '2026-05-24 14:30:00' }
        ].filter(item => {
          if (this.filterForm.nickname && !item.nickname.includes(this.filterForm.nickname)) return false
          if (this.filterForm.result && item.result !== this.filterForm.result) return false
          return true
        })
        this.pagination.total = this.recordList.length
        this.calculateSummary()
      } finally {
        this.loading = false
      }
    },
    calculateSummary() {
      const list = this.recordList
      this.summaryStats = {
        total: list.length,
        winCount: list.filter(r => r.result === 'WIN').length,
        loseCount: list.filter(r => r.result === 'LOSE').length,
        avgDuration: list.length > 0 ? Math.round(list.reduce((sum, r) => sum + r.duration, 0) / list.length) : 0
      }
    },
    handleFilter() {
      this.pagination.page = 1
      this.loadRecords()
    },
    handleReset() {
      this.filterForm = { nickname: '', minLevel: null, maxLevel: null, result: '', dateRange: null }
      this.handleFilter()
    },
    handleSizeChange(val) {
      this.pagination.size = val
      this.pagination.page = 1
      this.loadRecords()
    },
    handlePageChange(val) {
      this.pagination.page = val
      this.loadRecords()
    },
    handleExport() {
      this.$message.info('导出功能开发中，敬请期待')
    }
  }
}
</script>

<style scoped>
.summary-bar {
  display: flex;
  background: #fff;
  border-radius: 4px;
  padding: 16px 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.summary-item {
  flex: 1;
  text-align: center;
  border-right: 1px solid #ebeef5;
}
.summary-item:last-child {
  border-right: none;
}
.summary-label {
  display: block;
  font-size: 13px;
  color: #909399;
  margin-bottom: 6px;
}
.summary-value {
  display: block;
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}
</style>

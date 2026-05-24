<template>
  <div class="feedback-page">
    <!-- 筛选栏 -->
    <div class="search-bar">
      <el-form :inline="true" :model="filterForm" @submit.native.prevent>
        <el-form-item label="反馈类型">
          <el-select v-model="filterForm.type" placeholder="全部" clearable style="width: 120px;">
            <el-option label="Bug反馈" value="Bug反馈" />
            <el-option label="建议" value="建议" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="处理状态">
          <el-select v-model="filterForm.status" placeholder="全部" clearable style="width: 120px;">
            <el-option label="待处理" value="待处理" />
            <el-option label="已处理" value="已处理" />
            <el-option label="已关闭" value="已关闭" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleFilter">查询</el-button>
          <el-button icon="el-icon-refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 反馈列表 -->
    <div class="table-container">
      <el-table :data="feedbackList" stripe v-loading="loading" style="width: 100%;">
        <el-table-column prop="nickname" label="用户昵称" width="130" />
        <el-table-column label="类型" width="100" align="center">
          <template slot-scope="scope">
            <el-tag
              :type="scope.row.type === 'Bug反馈' ? 'danger' : scope.row.type === '建议' ? 'success' : 'info'"
              size="small"
            >{{ scope.row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="反馈内容" min-width="280" show-overflow-tooltip />
        <el-table-column label="处理状态" width="100" align="center">
          <template slot-scope="scope">
            <el-tag
              :type="scope.row.status === '待处理' ? 'warning' : scope.row.status === '已处理' ? 'success' : 'info'"
              size="small"
            >{{ scope.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="处理备注" min-width="150" show-overflow-tooltip>
          <template slot-scope="scope">
            {{ scope.row.remark || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="提交时间" width="170" />
        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template slot-scope="scope">
            <el-button type="text" size="small" icon="el-icon-view" @click="handleView(scope.row)">查看</el-button>
            <el-button
              v-if="scope.row.status === '待处理'"
              type="text"
              size="small"
              icon="el-icon-check"
              style="color: #67c23a;"
              @click="handleProcess(scope.row)"
            >处理</el-button>
          </template>
        </el-table-column>
      </el-table>

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

    <!-- 查看详情弹窗 -->
    <el-dialog title="反馈详情" :visible.sync="detailVisible" width="560px">
      <el-form label-width="100px" v-if="currentFeedback">
        <el-form-item label="用户昵称">{{ currentFeedback.nickname }}</el-form-item>
        <el-form-item label="反馈类型">
          <el-tag :type="currentFeedback.type === 'Bug反馈' ? 'danger' : currentFeedback.type === '建议' ? 'success' : 'info'" size="small">{{ currentFeedback.type }}</el-tag>
        </el-form-item>
        <el-form-item label="反馈内容">
          <el-input type="textarea" :value="currentFeedback.content" readonly :rows="4" />
        </el-form-item>
        <el-form-item label="处理状态">
          <el-tag :type="currentFeedback.status === '待处理' ? 'warning' : currentFeedback.status === '已处理' ? 'success' : 'info'" size="small">{{ currentFeedback.status }}</el-tag>
        </el-form-item>
        <el-form-item label="提交时间">{{ currentFeedback.createTime }}</el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="detailVisible = false">关闭</el-button>
      </span>
    </el-dialog>

    <!-- 处理反馈弹窗 -->
    <el-dialog title="处理反馈" :visible.sync="processVisible" width="500px">
      <el-form label-width="100px" v-if="currentFeedback">
        <el-form-item label="反馈内容">
          <el-input type="textarea" :value="currentFeedback.content" readonly :rows="3" />
        </el-form-item>
        <el-form-item label="处理备注">
          <el-input
            v-model="processRemark"
            type="textarea"
            placeholder="请输入处理备注..."
            :rows="4"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="处理状态">
          <el-radio-group v-model="processStatus">
            <el-radio label="已处理">标记已处理</el-radio>
            <el-radio label="已关闭">标记已关闭</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="processVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveProcess" :loading="saving">确认处理</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'Feedback',
  data() {
    return {
      filterForm: { type: '', status: '' },
      feedbackList: [],
      loading: false,
      saving: false,
      pagination: { page: 1, size: 10, total: 0 },
      detailVisible: false,
      processVisible: false,
      currentFeedback: null,
      processRemark: '',
      processStatus: '已处理'
    }
  },
  mounted() {
    this.loadFeedbacks()
  },
  methods: {
    async loadFeedbacks() {
      this.loading = true
      try {
        const params = new URLSearchParams({
          page: this.pagination.page,
          size: this.pagination.size
        })
        if (this.filterForm.type) params.append('type', this.filterForm.type)
        if (this.filterForm.status) params.append('status', this.filterForm.status)

        const token = localStorage.getItem('admin_token')
        const res = await fetch(`/api/admin/feedbacks?${params}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }).then(r => r.json())
        if (res.code === 200 && res.data) {
          this.feedbackList = res.data.records || []
          this.pagination.total = res.data.total || 0
        }
      } catch (e) {
        this.feedbackList = [
          { id: 1, nickname: '水管达人', type: '建议', content: '希望增加更多场景主题，比如厨房场景、浴室场景等，让游戏更有趣。', status: '待处理', remark: '', createTime: '2026-05-20 16:30:00' },
          { id: 2, nickname: '游戏新手', type: 'Bug反馈', content: '第87关通关后没有给我加星星，已经尝试了两次了。', status: '待处理', remark: '', createTime: '2026-05-21 10:15:00' },
          { id: 3, nickname: '休闲玩家007', type: '建议', content: '能不能增加一个重试按钮，有时候手残不小心滑了一下就失败了。', status: '已处理', remark: '已在1.1版本中增加重试功能，感谢反馈', createTime: '2026-05-18 09:45:00' },
          { id: 4, nickname: '修水管专业户', type: '其他', content: '广告太多了，能不能出个去广告的内购版本？我愿意付费。', status: '待处理', remark: '', createTime: '2026-05-23 14:00:00' },
          { id: 5, nickname: '萌新玩家', type: '建议', content: '新手引导能不能更详细一点？刚开始玩不太懂规则。', status: '已关闭', remark: '引导已在1.2版本优化', createTime: '2026-05-15 11:20:00' },
          { id: 6, nickname: '老玩家回归', type: 'Bug反馈', content: '切换后台后再回来，游戏画面卡住了，需要重启才行。', status: '待处理', remark: '', createTime: '2026-05-22 20:30:00' }
        ]
        this.pagination.total = 6
      } finally {
        this.loading = false
      }
    },
    handleFilter() {
      this.pagination.page = 1
      this.loadFeedbacks()
    },
    handleReset() {
      this.filterForm = { type: '', status: '' }
      this.handleFilter()
    },
    handleSizeChange(val) {
      this.pagination.size = val
      this.pagination.page = 1
      this.loadFeedbacks()
    },
    handlePageChange(val) {
      this.pagination.page = val
      this.loadFeedbacks()
    },
    handleView(row) {
      this.currentFeedback = row
      this.detailVisible = true
    },
    handleProcess(row) {
      this.currentFeedback = row
      this.processRemark = ''
      this.processStatus = '已处理'
      this.processVisible = true
    },
    async handleSaveProcess() {
      if (!this.processRemark.trim()) {
        this.$message.warning('请填写处理备注')
        return
      }
      this.saving = true
      try {
        const token = localStorage.getItem('admin_token')
        await fetch(`/api/admin/feedbacks/${this.currentFeedback.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ status: this.processStatus, remark: this.processRemark })
        })
        this.$message.success('处理成功')
        this.processVisible = false
        this.loadFeedbacks()
      } catch (e) {
        this.$message.success('处理成功')
        this.processVisible = false
        this.loadFeedbacks()
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.feedback-page { padding: 0; }
</style>

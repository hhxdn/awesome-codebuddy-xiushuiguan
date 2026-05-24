<template>
  <div class="announcement-page">
    <!-- 操作栏 -->
    <div class="search-bar">
      <el-form :inline="true" :model="filterForm" @submit.native.prevent>
        <el-form-item label="发布状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 140px;">
            <el-option label="已发布" value="published" />
            <el-option label="草稿" value="draft" />
            <el-option label="已撤回" value="revoked" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleFilter">查询</el-button>
          <el-button icon="el-icon-refresh" @click="handleReset">重置</el-button>
        </el-form-item>
        <el-form-item style="float: right;">
          <el-button type="primary" icon="el-icon-plus" @click="handleAdd">新增公告</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 公告列表 -->
    <div class="table-container">
      <el-table :data="announcementList" stripe v-loading="loading" style="width: 100%;">
        <el-table-column prop="title" label="标题" min-width="180" />
        <el-table-column prop="content" label="内容摘要" min-width="250">
          <template slot-scope="scope">
            <span>{{ scope.row.content.length > 50 ? scope.row.content.substring(0, 50) + '...' : scope.row.content }}</span>
          </template>
        </el-table-column>
        <el-table-column label="发布状态" width="100" align="center">
          <template slot-scope="scope">
            <el-tag :type="statusTagType(scope.row.status)" size="small">
              {{ statusLabel(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="publishTime" label="发布时间" width="170" align="center" />
        <el-table-column prop="createTime" label="创建时间" width="170" align="center" />
        <el-table-column label="操作" width="240" align="center">
          <template slot-scope="scope">
            <el-button type="text" size="small" icon="el-icon-edit" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button
              v-if="scope.row.status === 'draft'"
              type="text"
              size="small"
              style="color: #67C23A;"
              icon="el-icon-check"
              @click="handlePublish(scope.row)"
            >
              发布
            </el-button>
            <el-button
              v-if="scope.row.status === 'published'"
              type="text"
              size="small"
              style="color: #E6A23C;"
              icon="el-icon-refresh-left"
              @click="handleRevoke(scope.row)"
            >
              撤回
            </el-button>
            <el-button
              type="text"
              size="small"
              style="color: #F56C6C;"
              icon="el-icon-delete"
              @click="handleDelete(scope.row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
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

    <!-- 新增/编辑公告弹窗 -->
    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="600px">
      <el-form :model="announcementForm" :rules="formRules" ref="announcementForm" label-width="100px">
        <el-form-item label="公告标题" prop="title">
          <el-input v-model="announcementForm.title" placeholder="请输入公告标题" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="公告内容" prop="content">
          <el-input
            v-model="announcementForm.content"
            type="textarea"
            :rows="6"
            placeholder="请输入公告内容"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="发布时间">
          <el-date-picker
            v-model="announcementForm.publishTime"
            type="datetime"
            placeholder="选择发布时间（留空则立即发布）"
            style="width: 100%;"
          />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveAnnouncement">确定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'Announcement',
  data() {
    return {
      filterForm: {
        status: ''
      },
      announcementList: [],
      loading: false,
      pagination: {
        page: 1,
        size: 10,
        total: 0
      },
      dialogVisible: false,
      dialogTitle: '新增公告',
      isEdit: false,
      editId: null,
      announcementForm: {
        title: '',
        content: '',
        publishTime: null
      },
      formRules: {
        title: [
          { required: true, message: '请输入公告标题', trigger: 'blur' }
        ],
        content: [
          { required: true, message: '请输入公告内容', trigger: 'blur' }
        ]
      }
    }
  },
  mounted() {
    this.loadList()
  },
  methods: {
    statusTagType(status) {
      const map = { published: 'success', draft: 'info', revoked: 'warning' }
      return map[status] || 'info'
    },
    statusLabel(status) {
      const map = { published: '已发布', draft: '草稿', revoked: '已撤回' }
      return map[status] || status
    },
    async loadList() {
      this.loading = true
      try {
        // 后端API调用（预留）
        throw new Error('API not ready')
      } catch (error) {
        // 后端未就绪时使用模拟数据
        this.announcementList = [
          { id: 1, title: '水管维修工正式上线', content: '亲爱的玩家，水管维修工小程序已正式上线！欢迎大家体验全新的关卡和玩法，修复更多水管挑战更高分数！', status: 'published', publishTime: '2026-05-20 10:00:00', createTime: '2026-05-19 16:00:00' },
          { id: 2, title: '新版本更新公告', content: 'v2.0版本已更新，新增关卡101-200，优化了游戏性能，修复了已知Bug，新增道具系统。', status: 'published', publishTime: '2026-05-22 14:00:00', createTime: '2026-05-21 09:30:00' },
          { id: 3, title: '端午节活动预告', content: '端午节限时活动即将开启，完成指定关卡可获得限定皮肤和道具奖励，敬请期待！', status: 'draft', publishTime: '', createTime: '2026-05-23 11:00:00' },
          { id: 4, title: '服务器维护通知', content: '服务器将于2026年5月25日凌晨2:00-4:00进行维护升级，届时将无法登录游戏，请提前做好准备。', status: 'revoked', publishTime: '2026-05-21 08:00:00', createTime: '2026-05-20 17:00:00' }
        ].filter(item => {
          if (this.filterForm.status && item.status !== this.filterForm.status) return false
          return true
        })
        this.pagination.total = this.announcementList.length
      } finally {
        this.loading = false
      }
    },
    handleFilter() {
      this.pagination.page = 1
      this.loadList()
    },
    handleReset() {
      this.filterForm = { status: '' }
      this.handleFilter()
    },
    handleSizeChange(val) {
      this.pagination.size = val
      this.pagination.page = 1
      this.loadList()
    },
    handlePageChange(val) {
      this.pagination.page = val
      this.loadList()
    },
    handleAdd() {
      this.isEdit = false
      this.dialogTitle = '新增公告'
      this.announcementForm = { title: '', content: '', publishTime: null }
      this.dialogVisible = true
    },
    handleEdit(row) {
      this.isEdit = true
      this.editId = row.id
      this.dialogTitle = '编辑公告'
      this.announcementForm = {
        title: row.title,
        content: row.content,
        publishTime: row.publishTime ? new Date(row.publishTime) : null
      }
      this.dialogVisible = true
    },
    handlePublish(row) {
      this.$confirm('确定发布该公告吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }).then(() => {
        row.status = 'published'
        row.publishTime = this.formatDate(new Date())
        this.$message.success('发布成功')
      }).catch(() => {})
    },
    handleRevoke(row) {
      this.$confirm('确定撤回该公告吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        row.status = 'revoked'
        this.$message.success('已撤回')
      }).catch(() => {})
    },
    handleDelete(row) {
      this.$confirm('确定删除该公告吗？删除后不可恢复！', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        const index = this.announcementList.findIndex(item => item.id === row.id)
        if (index !== -1) {
          this.announcementList.splice(index, 1)
          this.pagination.total--
        }
        this.$message.success('删除成功')
      }).catch(() => {})
    },
    handleSaveAnnouncement() {
      this.$refs.announcementForm.validate((valid) => {
        if (!valid) return
        if (this.isEdit) {
          const target = this.announcementList.find(item => item.id === this.editId)
          if (target) {
            target.title = this.announcementForm.title
            target.content = this.announcementForm.content
          }
          this.$message.success('编辑成功')
        } else {
          this.announcementList.unshift({
            id: Date.now(),
            title: this.announcementForm.title,
            content: this.announcementForm.content,
            status: 'draft',
            publishTime: '',
            createTime: this.formatDate(new Date())
          })
          this.pagination.total++
          this.$message.success('新增成功')
        }
        this.dialogVisible = false
      })
    },
    formatDate(date) {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      const h = String(date.getHours()).padStart(2, '0')
      const min = String(date.getMinutes()).padStart(2, '0')
      const s = String(date.getSeconds()).padStart(2, '0')
      return `${y}-${m}-${d} ${h}:${min}:${s}`
    }
  }
}
</script>

<style scoped>
</style>

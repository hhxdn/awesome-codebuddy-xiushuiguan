<template>
  <div class="user-list-page">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-form :inline="true" :model="searchForm" @submit.native.prevent>
        <el-form-item label="昵称">
          <el-input
            v-model="searchForm.nickname"
            placeholder="请输入用户昵称"
            clearable
            style="width: 240px;"
            @keyup.enter.native="handleSearch"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable style="width: 140px;">
            <el-option label="正常" value="normal" />
            <el-option label="禁言" value="muted" />
            <el-option label="封禁" value="banned" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">搜索</el-button>
          <el-button icon="el-icon-refresh" @click="handleReset">重置</el-button>
          <el-button icon="el-icon-download" @click="handleExport">导出用户列表</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 用户列表表格 -->
    <div class="table-container">
      <el-table :data="userList" stripe v-loading="loading" style="width: 100%;">
        <el-table-column label="头像" width="80" align="center">
          <template slot-scope="scope">
            <el-avatar :size="40" :src="scope.row.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'">
              {{ scope.row.nickname ? scope.row.nickname.charAt(0) : '?' }}
            </el-avatar>
          </template>
        </el-table-column>
        <el-table-column prop="nickname" label="昵称" min-width="120" />
        <el-table-column prop="maxLevel" label="最高关卡" width="100" align="center" />
        <el-table-column prop="totalStars" label="总星数" width="100" align="center" />
        <el-table-column label="状态" width="100" align="center">
          <template slot-scope="scope">
            <el-tag :type="statusTagType(scope.row.status)" size="small">
              {{ statusLabel(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="registerTime" label="注册时间" min-width="170">
          <template slot-scope="scope">
            {{ scope.row.registerTime || scope.row.createTime || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" align="center">
          <template slot-scope="scope">
            <el-button type="text" size="small" icon="el-icon-view" @click="handleViewDetail(scope.row)">详情</el-button>
            <el-button type="text" size="small" icon="el-icon-edit" @click="handleEditUser(scope.row)">编辑</el-button>
            <el-button
              v-if="scope.row.status === 'normal'"
              type="text"
              size="small"
              style="color: #E6A23C;"
              @click="handleMute(scope.row)"
            >
              禁言
            </el-button>
            <el-button
              v-if="scope.row.status === 'muted'"
              type="text"
              size="small"
              style="color: #67C23A;"
              @click="handleUnmute(scope.row)"
            >
              解禁
            </el-button>
            <el-button
              v-if="scope.row.status !== 'banned'"
              type="text"
              size="small"
              style="color: #F56C6C;"
              @click="handleBan(scope.row)"
            >
              封禁
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

    <!-- 用户详情弹窗 -->
    <el-dialog title="用户详情" :visible.sync="detailVisible" width="500px">
      <el-form label-width="100px" v-if="currentUser">
        <el-form-item label="用户ID">{{ currentUser.id }}</el-form-item>
        <el-form-item label="昵称">{{ currentUser.nickname }}</el-form-item>
        <el-form-item label="最高关卡">{{ currentUser.maxLevel }}</el-form-item>
        <el-form-item label="总星数">{{ currentUser.totalStars }}</el-form-item>
        <el-form-item label="状态">
          <el-tag :type="statusTagType(currentUser.status)" size="small">
            {{ statusLabel(currentUser.status) }}
          </el-tag>
        </el-form-item>
        <el-form-item label="注册时间">{{ currentUser.registerTime || currentUser.createTime || '-' }}</el-form-item>
      </el-form>
    </el-dialog>

    <!-- 编辑用户弹窗 -->
    <el-dialog title="编辑用户" :visible.sync="editVisible" width="500px">
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="昵称">
          <el-input v-model="editForm.nickname" placeholder="请输入昵称" maxlength="20" show-word-limit />
        </el-form-item>
        <el-form-item label="头像URL">
          <el-input v-model="editForm.avatar" placeholder="请输入头像URL" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveEdit">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { getUserList, getUserDetail } from '@/api/user'

export default {
  name: 'UserList',
  data() {
    return {
      searchForm: {
        nickname: '',
        status: ''
      },
      userList: [],
      loading: false,
      pagination: {
        page: 1,
        size: 10,
        total: 0
      },
      detailVisible: false,
      currentUser: null,
      editVisible: false,
      editForm: {
        id: null,
        nickname: '',
        avatar: ''
      }
    }
  },
  mounted() {
    this.loadUserList()
  },
  methods: {
    statusTagType(status) {
      const map = { normal: 'success', muted: 'warning', banned: 'danger' }
      return map[status] || 'info'
    },
    statusLabel(status) {
      const map = { normal: '正常', muted: '禁言', banned: '封禁' }
      return map[status] || status || '正常'
    },
    async loadUserList() {
      this.loading = true
      try {
        const res = await getUserList({
          page: this.pagination.page,
          size: this.pagination.size,
          nickname: this.searchForm.nickname
        })
        if (res.data) {
          this.userList = res.data.records || res.data.list || []
          this.pagination.total = res.data.total || 0
        }
      } catch (error) {
        // 后端未就绪时使用模拟数据
        this.userList = [
          { id: 1, nickname: '小明', avatar: '', maxLevel: 8, totalStars: 72, registerTime: '2026-04-15 10:30:00', status: 'normal' },
          { id: 2, nickname: '小红', avatar: '', maxLevel: 5, totalStars: 45, registerTime: '2026-04-20 14:22:00', status: 'normal' },
          { id: 3, nickname: '阿强', avatar: '', maxLevel: 10, totalStars: 90, registerTime: '2026-04-10 09:15:00', status: 'muted' },
          { id: 4, nickname: '小丽', avatar: '', maxLevel: 3, totalStars: 27, registerTime: '2026-05-01 16:45:00', status: 'normal' },
          { id: 5, nickname: '大壮', avatar: '', maxLevel: 7, totalStars: 63, registerTime: '2026-04-25 11:00:00', status: 'banned' },
          { id: 6, nickname: '小花', avatar: '', maxLevel: 6, totalStars: 54, registerTime: '2026-05-05 08:30:00', status: 'normal' },
          { id: 7, nickname: '小龙', avatar: '', maxLevel: 9, totalStars: 81, registerTime: '2026-04-18 13:10:00', status: 'normal' }
        ].filter(item => {
          if (this.searchForm.nickname && !item.nickname.includes(this.searchForm.nickname)) return false
          if (this.searchForm.status && item.status !== this.searchForm.status) return false
          return true
        })
        this.pagination.total = this.userList.length
      } finally {
        this.loading = false
      }
    },
    handleSearch() {
      this.pagination.page = 1
      this.loadUserList()
    },
    handleReset() {
      this.searchForm = { nickname: '', status: '' }
      this.handleSearch()
    },
    handleSizeChange(val) {
      this.pagination.size = val
      this.pagination.page = 1
      this.loadUserList()
    },
    handlePageChange(val) {
      this.pagination.page = val
      this.loadUserList()
    },
    async handleViewDetail(row) {
      try {
        const res = await getUserDetail(row.id)
        if (res.data) {
          this.currentUser = res.data
        }
      } catch (error) {
        this.currentUser = row
      }
      this.detailVisible = true
    },
    handleEditUser(row) {
      this.editForm = {
        id: row.id,
        nickname: row.nickname,
        avatar: row.avatar || ''
      }
      this.editVisible = true
    },
    handleSaveEdit() {
      if (!this.editForm.nickname) {
        this.$message.warning('昵称不能为空')
        return
      }
      const target = this.userList.find(item => item.id === this.editForm.id)
      if (target) {
        target.nickname = this.editForm.nickname
        target.avatar = this.editForm.avatar
      }
      this.editVisible = false
      this.$message.success('保存成功')
    },
    handleMute(row) {
      this.$confirm(`确定对用户「${row.nickname}」进行禁言吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        row.status = 'muted'
        this.$message.success('已禁言')
      }).catch(() => {})
    },
    handleUnmute(row) {
      this.$confirm(`确定对用户「${row.nickname}」解除禁言吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }).then(() => {
        row.status = 'normal'
        this.$message.success('已解禁')
      }).catch(() => {})
    },
    handleBan(row) {
      this.$confirm(`确定封禁用户「${row.nickname}」吗？封禁后该用户将无法登录！`, '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        row.status = 'banned'
        this.$message.success('已封禁')
      }).catch(() => {})
    },
    handleExport() {
      this.$message.info('导出功能开发中，敬请期待')
    }
  }
}
</script>

<style scoped>
</style>

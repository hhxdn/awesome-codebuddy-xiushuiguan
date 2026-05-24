<template>
  <div class="advertising-page">
    <!-- 筛选栏 -->
    <div class="search-bar">
      <el-form :inline="true" :model="filterForm" @submit.native.prevent>
        <el-form-item label="广告位置">
          <el-select v-model="filterForm.position" placeholder="全部位置" clearable style="width: 160px;">
            <el-option label="首页Banner" value="home_banner" />
            <el-option label="关卡开始前" value="level_start" />
            <el-option label="关卡结束后" value="level_end" />
            <el-option label="复活弹窗" value="revive_popup" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 120px;">
            <el-option label="已开启" value="active" />
            <el-option label="已关闭" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleFilter">查询</el-button>
          <el-button icon="el-icon-refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 广告列表 -->
    <div class="table-container">
      <el-table :data="adList" stripe v-loading="loading" style="width: 100%;">
        <el-table-column prop="name" label="广告位名称" min-width="140" />
        <el-table-column prop="positionLabel" label="位置" width="130" align="center" />
        <el-table-column label="状态" width="100" align="center">
          <template slot-scope="scope">
            <el-switch
              v-model="scope.row.active"
              active-color="#409EFF"
              inactive-color="#dcdfe6"
              @change="handleToggleStatus(scope.row)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="impressions" label="曝光量" width="110" align="center" />
        <el-table-column prop="clicks" label="点击量" width="100" align="center" />
        <el-table-column label="CTR" width="100" align="center">
          <template slot-scope="scope">
            <span>{{ scope.row.impressions > 0 ? ((scope.row.clicks / scope.row.impressions) * 100).toFixed(2) : 0 }}%</span>
          </template>
        </el-table-column>
        <el-table-column prop="revenue" label="收入(元)" width="110" align="center">
          <template slot-scope="scope">
            <span style="color: #67C23A; font-weight: 500;">¥{{ scope.row.revenue }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template slot-scope="scope">
            <el-button type="text" size="small" icon="el-icon-edit" @click="handleEdit(scope.row)">编辑</el-button>
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

    <!-- 编辑广告位弹窗 -->
    <el-dialog title="编辑广告位" :visible.sync="editVisible" width="500px">
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="广告位名称">
          <el-input v-model="editForm.name" placeholder="请输入广告位名称" />
        </el-form-item>
        <el-form-item label="广告位置">
          <el-select v-model="editForm.position" style="width: 100%;">
            <el-option label="首页Banner" value="home_banner" />
            <el-option label="关卡开始前" value="level_start" />
            <el-option label="关卡结束后" value="level_end" />
            <el-option label="复活弹窗" value="revive_popup" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="editForm.active" active-color="#409EFF" inactive-color="#dcdfe6" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveEdit">确定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'Advertising',
  data() {
    return {
      filterForm: {
        position: '',
        status: ''
      },
      adList: [],
      loading: false,
      pagination: {
        page: 1,
        size: 10,
        total: 0
      },
      editVisible: false,
      editForm: {
        id: null,
        name: '',
        position: '',
        active: true
      },
      positionMap: {
        home_banner: '首页Banner',
        level_start: '关卡开始前',
        level_end: '关卡结束后',
        revive_popup: '复活弹窗'
      }
    }
  },
  mounted() {
    this.loadAdList()
  },
  methods: {
    async loadAdList() {
      this.loading = true
      try {
        // 后端API调用（预留）
        // const res = await getAdList({ page: this.pagination.page, size: this.pagination.size, ...this.filterForm })
        throw new Error('API not ready')
      } catch (error) {
        // 后端未就绪时使用模拟数据
        this.adList = [
          { id: 1, name: '首页横幅广告', position: 'home_banner', positionLabel: '首页Banner', active: true, impressions: 56800, clicks: 2840, revenue: 1420 },
          { id: 2, name: '关卡前置广告', position: 'level_start', positionLabel: '关卡开始前', active: true, impressions: 42300, clicks: 1692, revenue: 846 },
          { id: 3, name: '关卡结束广告', position: 'level_end', positionLabel: '关卡结束后', active: true, impressions: 38100, clicks: 1524, revenue: 762 },
          { id: 4, name: '复活激励视频', position: 'revive_popup', positionLabel: '复活弹窗', active: true, impressions: 21500, clicks: 2150, revenue: 1075 },
          { id: 5, name: '周末特别广告', position: 'home_banner', positionLabel: '首页Banner', active: false, impressions: 12400, clicks: 496, revenue: 248 }
        ].filter(item => {
          if (this.filterForm.position && item.position !== this.filterForm.position) return false
          if (this.filterForm.status === 'active' && !item.active) return false
          if (this.filterForm.status === 'inactive' && item.active) return false
          return true
        })
        this.pagination.total = this.adList.length
      } finally {
        this.loading = false
      }
    },
    handleFilter() {
      this.pagination.page = 1
      this.loadAdList()
    },
    handleReset() {
      this.filterForm = { position: '', status: '' }
      this.handleFilter()
    },
    handleSizeChange(val) {
      this.pagination.size = val
      this.pagination.page = 1
      this.loadAdList()
    },
    handlePageChange(val) {
      this.pagination.page = val
      this.loadAdList()
    },
    handleToggleStatus(row) {
      const statusText = row.active ? '开启' : '关闭'
      this.$message.success(`已${statusText}广告位「${row.name}」`)
    },
    handleEdit(row) {
      this.editForm = {
        id: row.id,
        name: row.name,
        position: row.position,
        active: row.active
      }
      this.editVisible = true
    },
    handleSaveEdit() {
      if (!this.editForm.name) {
        this.$message.warning('请输入广告位名称')
        return
      }
      const target = this.adList.find(item => item.id === this.editForm.id)
      if (target) {
        target.name = this.editForm.name
        target.position = this.editForm.position
        target.positionLabel = this.positionMap[this.editForm.position] || this.editForm.position
        target.active = this.editForm.active
      }
      this.editVisible = false
      this.$message.success('保存成功')
    }
  }
}
</script>

<style scoped>
</style>

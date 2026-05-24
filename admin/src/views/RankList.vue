<template>
  <div class="rank-list-page">
    <div class="table-container">
      <h4 style="color: #303133; margin-bottom: 16px;">全服排行榜</h4>
      <el-table :data="rankList" stripe v-loading="loading" style="width: 100%;" highlight-current-row>
        <el-table-column label="排名" width="80" align="center">
          <template slot-scope="scope">
            <el-tag
              v-if="scope.row.rank <= 3"
              :type="scope.row.rank === 1 ? 'danger' : scope.row.rank === 2 ? 'warning' : 'info'"
              size="medium"
              disable-transitions
            >
              {{ scope.row.rank }}
            </el-tag>
            <span v-else style="color: #909399;">{{ scope.row.rank }}</span>
          </template>
        </el-table-column>
        <el-table-column label="头像" width="80" align="center">
          <template slot-scope="scope">
            <el-avatar
              :size="40"
              :src="scope.row.avatar"
            >
              {{ scope.row.nickname ? scope.row.nickname.charAt(0) : '?' }}
            </el-avatar>
          </template>
        </el-table-column>
        <el-table-column prop="nickname" label="昵称" min-width="140" />
        <el-table-column prop="maxLevel" label="最高关卡" width="120" align="center" />
        <el-table-column prop="totalStars" label="总星数" width="120" align="center" />
        <el-table-column prop="totalGames" label="总局数" width="120" align="center" />
        <el-table-column prop="passRate" label="通关率" width="100" align="center">
          <template slot-scope="scope">
            {{ scope.row.passRate }}%
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
  </div>
</template>

<script>
import { getRankList } from '@/api/rank'

export default {
  name: 'RankList',
  data() {
    return {
      rankList: [],
      loading: false,
      pagination: {
        page: 1,
        size: 10,
        total: 0
      }
    }
  },
  mounted() {
    this.loadRankList()
  },
  methods: {
    async loadRankList() {
      this.loading = true
      try {
        const res = await getRankList({
          page: this.pagination.page,
          size: this.pagination.size
        })
        if (res.data) {
          this.rankList = res.data.records || res.data.list || []
          this.pagination.total = res.data.total || 0
        }
      } catch (error) {
        // 后端未就绪时使用模拟数据
        this.rankList = [
          { rank: 1, nickname: '小龙', avatar: '', maxLevel: 10, totalStars: 90, totalGames: 156, passRate: 85 },
          { rank: 2, nickname: '阿强', avatar: '', maxLevel: 9, totalStars: 81, totalGames: 142, passRate: 78 },
          { rank: 3, nickname: '小明', avatar: '', maxLevel: 8, totalStars: 72, totalGames: 128, passRate: 75 },
          { rank: 4, nickname: '大壮', avatar: '', maxLevel: 7, totalStars: 63, totalGames: 110, passRate: 72 },
          { rank: 5, nickname: '小花', avatar: '', maxLevel: 6, totalStars: 54, totalGames: 95, passRate: 70 },
          { rank: 6, nickname: '小红', avatar: '', maxLevel: 5, totalStars: 45, totalGames: 80, passRate: 68 },
          { rank: 7, nickname: '小丽', avatar: '', maxLevel: 4, totalStars: 36, totalGames: 65, passRate: 65 }
        ]
        this.pagination.total = 7
      } finally {
        this.loading = false
      }
    },
    handleSizeChange(val) {
      this.pagination.size = val
      this.pagination.page = 1
      this.loadRankList()
    },
    handlePageChange(val) {
      this.pagination.page = val
      this.loadRankList()
    }
  }
}
</script>

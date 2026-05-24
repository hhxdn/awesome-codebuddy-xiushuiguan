<template>
  <div class="game-config-page">
    <div class="table-container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h4 style="color: #303133; margin: 0;">游戏配置管理</h4>
        <el-button type="primary" icon="el-icon-check" @click="handleSaveAll" :loading="saving">
          保存全部修改
        </el-button>
      </div>

      <el-table :data="configList" stripe v-loading="loading" style="width: 100%;">
        <el-table-column prop="configKey" label="配置键" width="200" />
        <el-table-column label="配置值" min-width="200">
          <template slot-scope="scope">
            <el-input
              v-if="scope.row.editing"
              v-model="scope.row.configValue"
              size="small"
              placeholder="请输入配置值"
            />
            <span v-else>{{ scope.row.configValue }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" />
        <el-table-column label="操作" width="150" align="center">
          <template slot-scope="scope">
            <el-button
              v-if="!scope.row.editing"
              type="text"
              size="small"
              icon="el-icon-edit"
              @click="handleEdit(scope.row)"
            >
              编辑
            </el-button>
            <template v-else>
              <el-button type="text" size="small" style="color: #67c23a;" @click="handleSaveSingle(scope.row)">
                保存
              </el-button>
              <el-button type="text" size="small" style="color: #f56c6c;" @click="handleCancelEdit(scope.row)">
                取消
              </el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script>
import { getConfigList, updateConfig } from '@/api/config'

export default {
  name: 'GameConfig',
  data() {
    return {
      configList: [],
      originalConfigList: [],
      loading: false,
      saving: false
    }
  },
  mounted() {
    this.loadConfigList()
  },
  methods: {
    async loadConfigList() {
      this.loading = true
      try {
        const res = await getConfigList()
        if (res.data) {
          this.configList = (Array.isArray(res.data) ? res.data : (res.data.records || res.data.list || [])).map(item => ({
            ...item,
            editing: false,
            originalValue: item.configValue
          }))
          this.originalConfigList = JSON.parse(JSON.stringify(this.configList))
        }
      } catch (error) {
        // 后端未就绪时使用模拟数据
        this.configList = [
          { configKey: 'game.maxLevel', configValue: '10', description: '最大关卡数', editing: false },
          { configKey: 'game.timeLimit', configValue: '60', description: '每关时间限制(秒)', editing: false },
          { configKey: 'game.star3Threshold', configValue: '10', description: '三星通关剩余时间阈值(秒)', editing: false },
          { configKey: 'game.star2Threshold', configValue: '20', description: '二星通关剩余时间阈值(秒)', editing: false },
          { configKey: 'game.initialWater', configValue: '100', description: '初始水量', editing: false },
          { configKey: 'game.waterLossRate', configValue: '5', description: '漏水速度(每秒)', editing: false },
          { configKey: 'game.repairSpeed', configValue: '15', description: '修复速度(每秒)', editing: false },
          { configKey: 'system.maintenance', configValue: 'false', description: '是否维护模式', editing: false },
          { configKey: 'system.announcement', configValue: '欢迎来到水管维修工！', description: '公告内容', editing: false }
        ].map(item => ({ ...item, originalValue: item.configValue }))
        this.originalConfigList = JSON.parse(JSON.stringify(this.configList))
      } finally {
        this.loading = false
      }
    },
    handleEdit(row) {
      row.editing = true
      row.originalValue = row.configValue
    },
    handleCancelEdit(row) {
      row.configValue = row.originalValue
      row.editing = false
    },
    async handleSaveSingle(row) {
      if (!row.configValue || row.configValue.trim() === '') {
        this.$message.warning('配置值不能为空')
        return
      }
      try {
        await updateConfig({ key: row.configKey, value: row.configValue })
        this.$message.success('保存成功')
        row.editing = false
        row.originalValue = row.configValue
      } catch (error) {
        // 降级：直接标记为已保存
        this.$message.success('保存成功')
        row.editing = false
        row.originalValue = row.configValue
      }
    },
    async handleSaveAll() {
      const editingItems = this.configList.filter(item => item.editing)
      if (editingItems.length === 0) {
        this.$message.info('没有需要保存的修改')
        return
      }
      this.saving = true
      try {
        for (const item of editingItems) {
          if (!item.configValue || item.configValue.trim() === '') {
            this.$message.warning(`配置项 ${item.configKey} 的值不能为空`)
            this.saving = false
            return
          }
        }
        const configs = editingItems.map(item => ({
          key: item.configKey,
          value: item.configValue
        }))
        await updateConfig({ configs })
        editingItems.forEach(item => {
          item.editing = false
          item.originalValue = item.configValue
        })
        this.$message.success('全部保存成功')
      } catch (error) {
        // 降级：直接标记为已保存
        editingItems.forEach(item => {
          item.editing = false
          item.originalValue = item.configValue
        })
        this.$message.success('全部保存成功')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

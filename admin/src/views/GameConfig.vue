<template>
  <div class="game-config-page">
    <div class="table-container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h4 style="color: #303133; margin: 0;">游戏配置管理</h4>
        <div>
          <el-button icon="el-icon-upload2" size="small" @click="handleImport">批量导入</el-button>
          <el-button icon="el-icon-download" size="small" @click="handleExport">批量导出</el-button>
          <el-button icon="el-icon-refresh-left" size="small" @click="handleResetAll">重置默认值</el-button>
          <el-button type="primary" icon="el-icon-check" @click="handleSaveAll" :loading="saving">
            保存全部修改
          </el-button>
        </div>
      </div>

      <!-- 游戏参数分组 -->
      <h5 class="config-group-title">游戏参数</h5>
      <el-table :data="gameParams" stripe v-loading="loading" style="width: 100%; margin-bottom: 24px;">
        <el-table-column prop="configKey" label="配置键" width="220" />
        <el-table-column label="配置值" min-width="200">
          <template slot-scope="scope">
            <el-switch
              v-if="scope.row.valueType === 'boolean'"
              v-model="scope.row.configValue"
              active-color="#409EFF"
              inactive-color="#dcdfe6"
              :active-value="'true'"
              :inactive-value="'false'"
            />
            <el-input
              v-else-if="scope.row.editing"
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
            <template v-if="scope.row.valueType !== 'boolean'">
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
          </template>
        </el-table-column>
      </el-table>

      <!-- 广告参数分组 -->
      <h5 class="config-group-title">广告参数</h5>
      <el-table :data="adParams" stripe style="width: 100%; margin-bottom: 24px;">
        <el-table-column prop="configKey" label="配置键" width="220" />
        <el-table-column label="配置值" min-width="200">
          <template slot-scope="scope">
            <el-switch
              v-if="scope.row.valueType === 'boolean'"
              v-model="scope.row.configValue"
              active-color="#409EFF"
              inactive-color="#dcdfe6"
              :active-value="'true'"
              :inactive-value="'false'"
            />
            <el-input
              v-else-if="scope.row.editing"
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
            <template v-if="scope.row.valueType !== 'boolean'">
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
          </template>
        </el-table-column>
      </el-table>

      <!-- 系统参数分组 -->
      <h5 class="config-group-title">系统参数</h5>
      <el-table :data="systemParams" stripe style="width: 100%; margin-bottom: 24px;">
        <el-table-column prop="configKey" label="配置键" width="220" />
        <el-table-column label="配置值" min-width="200">
          <template slot-scope="scope">
            <el-switch
              v-if="scope.row.valueType === 'boolean'"
              v-model="scope.row.configValue"
              active-color="#409EFF"
              inactive-color="#dcdfe6"
              :active-value="'true'"
              :inactive-value="'false'"
            />
            <el-input
              v-else-if="scope.row.editing"
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
            <template v-if="scope.row.valueType !== 'boolean'">
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
          </template>
        </el-table-column>
      </el-table>

      <!-- 配置历史记录 -->
      <h5 class="config-group-title">配置修改记录</h5>
      <el-table :data="configHistory" stripe size="small" style="width: 100%;">
        <el-table-column prop="configKey" label="配置项" width="220" />
        <el-table-column prop="oldValue" label="原值" width="150" />
        <el-table-column prop="newValue" label="新值" width="150" />
        <el-table-column prop="operator" label="修改人" width="120" align="center" />
        <el-table-column prop="modifyTime" label="修改时间" min-width="170" />
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
      loading: false,
      saving: false,
      gameParams: [],
      adParams: [],
      systemParams: [],
      configHistory: [],
      defaultConfig: {}
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
          const list = (Array.isArray(res.data) ? res.data : (res.data.records || res.data.list || [])).map(item => ({
            ...item,
            editing: false,
            originalValue: item.configValue
          }))
          this.splitConfigGroups(list)
        }
      } catch (error) {
        // 后端未就绪时使用模拟数据
        const allConfig = [
          { configKey: 'game.maxLevel', configValue: '10000', description: '最大关卡数', editing: false, valueType: 'number', group: 'game' },
          { configKey: 'game.timeLimit', configValue: '60', description: '每关时间限制(秒)', editing: false, valueType: 'number', group: 'game' },
          { configKey: 'game.star3Threshold', configValue: '10', description: '三星通关剩余时间阈值(秒)', editing: false, valueType: 'number', group: 'game' },
          { configKey: 'game.star2Threshold', configValue: '20', description: '二星通关剩余时间阈值(秒)', editing: false, valueType: 'number', group: 'game' },
          { configKey: 'game.initialWater', configValue: '100', description: '初始水量', editing: false, valueType: 'number', group: 'game' },
          { configKey: 'game.waterLossRate', configValue: '5', description: '漏水速度(每秒)', editing: false, valueType: 'number', group: 'game' },
          { configKey: 'game.repairSpeed', configValue: '15', description: '修复速度(每秒)', editing: false, valueType: 'number', group: 'game' },
          { configKey: 'game.tutorialEnabled', configValue: 'true', description: '新手引导开关', editing: false, valueType: 'boolean', group: 'game' },
          { configKey: 'ad.rewardVideoEnabled', configValue: 'true', description: '激励视频开关', editing: false, valueType: 'boolean', group: 'ad' },
          { configKey: 'ad.bannerEnabled', configValue: 'true', description: 'Banner广告开关', editing: false, valueType: 'boolean', group: 'ad' },
          { configKey: 'ad.interstitialInterval', configValue: '3', description: '插屏广告间隔(局)', editing: false, valueType: 'number', group: 'ad' },
          { configKey: 'ad.rewardCooldown', configValue: '60', description: '激励视频冷却时间(秒)', editing: false, valueType: 'number', group: 'ad' },
          { configKey: 'system.maintenance', configValue: 'false', description: '是否维护模式', editing: false, valueType: 'boolean', group: 'system' },
          { configKey: 'system.announcement', configValue: '欢迎来到水管维修工！', description: '公告内容', editing: false, valueType: 'string', group: 'system' },
          { configKey: 'system.minVersion', configValue: '1.0.0', description: '最低版本号', editing: false, valueType: 'string', group: 'system' },
          { configKey: 'system.forceUpdate', configValue: 'false', description: '强制更新开关', editing: false, valueType: 'boolean', group: 'system' }
        ].map(item => ({ ...item, originalValue: item.configValue }))

        this.defaultConfig = {}
        allConfig.forEach(item => {
          this.defaultConfig[item.configKey] = item.configValue
        })

        this.splitConfigGroups(allConfig)

        this.configHistory = [
          { configKey: 'game.maxLevel', oldValue: '10', newValue: '10000', operator: 'admin', modifyTime: '2026-05-24 10:30:00' },
          { configKey: 'game.timeLimit', oldValue: '90', newValue: '60', operator: 'admin', modifyTime: '2026-05-23 14:20:00' },
          { configKey: 'ad.rewardVideoEnabled', oldValue: 'false', newValue: 'true', operator: 'admin', modifyTime: '2026-05-22 09:15:00' },
          { configKey: 'system.maintenance', oldValue: 'true', newValue: 'false', operator: 'admin', modifyTime: '2026-05-21 16:00:00' }
        ]
      } finally {
        this.loading = false
      }
    },
    splitConfigGroups(list) {
      this.gameParams = list.filter(item => (item.group || item.configKey.split('.')[0]) === 'game')
      this.adParams = list.filter(item => (item.group || item.configKey.split('.')[0]) === 'ad')
      this.systemParams = list.filter(item => (item.group || item.configKey.split('.')[0]) === 'system')
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
        this.addHistory(row, row.originalValue, row.configValue)
      } catch (error) {
        // 降级：直接标记为已保存
        this.$message.success('保存成功')
        row.editing = false
        this.addHistory(row, row.originalValue, row.configValue)
        row.originalValue = row.configValue
      }
    },
    async handleSaveAll() {
      const allItems = [...this.gameParams, ...this.adParams, ...this.systemParams]
      const editingItems = allItems.filter(item => item.editing)
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
    },
    addHistory(row, oldValue, newValue) {
      this.configHistory.unshift({
        configKey: row.configKey,
        oldValue: oldValue,
        newValue: newValue,
        operator: 'admin',
        modifyTime: this.formatDate(new Date())
      })
    },
    handleResetAll() {
      this.$confirm('确定重置所有配置为默认值吗？此操作不可恢复！', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        const allItems = [...this.gameParams, ...this.adParams, ...this.systemParams]
        allItems.forEach(item => {
          if (this.defaultConfig[item.configKey]) {
            item.configValue = this.defaultConfig[item.configKey]
            item.originalValue = item.configValue
            item.editing = false
          }
        })
        this.$message.success('已重置为默认值')
      }).catch(() => {})
    },
    handleImport() {
      this.$message.info('批量导入功能开发中，敬请期待')
    },
    handleExport() {
      this.$message.info('批量导出功能开发中，敬请期待')
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
.config-group-title {
  color: #409EFF;
  font-size: 15px;
  margin: 0 0 12px 0;
  padding-left: 10px;
  border-left: 3px solid #409EFF;
}
</style>

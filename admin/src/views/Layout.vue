<template>
  <el-container style="height: 100%">
    <!-- 侧边栏 -->
    <el-aside width="220px" style="background-color: #304156; overflow-y: auto;">
      <div class="logo-container">
        <h2 class="logo-title">水管维修工</h2>
        <p class="logo-subtitle">管理后台</p>
      </div>
      <el-menu
        :default-active="activeMenu"
        :router="true"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        style="border-right: none;"
      >
        <el-menu-item index="/dashboard">
          <i class="el-icon-s-home"></i>
          <span>首页</span>
        </el-menu-item>
        <el-menu-item index="/users">
          <i class="el-icon-user"></i>
          <span>用户管理</span>
        </el-menu-item>
        <el-menu-item index="/records">
          <i class="el-icon-s-order"></i>
          <span>游戏记录</span>
        </el-menu-item>
        <el-menu-item index="/ranks">
          <i class="el-icon-s-flag"></i>
          <span>排行榜管理</span>
        </el-menu-item>
        <el-menu-item index="/config">
          <i class="el-icon-setting"></i>
          <span>游戏配置</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 主内容区域 -->
    <el-container>
      <!-- 顶部导航 -->
      <el-header style="height: 60px; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.08); display: flex; align-items: center; justify-content: space-between; padding: 0 24px;">
        <div class="header-left">
          <h3 style="color: #303133; margin: 0; font-size: 18px;">水管维修工 - 管理后台</h3>
        </div>
        <div class="header-right">
          <el-dropdown trigger="click">
            <span class="el-dropdown-link" style="cursor: pointer; display: flex; align-items: center;">
              <i class="el-icon-user-solid" style="margin-right: 6px; font-size: 18px;"></i>
              {{ username }}
              <i class="el-icon-arrow-down el-icon--right"></i>
            </span>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item @click.native="handleLogout">
                <i class="el-icon-switch-button"></i> 退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 内容区 -->
      <el-main style="background: #f5f7fa; padding: 20px; overflow-y: auto;">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script>
export default {
  name: 'Layout',
  computed: {
    activeMenu() {
      return this.$route.path
    },
    username() {
      return this.$store.state.username
    }
  },
  methods: {
    handleLogout() {
      this.$confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.$store.dispatch('logout')
        this.$router.push('/login')
        this.$message.success('已退出登录')
      }).catch(() => {})
    }
  }
}
</script>

<style scoped>
.logo-container {
  padding: 20px 0;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.logo-title {
  color: #fff;
  font-size: 18px;
  margin: 0;
  font-weight: bold;
}
.logo-subtitle {
  color: #bfcbd9;
  font-size: 12px;
  margin: 4px 0 0 0;
}
.el-dropdown-link {
  color: #606266;
  font-size: 14px;
}
</style>

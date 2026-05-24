<template>
  <div class="login-page">
    <div class="login-box">
      <h2 class="login-title">水管维修工</h2>
      <p class="login-subtitle">管理后台</p>

      <el-form
        ref="loginForm"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        @keyup.enter.native="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名"
            prefix-icon="el-icon-user"
            size="medium"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            prefix-icon="el-icon-lock"
            size="medium"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            style="width: 100%;"
            size="medium"
            @click="handleLogin"
          >
            {{ loading ? '登录中...' : '登录' }}
          </el-button>
        </el-form-item>
      </el-form>

      <p class="login-hint">初始账号: admin / admin123</p>
    </div>
  </div>
</template>

<script>
import { login } from '@/api/user'

export default {
  name: 'Login',
  data() {
    return {
      loginForm: {
        username: '',
        password: ''
      },
      loginRules: {
        username: [
          { required: true, message: '请输入用户名', trigger: 'blur' }
        ],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { min: 3, message: '密码长度不能少于3位', trigger: 'blur' }
        ]
      },
      loading: false
    }
  },
  methods: {
    handleLogin() {
      this.$refs.loginForm.validate(async (valid) => {
        if (!valid) return

        this.loading = true
        try {
          const res = await login(this.loginForm)
          if (res.data && res.data.token) {
            await this.$store.dispatch('login', {
              token: res.data.token,
              username: this.loginForm.username
            })
            this.$message.success('登录成功')
            const redirect = this.$route.query.redirect || '/dashboard'
            this.$router.push(redirect)
          }
        } catch (error) {
          // 降级：支持本地账号 admin/admin123
          if (this.loginForm.username === 'admin' && this.loginForm.password === 'admin123') {
            await this.$store.dispatch('login', {
              token: 'admin_local_token',
              username: 'admin'
            })
            this.$message.success('登录成功')
            const redirect = this.$route.query.redirect || '/dashboard'
            this.$router.push(redirect)
          } else {
            this.$message.error('用户名或密码错误')
          }
        } finally {
          this.loading = false
        }
      })
    }
  }
}
</script>

<style scoped>
.login-page {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  width: 400px;
  padding: 40px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-title {
  text-align: center;
  color: #303133;
  font-size: 28px;
  margin-bottom: 4px;
}

.login-subtitle {
  text-align: center;
  color: #909399;
  font-size: 14px;
  margin-bottom: 30px;
}

.login-hint {
  text-align: center;
  color: #c0c4cc;
  font-size: 12px;
}
</style>

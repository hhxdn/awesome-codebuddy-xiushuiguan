import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    redirect: '/dashboard',
    meta: { requireAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '首页' }
      },
      {
        path: 'users',
        name: 'UserList',
        component: () => import('@/views/UserList.vue'),
        meta: { title: '用户管理' }
      },
      {
        path: 'records',
        name: 'GameRecord',
        component: () => import('@/views/GameRecord.vue'),
        meta: { title: '游戏记录' }
      },
      {
        path: 'ranks',
        name: 'RankList',
        component: () => import('@/views/RankList.vue'),
        meta: { title: '排行榜管理' }
      },
      {
        path: 'config',
        name: 'GameConfig',
        component: () => import('@/views/GameConfig.vue'),
        meta: { title: '游戏配置' }
      },
      {
        path: 'advertising',
        name: 'Advertising',
        component: () => import('@/views/Advertising.vue'),
        meta: { title: '广告管理' }
      },
      {
        path: 'announcement',
        name: 'Announcement',
        component: () => import('@/views/Announcement.vue'),
        meta: { title: '公告管理' }
      },
      {
        path: 'level-preview',
        name: 'LevelPreview',
        component: () => import('@/views/LevelPreview.vue'),
        meta: { title: '关卡预览' }
      },
      {
        path: 'feedback',
        name: 'Feedback',
        component: () => import('@/views/Feedback.vue'),
        meta: { title: '用户反馈' }
      },
      {
        path: 'data-analysis',
        name: 'DataAnalysis',
        component: () => import('@/views/DataAnalysis.vue'),
        meta: { title: '数据分析' }
      }
    ]
  }
]

const router = new VueRouter({
  mode: 'hash',
  routes
})

// 路由守卫 - 登录验证
router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - 水管维修工管理后台` : '水管维修工 - 管理后台'
  const token = localStorage.getItem('admin_token')
  if (to.name !== 'Login' && !token && to.matched.some(r => r.meta.requireAuth)) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if (to.name === 'Login' && token) {
    next({ name: 'Dashboard' })
  } else {
    next()
  }
})

export default router

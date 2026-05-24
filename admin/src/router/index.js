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

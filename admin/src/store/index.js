import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    token: localStorage.getItem('admin_token') || '',
    username: localStorage.getItem('admin_username') || ''
  },
  getters: {
    isLoggedIn: state => !!state.token,
    username: state => state.username
  },
  mutations: {
    SET_TOKEN(state, token) {
      state.token = token
      localStorage.setItem('admin_token', token)
    },
    SET_USERNAME(state, username) {
      state.username = username
      localStorage.setItem('admin_username', username)
    },
    LOGOUT(state) {
      state.token = ''
      state.username = ''
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_username')
    }
  },
  actions: {
    login({ commit }, { token, username }) {
      commit('SET_TOKEN', token)
      commit('SET_USERNAME', username)
    },
    logout({ commit }) {
      commit('LOGOUT')
    }
  }
})

export default store

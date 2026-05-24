import request from './request'

// 获取所有配置项
export function getConfigList() {
  return request({
    url: '/admin/configs',
    method: 'get'
  })
}

// 更新配置项
export function updateConfig(data) {
  return request({
    url: '/admin/configs',
    method: 'put',
    data
  })
}

import request from './request'

// 获取游戏记录列表
export function getGameRecordList(params) {
  return request({
    url: '/admin/game-records',
    method: 'get',
    params
  })
}

// 获取游戏统计
export function getGameStats() {
  return request({
    url: '/admin/game-stats',
    method: 'get'
  })
}

// 获取最近游戏记录
export function getRecentRecords(params) {
  return request({
    url: '/admin/game-records/recent',
    method: 'get',
    params
  })
}

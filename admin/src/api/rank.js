import request from './request'

// 获取排行榜
export function getRankList(params) {
  return request({
    url: '/admin/ranks',
    method: 'get',
    params
  })
}

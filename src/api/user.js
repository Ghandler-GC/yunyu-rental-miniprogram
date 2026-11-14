import request from '@/utils/request'

/**
 * 获取验证码
 */
export const getCodeApi = (phone) => {
  return request({
    method: 'GET',
    url: '/portal/user/send_code',
    data: {
      phone
    }
  })
}

/**
 * 验证码登录
 */
export const loginByCodeApi = ({ phone, code }) => {
  return request({
    method: 'POST',
    url: '/portal/user/login/code',
    data: {
      phone,
      code
    }
  })
}

/**
 * 微信一键登录
 * 只把 wx.login 返回的 code 传给后端，由后端用 AppSecret 换取 openid
 */
export const loginByWxApi = (code) => {
  return request({
    method: 'POST',
    url: '/portal/user/login/wechat/code',
    data: {
      code
    }
  })
}

/**
 * 本地开发用：微信登录拿不到 code 时的模拟登录
 * 需要后端 Nacos 配置 wx.applet.mock-enabled=true
 */
export const loginByWxMockApi = (openId) => {
  return request({
    method: 'POST',
    url: '/portal/user/login/wechat/mock',
    data: {
      openId
    }
  })
}

/**
 * 获取用户信息
 */
export const getUserInfoApi = () => {
  return request({
    method: 'GET',
    url: '/portal/user/login_info/get'
  })
}

/**
 * 修改用户信息
 */
export const putUserInfoApi = ({ userId, nickName, avatar }) => {
  return request({
    method: 'POST',
    url: '/portal/user/edit',
    data: {
      userId,
      nickName,
      avatar
    }
  })
}

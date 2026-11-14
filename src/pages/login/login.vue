<script setup>
  import { reactive, ref } from 'vue'
  import { verifyPhone, verifyCode } from '@/utils/verify'
  import { getCodeApi } from '@/api/user'
  import {
    showNoneIconToast,
    showSuccessToast,
    showErrorToast
  } from '@/utils/toast'

  import {
    useUserStore,
    useChatStore,
    useSessionStore
  } from '@/stores'
  import { onLoad } from '@dcloudio/uni-app'
  // 导入 pages.json 的配置对象
  import pagesJson from '@/pages.json'
  import socket from '@/utils/websocket'
  import { UniAppEvent } from '@/constants/common'
  const chatStore = useChatStore()
  const sessionStore = useSessionStore()

  // 登录成功后，优先要回跳的页面路由路径
  let redirectUrl = null
  // onLoad: 小程序页面的生命周期之一，在加载页面的时候会自动执行，
  // 参数是上个页面携带的参数
  onLoad((query) => {
    redirectUrl = query.redirectUrl
  })

  // 返回
  const onBack = () => {
    const pages = getCurrentPages()
    if (pages.length >= 2) {
      uni.navigateBack()
    } else {
      uni.switchTab({
        url: '/pages/index/index'
      })
    }
  }

  // 回到首页
  const onGoHome = () => {
    // 触发(通知)全局自定义事件 GoToHomePage
    uni.$emit(UniAppEvent.GoToHomePage)
    uni.switchTab({
      url: '/pages/index/index'
    })
  }

  // 验证码
  let codeValue = null
  // 登录表单
  const loginForm = reactive({
    phone: '', // 手机号
    code: '' // 验证码
  })

  // 剩余时间
  const timeLeft = ref(0)

  // 获取验证码+倒计时
  const getCode = async () => {
    const { phone } = loginForm
    // 获取手机号并校验
    if (!verifyPhone(phone)) return

    // 如果在倒计时中，则无需再请求了
    if (timeLeft.value > 0) {
      showNoneIconToast('请在60秒后重新获取')
      return
    }
    try {
      // 发请求（请求验证码）
      codeValue = await getCodeApi(phone)
      // 倒计时（更新界面）
      timeLeft.value = 60
      // 开启间歇定时器
      const timer = setInterval(() => {
        // 每隔1秒，剩余时间自减 1
        timeLeft.value--
        if (timeLeft.value === 0) {
          // 关闭定时器
          clearInterval(timer)
          timeLeft.value = 0
        }
      }, 1000)
    } catch (e) {
      timeLeft.value = 0
      showNoneIconToast(e.message)
    }
  }

  // 是否勾选协议
  const isAgree = ref(false)
  // 控制登录按钮的加载状态
  const codeLoading = ref(false)
  const wxLoading = ref(false)

  // 勾选切换
  const onToggle = () => {
    isAgree.value = !isAgree.value
  }
  const userStore = useUserStore()

  // 公共登录函数：
  // 把两种登录方式都需要执行的代码统一放到这个函数中进行编写
  // 把不同的代码进行参数的传递
  const onLogin = (loginFn) => {
    // 判断小图标是否勾选
    if (!isAgree.value) {
      showNoneIconToast('请勾选并同意用户协议')
      return
    }
    // loginFn: 代指一个函数，今后传入的是手机号+验证码的登录代码或微信一键登录的代码
    // 并且 loginFn 函数返回值必须是一个 Promise 实例，这样的话，调用 loginFn 函数的时候
    // 可以知道当前登录是成功还是失败
    // 调用具体的登录函数前，把按钮设置为加载中，给用户 loading 提示
    // 登录成功后统一做页面跳转操作
    loginFn()
      // 成功
      .then(async () => {
        // 登录成功的提示
        showSuccessToast('登录成功')
        // 主动建立 websocket 连接
        socket.initSocketConnect()
        try {
          // 获取会话列表
          await sessionStore.getSessionListAction()
          // 通知(对方)登录成功
          uni.$emit(UniAppEvent.LoginSuccess)
        } catch (e) {
          console.log(e)
        }
        // 获取用户信息：聊天发送消息依赖 userInfo.userId，必须等拿到再跳转，
        // 否则首次进入聊天页时会出现发送失败、个人信息显示不全的问题
        try {
          await userStore.getUserInfoAction()
        } catch (e) {
          showNoneIconToast(e.message)
        }
        // 页面跳转: 目前统一跳转至首页（今后会有很多跳转细节，ToDo)
        setTimeout(() => {
          // 说明携带了要回跳路由路径，此时需要跳转至 redirectUrl 的路径
          if (redirectUrl) {
            // 判断 redirectUrl 是不是 tabbar 路径
            const isTabBarPage = pagesJson.tabBar.list.some(
              (route) => route.pagePath === redirectUrl
            )
            // 如果是：uni.switchTab
            if (isTabBarPage) {
              uni.switchTab({
                url: '/' + redirectUrl
              })
            } else {
              // 否则：uni.redirectTo
              // redirectTo 与 navigateTo 的区别：
              // 相同点：都可以做页面跳转
              // 不同点：navigateTo 不会关闭当前页面，回退的时候会返回到当前当前页
              //        redirectTo 会关闭当期那页面，回退的时候不会返回到当前页
              if (
                // 本人并且携带的路由路径还是聊天页，由于本人不能自己聊天，压根就去不了聊天
                chatStore.fangDong.id === userStore.userInfo.userId &&
                redirectUrl === 'pages/chat/chat'
              ) {
                showNoneIconToast('不能与自己聊天')
                uni.redirectTo({
                  url:
                    '/pages/detail/detail?houseId=' +
                    chatStore.house.houseId
                })
              } else {
                uni.redirectTo({
                  url: '/' + redirectUrl
                })
              }
            }
          } else {
            uni.switchTab({
              url: '/pages/index/index'
            })
          }
        }, 500)
      })
      // 失败
      .catch((error) => {
        showErrorToast(error.message)
      })
  }

  // 验证码登录
  const onLoginByCode = () => {
    onLogin(() => {
      return new Promise((resolve, reject) => {
        const { phone, code } = loginForm
        // 做校验：当校验不通过，需要手动调用 reject 函数，将Promise设置为失败的
        if (!verifyPhone(phone)) return reject()
        if (!verifyCode(code)) return reject()
        if (code !== codeValue) {
          showNoneIconToast('验证码不正确')
          return reject()
        }
        codeLoading.value = true
        // 调用 loginByCodeAction 函数
        userStore
          .loginByCodeAction(loginForm)
          // 更新Promise实例状态为成功
          .then(resolve)
          // 更新Promise实例状态为失败
          .catch(reject)
          .finally(() => {
            codeLoading.value = false
          })
      })
    })
  }

  // 获取（或生成本地保存的）模拟微信 openId
  const getMockWxOpenId = () => {
    const key = 'DEV_MOCK_WX_OPENID'
    let openId = uni.getStorageSync(key)
    if (!openId) {
      openId = `dev_mock_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`
      uni.setStorageSync(key, openId)
    }
    return openId
  }

  // 微信一键登录
  const onLoginByWx = () => {
    onLogin(() => {
      return new Promise((resolve, reject) => {
        wxLoading.value = true

        // 本地开发兜底：真实微信登录失败时，尝试后端的模拟登录接口。
        // 该接口受 Nacos 配置 wx.applet.mock-enabled 控制，生产环境默认关闭，
        // 关闭时会直接失败并返回真实微信登录错误。
        const fallbackToMock = (originalError) => {
          userStore
            .loginByWxMockAction(getMockWxOpenId())
            .then(() => {
              showNoneIconToast(
                '未获取到微信登录凭证，已使用本地模拟登录（仅开发环境）'
              )
              resolve()
            })
            .catch(() => {
              reject(originalError)
            })
            .finally(() => {
              wxLoading.value = false
            })
        }

        // 获取微信登录凭证 code
        uni.login({
          provider: 'weixin',
          success: (res) => {
            if (!res.code) {
              fallbackToMock(
                new Error(
                  '微信登录失败：未获取到登录凭证，且本地模拟登录未开启，请使用手机号验证码登录'
                )
              )
              return
            }
            // 把 wx.login 返回的 code 交给后端，由后端使用 AppSecret 换取 openid
            userStore
              .loginByWxAction(res.code)
              .then(resolve)
              .catch((error) => {
                // 真实微信登录失败时，尝试本地模拟兜底
                fallbackToMock(error)
              })
              .finally(() => {
                wxLoading.value = false
              })
          },
          fail: (error) => {
            const errMsg = (error && error.errMsg) || ''
            // 微信登录依赖开发者工具/微信客户端的登录态，以及 AppID 的开发者权限
            const message = /token|login|登录/i.test(errMsg)
              ? '微信登录失败：请先登录微信开发者工具，并确认当前账号拥有该小程序 AppID 的开发者权限'
              : `微信登录失败：${errMsg || '请稍后重试'}`
            fallbackToMock(new Error(message))
          }
        })
      })
    })
  }
</script>

<template>
  <view class="login">
    <!-- 顶部导航栏 -->
    <bit-nav-bar
      title="云寓租房"
      direction="bottom"
      bgStartColor="#EBFBFF"
      bgEndColor="#DFF8FF"
      class="navbar"
    >
      <template #left>
        <bit-icon
          name="fanhui-left"
          size="32"
          class="icon"
          @click="onBack"
        />
        <bit-icon name="shouye" size="32" @click="onGoHome" />
      </template>
    </bit-nav-bar>
    <!-- 主体 -->
    <view class="main">
      <!-- 标题 -->
      <view class="title">
        <view class="level1">手机号快捷登录</view>
        <view class="level2">未注册过的手机号将自动创建账号</view>
      </view>
      <!-- 表单 -->
      <view class="form">
        <view class="form-item">
          <input
            type="text"
            placeholder="手机号"
            class="form-item__input"
            v-model.trim="loginForm.phone"
          />
        </view>
        <view class="form-item">
          <input
            type="text"
            placeholder="验证码"
            class="form-item__input code"
            v-model.trim="loginForm.code"
          />
          <text class="btn-code" @click="getCode">
            {{
              timeLeft > 0 ? `${timeLeft}秒后重新获取` : '获取验证码'
            }}
          </text>
        </view>
        <view class="form-item xieyi">
          <bit-icon
            :name="isAgree ? 'agree' : 'unagree'"
            size="22"
            @click="onToggle"
            class="icon"
          />
          <view class="text">
            <text class="text_default" @click="onToggle">
              打勾表示您阅读并同意
            </text>
            <text class="text_active">《云寓租房用户服务协议》</text>
            <text class="text_default">和</text>
            <text class="text_active">《云寓租房隐私政策》</text>
          </view>
        </view>
        <view class="form-item">
          <button
            class="btn btn-phone-login"
            plain
            :loading="codeLoading"
            :disabled="codeLoading"
            @click="onLoginByCode"
          >
            立即登录
          </button>
          <button
            class="btn btn-wx-login"
            plain
            :loading="wxLoading"
            :disabled="wxLoading"
            @click="onLoginByWx"
          >
            微信一键登录
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss">
  @import '@/styles/variables.scss';
  .login {
    .navbar {
      .icon {
        margin-right: 60rpx;
      }
    }

    // 主体样式
    .main {
      height: calc(100vh - 176rpx);
      padding: 60rpx 52rpx 0;
      background: linear-gradient(to bottom, #dff8ff, #f0fcff);
      // 标题
      .title {
        .level1 {
          font-size: 42rpx;
          font-weight: 600;
          color: $font-color-dark;
        }
        .level2 {
          margin: 12rpx 0 59rpx;
          font-size: $font-size-sm-24;
          color: $font-color-shallow;
        }
      }
      // 表单
      .form {
        &-item {
          position: relative;
          &__input {
            box-sizing: border-box;
            width: 646rpx;
            height: 110rpx;
            padding-left: 30rpx;
            border-radius: 24rpx;
            background: $bg-color-white;
            &.code {
              margin: 30rpx 0 17rpx;
            }
          }
          .btn-code {
            z-index: 2;
            position: absolute;
            right: 30rpx;
            bottom: 37rpx;
            font-size: $font-size-md-28;
            color: $font-color-active;
          }
          &.xieyi {
            display: flex;
            .icon {
              position: relative;
              top: -4.5rpx;
            }
            .text {
              margin-left: 12rpx;
              font-size: $font-size-sm-24;
              &_default {
                color: $font-color-shallow;
              }
              &_active {
                color: $font-color-active;
              }
            }
          }
          .btn {
            width: 646rpx;
            height: 113rpx;
            line-height: 113rpx;
            border-radius: 24rpx;
            border: none;
            font-size: $font-size-lg-32;
            font-weight: 600;
            &.btn-phone-login {
              margin: 85rpx 0 30rpx;
              background: linear-gradient(
                to right,
                $bg-color-from,
                $bg-color-to
              );
              color: $font-color-white;
            }
            &.btn-wx-login {
              background: $bg-color-white;
              color: $font-color-active;
            }
          }
        }
      }
    }
  }
</style>

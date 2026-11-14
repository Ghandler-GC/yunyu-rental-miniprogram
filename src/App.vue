<script setup>
  import { onLaunch, onShow } from '@dcloudio/uni-app'
  import {
    useLocationStore,
    useChatStore,
    useUserStore,
    useSessionStore
  } from '@/stores'
  import socket from '@/utils/websocket'
  import { setRedDot } from '@/utils/redDot'
  import { UniAppEvent, updateSessionTime } from '@/constants/common'
  const locationStore = useLocationStore()
  const chatStore = useChatStore()
  const userStore = useUserStore()
  const sessionStore = useSessionStore()
  // 在 uni-app 中，有 3 种生命周期类别：
  // 1. 应用级的生命周期：针对小程序整个应用而言的，级别最高
  //  onLaunch、onShow、onHide 等
  // 2. 页面级的生命周期：针对某个页面而言的，一个应用会有多个页面组成
  //  onInit、onLoad、onShow、onReady、onHide等
  // 3. 组件级的生命周期： 针对某个组件(vue)文件而言的，一个页面可以看作由多个组件组成
  // onMounted、onUnmounted 等
  onLaunch(async () => {
    try {
      console.log('App Launch')
      // #ifdef MP-WEIXIN
      uni.setInnerAudioOption({
        obeyMuteSwitch: false,
        fail: () => {}
      })
      // #endif
      // 获取用户所在的城市(位置)信息
      await locationStore.getLocationAction()
      // 调用初始化录音管理器方法
      chatStore.initRecorder()

      // 监听/订阅收到消息事件（只在应用启动时注册一次，避免重复注册）
      uni.$on(UniAppEvent.ReceiveMsg, updateSessionList)
    } catch (e) {}
  })

  // 收到消息，更新会话列表
  function updateSessionList(message) {
    // 更新会话列表
    sessionStore.updateSessionList(
      updateSessionTime.receiveMsg,
      message
    )
    // 设置红点
    setRedDot()
  }

  // 小程序应用在前台运行的时候会自动执行 onShow 钩子 1次
  onShow(async () => {
    // 登录了才需要拉取用户信息、会话列表并建立 websocket 连接
    if (userStore.token) {
      // 用户信息可能因为微信登录未成功获取或本地缓存丢失而不完整，
      // 这里做一次兜底刷新，保证“我的”页信息完整、聊天消息能带上发送人
      if (!userStore.userInfo || !userStore.userInfo.userId) {
        try {
          await userStore.getUserInfoAction()
        } catch (e) {
          console.log(e)
        }
      }
      try {
        // 请求会话列表
        await sessionStore.getSessionListAction()
        // 设置红点(App.vue中也可以设置红点)
        setRedDot()
      } catch (e) {}
      // 当小程序在前台运行的时候，主动建立 websocket 连接
      socket.initSocketConnect()
    }
    console.log('App Show')
  })
</script>

<style lang="scss">
  /*每个页面公共css */
  @import '@/styles/common.scss';

  // 注意：今后vue文件中需要使用 scss 模块，都要导入才能使用
</style>

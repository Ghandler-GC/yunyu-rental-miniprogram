import { WS_URL, UniAppEvent } from '@/constants/common'
import { useUserStore } from '@/stores'
import { websocketMsgType, msgType } from '@/constants/chat'
class WebSocket {
  // 构造函数
  constructor(options = {}) {
    this.options = options
    this.socketTask = null
    this.isOpenSocket = false // 是否已连接
    this.isConnecting = false // 是否正在连接（防止重复创建连接）
    this.heartbeatInterval = options.heartbeatInterval || 10000 // 心跳间隔，默认为10秒
    this.reconnectInterval = options.reconnectInterval || 5000 // 重连间隔，默认为5秒
    this.reconnectAttempts = options.reconnectAttempts || Infinity // 最大重连次数，默认为无限次
    this.needbeat = options.needbeat !== false
    this.reconnectCount = 0
    this.isNormalClosed = false
    // 发送消息时等待连接建立的最长时间
    this.sendTimeout = options.sendTimeout || 10000
    this.reconnectTimer = null
  }

  // 创建 websocket 连接
  initSocketConnect() {
    const userStore = useUserStore()
    // 未登录不建立连接
    if (!userStore.token) return
    // 已经连接或正在连接时，直接复用，避免重复创建连接
    // （微信小程序有最大并发连接数限制，重复创建会导致连接失败）
    if (this.isOpenSocket || this.isConnecting) return

    this.isConnecting = true
    this.isNormalClosed = false
    this.socketTask = uni.connectSocket({
      url: WS_URL,
      header: {
        Authorization: userStore.token
      },
      success: () => {
        console.log(
          '============WebSocket正在连接中...==============='
        )
      },
      fail: (err) => {
        console.error('WebSocket连接失败', err)
        this.isConnecting = false
        this.socketTask = null
        this.reconnect()
      }
    })
    if (!this.socketTask) {
      // 部分平台在回调模式下可能拿不到 socketTask，做兜底处理
      this.isConnecting = false
      this.reconnect()
      return
    }
    // 监听WebSocket打开事件
    this.socketTask.onOpen(() => {
      console.log(
        '==============WebSocket连接成功==================='
      )
      this.isOpenSocket = true
      this.isConnecting = false
      this.reconnectCount = 0
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
      }
      // 监听接收消息
      this.socketTask.onMessage((res) => {
        // 反序列化
        const resData = JSON.parse(res.data)
        if (resData.type === websocketMsgType.heart_beat) {
          // 心跳消息
          console.log('收到了心跳消息，代表服务器正常运作')
        } else {
          // 聊天消息
          // 解构出聊天消息对象
          const message = JSON.parse(resData.data)

          // 针对语音消息和卡片消息，需要对 content 做反序列化
          if ([msgType.voice, msgType.card].includes(message.type)) {
            message.content = JSON.parse(message.content)
          }
          // 统一通知操作，通知其他模块收到了消息，并且把消息对象传递出去
          uni.$emit(UniAppEvent.ReceiveMsg, {
            ...message,
            createTime: +message.createTime
          })
        }
        if (this.needbeat) {
          // 是否需要心跳选择器
          this.resetHeartbeat()
        }
      })
    })
    // 监听WebSocket关闭事件
    this.socketTask.onClose((res) => {
      this.isOpenSocket = false
      this.isConnecting = false
      this.socketTask = null
      console.log(
        '==============WebSocket连接已关闭=================',
        res
      )
      if (!this.isNormalClosed) {
        this.reconnect()
      }
    })

    // 监听WebSocket错误事件
    this.socketTask.onError((err) => {
      console.error(
        '===============WebSocket发生错误====================',
        err
      )
      this.isOpenSocket = false
      this.isConnecting = false
      if (
        [
          'createSocketTask:fail wcwss exceed max concurrent count',
          '未完成的操作',
          'Invalid HTTP status.'
        ].includes(err.errMsg)
      ) {
        this.reconnectCount = 0
        this.close()
        return
      }
      this.reconnect()
    })
  }

  // 发送消息
  send({ type, data }) {
    // 序列化要发送的内容（保持与服务端约定的协议格式）
    const payload = JSON.stringify({ type, data })
    return new Promise((resolve, reject) => {
      const startedAt = Date.now()
      // 尝试发送：如果连接还没建立，会等待一段时间（最多 sendTimeout）
      const trySend = () => {
        if (this.isOpenSocket && this.socketTask) {
          this.socketTask.send({
            data: payload,
            success: () => {
              resolve()
              console.log('消息发送成功')
            },
            fail: (err) => {
              console.error('消息发送失败', err)
              reject(err)
            }
          })
          return
        }
        if (Date.now() - startedAt >= this.sendTimeout) {
          reject(new Error('WebSocket 连接超时，请稍后重试'))
          return
        }
        // 主动发起连接（内部已做去重），并轮询等待连接建立
        this.initSocketConnect()
        setTimeout(trySend, 200)
      }
      trySend()
    })
  }

  // 心跳检测
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat()
    }, this.heartbeatInterval)
  }
  // 重置心跳计时器
  resetHeartbeat() {
    clearInterval(this.heartbeatTimer)
    this.startHeartbeat()
  }
  // 发送心跳消息
  sendHeartbeat() {
    this.send({
      type: websocketMsgType.heart_beat,
      data: 'ping' // 心跳消息内容为 'ping'
    }).catch(() => {})
  }
  // 重连逻辑
  reconnect() {
    // 已经连接、正在连接或有重连任务时，不重复触发
    if (
      this.isOpenSocket ||
      this.isConnecting ||
      this.reconnectTimer
    ) {
      return
    }
    if (this.reconnectCount < this.reconnectAttempts) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null
        this.reconnectCount++
        this.initSocketConnect()
      }, this.reconnectInterval)
    }
  }
  // 关闭连接
  close() {
    this.isOpenSocket = false
    this.isConnecting = false
    this.isNormalClosed = true
    clearInterval(this.heartbeatTimer)
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.socketTask) {
      const task = this.socketTask
      this.socketTask = null
      task.close({
        success: () => {
          console.log('WebSocket连接已关闭/已断开')
        },
        fail: (err) => {
          console.error('WS关闭失败->', err)
        }
      })
    }
  }
}

// 默认导出实例
export default new WebSocket()

import { WS_URL, UniAppEvent } from '@/constants/common'
import { useUserStore } from '@/stores'
import { websocketMsgType, msgType } from '@/constants/chat'
class WebSocket {
  // 构造函数
  constructor(options = {}) {
    this.options = options
    this.socketTask = null
    this.isOpenSocket = false //避免重复连接
    this.heartbeatInterval = options.heartbeatInterval || 10000 // 心跳间隔，默认为10秒
    this.reconnectInterval = options.reconnectInterval || 5000 // 重连间隔，默认为5秒
    this.reconnectAttempts = options.reconnectAttempts || Infinity // 最大重连次数，默认为无限次
    this.needbeat = options.needbeat || true
    this.reconnectCount = 0
    this.isNormalClosed = false
  }

  // 创建 websocket 连接
  initSocketConnect() {
    const userStore = useUserStore()
    if (!userStore.token) return
    this.socketTask = uni.connectSocket({
      url: WS_URL,
      header: {
        Authorization: userStore.token
      },
      success: () => {
        console.log(
          '============WebSocket正在连接中...==============='
        )
        return this.socketTask
      },
      fail: (err) => {
        console.error('WebSocket连接失败', err)
        this.reconnect()
      }
    })
    // 监听WebSocket打开事件
    this.socketTask.onOpen(() => {
      console.log(
        '==============WebSocket连接成功==================='
      )
      this.isOpenSocket = true
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
    return new Promise((resolve, reject) => {
      this.socketTask.send({
        // 序列化
        data: JSON.stringify({
          type,
          data
        }),
        success: () => {
          resolve()
          console.log('消息发送成功')
        },
        fail: (err) => {
          console.error(data, ' 消息发送失败', err)
          reject(err)
        }
      })
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
    })
  }
  // 重连逻辑
  reconnect() {
    if (this.reconnectCount < this.reconnectAttempts) {
      setTimeout(() => {
        this.initSocketConnect()
        this.reconnectCount++
      }, this.reconnectInterval)
    }
  }
  // 关闭连接
  close() {
    this.isOpenSocket = false
    this.isNormalClosed = true
    if (this.socketTask && this.socketTask.readyState !== '') {
      this.socketTask.close({
        success: () => {
          console.log('WebSocket连接已关闭/已断开')
        },
        fail: (err) => {
          console.error('WS关闭失败->', err)
        }
      })
      clearInterval(this.heartbeatTimer)
    }
  }
}

// 默认导出实例
export default new WebSocket()

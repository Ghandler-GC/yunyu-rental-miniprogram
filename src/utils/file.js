import { showNoneIconToast } from './toast'
import request from './request'
import {
  imageExtName,
  audioExtName,
  videoExtName
} from '@/constants/common'
/**
 * 选择文件或拍摄
 */
export const chooseFile = ({ count, mediaType, sourceType }) => {
  return new Promise((resolve, reject) => {
    uni.chooseMedia({
      count,
      mediaType,
      sourceType,
      // 成功回调
      success: (res) => {
        // 临时文件列表长度为零
        if (!res.tempFiles.length) {
          // 更新Promise状态为成功态，传入参数为 null
          resolve(null)
          return
        }
        // 解构
        const [{ tempFilePath, size }] = res.tempFiles
        // 判断文件大小：约定文件大小不超过5M
        const isGT5M = size > 5 * 1024 * 1024
        if (isGT5M) {
          showNoneIconToast('图片大小不能超过5M')
          // 更新Promise状态为成功态，传入参数为 null
          resolve(null)
          return
        }
        // 更新Promise状态为成功态，传入参数为临时文件路径
        console.log('文件选择成功')
        resolve(tempFilePath)
      },

      // 失败回调
      fail: (error) => {
        console.log('文件选择失败')
        // 错误提示
        showNoneIconToast(error.errMsg)
        // 更新Promise状态为失败，并传入错误对象
        reject(new Error(error.errMsg))
      }
    })
  })
}

/**
 * 获取文件签名
 */
export const getFileSignApi = () => {
  return request({
    method: 'GET',
    url: '/file/sign'
  })
}
/**
 * 生成 uuid
 */
export function createUUID() {
  let dt = Date.now()
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    (c) => {
      const r = (dt + Math.random() * 16) % 16 | 0
      dt = Math.floor(dt / 16)
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
    }
  )
  return uuid
}

/**
 * 获取文件类型
 */
const getFileType = (tempFilePath) => {
  // 拿到文件扩展名，比如：.png，.jpeg等
  const extName = tempFilePath.slice(
    tempFilePath.lastIndexOf('.') + 1
  )
  // 判断
  let fileType = null
  if (imageExtName.includes(extName)) {
    fileType = 'image'
  } else if (audioExtName.includes(extName)) {
    fileType = 'audio'
  } else if (videoExtName.includes(extName)) {
    fileType = 'video'
  }
  return fileType
}
/**
 * 把临时文件路径上传至OSS云服务器
 */
export const uploadFile2OSS = (tempFilePath) => {
  return new Promise(async (resolve, reject) => {
    try {
      // 调用获取文件签名的接口
      const signRes = await getFileSignApi()
      // 参数解构
      const {
        host, // 云服务器的域名
        pathPrefix, // 桶名称(路径，用来存储文件容器)
        policy, // 策略
        signature, // 签名
        xosscredential, // 密钥
        xossdate // 时间
      } = signRes

      // 获取文件的扩展名
      const extName = tempFilePath.slice(
        tempFilePath.lastIndexOf('.')
      )
      // 收集参数
      const formData = {
        success_action_status: 200,
        policy,
        'x-oss-signature-version': 'OSS4-HMAC-SHA256',
        'x-oss-credential': xosscredential,
        'x-oss-date': xossdate,
        'x-oss-signature': signature,
        // 桶名+文件名.扩展名
        key: pathPrefix + createUUID() + extName,
        'x-oss-object-acl': 'public-read'
      }
      // 上传
      uni.uploadFile({
        url: host,
        filePath: tempFilePath,
        name: 'file',
        fileType: getFileType(tempFilePath),
        formData,
        // 成功
        success: (res) => {
          if (res.statusCode === formData.success_action_status) {
            // host：基础地址
            // formData.key: 后半段地址
            // 二者拼接在一起，会得到一个完整的网络文件路径
            resolve(host + formData.key)
          } else {
            // wx.uploadFile 只要请求完成 errMsg 都是 "uploadFile:ok"，
            // 真正的失败原因要看 HTTP 状态码，这里给出可读的提示
            const msg = `文件上传失败(${res.statusCode})，请稍后重试`
            showNoneIconToast(msg)
            reject(new Error(msg))
          }
        },
        // 失败
        fail: (error) => {
          showNoneIconToast(error.errMsg)
          reject(new Error(error.errMsg))
        },
        // 上传完成：无论成功还是失败都会执行
        complete: () => {
          uni.hideLoading({
            fail: () => {}
          })
        }
      })
    } catch (e) {
      reject(e)
    }
  })
}

<script setup>
  import { computed } from 'vue'
  const props = defineProps({
    // 图标名称，或完整的图片路径（/static/... 或 http(s)://...）
    name: {
      type: String,
      default: ''
    },
    // 图标尺寸
    size: [String, Number],
    // 图标宽度
    width: [String, Number],
    // 图标高度
    height: [String, Number],
    // 是否是圆形
    round: {
      type: Boolean,
      default: false
    }
  })
  const emit = defineEmits(['click'])

  const iconUrl = computed(() => {
    const name = props.name || ''
    // 支持直接传入完整图片路径：
    // 1) 网络图片 http(s)://...
    // 2) 以 / 开头的本地静态资源，如 /static/images/web/home/zhengzu.png
    if (/^(https?:)?\/\//.test(name) || name.startsWith('/')) {
      return name
    }
    // 其余情况按“图标名称”处理，统一映射到 /static/icons 目录
    return name ? `/static/icons/${name}.png` : ''
  })

  const iconStyle = computed(() => {
    return {
      width: (props.size || props.width) + 'rpx',
      height: (props.size || props.height) + 'rpx',
      borderRadius: props.round ? '50%' : 'none'
    }
  })
</script>

<template>
  <image
    mode="scaleToFill"
    :src="iconUrl"
    :style="iconStyle"
    @click="emit('click', $event)"
  />
</template>

<style lang="scss"></style>

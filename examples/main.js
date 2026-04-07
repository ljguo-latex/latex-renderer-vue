import './assets/main.css'

import { createApp } from 'vue'

// 测试嵌套功能
import TestNesting from './TestNesting.vue'
import App from './App.vue'

// 切换到 TestNesting 来测试嵌套功能
// 切换回 App 查看原始示例
createApp(TestNesting).mount('#app')

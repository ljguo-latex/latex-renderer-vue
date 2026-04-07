import { parseLatex, serializeLatex } from './src/latex/core.js'
import { defaultProcessors } from './src/latex/processors/index.js'

console.log('=== 测试 Enumerate 和 Choices 嵌套支持 ===\n')

// 测试用例 1：Enumerate 嵌套 Choices
const test1 = String.raw`\begin{enumerate}
\item 第一题的题干
\begin{choices}
\item A选项
\item B选项
\end{choices}
\item 第二题
\end{enumerate}`

console.log('测试用例 1：Enumerate 嵌套 Choices')
console.log('输入：', test1)
const parsed1 = parseLatex(test1, defaultProcessors)
console.log('解析结果：', JSON.stringify(parsed1, null, 2))

// 检查嵌套结构
if (parsed1.length > 0 && parsed1[0].type === 'enumerate') {
  const enumNode = parsed1[0]
  console.log('\n枚举节点的 items 类型：', Array.isArray(enumNode.items) ? 'Array' : typeof enumNode.items)

  if (enumNode.items.length > 0) {
    const firstItem = enumNode.items[0]
    console.log('第一个 item 的类型：', Array.isArray(firstItem) ? 'Array (nodes)' : 'String')

    if (Array.isArray(firstItem)) {
      console.log('第一个 item 的节点：')
      firstItem.forEach((node, idx) => {
        console.log(`  [${idx}] type: ${node.type}`)
        if (node.type === 'choices') {
          console.log(`       items count: ${node.items?.length || 0}`)
        }
      })
    }
  }
}

// 测试序列化
const serialized1 = serializeLatex(parsed1, defaultProcessors)
console.log('\n序列化结果：', serialized1)

// 测试用例 2：向后兼容性（简单文本）
console.log('\n\n测试用例 2：向后兼容性')
const test2 = String.raw`\begin{enumerate}
\item 简单文本1
\item 简单文本2
\end{enumerate}`

console.log('输入：', test2)
const parsed2 = parseLatex(test2, defaultProcessors)
console.log('解析结果：', JSON.stringify(parsed2, null, 2))

if (parsed2.length > 0 && parsed2[0].type === 'enumerate') {
  const enumNode = parsed2[0]
  if (enumNode.items.length > 0) {
    const firstItem = enumNode.items[0]
    console.log('第一个 item 是简单文本吗？',
      Array.isArray(firstItem) && firstItem.length === 1 && firstItem[0].type === 'text'
    )
  }
}

const serialized2 = serializeLatex(parsed2, defaultProcessors)
console.log('序列化结果：', serialized2)

console.log('\n✅ 测试完成')

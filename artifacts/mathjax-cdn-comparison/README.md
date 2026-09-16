# MathJax CDN 实测对比

记录时间：2026-09-16T13:58:15.693166+08:00

测试位置：当前电脑网络；curl 绕过显式代理环境变量，但远端地址为 198.18.*，可能经过透明代理/TUN。不能代表国内三网直连结果。

测试方法：两端相同 4.1.3 资源，预热一轮后每个资源交替请求五次，独立 curl 连接，启用 gzip 解压；统计完整下载耗时中位数，不是页面渲染时间。保留正常 CDN 缓存；没有浏览器本地缓存。

| 资源 | 自有 CDN 中位数 | jsDelivr 中位数 | 耗时减少 |
|---|---:|---:|---:|
| 主脚本 | 144 ms | 554 ms | 74.0% |
| STIX2 字体脚本 | 95 ms | 297 ms | 68.0% |
| 化学公式扩展 | 94 ms | 300 ms | 68.7% |
| 化学字体脚本 | 85 ms | 288 ms | 70.5% |
| STIX2 字体文件 | 84 ms | 299 ms | 71.9% |
| 化学字体文件 | 80 ms | 289 ms | 72.3% |

六种资源各五次：每个 CDN 30/30 请求成功，解压后的 SHA-256 全部与本地 npm 发布包一致。

主脚本地址：https://cdn-file.filatex.cn/static/mathjax/4.1.3/mathjax/tex-chtml.js

响应头检查：
- 主脚本：gzip；Access-Control-Allow-Origin: *；Cache-Control: public, max-age=31536000, immutable。
- 两个抽样 woff2 字体：当前 Content-Type 为 text/plain，且没有显式 Cache-Control。建议改为 font/woff2，并对版本固定的目录配置长期缓存。
- 自有 CDN 已出现 HIT；第一次单独主脚本探测为 MISS，耗时约 536 ms，不计入上述预热后的统计。

原始数据见 results.json 和 summary.json；本次未修改使用方 CDN 配置。

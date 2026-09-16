# MathJax 4.1.3 COS 上传包

本包按当前 latex-renderer-vue 的 STIX2 字体配置准备，包含完整的三个 npm 发布包：
- mathjax@4.1.3
- @mathjax/mathjax-stix2-font@4.1.3
- @mathjax/mathjax-mhchem-font-extension@4.1.3

保留包内文件结构及原包许可信息。未安装这些包的依赖，也没有更改项目依赖。
MathJax 的默认 NewCM 字体单独包不在此包内；请使用随附的 STIX2 配置。

## 上传

将 static/ 目录合并上传到 COS 桶根目录；如果已经打开桶内 static/ 目录，只上传它里面的 mathjax/。
不要多套一层 mathjax-cos-4.1.3，也不要将 ZIP 本身作为脚本上传。
最终对象路径应为 static/mathjax/4.1.3/mathjax/tex-chtml.js。
字体目录必须一起上传并保持子目录结构。

## 配置

参考 configure-mathjax.js，替换 CDN 域名，在网站和后台首次渲染之前执行。
保持现有桶权限；确保 CDN 可读取这些资源。跨域字体请求需允许网站和后台来源，
公开静态资源可以返回 Access-Control-Allow-Origin: *。使用 CDN 域名时要检查 CDN 的实际响应头。
版本目录可设置长期缓存；更换资源内容时使用新版本目录。

## 验证

1. CDN 主脚本、扩展 JS、woff2 字体返回 200，类型正确且没有跨域错误。
2. 浏览器禁用缓存，测试普通公式、化学公式、白板和分页。
3. 屏蔽 cdn.jsdelivr.net 后重新加载，确认当前支持的公式仍正常。

packages.json 记录 npm 包版本及原压缩包 SHA-512；SHA256SUMS 记录上传文件校验值。
仅需上传 static/，其余文件为本地说明及配置示例。

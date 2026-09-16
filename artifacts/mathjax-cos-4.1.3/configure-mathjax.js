// 网站和后台 main.js 使用同一配置；放在 app.use(router) / app.mount() 之前。
// 替换下面的 CDN 域名；base 末尾不要加斜杠。
import { configureMathJax } from 'latex-renderer-vue'

const base = 'https://你的CDN域名/static/mathjax/4.1.3'

configureMathJax({
  src: `${base}/mathjax/tex-chtml.js`,
  config: {
    loader: {
      paths: {
        mathjax: `${base}/mathjax`,
        fonts: `${base}/fonts`,
        'mathjax-mhchem-extension': `${base}/fonts/mathjax-mhchem-font-extension`,
      },
    },
    output: {
      font: 'mathjax-stix2',
      fontPath: '[fonts]/%%FONT%%-font',
    },
  },
})

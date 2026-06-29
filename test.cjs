const { JSDOM } = require('jsdom');
const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="test"></div></body></html>`, {
  runScripts: "dangerously",
  resources: "usable"
});
global.window = dom.window;
global.document = dom.window.document;

window.MathJax = {
  loader: { load: ['[tex]/html'] },
  tex: {
    packages: {'[+]': ['html']},
    macros: { paren: '\\class{paren-math}{\\left(\\qquad\\right)}' }
  },
  startup: {
    ready: () => {
      window.MathJax.startup.defaultReady();
      setTimeout(() => {
        document.getElementById('test').innerHTML = '$a = \\paren{}$';
        window.MathJax.typesetPromise([document.getElementById('test')]).then(() => {
          console.log(document.getElementById('test').innerHTML);
        });
      }, 1000);
    }
  }
};

const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml-full.js';
document.head.appendChild(script);

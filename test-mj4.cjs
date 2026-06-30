const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="test"></div></body></html>', { runScripts: "dangerously", resources: "usable" });
global.window = dom.window;
global.document = dom.window.document;

window.MathJax = {
  loader: { load: ['[tex]/html'] },
  tex: {
    packages: {'[+]': ['html']}
  },
  output: {
    font: 'mathjax-stix2'
  },
  startup: {
    ready: () => {
      window.MathJax.startup.defaultReady();
      setTimeout(() => {
        document.getElementById('test').innerHTML = '$\\frac{2}{3}$';
        window.MathJax.typesetPromise([document.getElementById('test')]).then(() => {
          console.log(document.getElementById('test').innerHTML);
        });
      }, 500);
    }
  }
};

const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/mathjax@4.0.0-beta.7/es5/tex-chtml.js';
document.head.appendChild(script);

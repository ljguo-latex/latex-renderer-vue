import { JSDOM } from 'jsdom';
const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="test"></div></body></html>`, {
  runScripts: "dangerously",
  resources: "usable"
});
global.window = dom.window;
global.document = dom.window.document;

import { typesetMath } from './src/composables/useMathJax.js';

async function run() {
  const element = document.getElementById('test');
  await typesetMath(element, '$a = \\class{paren-math}{\\left(\\right)}$');
  await new Promise(r => setTimeout(r, 1000));
  console.log(element.innerHTML);
}
run();

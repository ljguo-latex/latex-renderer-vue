import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { CHTML } from 'mathjax-full/js/output/chtml.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import 'mathjax-full/js/input/tex/html/HtmlConfiguration.js';

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const tex = new TeX({
  packages: ['base', 'html'],
  macros: {
    paren: ['\\style{color: var(--my-color)}{\\left(\\qquad\\right)}', 0],
    blank: ['\\class{my-class}{\\underline{\\qquad\\qquad}}', 0]
  }
});
const chtml = new CHTML();
const html = mathjax.document('', { InputJax: tex, OutputJax: chtml });

console.log(adaptor.outerHTML(html.convert('\\paren{}', { display: false })));
console.log(adaptor.outerHTML(html.convert('\\blank{}', { display: false })));

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderRichContent} from '../scripts/rich-content.mjs';

test('code highlighting preserves literal code and does not turn code into executable markup',()=>{
 const html=renderRichContent('<pre><code class="language-python">def read(n):\n    return n &lt; 4  # limit</code></pre>');
 assert.ok(html.includes('token keyword'));
 assert.ok(html.includes('data-copy-code'));
 assert.ok(html.includes('&lt;'));
 const unsafe=renderRichContent('<pre><code class="language-plain">&lt;script&gt;alert(1)&lt;/script&gt;</code></pre>');
 assert.ok(!unsafe.includes('<script>'));
 assert.ok(unsafe.includes('&lt;script'));
 assert.ok(unsafe.includes('&lt;/script'));
});

test('figure links keep a usable original-image fallback without JavaScript',()=>{
 const html=renderRichContent('<figure class="learn-figure"><img src="../assets/learning/test.svg" alt="状态变化"><figcaption>说明</figcaption></figure>');
 assert.ok(html.includes('href="../assets/learning/test.svg"'));
 assert.ok(html.includes('class="figure-open"'));
 assert.ok(html.includes('状态变化'));
 const linked=renderRichContent('<figure class="learn-figure"><a href="../paper.svg"><img src="../paper.svg" alt="论文图"></a><figcaption><a href="https://example.org/">来源</a></figcaption></figure>');
 assert.ok(linked.includes('class="figure-open"'));
 assert.equal((linked.match(/<a\b/g)||[]).length,2);
});

test('numeric HTML entities in authored code become copyable source, decoded once',()=>{
 const html=renderRichContent('<pre><code class="language-plain">parse(&#x27;a,b&#x27;)&#10;assert x &#60; 3\n&amp;lt;literal&amp;gt;</code></pre>');
 const code=html.match(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/)[1];
 assert.ok(code.includes("parse('a,b')\nassert x &lt; 3"));
 assert.ok(code.includes('&amp;lt;literal&amp;gt;'));
 assert.ok(!code.includes('&amp;#x27;'));
});

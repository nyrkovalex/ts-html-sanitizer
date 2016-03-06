"use strict";
const s = require('../src/sanitizer');
const chai_1 = require('chai');
const OPTIONS = { sourceHost: '', sourcePath: '' };
describe('attribute class', () => {
    it('should create an attribute from name and value', () => {
        let a = s.attribute('href', 'http://nowhere.com');
        chai_1.expect(a.toString()).to.equal('href="http://nowhere.com"');
    });
});
describe('basic tag', () => {
    it('should create a tag from name and attributes', () => {
        let attrs = [
            s.attribute('href', 'http://nowhere.com'),
            s.attribute('target', '_blank')
        ];
        let t = new s.Tags.Basic('a', attrs);
        t.writeText('Link text');
        chai_1.expect(t.toString()).to.equal('<a href="http://nowhere.com" target="_blank">Link text</a>');
    });
});
describe('skipped tag', () => {
    it('should always be an empty string', () => {
        let attrs = [
            s.attribute('href', 'http://nowhere.com'),
            s.attribute('target', '_blank')
        ];
        let t = new s.Tags.Skipped('a', attrs);
        t.writeText('Link text');
        chai_1.expect(t.toString()).to.equal('');
    });
});
describe('restricted tag', () => {
    it('should not allow certain attributes', () => {
        let attrs = [
            s.attribute('href', 'http://nowhere.com'),
            s.attribute('target', '_blank')
        ];
        let t = s.Transforms.restrcitedTag(['href'])(s.tag('a', attrs), OPTIONS);
        t.writeText('Link text');
        chai_1.expect(t.toString()).to.equal('<a href="http://nowhere.com">Link text</a>');
    });
    it('should create a self-closing tag from name and attributes', () => {
        let attrs = [
            s.attribute('src', 'http://nowhere.com/1.png'),
            s.attribute('alt', 'image')
        ];
        let t = s.Transforms.chain([
            s.Transforms.restrcitedTag(['src']),
            s.Transforms.selfClosingTag(),
        ])(s.tag('img', attrs), OPTIONS);
        t.writeText('Link text'); // should have no effect
        chai_1.expect(t.toString()).to.equal('<img src="http://nowhere.com/1.png" />');
    });
});
describe('self-closing tag', () => {
    it('should create a tag from name and attributes', () => {
        let attrs = [
            s.attribute('src', 'http://nowhere.com/1.png'),
            s.attribute('alt', 'image')
        ];
        let t = new s.Tags.SelfClosing('img', attrs);
        t.writeText('Link text'); // should have no effect
        chai_1.expect(t.toString()).to.equal('<img src="http://nowhere.com/1.png" alt="image" />');
    });
});
describe('stripped tag', () => {
    it('should retian only text', () => {
        let attrs = [
            s.attribute('href', 'http://nowhere.com'),
            s.attribute('target', '_blank')
        ];
        let t = new s.Tags.Stripped('a', attrs);
        t.writeText('Link text');
        chai_1.expect(t.toString()).to.equal('Link text');
    });
});
describe('defaultAttrs', () => {
    it('should create a tagwith default attrs', () => {
        let attrs = [
            s.attribute('href', 'http://nowhere.com'),
            s.attribute('target', '_blank')
        ];
        let t = s.Transforms.defaultAttrs([
            s.attribute('rel', 'nofollow')
        ])(s.tag('a', attrs), OPTIONS);
        t.writeText('Link text');
        chai_1.expect(t.toString()).to.equal('<a href="http://nowhere.com" target="_blank" rel="nofollow">Link text</a>');
    });
});
describe('transformed tag', () => {
    it('should transform passed tag', () => {
        let tf = s.Transforms.transformTag('strong');
        chai_1.expect(tf(s.tag('b', []), OPTIONS).toString()).to.equal('<strong></strong>');
    });
});
describe('transformed attribute', () => {
    it('should transform attribute value', () => {
        let tf = s.Transforms.transformAttributes({
            'href': (a, opts) => s.attribute(a.name, opts.sourceHost + a.value)
        });
        let result = tf(s.tag('a', [
            s.attribute('href', '/1.png'),
            s.attribute('target', '_blank')
        ]), {
            sourceHost: 'http://nowhere.com',
            sourcePath: '/'
        });
        chai_1.expect(result.toString()).to.equal('<a href="http://nowhere.com/1.png" target="_blank"></a>');
    });
});
describe('sample html transformation', () => {
    const INPUT = `
      <html>
        <head>
          <title>Something</title>
        </head>
        <body class="content" style="color: red">
          <form action="/message" method="post">
            <input name="text" />
            <button type="submit">Send</button>
          </form>
          <main>
            <h1 class="heading">Awesome page</h1>
            <section style="width: 600px">
              <img src="/1.jpg" alt="some image">
              <P>
                Some <big>BIG</big> text <a href="http://nowhere.com">here</a><br>
                With custom <font>font</font>
              </P>
              <a href="next.html">next</a>
            </section>
          </main>
          <script>
            alert('malicious script');
          </script>
        </body>
      </html>`;
    let sanitizer = s.sanitizer();
    const EXPECTED = '<section><h1>Awesome page</h1>'
        + '<section><img src="http://nowhere.com/1.jpg" alt="some image" />'
        + '<p> Some <strong>BIG</strong> text <a href="http://nowhere.com" target="_blank" rel="nofollow">here</a><br />'
        + ' With custom font</p><a href="http://nowhere.com/page/next.html" target="_blank" rel="nofollow">next</a></section></section>';
    it('should sanitize test input', () => {
        chai_1.expect(sanitizer.sanitize(INPUT, {
            sourceHost: 'http://nowhere.com/',
            sourcePath: '/page'
        })).to.equal(EXPECTED);
    });
    it('should handle https urls', () => {
        let input = '<a href="https://nowhere.com">Blah</a>';
        let result = sanitizer.sanitize(input, {
            sourceHost: 'http://nowhere.com',
            sourcePath: '/some-page/'
        });
        chai_1.expect(result).to.equal('<a href="https://nowhere.com" target="_blank" rel="nofollow">Blah</a>');
    });
    it('should handle mailto: links', () => {
        let input = '<a href="mailto:someone@nowhere.com">Blah</a>';
        let result = sanitizer.sanitize(input, {
            sourceHost: 'http://nowhere.com',
            sourcePath: '/some-page/'
        });
        chai_1.expect(result).to.equal('<a href="mailto:someone@nowhere.com" target="_blank" rel="nofollow">Blah</a>');
    });
    it('should retain specials chars', () => {
        let input = '<p>some text with&nbsp;non-breakable space</p>';
        let result = sanitizer.sanitize(input);
        chai_1.expect(result).to.equal(input);
    });
});
//# sourceMappingURL=sanitizer.test.js.map
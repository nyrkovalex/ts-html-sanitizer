import * as s from '../src/sanitizer';
import {expect} from 'chai';

describe('sanitizer tests', () => {
  describe('attribute class', () => {
    it('should create an attribute from name and value', () => {
      let a = s.attribute('href', 'http://nowhere.com');
      expect(a.toString()).to.equal('href="http://nowhere.com"');
    });
  });

  describe('basic tag', () => {
    it('should create a tag from name and attributes', () => {
      let attrs = [
        s.attribute('href', 'http://nowhere.com'),
        s.attribute('target', '_blank')
      ];

      let t = s.basicTag()('a', attrs);
      t.writeText('Link text');

      expect(t.toString()).to.equal(
        '<a href="http://nowhere.com" target="_blank">Link text</a>');
    });
  });

  describe('skipped tag', () => {
    it('should always be an empty string', () => {
      let attrs = [
        s.attribute('href', 'http://nowhere.com'),
        s.attribute('target', '_blank')
      ];

      let t = s.skippedTag()('a', attrs);
      t.writeText('Link text');

      expect(t.toString()).to.equal('');
    });
  });

  describe('restricted tag', () => {
    it('should not allow certain attributes', () => {
      let attrs = [
        s.attribute('href', 'http://nowhere.com'),
        s.attribute('target', '_blank')
      ];

      let t = s.restrcitedTag(s.basicTag(), ['href'])('a', attrs);
      t.writeText('Link text');

      expect(t.toString()).to.equal('<a href="http://nowhere.com">Link text</a>');
    });

    it('should create a self-closing tag from name and attributes', () => {
      let attrs = [
        s.attribute('src', 'http://nowhere.com/1.png'),
        s.attribute('alt', 'image')
      ];

      let t = s.restrcitedTag(s.selfClosingTag(), ['src'])('img', attrs);
      t.writeText('Link text'); // should have no effect

      expect(t.toString()).to.equal('<img src="http://nowhere.com/1.png" />');
    });
  });

  describe('self-closing tag', () => {
    it('should create a tag from name and attributes', () => {
      let attrs = [
        s.attribute('src', 'http://nowhere.com/1.png'),
        s.attribute('alt', 'image')
      ];

      let t = s.selfClosingTag()('img', attrs);
      t.writeText('Link text'); // should have no effect

      expect(t.toString()).to.equal('<img src="http://nowhere.com/1.png" alt="image" />');
    });
  });

  describe('stripped tag', () => {
    it('should retian only text', () => {
      let attrs = [
        s.attribute('href', 'http://nowhere.com'),
        s.attribute('target', '_blank')
      ];

      let t = s.strippedTag()('a', attrs);
      t.writeText('Link text');

      expect(t.toString()).to.equal(
        'Link text');
    });
  });

  describe('defaultAttrs', () => {
    it('should create a tagwith default attrs', () => {
      let attrs = [
        s.attribute('href', 'http://nowhere.com'),
        s.attribute('target', '_blank')
      ];

      let t = s.defaultAttrs(s.basicTag(), [
        s.attribute('rel', 'nofollow')
      ])('a', attrs);
      t.writeText('Link text');

      expect(t.toString()).to.equal(
        '<a href="http://nowhere.com" target="_blank" rel="nofollow">Link text</a>');
    });
  });

  describe('transformed tag', () => {
    it('should transform passed tag', () => {
      let tf = s.transformedTag(s.basicTag(), 'strong');
      expect(tf('b', []).toString()).to.equal('<strong></strong>');
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
                Some <big>BIG</big> text <a href="/boom">here</a>
                With custom <font>font</font>
              </P>
            </section>
          </main>
          <script>
            alert('malicious script');
          </script>
        </body>
      </html>
    `;

    const EXPECTED = '<section><h1>Awesome page</h1>'
      +'<section><img src="/1.jpg" alt="some image" />'
      +'<p> Some <strong>BIG</strong> text <a href="/boom" target="_blank" rel="nofollow">here</a>'
      +' With custom font</p></section></section>';

    it('should sanitize test input', () => {
      let sanitizer = s.sanitizer(s.DEFAULT_TAG_MAP);
      expect(sanitizer.sanitize(INPUT)).to.equal(EXPECTED);
    });
  });
});

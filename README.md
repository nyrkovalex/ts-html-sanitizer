# ts-html-sanitizer

Extendable HTML sanitizer written in typescript on top of [htmlparser2](https://www.npmjs.com/package/htmlparser2)
suitable for both JS and TS projects

## Usage
```typescript
import * as s from 'ts-html-sanitizer'; // for TS users
// let s = require('ts-html-sanitizer'); // for JS users

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

let sanitizer = s.sanitizer(s.DEFAULT_TAG_MAP);
console.log(sanitizer.sanitize(INPUT));

// outputs
// <section><h1>Awesome page</h1><section><img src="/1.jpg" alt="some image" /><p> Some <strong>BIG</strong> text <a href="/boom" target="_blank" rel="nofollow">here</a> With custom font</p></section></section>
```

## Customization

Parsing logic can be greatly altered by creating a new or modifying the default `TagMap`.

All you need to do is register your own `TagFactory` function within the tag map.

One may also consider writing custom `Tag` implmentation.


_More documentation to come, consult the source code for any details it's really simple_

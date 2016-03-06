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

let sanitizer = s.sanitizer();
console.log(sanitizer.sanitize(INPUT));

// outputs
// <section><h1>Awesome page</h1><section><img src="/1.jpg" alt="some image" /><p> Some <strong>BIG</strong> text <a href="/boom" target="_blank" rel="nofollow">here</a> With custom font</p></section></section>
```


## `sanitizer()`
`sanitizer` function creates an instance of `Sanitize.Sanitizer` and takes an optional parameter:
* `tagMap: Object` — transforms mapped to tag names


## `Sanitize.Sanitizer`
Interface declares a single `sanitize()` function which takes following arguments:
* `input: string` — html input to sanitize
* `options: Sanitize.Options` — an object with following keys:
  * `sourceHost: string` — hostname of a document source used by link transformer, it will be appended to links starting with `"/"`
  so `src="/1.png"` will become `src="${sourceHost}/1.png"`. Defaults to empty string
  * `sourcePath: string` — path of a source document, it will be append to realtive links so `href="next.html"`
  will become `href="${sourceHost}/${sourcePath}/next.html"`. Defaults to empty string


## Customization

Parsing logic can be greatly altered by creating a new or modifying the default `Sanitize.TagMap`.

All you need to do is register your own function implementing `Transforms.Transform` interface within the tag map.
Transfomations can be used as middleware functions by utilizing `Transfomrs.chain()` which takes an array of tranformations and runs is top down.

One may also consider writing custom `Tags.Tag` implmentation.


_More documentation to come, consult the source code for any details it's really simple_

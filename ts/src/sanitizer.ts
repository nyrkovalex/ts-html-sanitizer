import * as parser from 'htmlparser2';


export namespace Sanitize {
  export interface TagMap {
    [tagName: string]: Transforms.Transform;
  }


  export interface Sanitizer {
    /**
     * Performs html sanitizing.
     * @param {string} input - html to sanitize
     * @param {Sanitize.Options} [options] - parsing options
     * @returns {string} - sanitized html
     */
    sanitize(input: string, options?: Options): string;
  }


  export interface Options {
    /**
     * hostname of a document source used by link transformer, it will be appended to links starting with `"/"`
     * so `src="/1.png"` will become `src="${sourceHost}/1.png"`. Defaults to empty string
     */
    host: string;

    /**
     * path of a source document, it will be append to realtive links so `href="next.html"`
     * will become `href="${sourceHost}/${sourcePath}/next.html"`. Defaults to empty string
     */
    path: string;
    protocol: string;
  }
}


export namespace Attributes {
  export class Basic implements Attribute {
    constructor(private _name: string, private _value: string) { }

    get name() { return this._name; }
    get value() { return this._value; }

    toString(): string {
      return `${this._name}="${this._value}"`;
    }
  }


  export interface Attribute {
    name: string;
    value: string;
    toString(): string;
  }
}

export namespace Tags {
  export interface Tag {
    writeText(text: string): void;
    toString(): string;
    name: string;
    attributes: Attributes.Attribute[];
    text: string;
  }


  export class Basic implements Tag {
    private _text: string = '';

    constructor(
      private _name: string,
      private _attrs?: Attributes.Attribute[]
    ) {
      this._attrs = this._attrs || [];
    }

    writeText(text: string) {
      this._text += text;
    }

    toString(): string {
      return `<${this.name}${this.attrString}>${this._text}</${this.name}>`;
    }

    get name(): string {
      return this._name;
    }

    get attributes(): Attributes.Attribute[] {
      return this._attrs;
    }

    get text(): string {
      return this._text;
    }

    protected get attrString(): string {
      let attrs = this.attributes.join(' ');
      return attrs = attrs ? ' ' + attrs : '';
    }
  }


  export class Skipped extends Basic {
    writeText(text: string) {
      // do nothing
    }

    toString(): string {
      return '';
    }
  }


  export class SelfClosing extends Basic {
    writeText(text: string) {
      // do nothing
    }

    toString(): string {
      return `<${this.name}${this.attrString} />`;
    }
  }


  export class Stripped extends Basic {
    toString(): string {
      return this.text;
    }
  }
}

export namespace Transforms {
  export const SKIPPED = (tag: Tags.Tag) => new Tags.Skipped(tag.name, tag.attributes);
  export const STRIPPED = (tag: Tags.Tag) => new Tags.Stripped(tag.name, tag.attributes);
  export const NO_ATTRS = restrcitedTag();

  export interface Transform {
    (tag: Tags.Tag, options: Sanitize.Options): Tags.Tag;
  }


  export interface AttributeTransform {
    (attr: Attributes.Attribute, options: Sanitize.Options): Attributes.Attribute;
  }


  export interface AttributeTransformMap {
    [attrName: string]: AttributeTransform;
  }


  export function chain(transfroms: Transform[]): Transform {
    return (tag: Tags.Tag, options: Sanitize.Options) => {
      let previous = tag;
      transfroms.forEach(t => {
        previous = t(previous, options);
      });
      return previous;
    };
  }


  export function restrcitedTag(allowedAttrs?: string[]): Transform {
    allowedAttrs = allowedAttrs || [];
    return (tag: Tags.Tag, options: Sanitize.Options) =>
      new Tags.Basic(tag.name, tag.attributes.filter(a => allowedAttrs.indexOf(a.name) > -1));
  }


  export function selfClosingTag(): Transform {
    return (tag: Tags.Tag, options: Sanitize.Options) =>
      new Tags.SelfClosing(tag.name, tag.attributes);
  }


  export function defaultAttrs(attrs: Attributes.Attribute[]): Transform {
    return (tag: Tags.Tag, options: Sanitize.Options) =>
      new Tags.Basic(tag.name, tag.attributes.concat(attrs));
  }


  export function transformTag(newName: string): Transform {
    return (tag: Tags.Tag, options: Sanitize.Options) =>
      new Tags.Basic(newName, tag.attributes);
  }


  export function transformAttributes(transforms: AttributeTransformMap): Transform {
    return (tag: Tags.Tag, options: Sanitize.Options) => {
      let attrs = tag.attributes.map(a => a.name in transforms ? transforms[a.name](a, options) : a);
      return new Tags.Basic(tag.name, attrs);
    };
  }
}


const URL_TRANSFORM: Transforms.AttributeTransform =
  (a: Attributes.Attribute, opts: Sanitize.Options) => {
    if (a.value.match(/^(https?:\/\/|mailto:)/)) {
      return a;
    }

    if (a.value.startsWith('//')) {
      return attribute(a.name, opts.protocol + a.value);
    }

    let domain = `${opts.protocol}//${opts.host}`;
    if (a.value.startsWith('/')) {
      return attribute(a.name, domain + a.value);
    }
    return attribute(a.name, domain + opts.path + a.value);
  };


let allowAttributes = Transforms.restrcitedTag;
let chain = Transforms.chain;
let transformAttributes = Transforms.transformAttributes;
let setAttributess = Transforms.defaultAttrs;
let renameTagTo = Transforms.transformTag;
let selfClosingTag = Transforms.selfClosingTag;
const SKIPPED = Transforms.SKIPPED;
const STRIPPED = Transforms.STRIPPED;
const NO_ATTRS = Transforms.NO_ATTRS;


const DEFAULT_OPTIONS: Sanitize.Options = {
  host: '',
  path: '',
  protocol: '',
};


class Htmlparser2Sanitizer implements Sanitize.Sanitizer {
  private _rootText: string[];
  private _parser: parser.Parser;
  private _tags: Tags.Tag[];
  private _current: Tags.Tag;
  private _options: Sanitize.Options = null;

  constructor(private _map: Sanitize.TagMap) {
    let self = this;
    this._parser = new parser.Parser({
      onopentag: (name: string, attrs: any) => self._openTag(name, attrs),
      ontext: (text: string) => self._writeText(text),
      onclosetag: (name) => self._closeTag(name)
    });
  }

  sanitize(input: string, options?: Sanitize.Options): string {
    this._tags = [];
    this._rootText = [];
    this._options = this._normalizedOptions(options);

    this._parser.parseComplete(input);
    let text = this._rootText.join('');

    this._rootText = [];
    this._options = null;
    this._current = null;
    this._tags = [];
    return text;
  }

  private _openTag(name: string, attrs: any) {
    let tagFactory = this._map[name];
    if (!tagFactory) {
      return;
    }

    let convertedAttrs = Object.keys(attrs).map(attrName => attribute(attrName, attrs[attrName]));
    this._current = tagFactory(new Tags.Basic(name, convertedAttrs), this._options);
    this._tags.push(this._current);
  }

  private _writeText(text: string) {
    if (!text.trim()) {
      return;
    }

    text = text.replace(/\s+/, ' ');

    if (!this._current) {
      this._rootText.push(text);
      return;
    }

    this._current.writeText(text);
  }

  private _closeTag(name: string) {
    let previousText = this._tags.pop().toString();
    if (this._tags.length === 0) {
      this._rootText.push(previousText);
      this._current = null;
      return;
    }
    this._current = this._tags[this._tags.length - 1];
    this._current.writeText(previousText);
  }

  private _normalizedOptions(options: Sanitize.Options): Sanitize.Options {
    if (!options) {
      return DEFAULT_OPTIONS;
    }

    let host = options.host;
    let path = options.path;
    let protocol = options.protocol;
    path = path.startsWith('/') ? path : '/' + path;
    path = path.endsWith('/') ? path : path + '/';

    return {
      path: path,
      host: host.endsWith('/') ? host.substr(0, host.length - 1) : host,
      protocol: protocol.endsWith('//') ? protocol.substr(0, protocol.length - 2) : protocol
    };
  }
}


// full list of tags from https://developer.mozilla.org/en-US/docs/Web/HTML/Element
export const DEFAULT_TAG_MAP: Sanitize.TagMap = {
  'a': chain([
    allowAttributes(['href']),
    transformAttributes({
      'href': URL_TRANSFORM
    }),
    setAttributess([
      attribute('target', '_blank'),
      attribute('rel', 'nofollow')
    ])
  ]),
  'abbr': NO_ATTRS,
  'acronym': NO_ATTRS,
  'address': NO_ATTRS,
  'applet': SKIPPED,
  'area': chain([
    allowAttributes(['href']),
    transformAttributes({
      'href': URL_TRANSFORM
    }),
    setAttributess([
      attribute('target', '_blank'),
      attribute('rel', 'nofollow')
    ])
  ]),
  'article': NO_ATTRS,
  'aside': NO_ATTRS,
  'audio': SKIPPED,
  'b': NO_ATTRS,
  'base': SKIPPED,
  'basefont': SKIPPED,
  'bdi': NO_ATTRS,
  'bdo': allowAttributes(['dir']),
  'bgsound': SKIPPED,
  'big': chain([
    renameTagTo('strong'),
    NO_ATTRS
  ]),
  'blink': SKIPPED,
  'blockquote': allowAttributes(['cite']),
  'body': STRIPPED,
  'br': chain([
    allowAttributes(),
    selfClosingTag(),
  ]),
  'button': SKIPPED,
  'canvas': SKIPPED,
  'caption': NO_ATTRS,
  'center': STRIPPED,
  'cite': NO_ATTRS,
  'code': NO_ATTRS,
  'col': allowAttributes(['span']),
  'colgroup': allowAttributes(['span']),
  'command': SKIPPED,
  'content': STRIPPED,
  'data': allowAttributes(['value']),
  'datalist': SKIPPED,
  'dd': NO_ATTRS,
  'del': NO_ATTRS,
  'details': NO_ATTRS,
  'dfn': allowAttributes(['id']),
  'dialog': SKIPPED,
  'dir': chain([NO_ATTRS, renameTagTo('ul')]),
  'div': NO_ATTRS,
  'dl': NO_ATTRS,
  'dt': NO_ATTRS,
  'element': SKIPPED,
  'em': NO_ATTRS,
  'embed': SKIPPED,
  'fieldset': SKIPPED,
  'figcaption': NO_ATTRS,
  'figure': NO_ATTRS,
  'font': STRIPPED,
  'footer': NO_ATTRS,
  'form': SKIPPED,
  'frame': SKIPPED,
  'frameset': SKIPPED,
  'h1': NO_ATTRS,
  'h2': NO_ATTRS,
  'h3': NO_ATTRS,
  'h4': NO_ATTRS,
  'h5': NO_ATTRS,
  'h6': NO_ATTRS,
  'head': SKIPPED,
  'header': NO_ATTRS,
  'hgroup': chain([NO_ATTRS, renameTagTo('header')]),
  'hr': NO_ATTRS,
  'html': STRIPPED,
  'i': NO_ATTRS,
  'iframe': SKIPPED,
  'image': SKIPPED,
  'img': chain([
    allowAttributes(['src', 'alt', 'title', 'srcset', 'ismap']),
    transformAttributes({
      'src': URL_TRANSFORM
    }),
    selfClosingTag(),
  ]),
  'input': SKIPPED,
  'ins': NO_ATTRS,
  'isindex': SKIPPED,
  'kbd': NO_ATTRS,
  'keygen': SKIPPED,
  'label': NO_ATTRS,
  'legend': SKIPPED,
  'li': allowAttributes(['value']),
  'link': SKIPPED,
  'listing': chain([NO_ATTRS, renameTagTo('pre')]),
  'main': chain([NO_ATTRS, renameTagTo('section')]),
  'map': allowAttributes(['name']),
  'mark': NO_ATTRS,
  'marquee': STRIPPED,
  'menu': chain([NO_ATTRS, renameTagTo('ul')]),
  'menuitem': chain([NO_ATTRS, renameTagTo('li')]),
  'meta': SKIPPED,
  'meter': SKIPPED,
  'multicol': SKIPPED,
  'nav': STRIPPED,
  'nobr': STRIPPED,
  'noembed': STRIPPED,
  'noframes': STRIPPED,
  'noscript': STRIPPED,
  'object': SKIPPED,
  'ol': NO_ATTRS,
  'optgroup': SKIPPED,
  'option': SKIPPED,
  'output': NO_ATTRS,
  'p': NO_ATTRS,
  'param': SKIPPED,
  'picture': NO_ATTRS,
  'plaintext': chain([NO_ATTRS, renameTagTo('pre')]),
  'pre': NO_ATTRS,
  'progress': allowAttributes(['value', 'max']),
  'q': allowAttributes(['cite']),
  'rp': NO_ATTRS,
  'rt': NO_ATTRS,
  'rtc': NO_ATTRS,
  'ruby': NO_ATTRS,
  's': NO_ATTRS,
  'samp': NO_ATTRS,
  'script': SKIPPED,
  'section': NO_ATTRS,
  'select': SKIPPED,
  'shadow': SKIPPED,
  'small': NO_ATTRS,
  'source': chain([
    allowAttributes(['sizes', 'src', 'srcset', 'type', 'media']),
    transformAttributes({
      'src': URL_TRANSFORM
    }),
    selfClosingTag(),
  ]),
  'spacer': SKIPPED,
  'span': NO_ATTRS,
  'strike': chain([
    NO_ATTRS,
    renameTagTo('s')
  ]),
  'strong': NO_ATTRS,
  'style': SKIPPED,
  'sub': NO_ATTRS,
  'summary': NO_ATTRS,
  'sup': NO_ATTRS,
  'table': NO_ATTRS,
  'tbody': NO_ATTRS,
  'td': allowAttributes(['colspan', 'rowspan']),
  'template': SKIPPED,
  'textarea': SKIPPED,
  'tfoot': NO_ATTRS,
  'th': allowAttributes(['colspan', 'rowspan', 'headers', 'scope']),
  'thead': NO_ATTRS,
  'time': allowAttributes(['datetime']),
  'title': SKIPPED,
  'tr': NO_ATTRS,
  'track': SKIPPED,
  'tt': SKIPPED,
  'u': NO_ATTRS,
  'ul': NO_ATTRS,
  'var': NO_ATTRS,
  'video': SKIPPED,
  'wbr': STRIPPED,
  'xmp': SKIPPED
};


/**
 * Creates an instance of `Sanitize.Sanitizer`
 * @param {Sanitize.TagMap} [tagMap] - map containing `Transforms.Transform` for each tag name. Defaults to `DEFAULT_TAG_MAP`.
 */
export function sanitizer(tagMap?: Sanitize.TagMap): Sanitize.Sanitizer {
  return new Htmlparser2Sanitizer(tagMap || DEFAULT_TAG_MAP);
}


export function attribute(name: string, value: string): Attributes.Attribute {
  return new Attributes.Basic(name, value);
}


export function tag(name: string, attrs: Attributes.Attribute[]): Tags.Tag {
  return new Tags.Basic(name, attrs);
}

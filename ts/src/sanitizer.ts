import * as parser from 'htmlparser2';

const BASIC = (name: string, attrs?: Attribute[]) => new BasicTag(name, attrs);
const SKIPPED = (name: string, attrs?: Attribute[]) => new SkippedTag(name, attrs);
const STRIPPED = (name: string, attrs?: Attribute[]) => new StrippedTag(name, attrs);
const COMMON = restrcitedTag(basicTag());

export interface Attribute {
  name: string;
  value: string;
  toString(): string;
}

class BasicAttribute implements Attribute {
  constructor(private _name: string, private _value: string) { }

  get name() { return this._name; }
  get value() { return this._value; }

  toString(): string {
    return `${this._name}="${this._value}"`;
  }
}

export function attribute(name: string, value: string): Attribute {
  return new BasicAttribute(name, value);
}

export interface Tag {
  writeText(text: string): void;
  toString(): string;
  name: string;
  attributes: string;
  text: string;
}

export function basicTag(): TagFactory {
  return BASIC;
}

export function skippedTag(): TagFactory {
  return SKIPPED;
}

export function strippedTag(): TagFactory {
  return STRIPPED;
}

export function restrcitedTag(tf: TagFactory, allowedAttrs?: string[]): TagFactory {
  allowedAttrs = allowedAttrs || [];
  return (name: string, attrs?: Attribute[]) => tf(name, attrs.filter(a => allowedAttrs.indexOf(a.name) > -1));
}

export function selfClosingTag(): TagFactory {
  return (name: string, attrs?: Attribute[]) => new SelfClosingTag(name, attrs);
}

export function defaultAttrs(tf: TagFactory, defaultAttrs: Attribute[]): TagFactory {
  return (name: string, attrs?: Attribute[]) => tf(name, attrs.concat(defaultAttrs));
}

export function transformedTag(tf: TagFactory, newName: string): TagFactory {
  return (name: string, attrs?: Attribute[]) => tf(newName, attrs);
}

export interface TagFactory {
  (name: string, attrs?: Attribute[]): Tag;
}

export interface TagMap {
  [tagName: string]: TagFactory;
}

export interface Sanitizer {
  sanitize(input: string): string;
}

export function sanitizer(map: TagMap): Sanitizer {
  return new Htmlparser2Sanitizer(map);
}

class Htmlparser2Sanitizer implements Sanitizer {
  private _rootText: string[];
  private _parser: parser.Parser;
  private _tags: Tag[];
  private _current: Tag;

  constructor(private _map: TagMap) {
    let self = this;
    this._parser = new parser.Parser({
      onopentag: (name: string, attrs: any) => self._openTag(name, attrs),
      ontext: (text: string) => self._writeText(text),
      onclosetag: (name) => self._closeTag(name)
    }, { decodeEntities: true });
  }

  sanitize(input: string): string {
    this._tags = [];
    this._rootText = [];
    this._parser.parseComplete(input);
    let text = this._rootText.join('');
    this._rootText = [];
    return text;
  }

  private _openTag(name: string, attrs: any) {
    let tagFactory = this._map[name];
    if (!tagFactory) {
      return;
    }

    let convertedAttrs = Object.keys(attrs).map(name => attribute(name, attrs[name]));
    this._current = tagFactory(name, convertedAttrs);
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
      return;
    }
    this._current = this._tags[this._tags.length - 1];
    this._current.writeText(previousText);
  }
}

// full list of tags from https://developer.mozilla.org/en-US/docs/Web/HTML/Element
export const DEFAULT_TAG_MAP: TagMap = {
  'a': restrcitedTag(
    defaultAttrs(basicTag(), [
      attribute('target', '_blank'),
      attribute('rel', 'nofollow')]),
    ['href']
  ),
  'abbr': COMMON,
  'acronym': COMMON,
  'address': COMMON,
  'applet': skippedTag(),
  'area': restrcitedTag(
    defaultAttrs(basicTag(), [
      attribute('target', '_blank'),
      attribute('rel', 'nofollow')]),
    ['href']
  ),
  'article': COMMON,
  'aside': COMMON,
  'audio': skippedTag(),
  'b': COMMON,
  'base': skippedTag(),
  'basefont': skippedTag(),
  'bdi': COMMON,
  'bdo': restrcitedTag(basicTag(), ['dir']),
  'bgsound': skippedTag(),
  'big': transformedTag(COMMON, 'strong'),
  'blink': skippedTag(),
  'blockquote': restrcitedTag(basicTag(), ['cite']),
  'body': strippedTag(),
  'br': restrcitedTag(selfClosingTag()),
  'button': skippedTag(),
  'canvas': skippedTag(),
  'caption': COMMON,
  'center': strippedTag(),
  'cite': COMMON,
  'code': COMMON,
  'col': restrcitedTag(basicTag(), ['span']),
  'colgroup': restrcitedTag(basicTag(), ['span']),
  'command': skippedTag(),
  'content': strippedTag(),
  'data': restrcitedTag(basicTag(), ['value']),
  'datalist': skippedTag(),
  'dd': COMMON,
  'del': COMMON,
  'details': COMMON,
  'dfn': restrcitedTag(basicTag(), ['id']),
  'dialog': skippedTag(),
  'dir': transformedTag(COMMON, 'ul'),
  'div': COMMON,
  'dl': COMMON,
  'dt': COMMON,
  'element': skippedTag(),
  'em': COMMON,
  'embed': skippedTag(),
  'fieldset': skippedTag(),
  'figcaption': COMMON,
  'figure': COMMON,
  'font': strippedTag(),
  'footer': COMMON,
  'form': skippedTag(),
  'frame': skippedTag(),
  'frameset': skippedTag(),
  'h1': COMMON,
  'h2': COMMON,
  'h3': COMMON,
  'h4': COMMON,
  'h5': COMMON,
  'h6': COMMON,
  'head': skippedTag(),
  'header': COMMON,
  'hgroup': transformedTag(COMMON, 'header'),
  'hr': COMMON,
  'html': strippedTag(),
  'i': COMMON,
  'iframe': skippedTag(),
  'image': skippedTag(),
  'img': restrcitedTag(selfClosingTag(), ['src', 'alt', 'title', 'srcset', 'ismap']),
  'input': skippedTag(),
  'ins': COMMON,
  'isindex': skippedTag(),
  'kbd': COMMON,
  'keygen': skippedTag(),
  'label': COMMON,
  'legend': skippedTag(),
  'li': restrcitedTag(basicTag(), ['value']),
  'link': skippedTag(),
  'listing': transformedTag(COMMON, 'pre'),
  'main': transformedTag(COMMON, 'section'),
  'map': restrcitedTag(basicTag(), ['name']),
  'mark': COMMON,
  'marquee': strippedTag(),
  'menu': transformedTag(COMMON, 'ul'),
  'menuitem': transformedTag(COMMON, 'li'),
  'meta': skippedTag(),
  'meter': skippedTag(),
  'multicol': skippedTag(),
  'nav': strippedTag(),
  'nobr': strippedTag(),
  'noembed': strippedTag(),
  'noframes': strippedTag(),
  'noscript': strippedTag(),
  'object': skippedTag(),
  'ol': COMMON,
  'optgroup': skippedTag(),
  'option': skippedTag(),
  'output': COMMON,
  'p': COMMON,
  'param': skippedTag(),
  'picture': COMMON,
  'plaintext': transformedTag(COMMON, 'pre'),
  'pre': COMMON,
  'progress': restrcitedTag(basicTag(), ['value', 'max']),
  'q': restrcitedTag(basicTag(), ['cite']),
  'rp': COMMON,
  'rt': COMMON,
  'rtc': COMMON,
  'ruby': COMMON,
  's': COMMON,
  'samp': COMMON,
  'script': skippedTag(),
  'section': COMMON,
  'select': skippedTag(),
  'shadow': skippedTag(),
  'small': COMMON,
  'source': restrcitedTag(basicTag(), ['sizes', 'src', 'srcset', 'type', 'media']),
  'spacer': skippedTag(),
  'span': COMMON,
  'strike': transformedTag(COMMON, 's'),
  'strong': COMMON,
  'style': skippedTag(),
  'sub': COMMON,
  'summary': COMMON,
  'sup': COMMON,
  'table': COMMON,
  'tbody': COMMON,
  'td': restrcitedTag(basicTag(), ['colspan', 'rowspan']),
  'template': skippedTag(),
  'textarea': skippedTag(),
  'tfoot': COMMON,
  'th': restrcitedTag(basicTag(), ['colspan', 'rowspan', 'headers', 'scope']),
  'thead': COMMON,
  'time': restrcitedTag(basicTag(), ['datetime']),
  'title': skippedTag(),
  'tr': COMMON,
  'track': skippedTag(),
  'tt': skippedTag(),
  'u': COMMON,
  'ul': COMMON,
  'var': COMMON,
  'video': skippedTag(),
  'wbr': strippedTag(),
  'xmp': skippedTag()
};

class BasicTag implements Tag {
  private _text: string = '';

  constructor(
    private _name: string,
    private _attrs?: Attribute[]
  ) {
    this._attrs = this._attrs || [];
  }

  writeText(text: string) {
    this._text += text;
  }

  toString(): string {
    let attrs = this.attributes;
    attrs = attrs ? ' ' + attrs : '';
    return `<${this.name}${attrs}>${this._text}</${this.name}>`;
  }

  get name(): string {
    return this._name;
  }

  get attributes(): string {
    return this._attrs.join(' ');
  }

  get text(): string {
    return this._text;
  }
}

class SkippedTag extends BasicTag {
  writeText(text: string) {
    // do nothing
  }

  toString(): string {
    return '';
  }
}

class SelfClosingTag extends BasicTag {
  writeText(text: string) {
    // do nothing
  }

  toString(): string {
    return `<${this.name} ${this.attributes} />`;
  }
}


class StrippedTag extends BasicTag {
  toString(): string {
    return this.text;
  }
}

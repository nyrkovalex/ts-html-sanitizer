"use strict";
const parser = require('htmlparser2');
const BASIC = (name, attrs) => new BasicTag(name, attrs);
const SKIPPED = (name, attrs) => new SkippedTag(name, attrs);
const STRIPPED = (name, attrs) => new StrippedTag(name, attrs);
const COMMON = restrcitedTag(basicTag());
class BasicAttribute {
    constructor(_name, _value) {
        this._name = _name;
        this._value = _value;
    }
    get name() { return this._name; }
    get value() { return this._value; }
    toString() {
        return `${this._name}="${this._value}"`;
    }
}
function attribute(name, value) {
    return new BasicAttribute(name, value);
}
exports.attribute = attribute;
function basicTag() {
    return BASIC;
}
exports.basicTag = basicTag;
function skippedTag() {
    return SKIPPED;
}
exports.skippedTag = skippedTag;
function strippedTag() {
    return STRIPPED;
}
exports.strippedTag = strippedTag;
function restrcitedTag(tf, allowedAttrs) {
    allowedAttrs = allowedAttrs || [];
    return (name, attrs) => tf(name, attrs.filter(a => allowedAttrs.indexOf(a.name) > -1));
}
exports.restrcitedTag = restrcitedTag;
function selfClosingTag() {
    return (name, attrs) => new SelfClosingTag(name, attrs);
}
exports.selfClosingTag = selfClosingTag;
function defaultAttrs(tf, defaultAttrs) {
    return (name, attrs) => tf(name, attrs.concat(defaultAttrs));
}
exports.defaultAttrs = defaultAttrs;
function transformedTag(tf, newName) {
    return (name, attrs) => tf(newName, attrs);
}
exports.transformedTag = transformedTag;
function sanitizer(map) {
    return new Htmlparser2Sanitizer(map);
}
exports.sanitizer = sanitizer;
class Htmlparser2Sanitizer {
    constructor(_map) {
        this._map = _map;
        let self = this;
        this._parser = new parser.Parser({
            onopentag: (name, attrs) => self._openTag(name, attrs),
            ontext: (text) => self._writeText(text),
            onclosetag: (name) => self._closeTag(name)
        }, { decodeEntities: true });
    }
    sanitize(input) {
        this._tags = [];
        this._rootText = [];
        this._parser.parseComplete(input);
        let text = this._rootText.join('');
        this._rootText = [];
        return text;
    }
    _openTag(name, attrs) {
        let tagFactory = this._map[name];
        if (!tagFactory) {
            return;
        }
        let convertedAttrs = Object.keys(attrs).map(name => attribute(name, attrs[name]));
        this._current = tagFactory(name, convertedAttrs);
        this._tags.push(this._current);
    }
    _writeText(text) {
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
    _closeTag(name) {
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
exports.DEFAULT_TAG_MAP = {
    'a': restrcitedTag(defaultAttrs(basicTag(), [
        attribute('target', '_blank'),
        attribute('rel', 'nofollow')]), ['href']),
    'abbr': COMMON,
    'acronym': COMMON,
    'address': COMMON,
    'applet': skippedTag(),
    'area': restrcitedTag(defaultAttrs(basicTag(), [
        attribute('target', '_blank'),
        attribute('rel', 'nofollow')]), ['href']),
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
class BasicTag {
    constructor(_name, _attrs) {
        this._name = _name;
        this._attrs = _attrs;
        this._text = '';
        this._attrs = this._attrs || [];
    }
    writeText(text) {
        this._text += text;
    }
    toString() {
        let attrs = this.attributes;
        attrs = attrs ? ' ' + attrs : '';
        return `<${this.name}${attrs}>${this._text}</${this.name}>`;
    }
    get name() {
        return this._name;
    }
    get attributes() {
        return this._attrs.join(' ');
    }
    get text() {
        return this._text;
    }
}
class SkippedTag extends BasicTag {
    writeText(text) {
        // do nothing
    }
    toString() {
        return '';
    }
}
class SelfClosingTag extends BasicTag {
    writeText(text) {
        // do nothing
    }
    toString() {
        return `<${this.name} ${this.attributes} />`;
    }
}
class StrippedTag extends BasicTag {
    toString() {
        return this.text;
    }
}
//# sourceMappingURL=sanitizer.js.map
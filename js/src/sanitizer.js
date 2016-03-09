"use strict";
const parser = require('htmlparser2');
var Attributes;
(function (Attributes) {
    class Basic {
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
    Attributes.Basic = Basic;
})(Attributes = exports.Attributes || (exports.Attributes = {}));
var Tags;
(function (Tags) {
    class Basic {
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
            return `<${this.name}${this.attrString}>${this._text}</${this.name}>`;
        }
        get name() {
            return this._name;
        }
        get attributes() {
            return this._attrs;
        }
        get text() {
            return this._text;
        }
        get attrString() {
            let attrs = this.attributes.join(' ');
            return attrs = attrs ? ' ' + attrs : '';
        }
    }
    Tags.Basic = Basic;
    class Skipped extends Basic {
        writeText(text) {
            // do nothing
        }
        toString() {
            return '';
        }
    }
    Tags.Skipped = Skipped;
    class SelfClosing extends Basic {
        writeText(text) {
            // do nothing
        }
        toString() {
            return `<${this.name}${this.attrString} />`;
        }
    }
    Tags.SelfClosing = SelfClosing;
    class Stripped extends Basic {
        toString() {
            return this.text;
        }
    }
    Tags.Stripped = Stripped;
})(Tags = exports.Tags || (exports.Tags = {}));
var Transforms;
(function (Transforms) {
    Transforms.SKIPPED = (tag) => new Tags.Skipped(tag.name, tag.attributes);
    Transforms.STRIPPED = (tag) => new Tags.Stripped(tag.name, tag.attributes);
    Transforms.NO_ATTRS = restrcitedTag();
    function chain(transfroms) {
        return (tag, options) => {
            let previous = tag;
            transfroms.forEach(t => {
                previous = t(previous, options);
            });
            return previous;
        };
    }
    Transforms.chain = chain;
    function restrcitedTag(allowedAttrs) {
        allowedAttrs = allowedAttrs || [];
        return (tag, options) => new Tags.Basic(tag.name, tag.attributes.filter(a => allowedAttrs.indexOf(a.name) > -1));
    }
    Transforms.restrcitedTag = restrcitedTag;
    function selfClosingTag() {
        return (tag, options) => new Tags.SelfClosing(tag.name, tag.attributes);
    }
    Transforms.selfClosingTag = selfClosingTag;
    function defaultAttrs(attrs) {
        return (tag, options) => new Tags.Basic(tag.name, tag.attributes.concat(attrs));
    }
    Transforms.defaultAttrs = defaultAttrs;
    function transformTag(newName) {
        return (tag, options) => new Tags.Basic(newName, tag.attributes);
    }
    Transforms.transformTag = transformTag;
    function transformAttributes(transforms) {
        return (tag, options) => {
            let attrs = tag.attributes.map(a => a.name in transforms ? transforms[a.name](a, options) : a);
            return new Tags.Basic(tag.name, attrs);
        };
    }
    Transforms.transformAttributes = transformAttributes;
})(Transforms = exports.Transforms || (exports.Transforms = {}));
const URL_TRANSFORM = (a, opts) => {
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
const DEFAULT_OPTIONS = {
    host: '',
    path: '',
    protocol: '',
};
class Htmlparser2Sanitizer {
    constructor(_map) {
        this._map = _map;
        this._options = null;
        let self = this;
        this._parser = new parser.Parser({
            onopentag: (name, attrs) => self._openTag(name, attrs),
            ontext: (text) => self._writeText(text),
            onclosetag: (name) => self._closeTag(name)
        });
    }
    sanitize(input, options) {
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
    _openTag(name, attrs) {
        let tagFactory = this._map[name];
        if (!tagFactory) {
            return;
        }
        console.info('starting tag', name);
        let convertedAttrs = Object.keys(attrs).map(attrName => attribute(attrName, attrs[attrName]));
        this._current = tagFactory(new Tags.Basic(name, convertedAttrs), this._options);
        this._tags.push(this._current);
    }
    _writeText(text) {
        if (!text.trim()) {
            return;
        }
        console.info('writin', text);
        text = text.replace(/\s+/, ' ');
        if (!this._current) {
            this._rootText.push(text);
            return;
        }
        this._current.writeText(text);
    }
    _closeTag(name) {
        let previousText = this._tags.pop().toString();
        console.info('closing tag', name);
        if (this._tags.length === 0) {
            this._rootText.push(previousText);
            this._current = null;
            return;
        }
        this._current = this._tags[this._tags.length - 1];
        this._current.writeText(previousText);
    }
    _normalizedOptions(options) {
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
exports.DEFAULT_TAG_MAP = {
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
function sanitizer(tagMap) {
    return new Htmlparser2Sanitizer(tagMap || exports.DEFAULT_TAG_MAP);
}
exports.sanitizer = sanitizer;
function attribute(name, value) {
    return new Attributes.Basic(name, value);
}
exports.attribute = attribute;
function tag(name, attrs) {
    return new Tags.Basic(name, attrs);
}
exports.tag = tag;
//# sourceMappingURL=sanitizer.js.map
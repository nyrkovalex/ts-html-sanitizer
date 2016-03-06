export declare namespace Sanitize {
    interface TagMap {
        [tagName: string]: Transforms.Transform;
    }
    interface Sanitizer {
        /**
         * Performs html sanitizing.
         * @param {string} input - html to sanitize
         * @param {Sanitize.Options} [options] - parsing options
         * @returns {string} - sanitized html
         */
        sanitize(input: string, options?: Options): string;
    }
    interface Options {
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
export declare namespace Attributes {
    class Basic implements Attribute {
        private _name;
        private _value;
        constructor(_name: string, _value: string);
        name: string;
        value: string;
        toString(): string;
    }
    interface Attribute {
        name: string;
        value: string;
        toString(): string;
    }
}
export declare namespace Tags {
    interface Tag {
        writeText(text: string): void;
        toString(): string;
        name: string;
        attributes: Attributes.Attribute[];
        text: string;
    }
    class Basic implements Tag {
        private _name;
        private _attrs;
        private _text;
        constructor(_name: string, _attrs?: Attributes.Attribute[]);
        writeText(text: string): void;
        toString(): string;
        name: string;
        attributes: Attributes.Attribute[];
        text: string;
        protected attrString: string;
    }
    class Skipped extends Basic {
        writeText(text: string): void;
        toString(): string;
    }
    class SelfClosing extends Basic {
        writeText(text: string): void;
        toString(): string;
    }
    class Stripped extends Basic {
        toString(): string;
    }
}
export declare namespace Transforms {
    const SKIPPED: (tag: Tags.Tag) => Tags.Skipped;
    const STRIPPED: (tag: Tags.Tag) => Tags.Stripped;
    const NO_ATTRS: Transform;
    interface Transform {
        (tag: Tags.Tag, options: Sanitize.Options): Tags.Tag;
    }
    interface AttributeTransform {
        (attr: Attributes.Attribute, options: Sanitize.Options): Attributes.Attribute;
    }
    interface AttributeTransformMap {
        [attrName: string]: AttributeTransform;
    }
    function chain(transfroms: Transform[]): Transform;
    function restrcitedTag(allowedAttrs?: string[]): Transform;
    function selfClosingTag(): Transform;
    function defaultAttrs(attrs: Attributes.Attribute[]): Transform;
    function transformTag(newName: string): Transform;
    function transformAttributes(transforms: AttributeTransformMap): Transform;
}
export declare const DEFAULT_TAG_MAP: Sanitize.TagMap;
/**
 * Creates an instance of `Sanitize.Sanitizer`
 * @param {Sanitize.TagMap} [tagMap] - map containing `Transforms.Transform` for each tag name. Defaults to `DEFAULT_TAG_MAP`.
 */
export declare function sanitizer(tagMap?: Sanitize.TagMap): Sanitize.Sanitizer;
export declare function attribute(name: string, value: string): Attributes.Attribute;
export declare function tag(name: string, attrs: Attributes.Attribute[]): Tags.Tag;

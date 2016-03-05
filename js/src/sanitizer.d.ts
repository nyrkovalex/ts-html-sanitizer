export interface Attribute {
    name: string;
    value: string;
    toString(): string;
}
export declare function attribute(name: string, value: string): Attribute;
export interface Tag {
    writeText(text: string): void;
    toString(): string;
    name: string;
    attributes: string;
    text: string;
}
export declare function basicTag(): TagFactory;
export declare function skippedTag(): TagFactory;
export declare function strippedTag(): TagFactory;
export declare function restrcitedTag(tf: TagFactory, allowedAttrs?: string[]): TagFactory;
export declare function selfClosingTag(): TagFactory;
export declare function defaultAttrs(tf: TagFactory, defaultAttrs: Attribute[]): TagFactory;
export declare function transformedTag(tf: TagFactory, newName: string): TagFactory;
export interface TagFactory {
    (name: string, attrs?: Attribute[]): Tag;
}
export interface TagMap {
    [tagName: string]: TagFactory;
}
export interface Sanitizer {
    sanitize(input: string): string;
}
export declare function sanitizer(map: TagMap): Sanitizer;
export declare const DEFAULT_TAG_MAP: TagMap;

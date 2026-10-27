import {
  $applyNodeReplacement,
  EditorConfig,
  NodeKey,
  SerializedTextNode,
  TextNode,
} from 'lexical';
import { getGoogleEmojiStyle } from './googleEmojiData';

export class GoogleEmojiNode extends TextNode {
  static getType() {
    return 'google-emoji';
  }

  static clone(node: GoogleEmojiNode) {
    return new GoogleEmojiNode(node.__text, node.__key);
  }

  constructor(text: string, key?: NodeKey) {
    super(text, key);
  }

  static importJSON(serialized: SerializedTextNode) {
    return $createGoogleEmojiNode(serialized.text).updateFromJSON(serialized).setMode('token');
  }

  exportJSON(): SerializedTextNode {
    return { ...super.exportJSON(), type: 'google-emoji', version: 1 };
  }

  createDOM(config: EditorConfig) {
    const dom = document.createElement('span');
    dom.dataset.googleEmoji = this.__text;
    Object.assign(dom.style, getGoogleEmojiStyle(this.__text));
    const text = super.createDOM(config);
    // Keep a real text node for selection, accessibility and Unicode clipboard data.
    text.style.opacity = '0';
    dom.appendChild(text);
    return dom;
  }

  updateDOM(previous: this, dom: HTMLElement, config: EditorConfig) {
    if (previous.__text !== this.__text) return true;
    return super.updateDOM(previous, dom.firstElementChild as HTMLElement, config);
  }

  exportDOM() {
    const element = document.createElement('span');
    element.textContent = this.getTextContent();
    return { element };
  }

  isTextEntity() {
    return true;
  }
}

export const $createGoogleEmojiNode = (emoji: string) =>
  $applyNodeReplacement(new GoogleEmojiNode(emoji)).setMode('token');

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ShortcodeNodeView } from '../components/ShortcodeNodeView.tsx';

export interface ShortcodeAttributes {
  type: string;
  slug: string;
  displayText: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    shortcode: {
      insertShortcode: (attrs: ShortcodeAttributes) => ReturnType;
    };
  }
}

export const ShortcodeNode = Node.create({
  name: 'shortcode',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      type: { default: '' },
      slug: { default: '' },
      displayText: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'shortcode',
        getAttrs(node) {
          const el = node as HTMLElement;
          return {
            type: el.getAttribute('type') ?? '',
            slug: el.getAttribute('slug') ?? '',
            displayText: el.getAttribute('label') ?? el.getAttribute('slug') ?? '',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { displayText, ...attrs } = HTMLAttributes;
    return [
      'shortcode',
      mergeAttributes(attrs, { label: displayText }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ShortcodeNodeView);
  },

  addCommands() {
    return {
      insertShortcode:
        (attrs: ShortcodeAttributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
    };
  },
});

import { useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { ShortcodeEditModal } from './ShortcodeEditModal.tsx';

export function ShortcodeNodeView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const [editOpen, setEditOpen] = useState(false);
  const { type, slug, displayText } = node.attrs;
  const label = displayText || slug;

  return (
    <NodeViewWrapper as="span" style={{ display: 'inline' }}>
      <a
        href="#"
        onClick={(e) => { e.preventDefault(); setEditOpen(true); }}
        style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer' }}
        title={`${type}:${slug}`}
      >
        {label}
      </a>
      <ShortcodeEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        type={type}
        slug={slug}
        displayText={displayText}
        onSave={(newDisplayText) => {
          updateAttributes({ displayText: newDisplayText });
          setEditOpen(false);
        }}
        onRemove={() => {
          deleteNode();
          setEditOpen(false);
        }}
      />
    </NodeViewWrapper>
  );
}

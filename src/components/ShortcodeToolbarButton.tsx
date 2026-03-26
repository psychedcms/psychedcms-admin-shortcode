import { useState } from 'react';
import { useTranslate } from 'react-admin';
import { ToggleButton } from '@mui/material';
import DataObjectIcon from '@mui/icons-material/DataObject';
import { useTiptapEditor } from 'ra-input-rich-text';
import { ShortcodeSearchModal } from './ShortcodeSearchModal.tsx';

export function ShortcodeToolbarButton() {
  const editor = useTiptapEditor();
  const translate = useTranslate();
  const [open, setOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');

  const handleOpen = () => {
    if (editor) {
      const { from, to } = editor.state.selection;
      setSelectedText(from !== to ? editor.state.doc.textBetween(from, to) : '');
    }
    setOpen(true);
  };

  const handleSelect = (result: { type: string; slug: string; label: string }) => {
    if (!editor) return;
    editor.commands.insertShortcode({
      type: result.type,
      slug: result.slug,
      displayText: result.label,
    });
    setOpen(false);
  };

  return (
    <>
      <ToggleButton
        aria-label={translate('psyched.shortcode.insert')}
        title={translate('psyched.shortcode.insert')}
        value="shortcode"
        onClick={handleOpen}
        size="small"
      >
        <DataObjectIcon fontSize="inherit" />
      </ToggleButton>
      <ShortcodeSearchModal
        open={open}
        onClose={() => setOpen(false)}
        onSelect={handleSelect}
        initialQuery={selectedText}
      />
    </>
  );
}

import { useState } from 'react';
import { useTranslate } from 'react-admin';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';

interface ShortcodeEditModalProps {
  open: boolean;
  onClose: () => void;
  type: string;
  slug: string;
  displayText: string;
  onSave: (displayText: string) => void;
  onRemove: () => void;
}

export function ShortcodeEditModal({
  open,
  onClose,
  type,
  slug,
  displayText,
  onSave,
  onRemove,
}: ShortcodeEditModalProps) {
  const translate = useTranslate();
  const [text, setText] = useState(displayText);

  const handleSave = () => {
    onSave(text);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{translate('psyched.shortcode.edit_title')}</DialogTitle>
      <DialogContent>
        <TextField
          label={translate('psyched.shortcode.type')}
          value={type}
          fullWidth
          margin="dense"
          disabled
          size="small"
        />
        <TextField
          label={translate('psyched.shortcode.slug')}
          value={slug}
          fullWidth
          margin="dense"
          disabled
          size="small"
        />
        <TextField
          label={translate('psyched.shortcode.display_text')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          fullWidth
          margin="dense"
          autoFocus
          size="small"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onRemove} color="error">
          {translate('psyched.shortcode.remove')}
        </Button>
        <Button onClick={onClose}>
          {translate('psyched.shortcode.cancel')}
        </Button>
        <Button onClick={handleSave} variant="contained">
          {translate('psyched.shortcode.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

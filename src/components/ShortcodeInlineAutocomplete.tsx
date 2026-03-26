import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Paper,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  CircularProgress,
  Box,
} from '@mui/material';
import { useTiptapEditor } from 'ra-input-rich-text';
import { usePsychedSchemaContext } from '@psychedcms/admin-core';

const TYPE_LABELS: Record<string, Record<string, string>> = {
  fr: {
    bands: 'Groupes', festivals: 'Festivals', labels: 'Labels',
    organizations: 'Organisations', venues: 'Salles', releases: 'Sorties',
    events: 'Événements', tours: 'Tournées', sets: 'Sets',
    reviews: 'Chroniques', 'event-reports': "Comptes-rendus d'événements",
    'set-reports': 'Comptes-rendus de sets', 'day-reports': 'Comptes-rendus de jours',
    posts: 'Articles',
  },
  en: {
    bands: 'Bands', festivals: 'Festivals', labels: 'Labels',
    organizations: 'Organizations', venues: 'Venues', releases: 'Releases',
    events: 'Events', tours: 'Tours', sets: 'Sets', reviews: 'Reviews',
    'event-reports': 'Event Reports', 'set-reports': 'Set Reports',
    'day-reports': 'Day Reports', posts: 'Posts',
  },
};

interface AutocompleteResult {
  type: string;
  slug: string;
  label: string;
  score: number;
}

const DEBOUNCE_DELAY = 200;
const TRIGGER = '[[';

export function ShortcodeInlineAutocomplete() {
  const editor = useTiptapEditor();
  const { entrypoint } = usePsychedSchemaContext();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AutocompleteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [triggerPos, setTriggerPos] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const locale = document.documentElement.lang || 'fr';
  const labels = TYPE_LABELS[locale] || TYPE_LABELS.en;

  const search = useCallback(
    async (q: string) => {
      if (!entrypoint || q.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await fetch(`${entrypoint}/shortcode-autocomplete?q=${encodeURIComponent(q)}`);
        const data = await response.json();
        setResults(data.results || []);
        setSelectedIndex(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [entrypoint],
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setResults([]);
    setTriggerPos(null);
    setSelectedIndex(0);
  }, []);

  const selectResult = useCallback(
    (result: AutocompleteResult) => {
      if (!editor || triggerPos === null) return;

      const cursorPos = editor.state.selection.from;

      // Delete the [[ + query text, then insert shortcode
      editor
        .chain()
        .focus()
        .deleteRange({ from: triggerPos, to: cursorPos })
        .insertShortcode({
          type: result.type,
          slug: result.slug,
          displayText: result.label,
        })
        .run();

      close();
    },
    [editor, triggerPos, close],
  );

  // Listen for editor updates to detect [[ trigger
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      const { from } = editor.state.selection;
      const textBefore = editor.state.doc.textBetween(
        Math.max(0, from - 50),
        from,
        '\n',
      );

      const match = textBefore.match(/\[\[([^\]\n]*)$/);
      if (match) {
        const queryText = match[1];
        const matchTriggerPos = from - queryText.length - TRIGGER.length;

        setTriggerPos(matchTriggerPos);
        setQuery(queryText);
        setOpen(true);

        // Position dropdown near cursor
        const coords = editor.view.coordsAtPos(from);
        const editorRect = editor.view.dom.closest('.ra-input')?.getBoundingClientRect()
          ?? editor.view.dom.getBoundingClientRect();
        setPosition({
          top: coords.bottom - editorRect.top + 4,
          left: coords.left - editorRect.left,
        });

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(queryText), DEBOUNCE_DELAY);
      } else if (open) {
        close();
      }
    };

    editor.on('update', handleUpdate);
    editor.on('selectionUpdate', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
      editor.off('selectionUpdate', handleUpdate);
    };
  }, [editor, open, close, search]);

  // Keyboard navigation
  useEffect(() => {
    if (!open || !editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (event.key === 'Enter' && results.length > 0) {
        event.preventDefault();
        selectResult(results[selectedIndex]);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };

    // Capture phase so we intercept before ProseMirror
    editor.view.dom.addEventListener('keydown', handleKeyDown, true);
    return () => {
      editor.view.dom.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [open, editor, results, selectedIndex, selectResult, close]);

  if (!open) return null;

  const grouped = results.reduce<Record<string, AutocompleteResult[]>>((acc, r) => {
    (acc[r.type] ??= []).push(r);
    return acc;
  }, {});

  let flatIndex = 0;

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        zIndex: 1300,
        maxHeight: 300,
        minWidth: 280,
        overflow: 'auto',
      }}
    >
      {loading && results.length === 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
          <CircularProgress size={20} />
        </Box>
      )}
      {results.length > 0 && (
        <List dense sx={{ py: 0 }}>
          {Object.entries(grouped).map(([type, items]) => (
            <li key={type}>
              <ul style={{ padding: 0 }}>
                <ListSubheader sx={{ lineHeight: '28px', fontSize: '0.75rem' }}>
                  {labels[type] || type}
                </ListSubheader>
                {items.map((item) => {
                  const idx = flatIndex++;
                  return (
                    <ListItemButton
                      key={`${item.type}:${item.slug}`}
                      selected={idx === selectedIndex}
                      onMouseDown={(e) => {
                        e.preventDefault(); // Keep editor focus
                        selectResult(item);
                      }}
                      dense
                    >
                      <ListItemText
                        primary={item.label}
                        secondary={item.slug}
                        primaryTypographyProps={{ fontSize: '0.85rem' }}
                        secondaryTypographyProps={{ fontSize: '0.7rem' }}
                      />
                    </ListItemButton>
                  );
                })}
              </ul>
            </li>
          ))}
        </List>
      )}
    </Paper>
  );
}

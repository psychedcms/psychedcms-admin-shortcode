import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslate } from 'react-admin';
import { usePsychedSchemaContext } from '@psychedcms/admin-core';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  CircularProgress,
  Box,
} from '@mui/material';

const TYPE_LABELS: Record<string, Record<string, string>> = {
  fr: {
    bands: 'Groupes',
    festivals: 'Festivals',
    labels: 'Labels',
    organizations: 'Organisations',
    venues: 'Salles',
    releases: 'Sorties',
    events: 'Événements',
    tours: 'Tournées',
    sets: 'Sets',
    reviews: 'Chroniques',
    'event-reports': "Comptes-rendus d'événements",
    'set-reports': 'Comptes-rendus de sets',
    'day-reports': 'Comptes-rendus de jours',
    posts: 'Articles',
  },
  en: {
    bands: 'Bands',
    festivals: 'Festivals',
    labels: 'Labels',
    organizations: 'Organizations',
    venues: 'Venues',
    releases: 'Releases',
    events: 'Events',
    tours: 'Tours',
    sets: 'Sets',
    reviews: 'Reviews',
    'event-reports': 'Event Reports',
    'set-reports': 'Set Reports',
    'day-reports': 'Day Reports',
    posts: 'Posts',
  },
};

interface AutocompleteResult {
  type: string;
  slug: string;
  label: string;
  score: number;
}

interface ShortcodeSearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (result: { type: string; slug: string; label: string }) => void;
  initialQuery?: string;
}

const DEBOUNCE_DELAY = 200;

export function ShortcodeSearchModal({ open, onClose, onSelect, initialQuery = '' }: ShortcodeSearchModalProps) {
  const translate = useTranslate();
  const { entrypoint } = usePsychedSchemaContext();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AutocompleteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const locale = document.documentElement.lang || 'fr';
  const labels = TYPE_LABELS[locale] || TYPE_LABELS.en;

  // Prefill query from selected text when modal opens
  useEffect(() => {
    if (open && initialQuery) {
      setQuery(initialQuery);
      search(initialQuery);
    }
  }, [open, initialQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const search = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const response = await fetch(`${entrypoint}/shortcode-autocomplete?q=${encodeURIComponent(q)}`);
        const data = await response.json();
        setResults(data.results || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [entrypoint],
  );

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), DEBOUNCE_DELAY);
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    onClose();
  };

  // Group results by type
  const grouped = results.reduce<Record<string, AutocompleteResult[]>>((acc, r) => {
    (acc[r.type] ??= []).push(r);
    return acc;
  }, {});

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{translate('psyched.shortcode.search_title')}</DialogTitle>
      <DialogContent>
        <TextField
          placeholder={translate('psyched.shortcode.placeholder')}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          fullWidth
          margin="dense"
          autoFocus
          size="small"
        />
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        {!loading && results.length > 0 && (
          <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
            {Object.entries(grouped).map(([type, items]) => (
              <li key={type}>
                <ul style={{ padding: 0 }}>
                  <ListSubheader sx={{ lineHeight: '32px' }}>
                    {labels[type] || type}
                  </ListSubheader>
                  {items.map((item) => (
                    <ListItemButton
                      key={`${item.type}:${item.slug}`}
                      onClick={() => {
                        onSelect({ type: item.type, slug: item.slug, label: item.label });
                        handleClose();
                      }}
                    >
                      <ListItemText primary={item.label} secondary={item.slug} />
                    </ListItemButton>
                  ))}
                </ul>
              </li>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, type ReactNode } from 'react';
import { usePsychedSchemaContext } from '@psychedcms/admin-core';
import { ShortcodeAutocomplete } from './ShortcodeAutocomplete.ts';

export function ShortcodeProvider({ children }: { children: ReactNode }) {
    const { entrypoint } = usePsychedSchemaContext();

    useEffect(() => {
        if (!entrypoint) return;
        const autocomplete = new ShortcodeAutocomplete(entrypoint);
        return () => autocomplete.destroy();
    }, [entrypoint]);

    return children;
}

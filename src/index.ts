import { registerPlugin } from '@psychedcms/admin-core';
import { ShortcodeProvider } from './ShortcodeProvider.tsx';
import { ShortcodeNode } from './extensions/ShortcodeNode.ts';
import { ShortcodeToolbarButton } from './components/ShortcodeToolbarButton.tsx';
import { ShortcodeInlineAutocomplete } from './components/ShortcodeInlineAutocomplete.tsx';
import { shortcodeTextToHtml, shortcodeHtmlToText } from './lib/shortcodeTransform.ts';
import { frMessages } from './i18n/fr.ts';
import { enMessages } from './i18n/en.ts';

registerPlugin({
    appWrappers: [{ component: ShortcodeProvider }],
    editorExtensions: [{
        extension: ShortcodeNode,
        position: 10,
    }],
    editorToolbarButtons: [{
        component: ShortcodeToolbarButton,
        position: 20,
    }, {
        component: ShortcodeInlineAutocomplete,
        position: 99,
    }],
    editorContentTransforms: [{
        toEditor: shortcodeTextToHtml,
        toStorage: shortcodeHtmlToText,
        position: 10,
    }],
    i18nMessages: { fr: frMessages, en: enMessages },
});

export { ShortcodeAutocomplete } from './ShortcodeAutocomplete.ts';
export { ShortcodeProvider } from './ShortcodeProvider.tsx';

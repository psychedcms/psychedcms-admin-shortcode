/**
 * Content type display labels for autocomplete grouping.
 */
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

interface ParsedQuery {
    type: string | null;
    query: string;
}

const DEBOUNCE_DELAY = 150;
const MIN_QUERY_LENGTH = 2;

export class ShortcodeAutocomplete {
    private dropdown: HTMLDivElement | null = null;
    private activeEditor: HTMLElement | null = null;
    private results: AutocompleteResult[] = [];
    private selectedIndex = -1;
    private isOpen = false;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private locale: string;
    private apiUrl: string;

    constructor(apiUrl: string) {
        this.locale = document.documentElement.lang || 'fr';
        this.apiUrl = apiUrl;
        this.init();
    }

    private init(): void {
        this.createDropdown();
        this.attachEventListeners();
    }

    private createDropdown(): void {
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'shortcode-autocomplete-dropdown';
        this.dropdown.style.cssText = `
            display: none;
            position: absolute;
            z-index: 99999;
            background: #fff;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            max-height: 300px;
            overflow-y: auto;
            min-width: 280px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 13px;
        `;
        document.body.appendChild(this.dropdown);
    }

    private attachEventListeners(): void {
        document.addEventListener('input', (e) => this.onInput(e), true);
        document.addEventListener('keydown', (e) => this.onKeydown(e), true);
        document.addEventListener('click', (e) => {
            if (this.dropdown && !this.dropdown.contains(e.target as Node)) {
                this.close();
            }
        });
        document.addEventListener('scroll', () => this.close(), true);
    }

    private onInput(e: Event): void {
        const target = e.target as HTMLElement;

        if (!this.isSupportedElement(target)) {
            return;
        }

        const text = this.getTextBeforeCursor(target);
        if (text === null) {
            this.close();
            return;
        }

        // Look for [[ pattern not preceded by backslash
        const triggerMatch = text.match(/(?:^|[^\\])\[\[([^\]\s]*)$/);

        if (triggerMatch) {
            this.activeEditor = target;
            const searchQuery = triggerMatch[1];

            const parsed = this.parseSearchQuery(searchQuery);

            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }

            this.debounceTimer = setTimeout(() => {
                this.search(parsed.query, parsed.type);
            }, DEBOUNCE_DELAY);
        } else {
            this.close();
        }
    }

    private parseSearchQuery(input: string): ParsedQuery {
        const colonIndex = input.indexOf(':');

        if (colonIndex > 0) {
            const potentialType = input.substring(0, colonIndex);
            const labels = TYPE_LABELS[this.locale] || TYPE_LABELS.en;
            if (labels[potentialType]) {
                return {
                    type: potentialType,
                    query: input.substring(colonIndex + 1),
                };
            }
        }

        return { type: null, query: input };
    }

    private isSupportedElement(element: HTMLElement): boolean {
        if (!element) return false;
        // Skip TipTap/ProseMirror editors — shortcodes are handled by the ShortcodeNode extension there
        if (element.closest('.ProseMirror')) return false;
        if (element.tagName === 'TEXTAREA') return true;
        if (element.isContentEditable || element.contentEditable === 'true') return true;
        return false;
    }

    private getTextBeforeCursor(element: HTMLElement): string | null {
        if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
            const input = element as HTMLTextAreaElement | HTMLInputElement;
            const cursorPos = input.selectionStart ?? 0;
            return input.value.substring(0, cursorPos);
        }

        // For contenteditable
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return null;

        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.startContainer, range.startOffset);

        return preCaretRange.toString();
    }

    private getCursorPosition(element: HTMLElement): { top: number; left: number } | null {
        if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
            const input = element as HTMLTextAreaElement | HTMLInputElement;
            return this.getCaretCoordinates(input, input.selectionStart ?? 0);
        }

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return null;

        const range = selection.getRangeAt(0).cloneRange();
        range.collapse(true);

        const rect = range.getClientRects()[0];
        if (rect) {
            return {
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX,
            };
        }

        const elemRect = element.getBoundingClientRect();
        return {
            top: elemRect.top + window.scrollY,
            left: elemRect.left + window.scrollX,
        };
    }

    private getCaretCoordinates(
        element: HTMLTextAreaElement | HTMLInputElement,
        position: number,
    ): { top: number; left: number } {
        const computed = window.getComputedStyle(element);
        const mirror = document.createElement('div');

        mirror.style.cssText = [
            'position: absolute',
            'visibility: hidden',
            'white-space: pre-wrap',
            'word-wrap: break-word',
            'overflow-wrap: break-word',
            `font-family: ${computed.fontFamily}`,
            `font-size: ${computed.fontSize}`,
            `font-weight: ${computed.fontWeight}`,
            `line-height: ${computed.lineHeight}`,
            `padding: ${computed.padding}`,
            `border: ${computed.border}`,
            `width: ${element.offsetWidth}px`,
        ].join('; ');

        document.body.appendChild(mirror);

        const textContent = element.value.substring(0, position);
        mirror.textContent = textContent;

        const span = document.createElement('span');
        span.textContent = element.value.substring(position) || '.';
        mirror.appendChild(span);

        const rect = element.getBoundingClientRect();
        const coordinates = {
            top: rect.top + window.scrollY + span.offsetTop - element.scrollTop,
            left: rect.left + window.scrollX + span.offsetLeft - element.scrollLeft,
        };

        document.body.removeChild(mirror);

        return coordinates;
    }

    private async search(query: string, type: string | null): Promise<void> {
        if (query.length < MIN_QUERY_LENGTH && !type) {
            this.close();
            return;
        }

        let url = `${this.apiUrl}/shortcode-autocomplete?q=${encodeURIComponent(query)}`;
        if (type) {
            url += `&type=${encodeURIComponent(type)}`;
        }

        try {
            const response = await fetch(url);
            const data = await response.json();
            this.results = data.results || [];
            this.selectedIndex = this.results.length > 0 ? 0 : -1;
            this.render();
        } catch (error) {
            console.error('Shortcode autocomplete error:', error);
            this.close();
        }
    }

    private render(): void {
        if (!this.dropdown || this.results.length === 0) {
            this.close();
            return;
        }

        const labels = TYPE_LABELS[this.locale] || TYPE_LABELS.en;
        let html = '';
        let currentType: string | null = null;

        this.results.forEach((result, index) => {
            if (result.type !== currentType) {
                currentType = result.type;
                const typeLabel = labels[result.type] || result.type;
                html += `<div style="padding: 4px 12px; font-size: 11px; font-weight: 600; color: #666; text-transform: uppercase; background: #f5f5f5;">${this.escapeHtml(typeLabel)}</div>`;
            }

            const isSelected = index === this.selectedIndex;
            const bgColor = isSelected ? '#e3f2fd' : '#fff';
            html += `<div class="shortcode-item" data-index="${index}" style="padding: 6px 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: ${bgColor};">
                <span style="color: #333;">${this.escapeHtml(result.label)}</span>
                <span style="color: #999; font-size: 11px; margin-left: 12px;">${this.escapeHtml(result.slug)}</span>
            </div>`;
        });

        this.dropdown.innerHTML = html;
        this.positionDropdown();
        this.dropdown.style.display = 'block';
        this.isOpen = true;

        // Attach click/hover handlers
        this.dropdown.querySelectorAll('.shortcode-item').forEach((item) => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const idx = parseInt((item as HTMLElement).dataset.index || '0', 10);
                this.select(idx);
            });

            item.addEventListener('mouseenter', () => {
                this.selectedIndex = parseInt((item as HTMLElement).dataset.index || '0', 10);
                this.updateSelection();
            });
        });
    }

    private positionDropdown(): void {
        if (!this.dropdown || !this.activeEditor) return;

        const pos = this.getCursorPosition(this.activeEditor);
        if (!pos) return;

        this.dropdown.style.top = `${pos.top + 20}px`;
        this.dropdown.style.left = `${pos.left}px`;

        // Ensure dropdown stays on screen
        const rect = this.dropdown.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            this.dropdown.style.left = `${window.innerWidth - rect.width - 10}px`;
        }
        if (rect.bottom > window.innerHeight) {
            this.dropdown.style.top = `${pos.top - rect.height - 5}px`;
        }
    }

    private updateSelection(): void {
        if (!this.dropdown) return;

        this.dropdown.querySelectorAll('.shortcode-item').forEach((item, index) => {
            const el = item as HTMLElement;
            el.style.background = index === this.selectedIndex ? '#e3f2fd' : '#fff';
            if (index === this.selectedIndex) {
                el.scrollIntoView({ block: 'nearest' });
            }
        });
    }

    private onKeydown(e: KeyboardEvent): void {
        if (!this.isOpen) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.results.length - 1);
                this.updateSelection();
                break;

            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
                this.updateSelection();
                break;

            case 'Enter':
                if (this.selectedIndex >= 0) {
                    e.preventDefault();
                    this.select(this.selectedIndex);
                }
                break;

            case 'Escape':
                e.preventDefault();
                this.close();
                break;

            case 'Tab':
                this.close();
                break;
        }
    }

    private select(index: number): void {
        if (index < 0 || index >= this.results.length) return;

        const result = this.results[index];
        const shortcode = `[[${result.type}:${result.slug}]]`;

        this.insertShortcode(shortcode);
        this.close();
    }

    private insertShortcode(shortcode: string): void {
        if (!this.activeEditor) return;

        const element = this.activeEditor;

        if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
            const input = element as HTMLTextAreaElement | HTMLInputElement;
            const cursorPos = input.selectionStart ?? 0;
            const text = input.value;

            const beforeCursor = text.substring(0, cursorPos);
            const triggerIndex = beforeCursor.lastIndexOf('[[');

            if (triggerIndex >= 0) {
                const newText = text.substring(0, triggerIndex) + shortcode + text.substring(cursorPos);
                input.value = newText;

                const newCursorPos = triggerIndex + shortcode.length;
                input.setSelectionRange(newCursorPos, newCursorPos);

                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        } else if (element.isContentEditable || element.contentEditable === 'true') {
            const textContent = this.getTextBeforeCursor(element);
            const triggerMatch = textContent?.match(/(?:^|[^\\])\[\[([^\]\s]*)$/);

            if (triggerMatch) {
                const deleteCount = 2 + triggerMatch[1].length;

                for (let i = 0; i < deleteCount; i++) {
                    document.execCommand('delete', false, undefined);
                }

                document.execCommand('insertText', false, shortcode);
            }
        }

        element.focus();
    }

    private close(): void {
        if (this.dropdown) {
            this.dropdown.style.display = 'none';
        }
        this.isOpen = false;
        this.results = [];
        this.selectedIndex = -1;
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    destroy(): void {
        if (this.dropdown) {
            document.body.removeChild(this.dropdown);
            this.dropdown = null;
        }
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
    }
}

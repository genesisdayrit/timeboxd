import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef } from 'react';
import { parseMarkdownToHTML, serializeToMarkdown } from './utils/markdownSerializer';
import './MarkdownEditor.css';

interface MarkdownEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minHeight?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Add notes...',
  disabled = false,
  className = '',
  minHeight = '80px',
  onFocus,
  onBlur,
}: MarkdownEditorProps) {
  // Track if we're updating from external value to avoid loops
  const isExternalUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
        listItem: {},
      }),
      Placeholder.configure({
        placeholder,
        emptyNodeClass: 'is-empty',
      }),
    ],
    content: parseMarkdownToHTML(value),
    editable: !disabled,
    onUpdate: ({ editor }) => {
      if (isExternalUpdate.current) return;
      const markdown = serializeToMarkdown(editor.getHTML());
      onChange(markdown);
    },
    onFocus: () => {
      onFocus?.();
    },
    onBlur: () => {
      onBlur?.();
    },
  });

  // Sync external value changes
  useEffect(() => {
    if (!editor) return;

    const currentMarkdown = serializeToMarkdown(editor.getHTML());
    if (value !== currentMarkdown) {
      isExternalUpdate.current = true;
      editor.commands.setContent(parseMarkdownToHTML(value));
      isExternalUpdate.current = false;
    }
  }, [value, editor]);

  // Update editable state when disabled changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  return (
    <div
      className={`tiptap-editor ${className}`}
      style={{ minHeight }}
    >
      <EditorContent editor={editor} />
    </div>
  );
}

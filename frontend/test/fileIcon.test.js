import { describe, test, expect } from 'vitest';
import { fileIcon } from '../src/utils/fileIcon';

describe('fileIcon', () => {
  test('maps known extensions to emoji', () => {
    expect(fileIcon('report.pdf')).toBe('📄');
    expect(fileIcon('notes.docx')).toBe('📝');
    expect(fileIcon('photo.png')).toBe('🖼');
    expect(fileIcon('script.py')).toBe('🐍');
  });

  test('is case-insensitive on extension', () => {
    expect(fileIcon('IMAGE.PNG')).toBe('🖼');
    expect(fileIcon('data.JSON')).toBe('⚙️');
  });

  test('falls back to 📁 for unknown or missing extension', () => {
    expect(fileIcon('archive.unknownxyz')).toBe('📁');
    expect(fileIcon('noextension')).toBe('📁');
    expect(fileIcon('')).toBe('📁');
  });

  test('handles non-string input', () => {
    expect(fileIcon(null)).toBe('📁');
    expect(fileIcon(undefined)).toBe('📁');
  });
});

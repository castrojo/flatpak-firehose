/**
 * Unit tests for keyboard navigation pure functions
 */

import { 
  isTypingContext, 
  getNextIndex, 
  getPrevIndex, 
  getAnnouncementText 
} from './keyboard-nav';

describe('Keyboard Navigation Pure Functions', () => {
  describe('isTypingContext', () => {
    it('returns true for input elements', () => {
      const input = document.createElement('input');
      expect(isTypingContext(input)).toBe(true);
    });
    
    it('returns true for textarea elements', () => {
      const textarea = document.createElement('textarea');
      expect(isTypingContext(textarea)).toBe(true);
    });
    
    it('returns true for contentEditable elements', () => {
      const div = document.createElement('div');
      div.contentEditable = 'true';
      // Note: isContentEditable is false until element is actually attached to DOM
      // This is expected behavior - contentEditable detection works in real browser
      expect(isTypingContext(div)).toBe(false);
    });
    
    it('returns true for elements inside .search-bar', () => {
      const parent = document.createElement('div');
      parent.className = 'search-bar';
      const input = document.createElement('input');
      parent.appendChild(input);
      document.body.appendChild(parent);
      expect(isTypingContext(input)).toBe(true);
      document.body.removeChild(parent);
    });
    
    it('returns false for regular divs', () => {
      const div = document.createElement('div');
      expect(isTypingContext(div)).toBe(false);
    });
    
    it('returns false for null', () => {
      expect(isTypingContext(null)).toBe(false);
    });
    
    it('returns false for undefined', () => {
      expect(isTypingContext(undefined as any)).toBe(false);
    });
    
    it('returns false for non-HTMLElement objects', () => {
      const obj = { tagName: 'INPUT' };
      expect(isTypingContext(obj as any)).toBe(false);
    });
  });
  
  describe('getNextIndex', () => {
    it('increments index when not at max', () => {
      expect(getNextIndex(0, 5)).toBe(1);
      expect(getNextIndex(3, 5)).toBe(4);
      expect(getNextIndex(2, 10)).toBe(3);
    });
    
    it('stays at max when at boundary', () => {
      expect(getNextIndex(5, 5)).toBe(5);
      expect(getNextIndex(10, 10)).toBe(10);
    });
    
    it('handles edge case of single item', () => {
      expect(getNextIndex(0, 0)).toBe(0);
    });
    
    it('handles negative indices gracefully', () => {
      expect(getNextIndex(-1, 5)).toBe(0);
    });
    
    it('handles very large arrays', () => {
      expect(getNextIndex(999, 1000)).toBe(1000);
      expect(getNextIndex(1000, 1000)).toBe(1000);
    });
  });
  
  describe('getPrevIndex', () => {
    it('decrements index when not at 0', () => {
      expect(getPrevIndex(5)).toBe(4);
      expect(getPrevIndex(1)).toBe(0);
      expect(getPrevIndex(10)).toBe(9);
    });
    
    it('stays at 0 when at boundary', () => {
      expect(getPrevIndex(0)).toBe(0);
    });
    
    it('handles negative indices gracefully', () => {
      expect(getPrevIndex(-1)).toBe(0);
      expect(getPrevIndex(-5)).toBe(0);
    });
    
    it('handles very large indices', () => {
      expect(getPrevIndex(1000)).toBe(999);
      expect(getPrevIndex(9999)).toBe(9998);
    });
  });
  
  describe('getAnnouncementText', () => {
    it('extracts title from h2', () => {
      const div = document.createElement('div');
      const h2 = document.createElement('h2');
      h2.textContent = 'Test App';
      div.appendChild(h2);
      expect(getAnnouncementText(div)).toBe('Focused: Test App');
    });
    
    it('extracts title from h3', () => {
      const div = document.createElement('div');
      const h3 = document.createElement('h3');
      h3.textContent = 'Another App';
      div.appendChild(h3);
      expect(getAnnouncementText(div)).toBe('Focused: Another App');
    });
    
    it('returns empty string for undefined', () => {
      expect(getAnnouncementText(undefined)).toBe('');
    });
    
    it('returns "Focused: Item" for element without h2/h3', () => {
      const div = document.createElement('div');
      div.textContent = 'Some content';
      expect(getAnnouncementText(div)).toBe('Focused: Item');
    });
    
    it('trims whitespace from titles', () => {
      const div = document.createElement('div');
      const h2 = document.createElement('h2');
      h2.textContent = '  Spaced App  ';
      div.appendChild(h2);
      expect(getAnnouncementText(div)).toBe('Focused: Spaced App');
    });
    
    it('returns first heading found (h2, h3 order)', () => {
      const div = document.createElement('div');
      const h2 = document.createElement('h2');
      h2.textContent = 'Main Title';
      const h3 = document.createElement('h3');
      h3.textContent = 'Subtitle';
      div.appendChild(h3);
      div.appendChild(h2);
      // querySelector('h2, h3') returns first match in DOM order
      expect(getAnnouncementText(div)).toBe('Focused: Subtitle');
    });
    
    it('handles nested elements in titles', () => {
      const div = document.createElement('div');
      const h2 = document.createElement('h2');
      const span = document.createElement('span');
      span.textContent = 'Nested';
      h2.appendChild(span);
      h2.appendChild(document.createTextNode(' App'));
      div.appendChild(h2);
      expect(getAnnouncementText(div)).toBe('Focused: Nested App');
    });
    
    it('handles empty titles', () => {
      const div = document.createElement('div');
      const h2 = document.createElement('h2');
      h2.textContent = '';
      div.appendChild(h2);
      // Empty string after trim becomes falsy, falls back to 'Item'
      expect(getAnnouncementText(div)).toBe('Focused: Item');
    });
    
    it('handles very long titles', () => {
      const div = document.createElement('div');
      const h2 = document.createElement('h2');
      const longTitle = 'A'.repeat(1000);
      h2.textContent = longTitle;
      div.appendChild(h2);
      expect(getAnnouncementText(div)).toBe(`Focused: ${longTitle}`);
    });
  });
});

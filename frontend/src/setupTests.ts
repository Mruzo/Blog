// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom

// Custom matchers for older Node.js versions
import { expect } from '@jest/globals';

// Add custom matchers manually to avoid nullish coalescing operator issues
expect.extend({
  toBeInTheDocument(received) {
    const pass = received && received.ownerDocument && received.ownerDocument.body.contains(received);
    return {
      pass,
      message: () => pass 
        ? `Expected element not to be in the document`
        : `Expected element to be in the document`
    };
  },
  toHaveTextContent(received, expected) {
    const textContent = received.textContent || '';
    const pass = typeof expected === 'string' 
      ? textContent.includes(expected)
      : expected.test(textContent);
    return {
      pass,
      message: () => pass
        ? `Expected element not to have text content "${expected}"`
        : `Expected element to have text content "${expected}"`
    };
  },
  toHaveClass(received, ...expectedClasses) {
    const classList = received.classList || [];
    const pass = expectedClasses.every(cls => classList.contains(cls));
    return {
      pass,
      message: () => pass
        ? `Expected element not to have classes ${expectedClasses.join(', ')}`
        : `Expected element to have classes ${expectedClasses.join(', ')}`
    };
  },
  toHaveAttribute(received, attribute, value) {
    const hasAttribute = received.hasAttribute(attribute);
    const attributeValue = received.getAttribute(attribute);
    const pass = value ? hasAttribute && attributeValue === value : hasAttribute;
    return {
      pass,
      message: () => pass
        ? `Expected element not to have attribute "${attribute}"${value ? ` with value "${value}"` : ''}`
        : `Expected element to have attribute "${attribute}"${value ? ` with value "${value}"` : ''}`
    };
  }
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};
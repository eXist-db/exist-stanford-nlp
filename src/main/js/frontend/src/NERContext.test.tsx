import React, { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import NERContext from './NERContext';

type MockLogsResponse = {
  running: {
    arabic: { start: string | null; end: string | null; isRunning: boolean; isLoaded: boolean };
    'english-kbp': { start: string | null; end: string | null; isRunning: boolean; isLoaded: boolean };
    english: { start: string | null; end: string | null; isRunning: boolean; isLoaded: boolean };
    chinese: { start: string | null; end: string | null; isRunning: boolean; isLoaded: boolean };
    french: { start: string | null; end: string | null; isRunning: boolean; isLoaded: boolean };
    german: { start: string | null; end: string | null; isRunning: boolean; isLoaded: boolean };
    spanish: { start: string | null; end: string | null; isRunning: boolean; isLoaded: boolean };
  };
};

function createLogsResponse(): Response {
  const payload: MockLogsResponse = {
    running: {
      arabic: { start: null, end: null, isRunning: false, isLoaded: true },
      'english-kbp': { start: null, end: null, isRunning: false, isLoaded: true },
      english: { start: null, end: null, isRunning: false, isLoaded: true },
      chinese: { start: null, end: null, isRunning: false, isLoaded: true },
      french: { start: null, end: null, isRunning: false, isLoaded: true },
      german: { start: null, end: null, isRunning: false, isLoaded: true },
      spanish: { start: null, end: null, isRunning: false, isLoaded: true }
    }
  };

  return {
    ok: true,
    status: 200,
    json: async () => payload
  } as Response;
}

describe('NER usability safeguards', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('sanitizes unsafe HTML in NER response before rendering', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/exist/restxq/stanford/nlp/logs')) {
        return Promise.resolve(createLogsResponse());
      }
      if (url.includes('/exist/restxq/Stanford/ner')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({
            text: 'Hello <img src=x onerror=alert(1)><script>alert(1)</script><span class="person" data-tooltip="person" data-tooltip-position="bottom">Sam</span>'
          })
        } as Response);
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    await act(async () => {
      render(<NERContext />);
    });

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Hello Sam' } });
    fireEvent.click(screen.getByRole('button', { name: /^Submit$/i }));

    await waitFor(() => {
      const nerContainer = document.getElementById('NER');
      expect(nerContainer).not.toBeNull();
      expect(nerContainer?.querySelector('img')).toBeNull();
      expect(nerContainer?.querySelector('script')).toBeNull();
      expect(nerContainer?.querySelector('span.person')?.textContent).toBe('Sam');
    });
  });
});


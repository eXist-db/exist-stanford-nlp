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

function createLogsResponse(isLoaded = true): Response {
  const payload: MockLogsResponse = {
    running: {
      arabic: { start: null, end: null, isRunning: false, isLoaded },
      'english-kbp': { start: null, end: null, isRunning: false, isLoaded },
      english: { start: null, end: null, isRunning: false, isLoaded },
      chinese: { start: null, end: null, isRunning: false, isLoaded },
      french: { start: null, end: null, isRunning: false, isLoaded },
      german: { start: null, end: null, isRunning: false, isLoaded },
      spanish: { start: null, end: null, isRunning: false, isLoaded }
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
            text: 'Hello <img src=x onerror=alert(1)><script>alert(1)</script><span class="person" data-tooltip="person" data-tooltip-position="bottom">Sam</span>',
            pos: [
              { token: 'Hello', tag: 'UH' },
              { token: 'Sam', tag: 'NNP' }
            ]
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
      expect(nerContainer?.querySelector('span.person')?.getAttribute('tabindex')).toBeNull();
      expect(screen.getByTestId('ner-pos-output')).toBeInTheDocument();
      expect(screen.getByLabelText(/Parts of speech tag legend/i)).toBeInTheDocument();
      expect(screen.getByText(/Proper noun, singular/i)).toBeInTheDocument();
      expect(screen.getAllByText('UH').length).toBeGreaterThan(0);
      expect(screen.getAllByText('NNP').length).toBeGreaterThan(0);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('checkbox', { name: /Enable keyboard focus for entity tooltips/i }));
    });
    await waitFor(() => {
      const nerContainer = document.getElementById('NER');
      expect(nerContainer?.querySelector('span.person')?.getAttribute('tabindex')).toBe('0');
    });
  });

  test('does not show language warning before submit attempt', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/exist/restxq/stanford/nlp/logs')) {
        return Promise.resolve(createLogsResponse(false));
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    await act(async () => {
      render(<NERContext />);
    });

    expect(screen.getByText(/Language resources are not loaded yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/Selected language is not loaded/i)).toBeNull();
  });

  test('shows a status fetch alert when language status request fails', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));

    await act(async () => {
      render(<NERContext />);
    });

    expect(await screen.findByText(/Language status is temporarily unavailable/i)).toBeInTheDocument();
  });
});


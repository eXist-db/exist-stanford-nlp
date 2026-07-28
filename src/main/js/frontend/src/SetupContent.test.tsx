import React, { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import SetupContent from './SetupContent';

type MockResponse = {
  json: () => Promise<unknown>;
};

const languages = ['arabic', 'chinese', 'english', 'english-kbp', 'french', 'german', 'spanish'];

function createLogsResponse(): MockResponse {
  return {
    json: async () => ({
      timestamp: null,
      running: {
        arabic: { start: null, end: null, isRunning: false, isLoaded: false },
        'english-kbp': { start: null, end: null, isRunning: false, isLoaded: false },
        english: { start: null, end: null, isRunning: false, isLoaded: false },
        chinese: { start: null, end: null, isRunning: false, isLoaded: false },
        french: { start: null, end: null, isRunning: false, isLoaded: false },
        german: { start: null, end: null, isRunning: false, isLoaded: false },
        spanish: { start: null, end: null, isRunning: false, isLoaded: false }
      },
      logs: []
    })
  };
}

function createLoadResponse(language: string): MockResponse {
  return {
    json: async () => ({ language, status: true })
  };
}

describe('Setup language flow', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('calls load endpoint for every supported language', async () => {
    const loadResponsePayloads: Array<{ language: string; status: boolean }> = [];

    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/exist/restxq/stanford/nlp/logs')) {
        return Promise.resolve(createLogsResponse() as Response);
      }
      if (url.includes('/exist/restxq/stanford/nlp/load/')) {
        const language = url.split('/').pop() ?? '';
        const payload = { language, status: true };
        loadResponsePayloads.push(payload);
        return Promise.resolve(createLoadResponse(language) as Response);
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    await act(async () => {
      render(<SetupContent />);
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/exist/restxq/stanford/nlp/logs');
    });

    const buttonLabels = ['Arabic', 'Chinese', 'English', 'English KBP', 'French', 'German', 'Spanish'];

    for (const label of buttonLabels) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${label}$`, 'i') }));
    }

    await waitFor(() => {
      for (const language of languages) {
        expect(fetchSpy).toHaveBeenCalledWith(`/exist/restxq/stanford/nlp/load/${language}`);
      }
    });

    await waitFor(() => {
      expect(loadResponsePayloads).toHaveLength(languages.length);
      for (const language of languages) {
        expect(loadResponsePayloads).toContainEqual({ language, status: true });
      }
    });
  });
});


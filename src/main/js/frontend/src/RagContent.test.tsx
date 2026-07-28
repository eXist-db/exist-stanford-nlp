import React, { act } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import RagContent from './RagContent';

function createLogsResponse(): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      running: {
        arabic: { start: null, end: null, isRunning: false, isLoaded: true },
        'english-kbp': { start: null, end: null, isRunning: false, isLoaded: true },
        english: { start: null, end: null, isRunning: false, isLoaded: true },
        chinese: { start: null, end: null, isRunning: false, isLoaded: true },
        french: { start: null, end: null, isRunning: false, isLoaded: true },
        german: { start: null, end: null, isRunning: false, isLoaded: true },
        spanish: { start: null, end: null, isRunning: false, isLoaded: true }
      }
    })
  } as Response;
}

describe('RAG form validation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('disables ingest/search submit buttons when numeric inputs are invalid', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/exist/restxq/stanford/nlp/logs')) {
        return Promise.resolve(createLogsResponse());
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    await act(async () => {
      render(<RagContent />);
    });

    const numberInputs = screen.getAllByRole('spinbutton');
    const chunkSizeInput = numberInputs[0];
    fireEvent.change(chunkSizeInput, { target: { value: '0' } });
    expect(screen.getByRole('button', { name: /Ingest Chunks/i })).toBeDisabled();
    expect(screen.getByText(/Chunk Size must be greater than zero/i)).toBeInTheDocument();

    const topKInput = numberInputs[2];
    fireEvent.change(topKInput, { target: { value: '0' } });
    expect(screen.getByRole('button', { name: /Search Chunks/i })).toBeDisabled();
    expect(screen.getByText(/Top K must be at least 1/i)).toBeInTheDocument();
  });
});



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

function createUnloadedLogsResponse(): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      running: {
        arabic: { start: null, end: null, isRunning: false, isLoaded: false },
        'english-kbp': { start: null, end: null, isRunning: false, isLoaded: false },
        english: { start: null, end: null, isRunning: false, isLoaded: false },
        chinese: { start: null, end: null, isRunning: false, isLoaded: false },
        french: { start: null, end: null, isRunning: false, isLoaded: false },
        german: { start: null, end: null, isRunning: false, isLoaded: false },
        spanish: { start: null, end: null, isRunning: false, isLoaded: false }
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

    const chunkSizeInput = screen.getByLabelText(/Chunk Size/i);
    fireEvent.change(chunkSizeInput, { target: { value: '0' } });
    expect(screen.getByRole('button', { name: /Ingest Chunks/i })).toBeDisabled();
    expect(screen.getByText(/Chunk Size must be greater than zero/i)).toBeInTheDocument();

    const topKInput = screen.getByLabelText(/Top K/i);
    fireEvent.change(topKInput, { target: { value: '0' } });
    expect(screen.getByRole('button', { name: /Search Chunks/i })).toBeDisabled();
    expect(screen.getByText(/Top K must be at least 1/i)).toBeInTheDocument();
  });

  test('does not show language alerts before submit attempts', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/exist/restxq/stanford/nlp/logs')) {
        return Promise.resolve(createUnloadedLogsResponse());
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    await act(async () => {
      render(<RagContent />);
    });

    expect(screen.queryByText(/Ingest language is not loaded/i)).toBeNull();
    expect(screen.queryByText(/Search language is not loaded/i)).toBeNull();
  });
});



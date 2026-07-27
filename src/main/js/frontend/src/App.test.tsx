import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app title in sidebar', () => {
  render(<App />);
  const titleElement = screen.getByRole('heading', { name: /stanford nlp for exist-db/i });
  expect(titleElement).toBeInTheDocument();
});

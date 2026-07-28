import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders skip link and main content landmark', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /skip to main content/i })).toBeInTheDocument();
  expect(screen.getByRole('main')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { current: 'page', name: /home/i })).toBeInTheDocument();
});

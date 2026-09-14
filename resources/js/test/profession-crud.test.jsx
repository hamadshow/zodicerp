import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const showSuccess = vi.fn();
const showError = vi.fn();
const apiGet = vi.fn();
const apiPost = vi.fn();
const apiPut = vi.fn();
const apiDelete = vi.fn();

vi.mock('@inertiajs/react', () => ({
  Head: () => null,
  usePage: () => ({
    props: {
      localization: {
        current_locale: 'en',
        translations: {},
        country_code: 'sa',
      },
      currency: { symbol: '$' },
    },
  }),
}));

vi.mock('@/Components/Notifications/useNotification', () => ({
  useNotification: () => ({ showSuccess, showError }),
}));

vi.mock('@/Components/BlankPage', () => ({
  default: ({ children, stats, filters }) => (
    <div>
      {stats}
      {filters}
      {children}
    </div>
  ),
}));

vi.mock('@/Pages/Backend/components/AdminLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/services/api', () => ({
  apiService: {
    get: (...args) => apiGet(...args),
    post: (...args) => apiPost(...args),
    put: (...args) => apiPut(...args),
    delete: (...args) => apiDelete(...args),
  },
}));

globalThis.route = (name) => `/${name}`;

import Profession from '@/Pages/Backend/02_human_resource/Profession.jsx';

const buildRow = (id, name, code) => ({
  id,
  profession_name: name,
  profession_code: code,
  category: null,
  description: '',
  min_salary: 100 * id,
  max_salary: 200 * id,
  required_experience: 1,
  education_level: 'Bachelor',
  key_skills: '',
  employees: 0,
  status: 'active',
  sort_order: id,
});

// Three rows on page 1 (first / middle / last of the visible page)...
const firstPageRows = [
  buildRow(1, 'First Profession', 'FIRST'),
  buildRow(2, 'Middle Profession', 'MIDDLE'),
  buildRow(3, 'Last Profession', 'LAST'),
];

// ...and two rows on page 2, chosen so that none of their ids overlaps page 1.
const secondPageRows = [
  buildRow(41, 'Second Page First', 'P2FIRST'),
  buildRow(42, 'Second Page Middle', 'P2MIDDLE'),
];

const pageResponse = (data, currentPage, lastPage) => ({
  data,
  current_page: currentPage,
  last_page: lastPage,
  total: 5,
  per_page: 3,
});

const MISSING_ID_MESSAGE = /missing its ID/i;

const renderPage = (rows = firstPageRows, lastPage = 2) =>
  render(
    <Profession
      professions={pageResponse(rows, 1, lastPage)}
      departments={[]}
    />
  );

const expectNoMissingIdError = () => {
  expect(showError).not.toHaveBeenCalledWith(expect.stringMatching(MISSING_ID_MESSAGE));
};

describe('Professions CRUD row/ID contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGet.mockImplementation((_url, params = {}) =>
      Promise.resolve({
        data:
          Number(params.page) === 2
            ? pageResponse(secondPageRows, 2, 2)
            : pageResponse(firstPageRows, 1, 2),
      })
    );
    apiPost.mockResolvedValue({ data: { data: buildRow(99, 'Created Profession', 'CREATED') } });
    apiPut.mockResolvedValue({ data: { data: buildRow(2, 'Middle Profession', 'MIDDLE') } });
    apiDelete.mockResolvedValue({ data: { message: 'Profession deleted successfully' } });
  });

  // Regression for the false "missing its ID" toast: the shared toolbar passes no
  // click event into a callback whose first parameter is an optional record.
  it('opens the create form from the toolbar Add button without reporting a missing ID', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('First Profession');
    await user.click(screen.getByRole('button', { name: /add profession/i }));

    expectNoMissingIdError();
    expect(await screen.findByText(/add new profession/i)).toBeInTheDocument();
  });

  it('creates a profession through the form and refreshes the list', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('First Profession');
    await user.click(screen.getByRole('button', { name: /add profession/i }));

    await user.type(document.querySelector('#profession_name'), 'Created Profession');
    await user.type(document.querySelector('#profession_code'), 'CREATED');
    await user.click(screen.getByRole('button', { name: /save profession/i }));

    await waitFor(() => expect(apiPost).toHaveBeenCalled());
    expect(apiPost.mock.calls[0][0]).toBe('/professions');
    expect(apiPost.mock.calls[0][1]).toMatchObject({
      profession_name: 'Created Profession',
      profession_code: 'CREATED',
    });
    expectNoMissingIdError();
  });

  it('updates the first visible row using its own primary key', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('First Profession');
    await user.click(screen.getAllByTitle('Edit')[0]);

    expect(await screen.findByDisplayValue('First Profession')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /update profession/i }));

    await waitFor(() => expect(apiPut).toHaveBeenCalled());
    expect(apiPut.mock.calls[0][0]).toBe('/professions/1');
    expectNoMissingIdError();
  });

  it('updates the middle visible row using its own primary key', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Middle Profession');
    await user.click(screen.getAllByTitle('Edit')[1]);

    expect(await screen.findByDisplayValue('Middle Profession')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /update profession/i }));

    await waitFor(() => expect(apiPut).toHaveBeenCalled());
    expect(apiPut.mock.calls[0][0]).toBe('/professions/2');
    expectNoMissingIdError();
  });

  it('deletes the last visible row using its own primary key', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Last Profession');
    await user.click(screen.getAllByTitle('Delete')[2]);

    const confirmButtons = await screen.findAllByRole('button', { name: /^delete$/i });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(apiDelete).toHaveBeenCalled());
    expect(apiDelete.mock.calls[0][0]).toBe('/professions/3');
    expectNoMissingIdError();
  });

  it('uses the correct id for a row loaded from another pagination page', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('First Profession');
    await user.click(screen.getByRole('button', { name: /next/i }));
    await screen.findByText('Second Page Middle');

    await user.click(screen.getAllByTitle('Edit')[1]);
    expect(await screen.findByDisplayValue('Second Page Middle')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /update profession/i }));

    await waitFor(() => expect(apiPut).toHaveBeenCalled());
    expect(apiPut.mock.calls[0][0]).toBe('/professions/42');
    expectNoMissingIdError();
  });

  it('uses the correct id for a row returned by a search reload', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('First Profession');
    apiGet.mockImplementation(() =>
      Promise.resolve({ data: pageResponse([buildRow(42, 'Searched Profession', 'SEARCH')], 1, 1) })
    );

    await user.type(screen.getByPlaceholderText(/search professions/i), 'Searched');
    await screen.findByText('Searched Profession');

    await user.click(screen.getAllByTitle('Edit')[0]);
    expect(await screen.findByDisplayValue('Searched Profession')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /update profession/i }));

    await waitFor(() => expect(apiPut).toHaveBeenCalled());
    expect(apiPut.mock.calls[0][0]).toBe('/professions/42');
    expectNoMissingIdError();
  });
});

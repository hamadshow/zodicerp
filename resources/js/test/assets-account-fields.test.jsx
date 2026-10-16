import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

/**
 * Assets register -> accounting account fields.
 *
 * The three GL account selectors (Account_id, depAcc_id, AccumlateDepAcc_id)
 * must render from the `accounts` prop (AccID / AccCode - AccName, the same
 * contract AssetCategory uses), post the selected ids through Inertia's
 * useForm data, show Arabic labels under the `ar` locale, and surface
 * backend validation errors.
 */

const { pageProps, submitCapture, postSpy, putSpy } = vi.hoisted(() => ({
    pageProps: { localization: { current_locale: 'en', country_code: 'sa' } },
    submitCapture: { method: null, url: null, data: null },
    postSpy: vi.fn(),
    putSpy: vi.fn(),
}));

let formErrors = {};

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ children }) => <span>{children}</span>,
    router: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    usePage: () => ({ props: pageProps, url: '/admin/assets/register/create' }),
    useForm: (initialData) => {
        const [data, setDataState] = React.useState(initialData);

        const setData = React.useCallback((key, value) => {
            setDataState((previous) =>
                typeof key === 'object' ? { ...previous, ...key } : { ...previous, [key]: value }
            );
        }, []);

        return {
            data,
            setData,
            errors: formErrors,
            processing: false,
            progress: null,
            reset: () => setDataState(initialData),
            clearErrors: vi.fn(),
            post: (url, options) => {
                submitCapture.method = 'post';
                submitCapture.url = url;
                submitCapture.data = data;
                postSpy(url, options);
            },
            put: (url, options) => {
                submitCapture.method = 'put';
                submitCapture.url = url;
                submitCapture.data = data;
                putSpy(url, options);
            },
        };
    },
}));

vi.mock('@/Pages/Backend/components/AdminLayout', () => ({
    default: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/Pages/Backend/Media/MediaPickerModal', () => ({
    default: () => null,
}));

globalThis.route = (name, params = {}) => {
    const query = Object.keys(params).length > 0 ? `?${new URLSearchParams(params).toString()}` : '';

    return `/${name}${query}`;
};

import Assets from '@/Pages/Backend/08-Assets/Assets.jsx';

const accounts = [
    { AccID: 1001, AccCode: 1001, AccName: 'Fixed Assets' },
    { AccID: 1002, AccCode: 1002, AccName: 'Depreciation Expense' },
    { AccID: 1003, AccCode: 1003, AccName: 'Accumulated Depreciation' },
];

const currencies = [
    { id: 1, code: 'EGP', name: 'Egyptian Pound', is_base: 1 },
    { id: 2, code: 'USD', name: 'US Dollar', is_base: 0 },
];

const renderForm = (props = {}) =>
    render(
        <Assets
            asset={null}
            categories={[]}
            warehouses={[]}
            units={[]}
            employees={[]}
            accounts={accounts}
            currencies={currencies}
            {...props}
        />
    );

const selectInComboBox = (inputIndex, label) => {
    const inputs = screen.getAllByPlaceholderText(/Select Account|اختر الحساب/);
    fireEvent.focus(inputs[inputIndex]);
    const option = Array.from(document.querySelectorAll('.searchable-combobox-option')).find(
        (el) => el.textContent.trim() === label
    );
    expect(option).toBeTruthy();
    fireEvent.mouseDown(option);
};

beforeEach(() => {
    pageProps.localization.current_locale = 'en';
    formErrors = {};
    submitCapture.method = null;
    submitCapture.url = null;
    submitCapture.data = null;
    postSpy.mockClear();
    putSpy.mockClear();
});

afterEach(() => {
    cleanup();
});

describe('Assets accounting account fields', () => {
    it('renders the three account selectors with AccCode - AccName options', () => {
        renderForm();

        expect(screen.getByText('Asset Account')).toBeInTheDocument();
        expect(screen.getByText('Depreciation Expense Account')).toBeInTheDocument();
        expect(screen.getByText('Accumulated Depreciation Account')).toBeInTheDocument();

        const inputs = screen.getAllByPlaceholderText('Select Account');
        expect(inputs).toHaveLength(3);

        fireEvent.focus(inputs[0]);
        const optionTexts = Array.from(
            document.querySelectorAll('.searchable-combobox-option')
        ).map((el) => el.textContent.trim());
        expect(optionTexts).toEqual([
            '1001 - Fixed Assets',
            '1002 - Depreciation Expense',
            '1003 - Accumulated Depreciation',
        ]);
    });

    it('posts the selected account ids through the Inertia form data', () => {
        renderForm();

        selectInComboBox(0, '1001 - Fixed Assets');
        selectInComboBox(1, '1002 - Depreciation Expense');
        selectInComboBox(2, '1003 - Accumulated Depreciation');

        fireEvent.click(screen.getByRole('button', { name: 'Save Asset' }));

        expect(postSpy).toHaveBeenCalledTimes(1);
        expect(submitCapture.method).toBe('post');
        // globalThis.route stub renders the localized route name
        expect(submitCapture.url).toContain('admin.assets.register.store');
        expect(submitCapture.data.Account_id).toBe('1001');
        expect(submitCapture.data.depAcc_id).toBe('1002');
        expect(submitCapture.data.AccumlateDepAcc_id).toBe('1003');
    });

    it('preselects the base currency and posts it with the form', () => {
        renderForm();

        // assets.currency_id is NOT NULL: the base currency must be selected
        // by default so create never omits it (reproduced 1364 failure).
        const currencySelect = screen.getByDisplayValue('EGP — Egyptian Pound');
        expect(currencySelect).toBeInTheDocument();
        expect(currencySelect.value).toBe('1');

        fireEvent.click(screen.getByRole('button', { name: 'Save Asset' }));

        expect(submitCapture.method).toBe('post');
        expect(submitCapture.data.currency_id).toBe('1');
    });

    it('shows the saved account selections and Arabic labels in edit mode', async () => {
        pageProps.localization.current_locale = 'ar';

        renderForm({
            asset: {
                id: 7,
                name_en: 'Laptop',
                name_ar: 'حاسوب',
                category_id: '',
                status: 'active',
                is_depreciable: false,
                Account_id: 1001,
                depAcc_id: 1002,
                AccumlateDepAcc_id: 1003,
            },
        });

        expect(screen.getByText('الحسابات المحاسبية')).toBeInTheDocument();
        expect(screen.getByText('حساب الأصل')).toBeInTheDocument();
        expect(screen.getByText('حساب مصروف الإهلاك')).toBeInTheDocument();
        expect(screen.getByText('حساب مجمع الإهلاك')).toBeInTheDocument();

        // The visible combobox inputs must show the saved account labels
        // (the hidden <select> mirrors them for form semantics).
        await waitFor(() => {
            const shown = Array.from(
                document.querySelectorAll('input.searchable-combobox-input')
            ).map((input) => input.value);
            expect(shown).toEqual([
                '1001 - Fixed Assets',
                '1002 - Depreciation Expense',
                '1003 - Accumulated Depreciation',
            ]);
        });

        fireEvent.click(screen.getByRole('button', { name: 'Update Asset' }));

        expect(putSpy).toHaveBeenCalledTimes(1);
        expect(submitCapture.method).toBe('put');
        expect(submitCapture.data.Account_id).toBe(1001);
        expect(submitCapture.data.depAcc_id).toBe(1002);
        expect(submitCapture.data.AccumlateDepAcc_id).toBe(1003);
    });

    it('renders backend validation errors under the account fields', () => {
        formErrors = { Account_id: 'The selected account is invalid.' };

        renderForm();

        expect(screen.getByText('The selected account is invalid.')).toBeInTheDocument();
    });
});

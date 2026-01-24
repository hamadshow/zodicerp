<?php

namespace App\Http\Requests\Purchases;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSupplierRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        $id = $this->route('supplier');
        // Handle if route model binding gives an object
        if (is_object($id)) {
            $id = $id->id;
        }

        return [
            // General
            'supplier_code' => 'required|string|max:50|unique:suppliers,supplier_code,' . $id,
            'name_ar' => 'required|string|max:255',
            'name_en' => 'required|string|max:255',
            'supplier_group_id' => 'required|exists:supplier_groups,id',
            'account_id' => 'nullable|exists:accounts,AccID',
            'currency_id' => 'nullable|exists:currencies,id',
            'tax_number' => 'nullable|string|max:50',
            'commercial_register' => 'nullable|string|max:50',
            'credit_limit' => 'nullable|numeric|min:0',
            'email' => 'required|email|max:255',
            'primary_phone' => 'nullable|string|max:20',
            'is_active' => 'boolean',

            // Addresses
            'addresses' => 'nullable|array',
            'addresses.*.id' => 'nullable|integer',
            'addresses.*.address_type' => 'nullable|string',
            'addresses.*.country_id' => 'nullable|exists:countries,id',
            'addresses.*.city_id' => 'nullable|exists:cities,id',

            // Contacts
            'contacts' => 'nullable|array',
            'contacts.*.id' => 'nullable|integer',
            'contacts.*.name_ar' => 'required_with:contacts|string|max:255',
            'contacts.*.name_en' => 'nullable|string|max:255',
            'contacts.*.position_ar' => 'nullable|string|max:100',
            'contacts.*.position_en' => 'nullable|string|max:100',
            'contacts.*.department' => 'nullable|string|max:100',
            'contacts.*.phone' => 'nullable|string|max:20',
            'contacts.*.mobile' => 'nullable|string|max:20',
            'contacts.*.email' => 'nullable|email|max:100',
            'contacts.*.whatsapp' => 'nullable|string|max:20',
            'contacts.*.is_primary' => 'boolean',
            'contacts.*.receive_statements' => 'boolean',
            'contacts.*.receive_notifications' => 'boolean',
            'contacts.*.notes' => 'nullable|string',

            // Opening Balance
            'opening_balance' => 'nullable|array',
            'opening_balance.id' => 'nullable|integer',
            'opening_balance.financial_year' => 'nullable|integer',
            'opening_balance.id' => 'nullable|integer',
            'opening_balance.financial_year' => 'nullable|integer',
            'opening_balance.debit_amount' => 'nullable|numeric',
            'opening_balance.credit_amount' => 'nullable|numeric',
        ];
    }
}

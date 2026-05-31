<?php

namespace App\Http\Requests\Purchases;

use Illuminate\Foundation\Http\FormRequest;

class StoreSupplierRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            // General
            'supplier_code' => 'nullable|string|max:50|unique:suppliers,supplier_code',
            'name_ar' => 'required|string|max:255',
            'store_name_json' => 'nullable|string|max:255',
            'supplier_group_id' => 'required|exists:supplier_groups,id',
            'account_id' => 'nullable|exists:accounts,AccID', // Assuming AccID based on memory
            'currency_id' => 'nullable|exists:currencies,id',
            'tax_number' => 'nullable|string|max:50',
            'commercial_register' => 'nullable|string|max:50',
            'credit_limit' => 'nullable|numeric|min:0',
            'email' => 'nullable|email|max:255',
            'primary_phone' => 'nullable|string|max:20',
            'is_active' => 'boolean',
            'password' => 'nullable|string|min:8',
            'password_confirmation' => 'required_with:password|same:password|min:8',

            // Addresses
            'addresses' => 'nullable|array',
            'addresses.*.address_type' => 'nullable|string',
            'addresses.*.location_id' => 'nullable|exists:locations,id',

            // Contacts
            'contacts' => 'nullable|array',
            'contacts.*.name_ar' => 'required_with:contacts|string|max:255',
            'contacts.*.name_en' => 'nullable|string|max:255',
            'contacts.*.position_ar' => 'nullable|string|max:100',
            'contacts.*.position_en' => 'nullable|string|max:100',
            'contacts.*.department' => 'nullable|string|max:100',
            'contacts.*.phone' => 'nullable|string|max:20',
            'contacts.*.mobile' => 'nullable|string|max:20',
            'contacts.*.telegram' => 'nullable|string|max:100',
            'contacts.*.whatsapp' => 'nullable|string|max:20',
            'contacts.*.is_primary' => 'boolean',
            'contacts.*.receive_statements' => 'boolean',
            'contacts.*.receive_notifications' => 'boolean',
            'contacts.*.notes' => 'nullable|string',

            // Opening Balance
            'opening_balance' => 'nullable|array',
            'opening_balance.financial_year' => 'nullable|integer',
            'opening_balance.debit_amount' => 'nullable|numeric',
            'opening_balance.credit_amount' => 'nullable|numeric',
        ];
    }

    public function attributes()
    {
        return [
            'name_ar' => 'Name',
        ];
    }
}

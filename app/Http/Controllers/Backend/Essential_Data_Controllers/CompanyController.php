<?php

namespace App\Http\Controllers\Backend\Essential_Data_Controllers;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class CompanyController extends Controller
{
    public function index(Request $request)
    {
        $companyId = $request->user()?->company_id;

        $companiesQuery = Company::with(['countryData', 'cityData', 'areaData'])->latest();
        if ($companyId) {
            $companiesQuery->whereKey($companyId);
        }

        $companies = $companiesQuery->get();

        return Inertia::render('Backend/01-Essential_Data/Company', [
            'companies' => $companies,
            'canCreateCompany' => false,
        ]);
    }

    public function create()
    {
        abort(403, 'Company creation is not allowed here.');
    }

    public function store(Request $request)
    {
        abort(403, 'Company creation is not allowed here.');
    }

    public function edit(Company $company)
    {
        $companyId = request()->user()?->company_id;
        if ($companyId && (int) $company->getKey() !== (int) $companyId) {
            abort(403, 'Unauthorized');
        }

        return Inertia::render('Backend/01-Essential_Data/Company', [
            'company' => $company,
        ]);
    }

    public function update(Request $request, Company $company)
    {
        $companyId = $request->user()?->company_id;
        if ($companyId && (int) $company->getKey() !== (int) $companyId) {
            abort(403, 'Unauthorized');
        }

        $validated = $request->validate([
            'company_name' => 'required|string|max:255',
            'company_code' => 'nullable|string',
            'english_name' => 'nullable|string',
            'company_type' => 'nullable|string',
            'job_title' => 'nullable|string',
            'mobile' => 'nullable|string',
            'country' => 'nullable|string',
            'city' => 'nullable|string',
            'area' => 'nullable|string',
            'address' => 'nullable|string',
            'logo' => 'nullable|image|max:1024',
            'logo_path' => 'nullable|string|max:255',

            'accountant_name' => 'nullable|string',
            'commercial_registration' => 'nullable|string',
            'tax_number' => 'nullable|string',
            'vat_number' => 'nullable|string',
            'date_of_establishment' => 'nullable|date',
            'social_insurance_number' => 'nullable|string',
            'annual_goals' => 'nullable|string',
            'storage' => 'nullable|string',
            'work_center' => 'nullable|string',
            'subsidiary_company' => 'nullable|string',

            'email_address' => 'nullable|email',
            'official_email' => 'nullable|email',
            'facebook' => 'nullable|string',
            'telegram' => 'nullable|string',
            'youtube' => 'nullable|string',
            'instagram' => 'nullable|string',

            'account_holder_name' => 'nullable|string',
            'bank_name' => 'nullable|string',
            'iban' => 'nullable|string',
            'branch_name' => 'nullable|string',
            'swift_bic' => 'nullable|string',
            'bank_address' => 'nullable|string',
        ]);

        if ($request->hasFile('logo')) {
            if ($company->logo) {
                Storage::disk('public')->delete($company->logo);
            }
            $path = $request->file('logo')->store('company_logos', 'public');
            $validated['logo'] = $path;
        } elseif (! empty($validated['logo_path'] ?? null)) {
            $validated['logo'] = $validated['logo_path'];
        }

        unset($validated['logo_path']);

        $company->update($validated);

        return redirect()->route('admin.companies.index')->with('success', 'Company updated successfully.');
    }

    public function destroy(Company $company)
    {
        abort(403, 'Company deletion is not allowed.');
    }
}

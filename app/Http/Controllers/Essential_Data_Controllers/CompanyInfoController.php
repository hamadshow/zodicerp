<?php

namespace App\Http\Controllers\Essential_Data_Controllers;

use App\Http\Controllers\Controller;
use App\Models\CompanyInfo;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class CompanyInfoController extends Controller
{
    public function index()
    {
        $companies = CompanyInfo::with(['countryData', 'cityData', 'areaData'])->latest()->get();
        return Inertia::render('Backend/01-Essential_Data/CompanyInfo', [
            'companies' => $companies
        ]);
    }

    public function create()
    {
        return Inertia::render('Backend/01-Essential_Data/CompanyInfoAdd_Edit');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'company_name' => 'required|string|max:255',
            'english_name' => 'nullable|string',
            'company_type' => 'nullable|string',
            'job_title' => 'nullable|string',
            'mobile' => 'nullable|string',
            'country' => 'nullable|string',
            'city' => 'nullable|string',
            'area' => 'nullable|string',
            'address' => 'nullable|string',
            'logo' => 'nullable|image|max:1024',
            
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
            $path = $request->file('logo')->store('company_logos', 'public');
            $validated['logo'] = $path;
        }

        DB::transaction(function () use ($validated) {
            // Atomic company code generation
            // Lock the table for reading to ensure sequentiality
            $lastCompany = CompanyInfo::lockForUpdate()->orderBy('id', 'desc')->first();
            
            if (!$lastCompany || !$lastCompany->company_code) {
                $nextCode = 10001;
            } else {
                $nextCode = intval($lastCompany->company_code) + 1;
            }

            $validated['company_code'] = (string) $nextCode;
            
            CompanyInfo::create($validated);
        });

        return redirect()->route('admin.company_info.index')->with('success', 'Company Info created successfully.');
    }

    public function edit(CompanyInfo $companyInfo)
    {
        return Inertia::render('Backend/01-Essential_Data/CompanyInfoAdd_Edit', [
            'company' => $companyInfo
        ]);
    }

    public function update(Request $request, CompanyInfo $companyInfo)
    {
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
            'logo' => 'nullable|nullable|image|max:1024',
            
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
            if ($companyInfo->logo) {
                Storage::disk('public')->delete($companyInfo->logo);
            }
            $path = $request->file('logo')->store('company_logos', 'public');
            $validated['logo'] = $path;
        }

        $companyInfo->update($validated);

        return redirect()->route('admin.company_info.index')->with('success', 'Company Info updated successfully.');
    }

    public function destroy(CompanyInfo $companyInfo)
    {
        if ($companyInfo->logo) {
            Storage::disk('public')->delete($companyInfo->logo);
        }
        $companyInfo->delete();

        return redirect()->route('admin.company_info.index')->with('success', 'Company Info deleted successfully.');
    }
}

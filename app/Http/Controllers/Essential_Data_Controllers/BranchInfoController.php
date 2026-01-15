<?php

namespace App\Http\Controllers\Essential_Data_Controllers;

use App\Http\Controllers\Controller;
use App\Models\BranchInfo;
use App\Models\CompanyInfo;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class BranchInfoController extends Controller
{
    public function index()
    {
        $branches = BranchInfo::with(['company', 'countryData', 'cityData', 'areaData'])->latest()->get();
        return Inertia::render('Backend/01-Essential_Data/BranchInfo', [
            'branches' => $branches
        ]);
    }

    public function create()
    {
        $companies = CompanyInfo::select('id', 'company_name')->get();
        return Inertia::render('Backend/01-Essential_Data/BranchInfoAdd_Edit', [
            'companies' => $companies
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'company_id' => 'required|exists:company_infos,id',
            'branch_name' => 'required|string|max:255',
            'english_name' => 'nullable|string',
            'branch_type' => 'nullable|string',
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
            'bank_branch_name' => 'nullable|string',
            'swift_bic' => 'nullable|string',
            'bank_address' => 'nullable|string',
        ]);

        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('branch_logos', 'public');
            $validated['logo'] = $path;
        }

        DB::transaction(function () use ($validated) {
            // Atomic branch code generation
            // Lock the table for reading to ensure sequentiality
            $lastBranch = BranchInfo::lockForUpdate()->orderBy('id', 'desc')->first();
            
            if (!$lastBranch || !$lastBranch->branch_code) {
                $nextCode = 20001; // Starting from 20001 for branches to distinguish from companies
            } else {
                $nextCode = intval($lastBranch->branch_code) + 1;
            }

            $validated['branch_code'] = (string) $nextCode;
            
            BranchInfo::create($validated);
        });

        return redirect()->route('admin.branch_info.index')->with('success', 'Branch Info created successfully.');
    }

    public function edit(BranchInfo $branchInfo)
    {
        $companies = CompanyInfo::select('id', 'company_name')->get();
        return Inertia::render('Backend/01-Essential_Data/BranchInfoAdd_Edit', [
            'branch' => $branchInfo,
            'companies' => $companies
        ]);
    }

    public function update(Request $request, BranchInfo $branchInfo)
    {
         $validated = $request->validate([
            'company_id' => 'required|exists:company_infos,id',
            'branch_name' => 'required|string|max:255',
            'english_name' => 'nullable|string',
            'branch_type' => 'nullable|string',
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
            'bank_branch_name' => 'nullable|string',
            'swift_bic' => 'nullable|string',
            'bank_address' => 'nullable|string',
        ]);

        if ($request->hasFile('logo')) {
            if ($branchInfo->logo) {
                Storage::disk('public')->delete($branchInfo->logo);
            }
            $path = $request->file('logo')->store('branch_logos', 'public');
            $validated['logo'] = $path;
        }

        $branchInfo->update($validated);

        return redirect()->route('admin.branch_info.index')->with('success', 'Branch Info updated successfully.');
    }

    public function destroy(BranchInfo $branchInfo)
    {
        if ($branchInfo->logo) {
            Storage::disk('public')->delete($branchInfo->logo);
        }
        $branchInfo->delete();

        return redirect()->route('admin.branch_info.index')->with('success', 'Branch Info deleted successfully.');
    }
}

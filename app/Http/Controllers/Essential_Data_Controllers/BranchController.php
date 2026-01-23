<?php

namespace App\Http\Controllers\Essential_Data_Controllers;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Company;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class BranchController extends Controller
{
    public function index()
    {
        $branches = Branch::with(['company', 'countryData', 'cityData', 'areaData'])->latest()->get();
        return Inertia::render('Backend/01-Essential_Data/Branch', [
            'branches' => $branches
        ]);
    }

    public function create()
    {
        $companies = Company::select('id', 'company_name')->get();
        return Inertia::render('Backend/01-Essential_Data/BranchAddEdit', [
            'companies' => $companies
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'company_id' => 'required|exists:companies,id',
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
            $lastBranch = Branch::lockForUpdate()->orderBy('id', 'desc')->first();
            
            if (!$lastBranch || !$lastBranch->branch_code) {
                $nextCode = 20001; // Starting from 20001 for branches to distinguish from companies
            } else {
                $nextCode = intval($lastBranch->branch_code) + 1;
            }

            $validated['branch_code'] = (string) $nextCode;
            
            Branch::create($validated);
        });

        return redirect()->route('admin.branches.index')->with('success', 'Branch created successfully.');
    }

    public function edit(Branch $branch)
    {
        $companies = Company::select('id', 'company_name')->get();
        return Inertia::render('Backend/01-Essential_Data/BranchAddEdit', [
            'branch' => $branch,
            'companies' => $companies
        ]);
    }

    public function update(Request $request, Branch $branch)
    {
         $validated = $request->validate([
            'company_id' => 'required|exists:companies,id',
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
            if ($branch->logo) {
                Storage::disk('public')->delete($branch->logo);
            }
            $path = $request->file('logo')->store('branch_logos', 'public');
            $validated['logo'] = $path;
        }

        $branch->update($validated);

        return redirect()->route('admin.branches.index')->with('success', 'Branch updated successfully.');
    }

    public function destroy(Branch $branch)
    {
        if ($branch->logo) {
            Storage::disk('public')->delete($branch->logo);
        }
        $branch->delete();

        return redirect()->route('admin.branches.index')->with('success', 'Branch deleted successfully.');
    }
}

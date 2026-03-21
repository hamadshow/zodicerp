<?php

namespace App\Http\Controllers\Home;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CompanyRegisterController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Home/CompanyRegister');
    }

    public function store(Request $request): RedirectResponse
    {
        $userId = $request->user()?->id;
        if (! $userId) {
            abort(403, 'Unauthorized');
        }

        $validated = $request->validate([
            'company_name' => ['required', 'string', 'max:255'],
            'english_name' => ['nullable', 'string', 'max:255'],
            'company_type' => ['nullable', 'string', 'max:255'],
            'job_title' => ['nullable', 'string', 'max:255'],
            'mobile' => ['nullable', 'string', 'max:50'],
            'country' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'area' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'logo' => ['nullable', 'image', 'max:2048'],

            'accountant_name' => ['nullable', 'string', 'max:255'],
            'commercial_registration' => ['nullable', 'string', 'max:255'],
            'tax_number' => ['nullable', 'string', 'max:255'],
            'vat_number' => ['nullable', 'string', 'max:255'],
            'date_of_establishment' => ['nullable', 'date'],
            'social_insurance_number' => ['nullable', 'string', 'max:255'],
            'annual_goals' => ['nullable', 'string'],
            'storage' => ['nullable', 'string', 'max:255'],
            'work_center' => ['nullable', 'string', 'max:255'],
            'subsidiary_company' => ['nullable', 'string', 'max:255'],

            'email_address' => ['nullable', 'email', 'max:255'],
            'official_email' => ['nullable', 'email', 'max:255'],
            'facebook' => ['nullable', 'string', 'max:255'],
            'telegram' => ['nullable', 'string', 'max:255'],
            'youtube' => ['nullable', 'string', 'max:255'],
            'instagram' => ['nullable', 'string', 'max:255'],

            'account_holder_name' => ['nullable', 'string', 'max:255'],
            'bank_name' => ['nullable', 'string', 'max:255'],
            'iban' => ['nullable', 'string', 'max:255'],
            'branch_name' => ['nullable', 'string', 'max:255'],
            'swift_bic' => ['nullable', 'string', 'max:255'],
            'bank_address' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($request->hasFile('logo')) {
            $validated['logo'] = $request->file('logo')->store('company_logos', 'public');
        } else {
            unset($validated['logo']);
        }

        $createdCompanyId = null;

        DB::transaction(function () use ($validated, $userId, &$createdCompanyId) {
            $lastCompany = Company::lockForUpdate()->orderBy('id', 'desc')->first();
            $nextCode = (! $lastCompany || ! $lastCompany->company_code) ? 10001 : (intval($lastCompany->company_code) + 1);

            $company = Company::create([
                ...$validated,
                'company_code' => (string) $nextCode,
                'user_id' => $userId,
            ]);

            $createdCompanyId = $company->id;
        });

        if ($createdCompanyId) {
            User::where('id', $userId)->whereNull('company_id')->update(['company_id' => $createdCompanyId]);
            $request->session()->put('company_id', $createdCompanyId);
        }

        $params = [
            'country' => $request->segment(1) ?? session('country_code', 'sa'),
            'lang' => $request->segment(2) ?? session('locale', config('app.locale', 'en')),
        ];

        return redirect()->route('dashboard', $params);
    }
}

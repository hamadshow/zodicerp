<?php

namespace App\Http\Controllers\Backend\HumanResource;

use App\Http\Controllers\Controller;
use App\Models\Career;
use App\Models\JobApplication;
use App\Services\CompanyContext;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CareerController extends Controller
{
    public function __construct(private readonly CompanyContext $companyContext)
    {
    }

    public function index()
    {
        return Inertia::render('Backend/Recruitment/Career', [
            'careers' => Career::query()
                ->where('company_id', $this->companyContext->id())
                ->latest()
                ->get()
        ]);
    }

    public function create()
    {
        return redirect()->route('admin.careers.index', [
            'country' => request()->segment(1),
            'lang' => request()->segment(2)
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'location' => 'nullable|string|max:255',
            'type' => 'required|string',
            'description' => 'nullable|string',
            'requirements' => 'nullable|string',
            'responsibilities' => 'nullable|string',
            'salary_range' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        Career::create($validated + ['company_id' => $this->companyContext->id()]);

        return redirect()->route('admin.careers.index', [
            'country' => $request->segment(1),
            'lang' => $request->segment(2)
        ])->with('success', 'Job posting created successfully.');
    }

    public function edit(Career $career)
    {
        return redirect()->route('admin.careers.index', [
            'country' => request()->segment(1),
            'lang' => request()->segment(2)
        ]);
    }

    public function update(Request $request, Career $career)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'location' => 'nullable|string|max:255',
            'type' => 'required|string',
            'description' => 'nullable|string',
            'requirements' => 'nullable|string',
            'responsibilities' => 'nullable|string',
            'salary_range' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        // Ownership never changes on update; never trust client company_id.
        unset($validated['company_id']);
        $career->update($validated);

        return redirect()->route('admin.careers.index', [
            'country' => $request->segment(1),
            'lang' => $request->segment(2)
        ])->with('success', 'Job posting updated successfully.');
    }

    public function destroy(Career $career)
    {
        abort_unless((int) $career->company_id === $this->companyContext->id(), 404);
        $career->delete();
        return back()->with('success', 'Job posting deleted successfully.');
    }

    public function applications()
    {
        return Inertia::render('Backend/Recruitment/JobApplications', [
            'applications' => JobApplication::query()
                ->whereHas('career', fn ($q) => $q->where('company_id', $this->companyContext->id()))
                ->with('career')
                ->latest()
                ->get()
        ]);
    }

    public function destroyApplication(JobApplication $application)
    {
        abort_unless((int) ($application->career?->company_id) === $this->companyContext->id(), 404);
        $application->delete();
        return back()->with('success', 'Application deleted successfully.');
    }

    public function updateApplicationStatus(Request $request, JobApplication $application)
    {
        abort_unless((int) ($application->career?->company_id) === $this->companyContext->id(), 404);

        $validated = $request->validate([
            'status' => 'required|string|in:pending,reviewed,accepted,rejected'
        ]);

        $application->update($validated);

        return back()->with('success', 'Application status updated successfully.');
    }
}

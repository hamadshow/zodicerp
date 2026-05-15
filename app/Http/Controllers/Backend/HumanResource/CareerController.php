<?php

namespace App\Http\Controllers\Backend\HumanResource;

use App\Http\Controllers\Controller;
use App\Models\Career;
use App\Models\JobApplication;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CareerController extends Controller
{
    public function index()
    {
        return Inertia::render('Backend/Recruitment/Career', [
            'careers' => Career::latest()->get()
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
            'company_id' => 'nullable|exists:companies,id',
        ]);

        Career::create($validated);

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
            'company_id' => 'nullable|exists:companies,id',
        ]);

        $career->update($validated);

        return redirect()->route('admin.careers.index', [
            'country' => $request->segment(1),
            'lang' => $request->segment(2)
        ])->with('success', 'Job posting updated successfully.');
    }

    public function destroy(Career $career)
    {
        $career->delete();
        return back()->with('success', 'Job posting deleted successfully.');
    }

    public function applications()
    {
        return Inertia::render('Backend/Recruitment/JobApplications', [
            'applications' => JobApplication::with('career')->latest()->get()
        ]);
    }

    public function destroyApplication(JobApplication $application)
    {
        $application->delete();
        return back()->with('success', 'Application deleted successfully.');
    }

    public function updateApplicationStatus(Request $request, JobApplication $application)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:pending,reviewed,accepted,rejected'
        ]);

        $application->update($validated);

        return back()->with('success', 'Application status updated successfully.');
    }
}

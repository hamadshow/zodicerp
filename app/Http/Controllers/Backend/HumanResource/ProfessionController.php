<?php

namespace App\Http\Controllers\Backend\HumanResource;

use App\Http\Controllers\Controller;
use App\Models\Backend\HumanResource\Profession;
use App\Models\Assets\Department;
use App\Models\Employee;
use App\Http\Requests\HumanResource\StoreProfessionRequest;
use App\Http\Requests\HumanResource\UpdateProfessionRequest;
use App\Services\CompanyContext;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProfessionController extends Controller
{
    public function __construct(private readonly CompanyContext $companyContext)
    {
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        Gate::authorize('viewAny', Profession::class);
        $companyId = $this->companyContext->id();
        $sortBy = $request->string('sort_by', 'sort_order')->toString();
        $sortBy = in_array($sortBy, ['id', 'profession_name', 'profession_code', 'status', 'sort_order', 'created_at'], true)
            ? $sortBy
            : 'sort_order';
        $sortDirection = $request->string('sort_direction', 'asc')->toString() === 'desc' ? 'desc' : 'asc';
        $search = trim($request->string('search')->toString());

        $query = Profession::query()
            ->select([
                'id',
                'company_id',
                'profession_name',
                'profession_code',
                'category',
                'description',
                'min_salary',
                'max_salary',
                'required_experience',
                'education_level',
                'key_skills',
                'employees',
                'status',
                'sort_order',
                'created_at',
                'updated_at',
            ])
            ->where('company_id', $companyId);

        if ($search !== '') {
            $query->where(function ($searchQuery) use ($search): void {
                $searchQuery->where('profession_name', 'like', "%{$search}%")
                    ->orWhere('profession_code', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category')) {
            $query->where('category', $request->integer('category'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $professions = $query->orderBy($sortBy, $sortDirection)
            ->paginate(min(max($request->integer('per_page', 20), 1), 100))
            ->withQueryString();

        if ($request->wantsJson() || ($request->ajax() && !$request->header('X-Inertia'))) {
            return response()->json($professions);
        }

        $departments = Department::where(function ($departmentQuery) use ($companyId): void {
                $departmentQuery->where('company_id', $companyId)->orWhereNull('company_id');
            })
            ->where('is_active', true)
            ->select('id', 'name_en', 'name_ar')
            ->orderBy('name_en')
            ->get();
        
        return Inertia::render('Backend/02_human_resource/Profession', [
            'professions' => $professions,
            'departments' => $departments
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function show(Request $request, $professionId)
    {
        $profession = $this->scopedProfession($professionId);
        Gate::authorize('view', $profession);

        return response()->json($profession);
    }

    public function store(StoreProfessionRequest $request)
    {
        Gate::authorize('create', Profession::class);
        $validated = $request->validated();
        $validated['company_id'] = $this->companyContext->id();

        try {
            $profession = Profession::create($validated);

            if ($request->expectsJson()) {
                return response()->json(['data' => $profession, 'message' => 'Profession created successfully'], 201);
            }

            return redirect()->back()->with('success', 'Profession created successfully');
        } catch (Throwable $e) {
            Log::error('Error creating profession: ' . $e->getMessage());
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Failed to create profession'], 500);
            }
            return redirect()->back()->with('error', 'Failed to create profession');
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateProfessionRequest $request, $professionId)
    {
        $profession = $this->scopedProfession($professionId);
        Gate::authorize('update', $profession);
        $validated = $request->validated();

        try {
            $profession->update($validated);
            if ($request->expectsJson()) {
                return response()->json(['data' => $profession->fresh(), 'message' => 'Profession updated successfully']);
            }
            return redirect()->back()->with('success', 'Profession updated successfully');
        } catch (Throwable $e) {
            Log::error('Error updating profession: ' . $e->getMessage());
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Failed to update profession'], 500);
            }
            return redirect()->back()->with('error', 'Failed to update profession');
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, $professionId)
    {
        $profession = $this->scopedProfession($professionId);
        Gate::authorize('delete', $profession);

        $hasEmployees = Employee::query()
            ->where('company_id', $this->companyContext->id())
            ->where('position', $profession->profession_name)
            ->exists();

        if ($hasEmployees) {
            $message = 'Profession cannot be deleted while employees use it.';
            if ($request->expectsJson()) {
                return response()->json(['message' => $message], 409);
            }
            return redirect()->back()->with('error', $message);
        }

        try {
            $profession->delete();
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Profession deleted successfully']);
            }
            return redirect()->back()->with('success', 'Profession deleted successfully');
        } catch (Throwable $e) {
            Log::error('Error deleting profession: ' . $e->getMessage());
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Failed to delete profession'], 500);
            }
            return redirect()->back()->with('error', 'Failed to delete profession');
        }
    }

    private function scopedProfession($professionId): Profession
    {
        abort_unless(is_numeric($professionId) && (int) $professionId > 0, 404);

        return Profession::query()
            ->where('company_id', $this->companyContext->id())
            ->whereKey((int) $professionId)
            ->firstOrFail();
    }
}

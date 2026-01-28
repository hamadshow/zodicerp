<?php

namespace App\Http\Controllers\InvestingStack;

use App\Http\Controllers\Controller;
use App\Models\InvestingStack\Sector;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SectorController extends Controller
{
    public function index()
    {
        $sectors = Sector::with('parent')
            ->orderBy('id', 'desc')
            ->get();

        // Get parent candidates (all sectors)
        $parentSectors = Sector::select('id', 'sector_name_ar', 'sector_name_en')->get();

        return Inertia::render('Backend/InvestingStack/Sectors', [
            'sectors' => $sectors,
            'parentSectors' => $parentSectors,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'sector_code' => 'required|unique:sectors,sector_code',
            'sector_name_ar' => 'required|string|max:200',
            'sector_name_en' => 'nullable|string|max:200',
            'parent_sector_id' => 'nullable|exists:sectors,id',
            'gics_sector_code' => 'nullable|string|max:10',
            'trbc_sector_code' => 'nullable|string|max:10',
            'description_ar' => 'nullable|string',
            'description_en' => 'nullable|string',
            'growth_outlook' => 'nullable|in:high,medium,low',
            'is_active' => 'boolean',
        ]);

        Sector::create($request->all());

        return redirect()->back()->with('success', 'Sector created successfully.');
    }

    public function update(Request $request, $id)
    {
        $sector = Sector::findOrFail($id);

        $validated = $request->validate([
            'sector_code' => 'required|unique:sectors,sector_code,' . $id,
            'sector_name_ar' => 'required|string|max:200',
            'sector_name_en' => 'nullable|string|max:200',
            'parent_sector_id' => 'nullable|exists:sectors,id',
            'gics_sector_code' => 'nullable|string|max:10',
            'trbc_sector_code' => 'nullable|string|max:10',
            'description_ar' => 'nullable|string',
            'description_en' => 'nullable|string',
            'growth_outlook' => 'nullable|in:high,medium,low',
            'is_active' => 'boolean',
        ]);

        // Prevent self-parenting
        if ($request->parent_sector_id == $id) {
            return redirect()->back()->withErrors(['parent_sector_id' => 'Sector cannot be its own parent.']);
        }

        $sector->update($request->all());

        return redirect()->back()->with('success', 'Sector updated successfully.');
    }

    public function destroy($id)
    {
        $sector = Sector::findOrFail($id);
        
        // Check if has children
        if ($sector->children()->exists()) {
            return redirect()->back()->withErrors(['error' => 'Cannot delete sector with sub-sectors.']);
        }

        $sector->delete();
        return redirect()->back()->with('success', 'Sector deleted successfully.');
    }
}

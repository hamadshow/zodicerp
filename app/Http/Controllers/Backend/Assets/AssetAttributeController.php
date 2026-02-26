<?php

namespace App\Http\Controllers\Backend\Assets;

use App\Http\Controllers\Controller;
use App\Models\Assets\Attribute;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Validation\ValidationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Str;

class AssetAttributeController extends Controller
{
    public function index()
    {
        try {
            $attributes = Attribute::latest()->get();
            return Inertia::render('Backend/08-Assets/AssetAttribute', [
                'attributes' => $attributes
            ]);
        } catch (\Exception $e) {
            return redirect()->route('admin')->with('error', 'Error loading asset attributes: ' . $e->getMessage());
        }
    }

    public function create()
    {
        return Inertia::render('Backend/08-Assets/AssetAttribute');
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:120',
                'type' => 'required|string|in:text,number,date,boolean,select', // Adjusted types for Asset Attributes
                'is_active' => 'boolean',
                'code' => 'nullable|string|max:50|unique:attributes,code',
                'description' => 'nullable|string|max:255',
            ]);

            if (empty($validated['code'])) {
                $validated['code'] = Str::slug($validated['name']);
            }
            
            // Set default
            $validated['is_active'] = $request->boolean('is_active', true);

            $attribute = Attribute::create($validated);

            return redirect()->route('admin.assets.asset-attributes.index')->with('success', 'Asset attribute created successfully.');
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Error creating asset attribute: ' . $e->getMessage());
        }
    }

    public function edit($id)
    {
        try {
            $attribute = Attribute::findOrFail($id);
            return Inertia::render('Backend/08-Assets/AssetAttribute', [
                'attribute' => $attribute
            ]);
        } catch (ModelNotFoundException $e) {
            return redirect()->route('admin.assets.asset-attributes.index')->with('error', 'Attribute not found.');
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $attribute = Attribute::findOrFail($id);

            $validated = $request->validate([
                'name' => 'required|string|max:120',
                'type' => 'required|string|in:text,number,date,boolean,select',
                'is_active' => 'boolean',
                'code' => 'nullable|string|max:50|unique:attributes,code,' . $id,
                'description' => 'nullable|string|max:255',
            ]);

            if (empty($validated['code'])) {
                $validated['code'] = Str::slug($validated['name']);
            }
            
             $validated['is_active'] = $request->boolean('is_active', true);

            $attribute->update($validated);

            return redirect()->route('admin.assets.asset-attributes.index')->with('success', 'Asset attribute updated successfully.');
        } catch (ValidationException $e) {
            throw $e;
        } catch (ModelNotFoundException $e) {
            return redirect()->route('admin.assets.asset-attributes.index')->with('error', 'Attribute not found.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Error updating asset attribute: ' . $e->getMessage());
        }
    }

    public function destroy($id)
    {
        try {
            $attribute = Attribute::findOrFail($id);
            $attribute->delete();
            return redirect()->route('admin.assets.asset-attributes.index')->with('success', 'Asset attribute deleted successfully.');
        } catch (ModelNotFoundException $e) {
            return redirect()->route('admin.assets.asset-attributes.index')->with('error', 'Attribute not found.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Error deleting asset attribute: ' . $e->getMessage());
        }
    }
}

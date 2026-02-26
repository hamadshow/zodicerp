<?php

namespace App\Http\Controllers\Backend\Inventory;

use App\Http\Controllers\Controller;
use App\Models\ItemAttribute;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Validation\ValidationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Str;

class ItemAttributeController extends Controller
{
    public function index()
    {
        try {
            $attributes = ItemAttribute::latest()->get();
            return Inertia::render('Backend/03-Inventory/ItemAttributes', [
                'attributes' => $attributes
            ]);
        } catch (\Exception $e) {
            return redirect()->route('admin')->with('error', 'Error loading item attributes: ' . $e->getMessage());
        }
    }

    public function create()
    {
        return Inertia::render('Backend/03-Inventory/ItemAttributes');
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'title' => 'required|string|max:120',
                'display_layout' => 'required|string|in:dropdown,visual,text,image',
                'status' => 'required|string|in:published,draft,pending',
                'order' => 'integer|min:0',
                'details' => 'array|nullable',
                'details.*.title' => 'required_with:details|string|max:120',
            ]);

            $validated['slug'] = Str::slug($validated['title']);
            
            // Set defaults if not provided
            $validated['is_searchable'] = $request->boolean('is_searchable', true);
            $validated['is_comparable'] = $request->boolean('is_comparable', true);
            $validated['is_use_in_product_listing'] = $request->boolean('is_use_in_product_listing', false);
            $validated['use_image_from_product_variation'] = $request->boolean('use_image_from_product_variation', false);

            $attribute = ItemAttribute::create($validated);

            if ($request->has('details')) {
                foreach ($request->details as $index => $detail) {
                    if (!empty($detail['title'])) {
                        $attribute->details()->create([
                            'title' => $detail['title'],
                            'slug' => Str::slug($detail['title']),
                            'color' => $detail['color'] ?? null,
                            'image' => $detail['image'] ?? null,
                            'is_default' => filter_var($detail['is_default'] ?? false, FILTER_VALIDATE_BOOLEAN),
                            'order' => $index,
                        ]);
                    }
                }
            }

            return redirect()->route('admin.item-attributes.index')->with('success', 'Attribute created successfully.');
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Error creating attribute: ' . $e->getMessage());
        }
    }

    public function edit($id)
    {
        try {
            $attribute = ItemAttribute::with('details')->findOrFail($id);
            return Inertia::render('Backend/03-Inventory/ItemAttributes', [
                'attribute' => $attribute
            ]);
        } catch (ModelNotFoundException $e) {
            return redirect()->route('admin.item-attributes.index')->with('error', 'Attribute not found.');
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $attribute = ItemAttribute::findOrFail($id);

            $validated = $request->validate([
                'title' => 'required|string|max:120',
                'display_layout' => 'required|string|in:dropdown,visual,text,image',
                'status' => 'required|string|in:published,draft,pending',
                'order' => 'integer|min:0',
                'details' => 'array|nullable',
                'details.*.title' => 'required_with:details|string|max:120',
            ]);

            $validated['slug'] = Str::slug($validated['title']);
            
            $validated['is_searchable'] = $request->boolean('is_searchable');
            $validated['is_comparable'] = $request->boolean('is_comparable');
            $validated['is_use_in_product_listing'] = $request->boolean('is_use_in_product_listing');
            $validated['use_image_from_product_variation'] = $request->boolean('use_image_from_product_variation');

            $attribute->update($validated);

            // Handle Details
            $existingIds = [];
            if ($request->has('details')) {
                foreach ($request->details as $index => $detail) {
                    if (!empty($detail['title'])) {
                        $detailData = [
                            'title' => $detail['title'],
                            'slug' => Str::slug($detail['title']),
                            'color' => $detail['color'] ?? null,
                            'image' => $detail['image'] ?? null,
                            'is_default' => filter_var($detail['is_default'] ?? false, FILTER_VALIDATE_BOOLEAN),
                            'order' => $index,
                        ];

                        if (isset($detail['id']) && $detail['id']) {
                            // Update existing
                            $attribute->details()->where('id', $detail['id'])->update($detailData);
                            $existingIds[] = $detail['id'];
                        } else {
                            // Create new
                            $newDetail = $attribute->details()->create($detailData);
                            $existingIds[] = $newDetail->id;
                        }
                    }
                }
            }
            
            // Delete removed details
            $attribute->details()->whereNotIn('id', $existingIds)->delete();

            return redirect()->route('admin.item-attributes.index')->with('success', 'Attribute updated successfully.');
        } catch (ValidationException $e) {
            throw $e;
        } catch (ModelNotFoundException $e) {
            return redirect()->route('admin.item-attributes.index')->with('error', 'Attribute not found.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Error updating attribute: ' . $e->getMessage());
        }
    }

    public function destroy($id)
    {
        try {
            $attribute = ItemAttribute::findOrFail($id);
            $attribute->delete();

            return redirect()->route('admin.item-attributes.index')->with('success', 'Attribute deleted successfully.');
        } catch (ModelNotFoundException $e) {
            return redirect()->route('admin.item-attributes.index')->with('error', 'Attribute not found.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Error deleting attribute: ' . $e->getMessage());
        }
    }
}

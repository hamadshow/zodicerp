<?php

namespace App\Http\Controllers\Backend\Inventory;

use App\Http\Controllers\Controller;
use App\Models\ItemCollection;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ItemCollectionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $collections = ItemCollection::with('parent')
            ->orderBy('id', 'desc')
            ->get();

        return Inertia::render('Backend/03-Inventory/ItemCollections', [
            'collections' => $collections
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $collections = ItemCollection::where('status', 'published')
            ->select('id', 'name')
            ->get();

        return Inertia::render('Backend/03-Inventory/ItemCollectionsCE', [
            'collections' => $collections
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:191',
            'status' => 'required|in:published,draft,pending',
            'slug' => 'nullable|string|max:191|unique:item_collections,slug',
            'description' => 'nullable|string|max:400',
            'parent_id' => 'nullable|exists:item_collections,id',
            'image' => 'nullable|string',
            'is_featured' => 'boolean',
        ]);

        $slug = $request->slug ? Str::slug($request->slug) : Str::slug($request->name);
        
        // Ensure unique slug if auto-generated
        if (!$request->slug) {
            $count = ItemCollection::where('slug', $slug)->count();
            if ($count > 0) {
                $slug .= '-' . ($count + 1);
            }
        }

        ItemCollection::create([
            'name' => $request->name,
            'slug' => $slug,
            'status' => $request->status,
            'description' => $request->description,
            'parent_id' => $request->parent_id,
            'image' => $request->image,
            'is_featured' => $request->is_featured ?? false,
        ]);

        return redirect()->route('admin.item-collections.index')
            ->with('success', 'Item Collection created successfully.');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit($id)
    {
        $collection = ItemCollection::findOrFail($id);
        
        // Get all collections except the current one to prevent circular parent reference
        $collections = ItemCollection::where('id', '!=', $id)
            ->where('status', 'published')
            ->select('id', 'name')
            ->get();

        return Inertia::render('Backend/03-Inventory/ItemCollections', [
            'collection' => $collection,
            'collections' => $collections
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $collection = ItemCollection::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:191',
            'status' => 'required|in:published,draft,pending',
            'slug' => 'nullable|string|max:191|unique:item_collections,slug,' . $id,
            'description' => 'nullable|string|max:400',
            'parent_id' => 'nullable|exists:item_collections,id',
            'image' => 'nullable|string',
            'is_featured' => 'boolean',
        ]);

        // Prevent setting self as parent
        if ($request->parent_id == $id) {
            return back()->withErrors(['parent_id' => 'A collection cannot be its own parent.']);
        }

        $slug = $request->slug ? Str::slug($request->slug) : Str::slug($request->name);

        // Ensure unique slug if auto-generated and changed
        if (!$request->slug && $slug !== $collection->slug) {
            $count = ItemCollection::where('slug', $slug)->where('id', '!=', $id)->count();
            if ($count > 0) {
                $slug .= '-' . ($count + 1);
            }
        }

        $collection->update([
            'name' => $request->name,
            'slug' => $slug,
            'status' => $request->status,
            'description' => $request->description,
            'parent_id' => $request->parent_id,
            'image' => $request->image,
            'is_featured' => $request->is_featured ?? false,
        ]);

        return redirect()->route('admin.item-collections.index')
            ->with('success', 'Item Collection updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $collection = ItemCollection::findOrFail($id);
        $collection->delete();

        return redirect()->route('admin.item-collections.index')
            ->with('success', 'Item Collection deleted successfully.');
    }
}

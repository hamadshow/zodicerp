<?php

namespace App\Http\Controllers\Backend\Inventory;

use App\Http\Controllers\Controller;
use App\Models\ProductCollection;
use App\Models\Products;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ProductCollectionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $collections = ProductCollection::with('translations')
            ->orderBy('id', 'desc')
            ->get();

        return Inertia::render('Backend/03-Inventory/ProductCollections', [
            'collections' => $collections,
            'mode' => 'list'
        ]);
    }

    /**
     * Get products for selection.
     */
    public function getProducts(Request $request)
    {
        $query = $request->input('query');
        $products = Products::query()
            ->when($query, function ($q) use ($query) {
                $q->where('name', 'like', "%{$query}%");
            })
            ->select('id', 'name', 'image', 'price')
            ->limit(20)
            ->get();
            
        return response()->json($products);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Backend/03-Inventory/ProductCollections', [
            'mode' => 'create'
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
            'slug' => 'nullable|string|max:191|unique:product_collections,slug',
            'description' => 'nullable|string|max:400',
            'image' => 'nullable|string',
            'is_featured' => 'boolean',
            'name_ar' => 'nullable|string|max:191',
            'name_en' => 'nullable|string|max:191',
            'description_ar' => 'nullable|string|max:400',
            'description_en' => 'nullable|string|max:400',
        ]);

        $slug = $request->slug ? Str::slug($request->slug) : Str::slug($request->name);
        
        // Ensure unique slug if auto-generated
        if (!$request->slug) {
            $count = ProductCollection::where('slug', $slug)->count();
            if ($count > 0) {
                $slug .= '-' . ($count + 1);
            }
        }

        $collection = ProductCollection::create([
            'name' => $request->name,
            'slug' => $slug,
            'status' => $request->status,
            'description' => $request->description,
            'image' => $request->image,
            'is_featured' => $request->is_featured ?? false,
        ]);

        // Save Translations
        $locales = ['ar', 'en'];
        foreach ($locales as $locale) {
            $nameField = "name_{$locale}";
            $descField = "description_{$locale}";
            
            if ($request->filled($nameField)) {
                $collection->translations()->create([
                    'lang_code' => $locale,
                    'name' => $request->$nameField,
                    'description' => $request->$descField,
                ]);
            }
        }

        if ($request->has('products')) {
            $collection->products()->sync($request->products);
        }

        return redirect()->route('admin.product-collections.index')
            ->with('success', 'Product Collection created successfully.');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit($id)
    {
        $collection = ProductCollection::with(['products:id,name,image', 'translations'])->findOrFail($id);

        return Inertia::render('Backend/03-Inventory/ProductCollections', [
            'collection' => $collection,
            'mode' => 'edit'
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $collection = ProductCollection::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:191',
            'status' => 'required|in:published,draft,pending',
            'slug' => 'nullable|string|max:191|unique:product_collections,slug,' . $id,
            'description' => 'nullable|string|max:400',
            'image' => 'nullable|string',
            'is_featured' => 'boolean',
            'name_ar' => 'nullable|string|max:191',
            'name_en' => 'nullable|string|max:191',
            'description_ar' => 'nullable|string|max:400',
            'description_en' => 'nullable|string|max:400',
        ]);

        $slug = $request->slug ? Str::slug($request->slug) : Str::slug($request->name);

        // Ensure unique slug if auto-generated and changed
        if (!$request->slug && $slug !== $collection->slug) {
            $count = ProductCollection::where('slug', $slug)->where('id', '!=', $id)->count();
            if ($count > 0) {
                $slug .= '-' . ($count + 1);
            }
        }

        $collection->update([
            'name' => $request->name,
            'slug' => $slug,
            'status' => $request->status,
            'description' => $request->description,
            'image' => $request->image,
            'is_featured' => $request->is_featured ?? false,
        ]);

        // Update Translations
        $locales = ['ar', 'en'];
        foreach ($locales as $locale) {
            $nameField = "name_{$locale}";
            $descField = "description_{$locale}";
            
            if ($request->filled($nameField)) {
                $collection->translations()->updateOrCreate(
                    ['lang_code' => $locale],
                    [
                        'name' => $request->$nameField,
                        'description' => $request->$descField,
                    ]
                );
            } else {
                $collection->translations()->where('lang_code', $locale)->delete();
            }
        }

        if ($request->has('products')) {
            $collection->products()->sync($request->products);
        }

        return redirect()->route('admin.product-collections.index')
            ->with('success', 'Product Collection updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $collection = ProductCollection::findOrFail($id);
        $collection->delete();

        return redirect()->route('admin.product-collections.index')
            ->with('success', 'Product Collection deleted successfully.');
    }
}

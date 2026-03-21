<?php

namespace App\Http\Controllers\Backend\Client_Sales;

use App\Http\Controllers\Controller;
use App\Models\Backend\Client_Sales\FlashSale;
use App\Models\Backend\Client_Sales\FlashSaleItem;
use App\Models\Products;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class FlashSaleController extends Controller
{
    public function index()
    {
        $flashSales = FlashSale::latest()->paginate(10);

        return Inertia::render('Backend/E-Commerce/FlashSales', [
            'flashSales' => $flashSales,
            'view' => 'list',
        ]);
    }

    public function create()
    {
        $flashSales = FlashSale::latest()->paginate(10);

        return Inertia::render('Backend/E-Commerce/FlashSales', [
            'flashSales' => $flashSales,
            'view' => 'create',
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:191',
            'end_date' => 'required|date',
            'status' => 'required|string',
            'products' => 'required|array',
            'products.*.id' => 'required|exists:products,id',
            'products.*.price' => 'required|numeric',
            'products.*.quantity' => 'required|integer|min:1',
        ]);

        DB::transaction(function () use ($request) {
            $flashSale = FlashSale::create([
                'name' => $request->name,
                'end_date' => $request->end_date,
                'status' => $request->status,
            ]);

            foreach ($request->products as $product) {
                FlashSaleItem::create([
                    'flash_sale_id' => $flashSale->id,
                    'product_id' => $product['id'],
                    'price' => $product['price'],
                    'quantity' => $product['quantity'],
                    'sold' => 0,
                ]);
            }
        });

        return redirect()->route('admin.client-sales.flash-sales.index')
            ->with('success', 'Flash Sale created successfully.');
    }

    public function edit($id)
    {
        $flashSales = FlashSale::latest()->paginate(10);
        $flashSale = FlashSale::with(['items.product'])->findOrFail($id);

        // Transform items to match the expected structure in frontend
        $selectedProducts = $flashSale->items->map(function ($item) {
            return [
                'id' => $item->product_id,
                'name' => $item->product->name ?? 'Unknown Product',
                'image' => $item->product->image ?? null, // Adjust based on Product model
                'price' => $item->price,
                'quantity' => $item->quantity,
            ];
        });

        return Inertia::render('Backend/E-Commerce/FlashSales', [
            'flashSales' => $flashSales,
            'flashSale' => $flashSale,
            'selectedProducts' => $selectedProducts,
            'view' => 'edit',
        ]);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'name' => 'required|string|max:191',
            'end_date' => 'required|date',
            'status' => 'required|string',
            'products' => 'required|array',
            'products.*.id' => 'required|exists:products,id',
            'products.*.price' => 'required|numeric',
            'products.*.quantity' => 'required|integer|min:1',
        ]);

        DB::transaction(function () use ($request, $id) {
            $flashSale = FlashSale::findOrFail($id);
            $flashSale->update([
                'name' => $request->name,
                'end_date' => $request->end_date,
                'status' => $request->status,
            ]);

            // Sync items: delete old and create new
            // Alternatively, update existing ones to preserve 'sold' count if needed.
            // For simplicity, we'll clear and re-add, but we should probably keep 'sold' if it's tracked.
            // If 'sold' is important, we need to match by product_id.

            $existingItems = $flashSale->items()->get()->keyBy('product_id');
            $newProductIds = collect($request->products)->pluck('id')->toArray();

            // Delete removed items
            $flashSale->items()->whereNotIn('product_id', $newProductIds)->delete();

            foreach ($request->products as $productData) {
                $item = $existingItems->get($productData['id']);
                if ($item) {
                    $item->update([
                        'price' => $productData['price'],
                        'quantity' => $productData['quantity'],
                    ]);
                } else {
                    FlashSaleItem::create([
                        'flash_sale_id' => $flashSale->id,
                        'product_id' => $productData['id'],
                        'price' => $productData['price'],
                        'quantity' => $productData['quantity'],
                        'sold' => 0,
                    ]);
                }
            }
        });

        return redirect()->route('admin.client-sales.flash-sales.index')
            ->with('success', 'Flash Sale updated successfully.');
    }

    public function destroy($id)
    {
        FlashSale::findOrFail($id)->delete();

        return redirect()->back()->with('success', 'Flash Sale deleted successfully.');
    }

    // API endpoint for product search
    public function searchProducts(Request $request)
    {
        $query = $request->input('query');
        $products = Products::where('name', 'like', "%{$query}%")
            ->limit(20)
            ->get(['id', 'name', 'price', 'image']); // Added image field

        return response()->json($products);
    }
}

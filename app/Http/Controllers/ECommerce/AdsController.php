<?php

namespace App\Http\Controllers\ECommerce;

use App\Http\Controllers\Controller;
use App\Models\Ad;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class AdsController extends Controller
{
    public function index(Request $request)
    {
        $query = Ad::query();

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                    ->orWhere('key', 'like', '%' . $search . '%')
                    ->orWhere('location', 'like', '%' . $search . '%')
                    ->orWhere('url', 'like', '%' . $search . '%');
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('location')) {
            $query->where('location', $request->string('location')->toString());
        }

        if ($request->filled('ads_type')) {
            $query->where('ads_type', $request->string('ads_type')->toString());
        }

        if ($request->boolean('with_trashed')) {
            $query->withTrashed();
        }

        $sort = $request->get('sort', 'order');
        $direction = $request->get('direction', 'asc') === 'desc' ? 'desc' : 'asc';

        $allowedSorts = ['name', 'order', 'status', 'clicked', 'expired_at', 'created_at'];
        if (!in_array($sort, $allowedSorts, true)) {
            $sort = 'order';
        }

        $query->orderBy($sort, $direction)->orderBy('id', 'asc');

        $perPage = (int) $request->get('per_page', 15);
        if ($perPage <= 0) {
            $perPage = 15;
        }

        $ads = $query->paginate($perPage)->withQueryString();

        return response()->json($ads);
    }

    public function show(Ad $ad)
    {
        return response()->json($ad);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:191'],
            'expired_at' => ['nullable', 'date'],
            'location' => ['nullable', 'string', 'max:120'],
            'key' => ['required', 'string', 'max:120', 'unique:ads,key'],
            'url' => ['nullable', 'url', 'max:191'],
            'order' => ['nullable', 'integer', 'min:0'],
            'status' => ['nullable', 'string', 'max:60'],
            'open_in_new_tab' => ['sometimes', 'boolean'],
            'ads_type' => ['nullable', 'string', 'max:191'],
            'google_adsense_slot_id' => ['nullable', 'string', 'max:191'],
            'clicked' => ['nullable', 'integer', 'min:0'],
            'image_path' => ['nullable', 'string', 'max:191'],
            'tablet_image_path' => ['nullable', 'string', 'max:191'],
            'mobile_image_path' => ['nullable', 'string', 'max:191'],
        ]);

        $order = $validated['order'] ?? null;
        if ($order === null) {
            $maxOrder = Ad::max('order');
            $order = is_numeric($maxOrder) ? ((int) $maxOrder + 1) : 0;
        }

        $status = $validated['status'] ?? 'published';

        $imagePath = $this->storeImage($request, 'image');
        $tabletImagePath = $this->storeImage($request, 'tablet_image');
        $mobileImagePath = $this->storeImage($request, 'mobile_image');

        $ad = Ad::create([
            'name' => $validated['name'],
            'expired_at' => $validated['expired_at'] ?? null,
            'location' => $validated['location'] ?? null,
            'key' => $validated['key'],
            'image' => $imagePath,
            'tablet_image' => $tabletImagePath,
            'mobile_image' => $mobileImagePath,
            'url' => $validated['url'] ?? null,
            'clicked' => $validated['clicked'] ?? 0,
            'order' => $order,
            'status' => $status,
            'open_in_new_tab' => $request->boolean('open_in_new_tab', true),
            'ads_type' => $validated['ads_type'] ?? null,
            'google_adsense_slot_id' => $validated['google_adsense_slot_id'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Ad created successfully.',
            'ad' => $ad,
        ], 201);
    }

    public function update(Request $request, Ad $ad)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:191'],
            'expired_at' => ['nullable', 'date'],
            'location' => ['nullable', 'string', 'max:120'],
            'key' => ['required', 'string', 'max:120', 'unique:ads,key,' . $ad->id],
            'url' => ['nullable', 'url', 'max:191'],
            'order' => ['nullable', 'integer', 'min:0'],
            'status' => ['nullable', 'string', 'max:60'],
            'open_in_new_tab' => ['sometimes', 'boolean'],
            'ads_type' => ['nullable', 'string', 'max:191'],
            'google_adsense_slot_id' => ['nullable', 'string', 'max:191'],
            'clicked' => ['nullable', 'integer', 'min:0'],
            'image_path' => ['nullable', 'string', 'max:191'],
            'tablet_image_path' => ['nullable', 'string', 'max:191'],
            'mobile_image_path' => ['nullable', 'string', 'max:191'],
        ]);

        $data = [
            'name' => $validated['name'],
            'expired_at' => $validated['expired_at'] ?? null,
            'location' => $validated['location'] ?? null,
            'key' => $validated['key'],
            'url' => $validated['url'] ?? null,
            'order' => $validated['order'] ?? $ad->order,
            'status' => $validated['status'] ?? $ad->status,
            'open_in_new_tab' => $request->boolean('open_in_new_tab', $ad->open_in_new_tab),
            'ads_type' => $validated['ads_type'] ?? $ad->ads_type,
            'google_adsense_slot_id' => $validated['google_adsense_slot_id'] ?? $ad->google_adsense_slot_id,
            'clicked' => $validated['clicked'] ?? $ad->clicked,
        ];

        $hasNewImageFile = $request->hasFile('image');
        $imagePath = $this->storeImage($request, 'image', $ad->image);
        if ($imagePath !== $ad->image) {
            if ($hasNewImageFile) {
                $this->deleteStoredFile($ad->image);
            }
            $data['image'] = $imagePath;
        }

        $hasNewTabletImageFile = $request->hasFile('tablet_image');
        $tabletImagePath = $this->storeImage($request, 'tablet_image', $ad->tablet_image);
        if ($tabletImagePath !== $ad->tablet_image) {
            if ($hasNewTabletImageFile) {
                $this->deleteStoredFile($ad->tablet_image);
            }
            $data['tablet_image'] = $tabletImagePath;
        }

        $hasNewMobileImageFile = $request->hasFile('mobile_image');
        $mobileImagePath = $this->storeImage($request, 'mobile_image', $ad->mobile_image);
        if ($mobileImagePath !== $ad->mobile_image) {
            if ($hasNewMobileImageFile) {
                $this->deleteStoredFile($ad->mobile_image);
            }
            $data['mobile_image'] = $mobileImagePath;
        }

        $ad->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Ad updated successfully.',
            'ad' => $ad->fresh(),
        ]);
    }

    public function destroy(Ad $ad)
    {
        $ad->delete();

        return response()->json([
            'success' => true,
            'message' => 'Ad deleted successfully.',
        ]);
    }

    public function bulkDelete(Request $request)
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'exists:ads,id'],
        ]);

        Ad::whereIn('id', $validated['ids'])->delete();

        return response()->json([
            'success' => true,
            'message' => 'Ads deleted successfully.',
        ]);
    }

    public function bulkStatus(Request $request)
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'exists:ads,id'],
            'status' => ['required', 'string', 'max:60'],
        ]);

        Ad::whereIn('id', $validated['ids'])->update([
            'status' => $validated['status'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Ads status updated successfully.',
        ]);
    }

    public function click(Request $request, Ad $ad)
    {
        try {
            $ad->increment('clicked');
        } catch (\Throwable $e) {
            Log::error('Failed to increment ad click counter', [
                'ad_id' => $ad->id,
                'message' => $e->getMessage(),
            ]);
        }

        if ($request->boolean('redirect') && $ad->url) {
            return redirect()->away($ad->url);
        }

        return response()->json([
            'success' => true,
            'id' => $ad->id,
            'clicked' => $ad->clicked,
        ]);
    }

    private function storeImage(Request $request, string $field, ?string $existingPath = null): ?string
    {
        if ($request->hasFile($field)) {
            $file = $request->file($field);

            if (!$file->isValid()) {
                return $existingPath;
            }

            if ($file->getSize() > 5 * 1024 * 1024) {
                return $existingPath;
            }

            $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            $extension = strtolower($file->getClientOriginalExtension());

            if (!in_array($extension, $allowedExtensions, true)) {
                return $existingPath;
            }

            return $file->store('ads/' . $field, 'public');
        }

        $pathField = $field . '_path';

        if ($request->filled($pathField)) {
            $path = $request->string($pathField)->toString();

            if ($path !== '') {
                return $path;
            }
        }

        return $existingPath;
    }

    private function deleteStoredFile(?string $path): void
    {
        if (!$path) {
            return;
        }

        if (Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }
}

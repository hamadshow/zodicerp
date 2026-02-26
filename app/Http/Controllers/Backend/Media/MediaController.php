<?php

namespace App\Http\Controllers\Backend\Media;

use App\Http\Controllers\Controller;
use App\Models\MediaFile;
use App\Models\MediaFolder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Exception;

class MediaController extends Controller
{
    public function index(Request $request, ?string $tab = null)
    {
        set_time_limit(0);
        $folderId = $request->input('folder_id');
        $search = $request->input('search');
        $sortBy = $request->input('sort_by', 'name');
        $sortOrder = $request->input('sort_order', 'asc');
        $type = $tab ?: $request->input('type', 'all');
        
        $queryFolders = MediaFolder::query();
        $queryFiles = MediaFile::query();

        if ($folderId) {
            $queryFolders->where('parent_id', $folderId);
            $queryFiles->where('folder_id', $folderId);
            $currentFolder = MediaFolder::find($folderId);
        } else {
            $queryFolders->whereNull('parent_id');
            $queryFiles->whereNull('folder_id');
            $currentFolder = null;
        }

        if ($search) {
            $queryFolders->where('name', 'like', "%{$search}%");
            $queryFiles->where('name', 'like', "%{$search}%");
        }

        if ($type && $type !== 'all') {
            if ($type === 'images') {
                $queryFiles->where('file_type', 'like', 'image/%');
            } elseif ($type === 'videos') {
                $queryFiles->where('file_type', 'like', 'video/%');
            } elseif ($type === 'documents') {
                $queryFiles->where(function($q) {
                    $q->where('file_type', 'not like', 'image/%')
                      ->where('file_type', 'not like', 'video/%');
                });
            }
        }

        // Validate sort columns to prevent SQL injection or errors
        $allowedSorts = ['name', 'created_at', 'size', 'file_type'];
        if (!in_array($sortBy, $allowedSorts)) {
            $sortBy = 'name';
        }

        // Apply sort to folders (only if column exists)
        if (in_array($sortBy, ['name', 'created_at'])) {
            $queryFolders->orderBy($sortBy, $sortOrder);
        } else {
            $queryFolders->orderBy('name', 'asc');
        }

        // Apply sort to files
        $queryFiles->orderBy($sortBy, $sortOrder);

        // Get ancestors for breadcrumbs
        $breadcrumbs = [];
        if ($currentFolder) {
            $temp = $currentFolder->parent;
            while ($temp) {
                array_unshift($breadcrumbs, $temp);
                $temp = $temp->parent;
            }
        }

        // Calculate storage usage
        $totalUsed = MediaFile::sum('size');
        $totalSpace = 1073741824;

        $filters = $request->only(['search', 'sort_by', 'sort_order']);
        $filters['type'] = $type ?: 'all';

        $files = $queryFiles->paginate(50)->withQueryString();
        $files->getCollection()->transform(function ($file) {
            $rawPath = parse_url($file->file_path, PHP_URL_PATH) ?: $file->file_path;
            $relativePath = ltrim(str_replace('/storage/', '', $rawPath), '/');
            $file->path = $relativePath;
            $file->file_url = '/media-files/' . $relativePath;
            return $file;
        });

        $data = [
            'folders' => $queryFolders->get(),
            'files' => $files,
            'currentFolder' => $currentFolder,
            'breadcrumbs' => $breadcrumbs,
            'filters' => $filters,
            'storageUsage' => [
                'used' => $totalUsed,
                'total' => $totalSpace
            ]
        ];

        if ($request->wantsJson() && !$request->header('X-Inertia')) {
            return response()->json($data);
        }

        return Inertia::render('Backend/Media/MediaIndex', $data);
    }

    public function store(Request $request)
    {
        $request->validate([
            'files' => 'required|array',
            'files.*' => 'file|max:10240|mimes:jpeg,png,jpg,gif,svg,webp,pdf,doc,docx,xls,xlsx,txt,mp4,mov,avi,webm,zip,rar',
            'folder_id' => 'nullable|exists:media_folders,id',
        ]);

        $folderId = $request->input('folder_id');

        foreach ($request->file('files') as $file) {
            $mime = $file->getMimeType();

            $path = $file->store('media', 'public');

            // Create database record
            MediaFile::create([
                'folder_id' => $folderId,
                'name' => $file->getClientOriginalName(),
                'file_path' => $path,
                'file_type' => $mime,
                'size' => $file->getSize(),
            ]);
        }

        return redirect()->back()->with('success', 'Files uploaded successfully');
    }

    public function importProductImages(Request $request)
    {
        $request->validate([
            'files' => 'required|array',
            'files.*' => 'file|max:51200',
            'paths' => 'nullable|array',
        ]);

        set_time_limit(0);

        $files = $request->file('files', []);
        $paths = $request->input('paths', []);
        $allowed = ['jpg', 'jpeg', 'png', 'gif'];
        $copied = 0;
        $skipped = 0;
        $errors = [];
        $mapping = [];

        foreach ($files as $index => $file) {
            try {
                $originalName = $file->getClientOriginalName();
                $extension = strtolower($file->getClientOriginalExtension());
                if (!in_array($extension, $allowed)) {
                    $skipped++;
                    continue;
                }

                $baseName = pathinfo($originalName, PATHINFO_FILENAME);
                $targetName = $originalName;
                $targetPath = 'images/products/' . $targetName;

                if (Storage::disk('public')->exists($targetPath)) {
                    $unique = $baseName . '-' . Str::random(6) . '-' . time() . '.' . $extension;
                    $targetName = $unique;
                    $targetPath = 'images/products/' . $targetName;
                }

                Storage::disk('public')->putFileAs('images/products', $file, $targetName);
                $copied++;

                $relativePath = is_array($paths) && array_key_exists($index, $paths) ? $paths[$index] : null;
                $folderName = null;
                if ($relativePath) {
                    $segments = preg_split('/[\/\\\\]+/', $relativePath);
                    $folderName = $segments && count($segments) > 1 ? $segments[0] : null;
                }
                $productKey = $folderName ?: $baseName;

                $mapping[] = [
                    'product_key' => $productKey,
                    'source_path' => $relativePath ?: $originalName,
                    'original_name' => $originalName,
                    'stored_name' => $targetName,
                    'stored_url' => Storage::url($targetPath),
                ];
            } catch (Exception $e) {
                $errors[] = $e->getMessage();
            }
        }

        $timestamp = now()->format('YmdHis');
        $mappingPath = 'imports/product-image-mapping-' . $timestamp . '.json';
        Storage::disk('public')->put($mappingPath, json_encode($mapping, JSON_UNESCAPED_UNICODE));

        return response()->json([
            'total' => count($files),
            'copied' => $copied,
            'skipped' => $skipped,
            'errors' => $errors,
            'mapping_url' => Storage::url($mappingPath),
            'output_folder' => Storage::url('images/products'),
        ]);
    }

    public function storeFolder(Request $request)
    {
        $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                \Illuminate\Validation\Rule::unique('media_folders')->where(function ($query) use ($request) {
                    return $query->where('parent_id', $request->parent_id);
                }),
            ],
            'parent_id' => 'nullable|exists:media_folders,id',
        ]);

        MediaFolder::create([
            'name' => $request->name,
            'parent_id' => $request->parent_id,
        ]);

        return redirect()->back()->with('success', 'Folder created successfully');
    }
    
    public function destroy(Request $request)
    {
        $request->validate([
            'items' => 'required|array',
            'items.*.type' => 'required|in:folder,file',
            'items.*.id' => 'required|integer',
        ]);

        foreach ($request->items as $item) {
            if ($item['type'] === 'folder') {
                $folder = MediaFolder::find($item['id']);
                if ($folder) {
                    $this->deleteFolderRecursively($folder);
                }
            } else {
                $file = MediaFile::find($item['id']);
                if ($file) {
                    $this->deleteFile($file);
                }
            }
        }

        return redirect()->back()->with('success', 'Items deleted successfully');
    }

    public function rename(Request $request)
    {
        $request->validate([
            'type' => 'required|in:folder,file',
            'id' => 'required|integer',
            'name' => 'required|string|max:255',
        ]);

        if ($request->type === 'folder') {
            $folder = MediaFolder::findOrFail($request->id);
            
            // Check uniqueness in the same parent
            $exists = MediaFolder::where('parent_id', $folder->parent_id)
                        ->where('name', $request->name)
                        ->where('id', '!=', $folder->id)
                        ->exists();

            if ($exists) {
                return redirect()->back()->withErrors(['name' => 'A folder with this name already exists in this location.']);
            }

            $folder->update(['name' => $request->name]);
        } else {
            $file = MediaFile::findOrFail($request->id);
            // Optional: Check file uniqueness if needed
            $file->update(['name' => $request->name]);
        }

        return redirect()->back()->with('success', 'Item renamed successfully');
    }

    public function move(Request $request)
    {
        $request->validate([
            'items' => 'required|array',
            'destination_folder_id' => 'nullable|exists:media_folders,id',
        ]);
        
        $destId = $request->destination_folder_id;

        foreach ($request->items as $item) {
             if ($item['type'] === 'folder') {
                 $folder = MediaFolder::find($item['id']);
                 // Prevent moving folder into itself or its children and ensure not moving to same parent
                 if ($folder && $folder->id !== $destId && $folder->parent_id !== $destId) {
                     // Check circular dependency (if moving into a child of itself)
                     if (!$destId || !$this->isDescendant($folder->id, $destId)) {
                        $folder->update(['parent_id' => $destId]);
                     }
                 }
             } else {
                 $file = MediaFile::find($item['id']);
                 if ($file) {
                     $file->update(['folder_id' => $destId]);
                 }
             }
        }
        
        return redirect()->back()->with('success', 'Items moved successfully');
    }

    private function deleteFolderRecursively($folder)
    {
        foreach ($folder->children as $child) {
            $this->deleteFolderRecursively($child);
        }
        foreach ($folder->files as $file) {
            $this->deleteFile($file);
        }
        $folder->delete();
    }

    private function deleteFile($file)
    {
        // Extract relative path from Storage URL
        // Example: /storage/media/images/abc.jpg -> media/images/abc.jpg
        $path = str_replace('/storage/', '', parse_url($file->file_path, PHP_URL_PATH));
        Storage::disk('public')->delete($path);
        $file->delete();
    }

    private function isDescendant($folderId, $targetId) {
        // Checks if targetId is a descendant of folderId
        if (!$targetId) return false;
        
        $target = MediaFolder::find($targetId);
        while ($target && $target->parent_id) {
            if ($target->parent_id == $folderId) return true;
            $target = $target->parent;
        }
        return false;
    }
}

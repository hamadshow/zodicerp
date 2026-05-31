<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LocationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'parent_id' => $this->parent_id,
            'name' => $this->name,
            'name_json' => $this->name_json,
            'location_type' => $this->location_type,
            'code' => $this->code,
            'status' => (bool) $this->status,
            'sort_order' => $this->sort_order,
            'children_count' => $this->children_count ?? $this->children()->count(),
            'path' => $this->path,
            'created_at' => $this->created_at->format('Y-m-d H:i'),
        ];
    }
}

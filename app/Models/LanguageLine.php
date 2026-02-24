<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LanguageLine extends Model
{
    protected $fillable = ['group', 'key', 'text'];

    protected $casts = [
        'text' => 'array',
    ];

    /**
     * Get the translation for a given locale.
     */
    public function getTranslation(string $locale): ?string
    {
        return $this->text[$locale] ?? null;
    }

    /**
     * Set the translation for a given locale.
     */
    public function setTranslation(string $locale, string $value): self
    {
        $text = $this->text;
        $text[$locale] = $value;
        $this->text = $text;

        return $this;
    }
}

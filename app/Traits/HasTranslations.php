<?php

namespace App\Traits;

trait HasTranslations
{
    /**
     * Get translated field.
     *
     * @param string $field
     * @param string|null $locale
     * @return mixed
     */
    public function getTranslated(string $field, ?string $locale = null)
    {
        $locale = $locale ?: app()->getLocale();
        $translations = $this->{$field};

        if (is_string($translations)) {
            $translations = json_decode($translations, true);
        }

        if (!is_array($translations)) {
            return $translations;
        }

        return $translations[$locale] ?? $translations[config('app.fallback_locale')] ?? array_shift($translations);
    }

    /**
     * Set translated field.
     *
     * @param string $field
     * @param string $locale
     * @param mixed $value
     * @return $this
     */
    public function setTranslation(string $field, string $locale, $value)
    {
        $translations = $this->{$field} ?: [];

        if (is_string($translations)) {
            $translations = json_decode($translations, true) ?: [];
        }

        $translations[$locale] = $value;
        $this->{$field} = $translations;

        return $this;
    }
}

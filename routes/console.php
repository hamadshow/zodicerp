<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Models\Ad;
use App\Models\Language;
use App\Models\LanguageLine;
use Illuminate\Support\Facades\File;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('ads:disable-expired', function () {
    Ad::whereNotNull('expired_at')
        ->where('expired_at', '<=', now())
        ->where('status', 'published')
        ->update(['status' => 'expired']);
})->purpose('Disable expired ads');

Schedule::command('ads:disable-expired')->hourly();

Artisan::command('translations:sync', function () {
    $locales = Language::pluck('lang_code')->toArray();
    if (empty($locales)) {
        $locales = ['en', 'ar'];
    }

    $imported = 0;

    foreach ($locales as $locale) {
        $langPath = base_path("lang/{$locale}");
        if (!File::isDirectory($langPath)) {
            continue;
        }

        $files = File::files($langPath);
        foreach ($files as $file) {
            $group = $file->getBasename('.php');
            if ($group === 'messages') {
                continue;
            }

            $translations = trans($group, [], $locale);
            if (!is_array($translations)) {
                continue;
            }

            $imported += importTranslations($translations, $group, $locale);
        }
    }

    $this->info("Translations synced. Updated {$imported} entries.");
})->purpose('Sync lang files to language_lines');

if (!function_exists('importTranslations')) {
    function importTranslations(array $translations, string $group, string $locale, string $parentKey = ''): int
    {
        $count = 0;

        foreach ($translations as $key => $value) {
            $fullKey = $parentKey ? "{$parentKey}.{$key}" : $key;

            if (is_array($value)) {
                $count += importTranslations($value, $group, $locale, $fullKey);
                continue;
            }

            $line = LanguageLine::firstOrNew([
                'group' => $group,
                'key' => $fullKey,
            ]);

            $text = $line->text ?? [];
            $text[$locale] = (string) $value;
            $line->text = $text;
            $line->save();
            $count += 1;
        }

        return $count;
    }
}

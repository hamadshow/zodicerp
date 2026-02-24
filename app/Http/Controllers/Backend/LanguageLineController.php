<?php

namespace App\Http\Controllers\Backend;

use App\Http\Controllers\Controller;
use App\Models\LanguageLine;
use App\Models\Language;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\File;

class LanguageLineController extends Controller
{
    public function index(Request $request)
    {
        $query = LanguageLine::query();

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('group', 'like', "%{$search}%")
                  ->orWhere('key', 'like', "%{$search}%")
                  ->orWhere('text', 'like', "%{$search}%");
            });
        }

        if ($request->has('group') && $request->group !== 'all') {
            $query->where('group', $request->group);
        }

        $translations = $query->latest()->paginate(100)->withQueryString();
        
        $groups = LanguageLine::select('group')->distinct()->pluck('group');
        $languages = Language::all();

        return Inertia::render('Backend/Settings/OtherTranslations', [
            'translations' => $translations,
            'groups' => $groups,
            'languages' => $languages,
            'filters' => $request->only(['search', 'group', 'lang']),
        ]);
    }

    public function update(Request $request, LanguageLine $languageLine)
    {
        $request->validate([
            'locale' => 'required|string',
            'value' => 'required|string',
        ]);

        $text = $languageLine->text;
        $text[$request->input('locale')] = $request->input('value');
        $languageLine->text = $text;
        $languageLine->save();

        return back()->with('success', 'Translation updated successfully.');
    }

    /**
     * Sync translations from lang files to database.
     */
    public function sync()
    {
        $locales = Language::pluck('lang_code')->toArray();
        if (empty($locales)) {
            $locales = ['en', 'ar'];
        }

        foreach ($locales as $locale) {
            $langPath = base_path("lang/{$locale}");
            if (!File::isDirectory($langPath)) continue;

            $files = File::files($langPath);
            foreach ($files as $file) {
                $group = $file->getBasename('.php');
                if ($group === 'messages') continue; // Skip our custom messages if needed, or include it

                $translations = trans($group, [], $locale);
                if (is_array($translations)) {
                    $this->importArray($translations, $group, $locale);
                }
            }
        }

        return back()->with('success', 'Translations synced from files successfully.');
    }

    protected function importArray(array $translations, string $group, string $locale, string $parentKey = '')
    {
        foreach ($translations as $key => $value) {
            $fullKey = $parentKey ? "{$parentKey}.{$key}" : $key;

            if (is_array($value)) {
                $this->importArray($value, $group, $locale, $fullKey);
            } else {
                $line = LanguageLine::firstOrNew([
                    'group' => $group,
                    'key' => $fullKey,
                ]);

                $text = $line->text ?? [];
                $text[$locale] = (string)$value;
                $line->text = $text;
                $line->save();
            }
        }
    }
}

<?php

namespace App\Http\Controllers\Backend;

use App\Http\Controllers\Controller;
use App\Models\Language;
use App\Models\LanguageLine;
use App\Services\AIService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ThemeTranslationController extends Controller
{
    protected AIService $aiService;

    public function __construct(AIService $aiService)
    {
        $this->aiService = $aiService;
    }

    public function index(Request $request)
    {
        $query = LanguageLine::query();

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('group', 'like', "%{$search}%")
                    ->orWhere('key', 'like', "%{$search}%")
                    ->orWhere('text', 'like', "%{$search}%");
            });
        }

        $translations = $query->latest()->paginate(100)->withQueryString();
        $languages = Language::all();

        return Inertia::render('Backend/Settings/ThemeTranslations', [
            'translations' => $translations,
            'languages' => $languages,
            'filters' => $request->only(['search', 'lang']),
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

        return back()->with('success', 'Theme translation updated successfully.');
    }

    /**
     * Auto-translate a language line using AI.
     */
    public function autoTranslate(Request $request, LanguageLine $languageLine)
    {
        $request->validate([
            'locale' => 'required|string',
        ]);

        $locale = $request->input('locale');
        $originalText = $languageLine->text['en'] ?? $languageLine->key;

        $translated = $this->aiService->translate($originalText, $locale);

        if ($translated) {
            $text = $languageLine->text;
            $text[$locale] = $translated;
            $languageLine->text = $text;
            $languageLine->save();

            return back()->with('success', 'AI Translation successful.');
        }

        return back()->with('error', 'AI Translation failed: ' . $this->aiService->getLastError());
    }

    public function sync()
    {
        // Re-use logic from LanguageLineController for now,
        // as theme translations in this project seem to be spread across groups
        return app(LanguageLineController::class)->sync();
    }
}

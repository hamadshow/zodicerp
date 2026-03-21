<?php

namespace App\Http\Controllers\Backend;

use App\Http\Controllers\Controller;
use App\Models\Language;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;

class LanguageController extends Controller
{
    public function index()
    {
        $languages = Language::orderBy('lang_order', 'asc')->get();

        return Inertia::render('Backend/Settings/Locales', [
            'locales_data' => $languages,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'lang_name' => 'required|string|max:120',
            'lang_locale' => 'required|string|max:20',
            'lang_code' => 'required|string|max:20',
            'lang_flag' => 'nullable|string|max:20',
            'lang_is_rtl' => 'boolean',
        ]);

        Language::create([
            'lang_name' => $request->lang_name,
            'lang_locale' => $request->lang_locale,
            'lang_code' => $request->lang_code,
            'lang_flag' => $request->lang_flag,
            'lang_is_rtl' => $request->lang_is_rtl ? 1 : 0,
        ]);

        return Redirect::back()->with('success', 'Language created successfully.');
    }

    public function update(Request $request, $id)
    {
        $language = Language::findOrFail($id);

        $request->validate([
            'lang_name' => 'required|string|max:120',
            'lang_locale' => 'required|string|max:20',
            'lang_code' => 'required|string|max:20',
            'lang_flag' => 'nullable|string|max:20',
            'lang_is_rtl' => 'boolean',
        ]);

        $language->update([
            'lang_name' => $request->lang_name,
            'lang_locale' => $request->lang_locale,
            'lang_code' => $request->lang_code,
            'lang_flag' => $request->lang_flag,
            'lang_is_rtl' => $request->lang_is_rtl ? 1 : 0,
        ]);

        return Redirect::back()->with('success', 'Language updated successfully.');
    }

    public function destroy($id)
    {
        $language = Language::findOrFail($id);

        if ($language->lang_is_default) {
            return Redirect::back()->with('error', 'Cannot delete default language.');
        }

        $language->delete();

        return Redirect::back()->with('success', 'Language deleted successfully.');
    }

    public function setDefault($id)
    {
        // Reset all to not default
        Language::where('lang_is_default', 1)->update(['lang_is_default' => 0]);

        // Set selected to default
        $language = Language::findOrFail($id);
        $language->update(['lang_is_default' => 1]);

        return Redirect::back()->with('success', 'Default language updated.');
    }
}

<?php

namespace App\Http\Controllers\Home\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('Backend/Auth/Register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'fullname' => 'sometimes|required_without:name|string|max:255',
            'name' => 'sometimes|required_without:fullname|string|max:255',
            'username' => 'sometimes|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'phone' => 'nullable|string|max:20',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $fullname = trim((string) ($data['fullname'] ?? $data['name'] ?? $data['username'] ?? ''));
        $username = trim((string) ($data['username'] ?? $fullname));

        $user = User::create([
            'username' => $username,
            'fullname' => $fullname,
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => 'customer',
            'status' => 'active',
            'phone' => $data['phone'] ?? null,
        ]);

        event(new Registered($user));

        Auth::login($user);

        $params = [
            'country' => $request->segment(1) ?? session('country_code', 'sa'),
            'lang' => $request->segment(2) ?? session('locale', config('app.locale', 'en')),
        ];

        return redirect()->route('company.register', $params);
    }
}

<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Client_Sales\Customer;
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
        return Inertia::render('Home/Auth/Register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'phone' => 'nullable|string|max:20',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = User::create([
            'name' => $data['first_name'].' '.$data['last_name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ]);

        event(new Registered($user));

        Auth::login($user);

        $customerData = [
            'name_ar' => $data['first_name'].' '.$data['last_name'],
            'name_en' => $data['first_name'].' '.$data['last_name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'mobile' => $data['phone'] ?? null,
            'is_active' => true,
            'customer_group_id' => 2,
            'registration_date' => now(),
            'created_by' => $user->id,
        ];

        $latest = Customer::latest('id')->first();
        if ($latest && preg_match('/^CUS-(\d+)$/', $latest->customer_code, $matches)) {
            $nextId = intval($matches[1]) + 1;
        } else {
            $nextId = 10001;
        }
        $customerData['customer_code'] = 'CUS-'.$nextId;

        Customer::create($customerData);

        return redirect(route('frontend', absolute: false));
    }
}

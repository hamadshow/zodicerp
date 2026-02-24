<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $cart = $request->session()->get('cart', []);
        $cartVersion = (int) $request->session()->get('cart_version', 0);
        $cartCount = 0;
        if (is_array($cart)) {
            foreach ($cart as $item) {
                if ((int) ($item['quantity'] ?? 0) > 0) {
                    $cartCount += 1;
                }
            }
        }

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
                'customer' => $request->user('customer'),
                'supplier' => $request->user('supplier'),
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            'cart' => [
                'count' => $cartCount,
                'version' => $cartVersion,
            ],
        ];
    }
}

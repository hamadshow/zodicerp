<?php

namespace App\Http\Controllers\Purchases;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Illuminate\Http\Request;

class PurchaseInvoiceController extends Controller
{
    public function index()
    {
        return Inertia::render('Backend/04-Purchases/Invoices/Index');
    }

    public function create()
    {
        return Inertia::render('Backend/04-Purchases/Invoices/Create');
    }

    public function store(Request $request)
    {
        // TODO: Implement store logic
    }

    public function pending()
    {
        return Inertia::render('Backend/04-Purchases/Invoices/Pending');
    }

    public function overdue()
    {
        return Inertia::render('Backend/04-Purchases/Invoices/Overdue');
    }
}

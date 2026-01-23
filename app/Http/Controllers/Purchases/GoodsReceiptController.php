<?php

namespace App\Http\Controllers\Purchases;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Illuminate\Http\Request;

class GoodsReceiptController extends Controller
{
    public function index()
    {
        return Inertia::render('Backend/04-Purchases/GoodsReceipts/Index');
    }

    public function create()
    {
        return Inertia::render('Backend/04-Purchases/GoodsReceipts/Create');
    }
}

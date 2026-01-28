<?php

namespace App\Http\Controllers\InvestingStack;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InvestingStackController extends Controller
{
    public function index()
    {
        return Inertia::render('Backend/InvestingStack/Index');
    }
}

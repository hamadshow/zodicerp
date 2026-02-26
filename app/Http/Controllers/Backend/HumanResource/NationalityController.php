<?php

namespace App\Http\Controllers\Backend\HumanResource;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class NationalityController extends Controller
{
    public function __construct()
    {
        $this->middleware(['auth', 'admin']);
    }

    public function index(): Response
    {
        return Inertia::render('Backend/02_human_resource/Nationalities');
    }
}

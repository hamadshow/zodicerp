<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\LoginController;
use App\Http\Controllers\Admin\DashBoardController;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::group(['prefix' => 'admin','namespace'=>'Admin','middleware'=>'auth:admin'], function () {
    Route::get('/', [DashBoardController::class, 'index'])->name('admin.dashboard');
    //  Route::get('logout', function() {
    //     auth()->logout();});
    Route::get('logout', [LoginController::class, 'logout'])->name('admin.logout');


});


Route::group(['prefix' => 'admin','namespace'=>'Admin','middleware'=>'guest:admin'], function () {
    Route::get('login', [LoginController::class, 'show_login_view'])->name('admin.showlogin');
    Route::post('login', [LoginController::class, 'login'])->name('admin.login');

});


// Route::get('/', function () { 
//     return view('admin.auth.login'); 
// });

// Route::get('content/01_into', function () { 
//     return view('content.01_into'); 
// });

// Route::get('content/02_interest_rate', function () { 
//     return view('content.02_interest_rate'); 
// });

// Route::get('content/03_rate_return', function () { 
//     return view('content.03_Rate_Return'); 
// });

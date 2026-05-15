<?php

namespace App\Http\Controllers\Home;

use App\Http\Controllers\Controller;
use App\Models\Career;
use App\Models\JobApplication;
use Illuminate\Http\Request;
use Inertia\Inertia;

use App\Http\Requests\StoreJobApplicationRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class CareerController extends Controller
{
    public function index()
    {
        $careers = Career::where('is_active', true)->get();
        return Inertia::render('Home/Career', [
            'careers' => $careers
        ]);
    }

    public function show($id)
    {
        $career = Career::findOrFail($id);
        return Inertia::render('Home/CareerDetails', [
            'career' => $career
        ]);
    }

    public function apply(StoreJobApplicationRequest $request)
    {
        Log::info('Job Application received', $request->all());
        try {
            $application = DB::transaction(function () use ($request) {
                // Check for duplicate application within 24 hours
                $exists = JobApplication::where('email', $request->email)
                    ->where('career_id', $request->career_id)
                    ->where('created_at', '>=', now()->subDay())
                    ->exists();

                if ($exists) {
                    throw new \Exception(__('You have already applied for this position in the last 24 hours.'), 422);
                }

                // Secure File Storage with UUID
                $cvFile = $request->file('cv');
                $cvName = Str::uuid() . '.' . $cvFile->getClientOriginalExtension();
                $cvPath = $cvFile->storeAs('careers/cvs', $cvName, 'public');

                $certificatesPath = null;
                if ($request->hasFile('certificates')) {
                    $certFile = $request->file('certificates');
                    $certName = Str::uuid() . '.' . $certFile->getClientOriginalExtension();
                    $certificatesPath = $certFile->storeAs('careers/certificates', $certName, 'public');
                }

                // Create Application Record
                return JobApplication::create([
                    'name'              => $request->name,
                    'email'             => $request->email,
                    'phone'             => $request->phone,
                    'career_id'         => $request->career_id,
                    'gender'            => $request->gender,
                    'age'               => $request->age,
                    'nationality'       => $request->nationality,
                    'country'           => $request->country,
                    'city'              => $request->city,
                    'area'              => $request->area,
                    'qualification'     => $request->qualification,
                    'specialization'    => $request->specialization,
                    'experience_years'  => $request->experience_years,
                    'shift_type'        => $request->shift_type ? implode(', ', $request->shift_type) : null,
                    'expected_salary'   => $request->expected_salary,
                    'availability_date' => $request->availability_date,
                    'cv_path'           => $cvPath,
                    'certificates_path' => $certificatesPath,
                    'message'           => $request->message,
                    'status'            => 'pending',
                ]);
            });

            return back()->with('success', __('Application submitted successfully!'));

        } catch (\Exception $e) {
            $errorCode = $e->getCode() == 422 ? 422 : 500;
            $errorMessage = $e->getMessage();

            Log::error('Job Application Save Error: ' . $errorMessage, [
                'email' => $request->email,
                'career_id' => $request->career_id,
            ]);

            $errors = [];
            if ($errorCode === 422) {
                $errors['email'] = $errorMessage;
            } else {
                $errors['form'] = __('An error occurred while saving your application. Please try again later.');
            }

            return back()->withErrors($errors)->withInput();
        }
    }
}

<!DOCTYPE html>
@php
    $currentLocale = app()->getLocale();
    $isRtl = false;
@endphp
<html lang="{{ str_replace('_', '-', $currentLocale) }}" dir="{{ $isRtl ? 'rtl' : 'ltr' }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>
        <link rel="canonical" href="{{ url()->current() }}" />
        @php
            $locales = ['ar', 'en'];
            $countries = ['sa', 'eg', 'ae'];
        @endphp
        @foreach($countries as $country)
            @foreach($locales as $locale)
                <link rel="alternate" hreflang="{{ $locale }}-{{ strtoupper($country) }}" href="{{ url($country . '/' . $locale) }}" />
            @endforeach
        @endforeach
        <link rel="alternate" hreflang="x-default" href="{{ url('sa/ar') }}" />

        @if (app()->environment('local'))
            <script>
                window['ga-disable-G-9Q6H0QETRF'] = true;
            </script>
        @endif


        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite('resources/js/app.jsx')
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
